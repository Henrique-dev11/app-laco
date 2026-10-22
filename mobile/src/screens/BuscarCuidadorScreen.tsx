import { isAxiosError } from 'axios';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { FormField } from '../components/FormField';
import { Notice } from '../components/Notice';
import { AppScreenLayout } from '../layouts/AppScreenLayout';
import { useListaApi } from '../hooks/useListaApi';
import { useAuth } from '../contexts/AuthContext';
import { api, mensagemErro } from '../services/api';
import { useStyles, useTheme } from '../theme/ThemeContext';
import type { Paleta } from '../theme';
import type { ScreenProps } from '../types/navigation';

type Cuidador = {
  id: number;
  usuario: {
    id: number;
    nome: string;
    nomeSocial: string | null;
    foto: { updatedAt: string } | null;
  };
  endereco: { cidade: string; estado: string };
  biografia: string | null;
  cuidadorServicos: {
    id: number;
    preco: string;
    duracaoMinutos: number;
    servico: { nome: string };
  }[];
};

const normalizar = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const nomeDe = (c: Cuidador) => c.usuario.nomeSocial || c.usuario.nome;
const preco = (valor: string) => Number(valor).toFixed(2).replace('.', ',');

/** PROVISÓRIO: nota fictícia fixa por cuidador, até existir a avaliação real. */
function avaliacaoProvisoria(cuidadorId: number) {
  const nota = 4.3 + ((cuidadorId * 7) % 8) / 10;
  return { nota, quantidade: 3 + ((cuidadorId * 5) % 20) };
}

function Estrelas({ nota, tamanho = 14 }: { nota: number; tamanho?: number }) {
  const colors = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons
          key={n}
          name={
            nota >= n - 0.25
              ? 'star'
              : nota >= n - 0.75
                ? 'star-half'
                : 'star-outline'
          }
          size={tamanho}
          color={colors.caregiver}
        />
      ))}
    </View>
  );
}

type Selecionada = {
  id: number;
  nome: string;
  cuidador: string;
  preco: string;
  duracaoMinutos: number;
};

