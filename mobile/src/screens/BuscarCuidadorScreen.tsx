import { fs, lh } from '../theme/tipografia';
import { useMotion } from '../motion/MotionProvider';
import { staggerDelay } from '../motion/policy';
import { SkeletonList } from '../motion/SkeletonList';
import { MotionPressable as TouchableOpacity } from '../motion/MotionPressable';
import { isAxiosError } from 'axios';
import { useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { CamadaLeitura, Text, TextInput } from '../accessibility/Texto';
import { BotaoAcessibilidade } from '../accessibility/BotaoAcessibilidade';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Estrelas } from '../components/Estrelas';
import { ListaAvaliacoes, ResumoNota } from '../components/ListaAvaliacoes';
import { Notice } from '../components/Notice';
import { AppScreenLayout } from '../layouts/AppScreenLayout';
import { useAvaliacoes } from '../hooks/useAvaliacoes';
import { useListaApi } from '../hooks/useListaApi';
import { useAuth } from '../contexts/AuthContext';
import { api, mensagemErro } from '../services/api';
import { useStyles, useTheme } from '../theme/ThemeContext';
import type { Paleta } from '../theme';
import type { ScreenProps } from '../types/navigation';
import { ESPACO_BOTAO } from '../utils/acessibilidade';
import { formatarMedia, normalizarMedia } from '../utils/avaliacoes';

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
  /** Nota média e total de avaliações do cuidador (`null`/0 = ainda sem avaliações). */
  avaliacaoMedia?: number | string | null;
  totalAvaliacoes?: number;
  cuidadorServicos: {
    id: number;
    preco: string;
    duracaoMinutos: number;
    servico: { id: number; nome: string };
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

export function BuscarCuidadorScreen({
  navigation,
  route,
}: ScreenProps<'BuscarCuidador'>) {
  const styles = useStyles(criarStyles);
  const colors = useTheme();
  const { reducedMotion } = useMotion();
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
  const emCurso = useRef(false);
  const [mensagem, setMensagem] = useState('');
  const [filtroServico, setFiltroServico] = useState(route.params?.servicoId);
  const [busca, setBusca] = useState('');
  const [selecionado, setSelecionado] = useState<Cuidador | null>(null);
  // Muda a cada abertura dos detalhes, para recarregar as avaliações do cuidador.
  const [abertura, setAbertura] = useState(0);
  const [somenteAvaliados, setSomenteAvaliados] = useState(false);

  const filtrados = useMemo(() => {
    const termo = normalizar(busca);
    return dados
      .filter((cuidador) => {
        const servicos = cuidador.cuidadorServicos;
        return (
          (!filtroServico ||
            servicos.some(({ servico }) => servico.id === filtroServico)) &&
          (!somenteAvaliados || (cuidador.totalAvaliacoes ?? 0) > 0) &&
          normalizar(
            [
              nomeDe(cuidador),
              cuidador.endereco.cidade,
              cuidador.endereco.estado,
              ...servicos.map(({ servico }) => servico.nome),
            ].join(' '),
          ).includes(termo)
        );
      })
      .sort(
        (a, b) =>
          (normalizarMedia(b.avaliacaoMedia) ?? 0) -
            (normalizarMedia(a.avaliacaoMedia) ?? 0) ||
          (b.totalAvaliacoes ?? 0) - (a.totalAvaliacoes ?? 0) ||
          nomeDe(a).localeCompare(nomeDe(b), 'pt-BR'),
      );
  }, [dados, busca, filtroServico, somenteAvaliados]);

  function abrir(cuidador: Cuidador) {
    setMensagem('');
    setAbertura((n) => n + 1);
    setSelecionado(cuidador);
  }

  function fechar() {
    if (!emCurso.current) setSelecionado(null);
  }

  async function solicitar(
    cuidador: Cuidador,
    oferta: Cuidador['cuidadorServicos'][number],
  ) {
    if (!idosoId || !usuario?.responsavel || emCurso.current) return;
    emCurso.current = true;
    setEnviando(true);
    setMensagem('');
    try {
      await api.post('/contratacoes', {
        responsavelId: usuario.responsavel.id,
        idosoId,
        cuidadorServicoId: oferta.id,
        reutilizarSolicitacaoPendente: true,
        precoReferenciaEsperado: Number(oferta.preco),
        duracaoEsperadaMinutos: oferta.duracaoMinutos,
      });
      setSelecionado(null);
      navigation.navigate('Conversa', {
        usuarioId: cuidador.usuario.id,
        nome: nomeDe(cuidador),
        fotoVersao: cuidador.usuario.foto?.updatedAt ?? null,
        sugestoes: [
          `Olá! Você tem disponibilidade para o serviço de ${oferta.servico.nome}?`,
          `Olá! Você pode me contar como funciona o serviço de ${oferta.servico.nome} e enviar uma proposta?`,
        ],
      });
    } catch (error) {
      setMensagem(mensagemErro(error));
      if (isAxiosError(error) && error.response?.status === 409) {
        setSelecionado(null);
        atualizar();
      }
    } finally {
      emCurso.current = false;
      setEnviando(false);
    }
  }

  const aberto = selecionado;
  // Avaliações reais do cuidador aberto (nada é consultado com os detalhes fechados).
  const avaliacoes = useAvaliacoes(aberto?.id ?? null, abertura);

  return (
    <AppScreenLayout
      title="Buscar cuidador"
      subtitle="Encontre quem pode cuidar com você"
      tab="Buscar"
      atualizacao={{ atualizar, carregando }}
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

      {!!filtroServico && (
        <>
          <Notice>{`Serviço selecionado: ${route.params?.nomeServico ?? 'catálogo'}`}</Notice>
          <Button
            title="Ver todos os cuidadores"
            variant="outline"
            onPress={() => setFiltroServico(undefined)}
          />
        </>
      )}
      <Button
        compacto
        title="Somente cuidadores avaliados"
        variant={somenteAvaliados ? 'filled' : 'outline'}
        selected={somenteAvaliados}
        onPress={() => setSomenteAvaliados((ativo) => !ativo)}
      />
      {carregando && !dados.length && <SkeletonList />}
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

      {filtrados.map((cuidador, index) => {
        const nota = normalizarMedia(cuidador.avaliacaoMedia);
        const servicos = cuidador.cuidadorServicos;
        return (
          <TouchableOpacity
            key={cuidador.id}
            enter
            delay={staggerDelay(index)}
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
                {nota !== null && <Estrelas nota={nota} />}
                <Text style={styles.nota}>
                  {nota !== null
                    ? `${formatarMedia(nota)} (${cuidador.totalAvaliacoes ?? 0})`
                    : 'Sem avaliações'}
                </Text>
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
        animationType={reducedMotion ? 'none' : 'slide'}
        onRequestClose={fechar}
      >
        <CamadaLeitura>
          <View style={styles.fundoModal}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={fechar}
              accessible={false}
            />
            <View style={styles.folha} accessibilityViewIsModal>
              {aberto && (
                <ScrollView
                  contentContainerStyle={styles.folhaConteudo}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled
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

                  {/* Nota média e quantidade, vindas das avaliações reais. */}
                  {!avaliacoes.erro && (
                    <ResumoNota
                      resumo={avaliacoes.resumo}
                      carregando={avaliacoes.carregando}
                    />
                  )}

                  {!!aberto.biografia && (
                    <View style={styles.bloco}>
                      <Text style={styles.secao}>Sobre</Text>
                      <Text style={styles.texto}>{aberto.biografia}</Text>
                    </View>
                  )}

                  <View style={styles.bloco}>
                    <Text style={styles.secao}>Serviços</Text>
                    {!aberto.cuidadorServicos.length && (
                      <Text style={styles.texto}>
                        Este cuidador ainda não cadastrou serviços.
                      </Text>
                    )}
                    {aberto.cuidadorServicos.map((oferta) => (
                      <View key={oferta.id} style={styles.servico}>
                        <View style={styles.linhaServico}>
                          <View style={styles.cardInfo}>
                            <Text style={styles.servicoNome}>
                              {oferta.servico.nome}
                            </Text>
                            <Text style={styles.local}>
                              {oferta.duracaoMinutos} minutos
                            </Text>
                          </View>
                          <Text style={styles.preco}>
                            R$ {preco(oferta.preco)}
                          </Text>
                        </View>
                        <TouchableOpacity
                          accessibilityRole="button"
                          disabled={enviando || !idosoId}
                          onPress={() => void solicitar(aberto, oferta)}
                          style={[
                            styles.solicitar,
                            (enviando || !idosoId) && styles.desativado,
                          ]}
                        >
                          <Text style={styles.solicitarTexto}>
                            Solicitar e conversar
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>

                  {!idosoId && (
                    <Notice>
                      Vincule um idoso para poder solicitar uma contratação.
                    </Notice>
                  )}
                  {!!mensagem && <Notice>{mensagem}</Notice>}
                  {/* Avaliações (estrelas e comentários) deste cuidador. */}
                  <ListaAvaliacoes
                    resumo={avaliacoes.resumo}
                    carregando={avaliacoes.carregando}
                    erro={avaliacoes.erro}
                    atualizar={avaliacoes.atualizar}
                  />
                  <Button
                    title="Ver perfil do cuidador"
                    disabled={enviando}
                    variant="outline"
                    onPress={() => {
                      fechar();
                      navigation.navigate('PerfilConsulta', {
                        usuarioId: aberto.usuario.id,
                        tipo: 'cuidador',
                      });
                    }}
                  />
                  <Button
                    title="Fechar"
                    variant="outline"
                    onPress={fechar}
                    disabled={enviando}
                  />
                </ScrollView>
              )}
            </View>
          </View>
          {/* O botão global fica sob o modal; este mantém a acessibilidade à mão. */}
          <BotaoAcessibilidade elevado={false} />
        </CamadaLeitura>
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
      fontSize: fs(15),
      color: colors.text,
      paddingVertical: 10,
    },
    paraQuem: { gap: 8 },
    rotulo: { fontSize: fs(13), fontWeight: '600', color: colors.muted },
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
    chipTexto: {
      fontSize: fs(14),
      fontWeight: '600',
      color: colors.primaryDark,
    },
    chipTextoAtivo: { color: colors.surface },
    contagem: { fontSize: fs(13), color: colors.muted },
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
    nome: { fontSize: fs(16), fontWeight: '700', color: colors.text },
    nomeGrande: { fontSize: fs(20), fontWeight: '700', color: colors.text },
    linha: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    nota: { fontSize: fs(13), fontWeight: '600', color: colors.text },
    local: { fontSize: fs(13), color: colors.muted },
    tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
    tag: {
      maxWidth: 140,
      paddingVertical: 3,
      paddingHorizontal: 10,
      borderRadius: 12,
      backgroundColor: colors.badge,
    },
    tagTexto: {
      fontSize: fs(12),
      fontWeight: '600',
      color: colors.primaryDark,
    },
    rodape: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 4,
    },
    link: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 6 },
    linkTexto: {
      fontSize: fs(14),
      fontWeight: '600',
      color: colors.primaryDark,
    },
    fundoModal: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    folha: {
      height: '88%',
      width: '100%',
      maxWidth: 640,
      alignSelf: 'center',
      backgroundColor: colors.surface,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
    },
    // O espaço extra no fim deixa o conteúdo rolar para fora de trás do botão de acessibilidade.
    folhaConteudo: { padding: 20, paddingBottom: 32 + ESPACO_BOTAO, gap: 18 },
    alca: {
      alignSelf: 'center',
      width: 44,
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.border,
    },
    folhaTopo: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    bloco: { gap: 10 },
    secao: { fontSize: fs(16), fontWeight: '700', color: colors.text },
    texto: { fontSize: fs(14), lineHeight: lh(21), color: colors.muted },
    linhaServico: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    servico: {
      gap: 10,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
    },
    servicoNome: { fontSize: fs(15), fontWeight: '600', color: colors.text },
    preco: { fontSize: fs(15), fontWeight: '700', color: colors.primaryDark },
    solicitar: {
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 8,
      borderRadius: 18,
      backgroundColor: colors.primary,
    },
    solicitarTexto: {
      textAlign: 'center',
      fontSize: fs(13),
      fontWeight: '700',
      color: colors.surface,
    },
    desativado: { opacity: 0.5 },
  });