export function BuscarCuidadorScreen({
  navigation,
  route,
}: ScreenProps<'BuscarCuidador'>) {
  const styles = useStyles(criarStyles);
  const colors = useTheme();
  const { usuario } = useAuth();
  const { dados, carregando, erro, atualizar } = useListaApi<Cuidador>(
    '/catalogo/cuidadores',
  );
  const idosos = usuario?.responsavel?.responsavelIdosos ?? [];
  const [escolhaId, setIdosoId] = useState(
    route.params?.idosoId ?? idosos[0]?.idoso.id,
  );
  // Se o idoso escolhido deixou de existir na lista, volta ao primeiro.
  const idosoId = idosos.some((i) => i.idoso.id === escolhaId)
    ? escolhaId
    : idosos[0]?.idoso.id;
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [busca, setBusca] = useState('');
  const [selecionado, setSelecionado] = useState<Cuidador | null>(null);
  const [selecionada, setSelecionada] = useState<Selecionada | null>(null);
  const [observacoes, setObservacoes] = useState('');

  const filtrados = useMemo(() => {
    const termo = normalizar(busca);
    if (!termo) return dados;
    return dados.filter((c) =>
      normalizar(
        [
          nomeDe(c),
          c.endereco.cidade,
          c.endereco.estado,
          ...c.cuidadorServicos.map((o) => o.servico.nome),
        ].join(' '),
      ).includes(termo),
    );
  }, [dados, busca]);

  function abrir(cuidador: Cuidador) {
    setMensagem('');
    setSelecionada(null);
    setObservacoes('');
    setSelecionado(cuidador);
  }

  function fechar() {
    setSelecionado(null);
    setSelecionada(null);
    setObservacoes('');
  }

  async function solicitar(cuidadorServicoId: number) {
    if (!idosoId || !usuario?.responsavel || !selecionada || enviando) return;
    setEnviando(true);
    setMensagem('');
    try {
      await api.post('/contratacoes', {
        responsavelId: usuario.responsavel.id,
        idosoId,
        cuidadorServicoId,
        precoReferenciaEsperado: Number(selecionada.preco),
        duracaoEsperadaMinutos: selecionada.duracaoMinutos,
        ...(observacoes.trim() ? { observacoes: observacoes.trim() } : {}),
      });
      setMensagem(
        'Solicitação salva. Aguarde a resposta do cuidador em Minhas contratações.',
      );
      setSelecionada(null);
      setObservacoes('');
    } catch (error) {
      setMensagem(mensagemErro(error));
      // Preço ou duração mudaram desde que a lista foi carregada.
      if (isAxiosError(error) && error.response?.status === 409) {
        setSelecionada(null);
        atualizar();
      }
    } finally {
      setEnviando(false);
    }
  }

  const aberto = selecionado;
  const avaliacao = aberto ? avaliacaoProvisoria(aberto.id) : null;

  return (
    <AppScreenLayout
      title="Buscar cuidador"
      subtitle="Encontre quem pode cuidar com você"
      tab="Buscar"
    >
      <View style={styles.busca}>
        <Ionicons name="search" size={20} color={colors.muted} />
        <TextInput
          style={styles.buscaInput}
          value={busca}
          onChangeText={setBusca}
          placeholder="Buscar por nome, serviço ou cidade"
          placeholderTextColor={colors.muted}
          returnKeyType="search"
          autoCorrect={false}
          accessibilityLabel="Buscar cuidador"
        />
        {!!busca && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Limpar busca"
            onPress={() => setBusca('')}
            hitSlop={10}
          >
            <Ionicons name="close-circle" size={20} color={colors.muted} />
          </TouchableOpacity>
        )}
      </View>

      {idosos.length > 0 ? (
        <View style={styles.paraQuem}>
          <Text style={styles.rotulo}>Para quem?</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            {idosos.map(({ idoso }) => {
              const ativo = idoso.id === idosoId;
              return (
                <TouchableOpacity
                  key={idoso.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: ativo }}
                  disabled={enviando}
                  onPress={() => setIdosoId(idoso.id)}
                  style={[styles.chip, ativo && styles.chipAtivo]}
                >
                  <Text
                    style={[styles.chipTexto, ativo && styles.chipTextoAtivo]}
                  >
                    {idoso.nomeSocial || idoso.nome}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      ) : (
        <Notice>
          É necessário ter um idoso vinculado para solicitar uma contratação.
        </Notice>
      )}

      {carregando && <ActivityIndicator color={colors.primary} />}
      {!!erro && <Notice>{erro}</Notice>}
      {!carregando && !erro && (
        <Text style={styles.contagem}>
          {filtrados.length === 1
            ? '1 cuidador'
            : `${filtrados.length} cuidadores`}
          {busca ? ' encontrados' : ' disponíveis'}
        </Text>
      )}
      {!carregando && !erro && !dados.length && (
        <Notice>Nenhum cuidador aprovado disponível no momento.</Notice>
      )}
      {!carregando && !erro && !!dados.length && !filtrados.length && (
        <Notice>Nenhum cuidador encontrado para essa busca.</Notice>
      )}

      {filtrados.map((cuidador) => {
        const { nota } = avaliacaoProvisoria(cuidador.id);
        const servicos = cuidador.cuidadorServicos;
        return (
          <TouchableOpacity
            key={cuidador.id}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`Ver detalhes de ${nomeDe(cuidador)}`}
            onPress={() => abrir(cuidador)}
            style={styles.card}
          >
            <Avatar
              nome={nomeDe(cuidador)}
              usuarioId={cuidador.usuario.id}
              versao={cuidador.usuario.foto?.updatedAt}
              tamanho={56}
            />
            <View style={styles.cardInfo}>
              <Text style={styles.nome} numberOfLines={1}>
                {nomeDe(cuidador)}
              </Text>
              <View style={styles.linha}>
                <Estrelas nota={nota} />
                <Text style={styles.nota}>{nota.toFixed(1)}</Text>
              </View>
              <Text style={styles.local} numberOfLines={1}>
                {cuidador.endereco.cidade}/{cuidador.endereco.estado}
              </Text>
              <View style={styles.tags}>
                {servicos.slice(0, 2).map((o) => (
                  <View key={o.id} style={styles.tag}>
                    <Text style={styles.tagTexto} numberOfLines={1}>
                      {o.servico.nome}
                    </Text>
                  </View>
                ))}
                {servicos.length > 2 && (
                  <View style={styles.tag}>
                    <Text style={styles.tagTexto}>+{servicos.length - 2}</Text>
                  </View>
                )}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </TouchableOpacity>
        );
      })}

      <View style={styles.rodape}>
        <TouchableOpacity
          disabled={carregando}
          onPress={atualizar}
          style={styles.link}
        >
          <Ionicons name="refresh" size={16} color={colors.primaryDark} />
          <Text style={styles.linkTexto}>Atualizar lista</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate('Historico')}
          style={styles.link}
        >
          <Ionicons name="time-outline" size={16} color={colors.primaryDark} />
          <Text style={styles.linkTexto}>Minhas contratações</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={!!aberto}
        transparent
        animationType="slide"
        onRequestClose={fechar}
      >
        <Pressable style={styles.fundoModal} onPress={fechar}>
          <Pressable style={styles.folha} onPress={() => undefined}>
            {aberto && avaliacao && (
              <ScrollView
                contentContainerStyle={styles.folhaConteudo}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.alca} />
                <View style={styles.folhaTopo}>
                  <Avatar
                    nome={nomeDe(aberto)}
                    usuarioId={aberto.usuario.id}
                    versao={aberto.usuario.foto?.updatedAt}
                    tamanho={72}
                  />
                  <View style={styles.cardInfo}>
                    <Text style={styles.nomeGrande}>{nomeDe(aberto)}</Text>
                    <Text style={styles.local}>
                      {aberto.endereco.cidade}/{aberto.endereco.estado}
                    </Text>
                  </View>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Fechar"
                    onPress={fechar}
                    hitSlop={10}
                  >
                    <Ionicons name="close" size={26} color={colors.muted} />
                  </TouchableOpacity>
                </View>

                <View style={styles.avaliacao}>
                  <Text style={styles.notaGrande}>
                    {avaliacao.nota.toFixed(1)}
                  </Text>
                  <View style={{ gap: 2 }}>
                    <Estrelas nota={avaliacao.nota} tamanho={18} />
                    <Text style={styles.local}>
                      {avaliacao.quantidade} avaliações · provisória
                    </Text>
                  </View>
                </View>

                {!!aberto.biografia && (
                  <View style={styles.bloco}>
                    <Text style={styles.secao}>Sobre</Text>
                    <Text style={styles.texto}>{aberto.biografia}</Text>
                  </View>
                )}

                {selecionada ? (
                  <View style={styles.bloco}>
                    <Text style={styles.secao}>Revisar solicitação</Text>
                    <Text style={styles.texto}>
                      {selecionada.cuidador} · {selecionada.nome}
                    </Text>
                    <Text style={styles.texto}>
                      Idoso:{' '}
                      {idosos.find((i) => i.idoso.id === idosoId)?.idoso.nome}
                    </Text>
                    <Text style={styles.texto}>
                      Preço de referência: R$ {preco(selecionada.preco)} ·{' '}
                      {selecionada.duracaoMinutos} minutos
                    </Text>
                    <Notice>
                      O preço-base e a duração acima serão usados nesta
                      solicitação. Aguarde o aceite do cuidador.
                    </Notice>
                    <FormField
                      label="Informações sobre o atendimento (opcional)"
                      value={observacoes}
                      onChangeText={setObservacoes}
                      maxLength={2000}
                      multiline
                      editable={!enviando}
                    />
                    <Button
                      title={enviando ? 'Enviando...' : 'Confirmar solicitação'}
                      disabled={enviando || !idosoId}
                      onPress={() => {
                        void solicitar(selecionada.id);
                      }}
                    />
                    <Button
                      title="Voltar à escolha de serviços"
                      variant="outline"
                      disabled={enviando}
                      onPress={() => setSelecionada(null)}
                    />
                  </View>
                ) : (
                <View style={styles.bloco}>
                  <Text style={styles.secao}>Serviços</Text>
                  {!aberto.cuidadorServicos.length && (
                    <Text style={styles.texto}>
                      Este cuidador ainda não cadastrou serviços.
                    </Text>
                  )}
                  {aberto.cuidadorServicos.map((oferta) => (
                    <View key={oferta.id} style={styles.servico}>
                      <View style={styles.cardInfo}>
                        <Text style={styles.servicoNome}>
                          {oferta.servico.nome}
                        </Text>
                        <Text style={styles.local}>
                          {oferta.duracaoMinutos} minutos
                        </Text>
                      </View>
                      <Text style={styles.preco}>R$ {preco(oferta.preco)}</Text>
                      <TouchableOpacity
                        accessibilityRole="button"
                        disabled={enviando || !idosoId}
                        onPress={() =>
                          setSelecionada({
                            id: oferta.id,
                            nome: oferta.servico.nome,
                            cuidador: nomeDe(aberto),
                            preco: oferta.preco,
                            duracaoMinutos: oferta.duracaoMinutos,
                          })
                        }
                        style={[
                          styles.solicitar,
                          (enviando || !idosoId) && styles.desativado,
                        ]}
                      >
                        <Text style={styles.solicitarTexto}>
                          Selecionar
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
                )}

                {!idosoId && (
                  <Notice>
                    Vincule um idoso para poder solicitar uma contratação.
                  </Notice>
                )}
                {!!mensagem && <Notice>{mensagem}</Notice>}
                <Button title="Fechar" variant="outline" onPress={fechar} />
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </AppScreenLayout>
  );
}

const criarStyles = (colors: Paleta) =>
  StyleSheet.create({
    busca: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      minHeight: 50,
      paddingHorizontal: 16,
      backgroundColor: colors.input,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 28,
    },
    buscaInput: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
      paddingVertical: 10,
    },
    paraQuem: { gap: 8 },
    rotulo: { fontSize: 13, fontWeight: '600', color: colors.muted },
    chips: { gap: 8 },
    chip: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 20,
      backgroundColor: colors.chip,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipAtivo: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipTexto: { fontSize: 14, fontWeight: '600', color: colors.primaryDark },
    chipTextoAtivo: { color: colors.surface },
    contagem: { fontSize: 13, color: colors.muted },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      padding: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
    },
    cardInfo: { flex: 1, gap: 3 },
    nome: { fontSize: 16, fontWeight: '700', color: colors.text },
    nomeGrande: { fontSize: 20, fontWeight: '700', color: colors.text },
    linha: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    nota: { fontSize: 13, fontWeight: '600', color: colors.text },
    local: { fontSize: 13, color: colors.muted },
    tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
    tag: {
      maxWidth: 140,
      paddingVertical: 3,
      paddingHorizontal: 10,
      borderRadius: 12,
      backgroundColor: colors.badge,
    },
    tagTexto: { fontSize: 12, fontWeight: '600', color: colors.primaryDark },
    rodape: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 4,
    },
    link: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 6 },
    linkTexto: { fontSize: 14, fontWeight: '600', color: colors.primaryDark },
    fundoModal: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    folha: {
      maxHeight: '88%',
      backgroundColor: colors.surface,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
    },
    folhaConteudo: { padding: 20, paddingBottom: 32, gap: 18 },
    alca: {
      alignSelf: 'center',
      width: 44,
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.border,
    },
    folhaTopo: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    avaliacao: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      padding: 14,
      borderRadius: 16,
      backgroundColor: colors.background,
    },
    notaGrande: { fontSize: 32, fontWeight: '700', color: colors.text },
    bloco: { gap: 10 },
    secao: { fontSize: 16, fontWeight: '700', color: colors.text },
    texto: { fontSize: 14, lineHeight: 21, color: colors.muted },
    servico: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
    },
    servicoNome: { fontSize: 15, fontWeight: '600', color: colors.text },
    preco: { fontSize: 15, fontWeight: '700', color: colors.primaryDark },
    solicitar: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 18,
      backgroundColor: colors.primary,
    },
    solicitarTexto: { fontSize: 13, fontWeight: '700', color: colors.surface },
    desativado: { opacity: 0.5 },
  });
