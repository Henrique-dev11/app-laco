import { isAxiosError } from 'axios';
import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { FormField } from '../components/FormField';
import { Notice } from '../components/Notice';
import { AppScreenLayout } from '../layouts/AppScreenLayout';
import { useAppStyles } from '../theme/appStyles';
import { useListaApi } from '../hooks/useListaApi';
import { useAuth } from '../contexts/AuthContext';
import { api, mensagemErro } from '../services/api';
import { useTheme } from '../theme/ThemeContext';
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
export function BuscarCuidadorScreen({
  navigation,
  route,
}: ScreenProps<'BuscarCuidador'>) {
  const appStyles = useAppStyles();
  const colors = useTheme();
  const { usuario } = useAuth();
  const { dados, carregando, erro, atualizar } = useListaApi<Cuidador>(
    '/catalogo/cuidadores',
  );
  const idosos = usuario?.responsavel?.responsavelIdosos ?? [];
  const [escolhaId, setIdosoId] = useState(
    route.params?.idosoId ?? idosos[0]?.idoso.id,
  );
  const idosoId = idosos.some((i) => i.idoso.id === escolhaId)
    ? escolhaId
    : idosos[0]?.idoso.id;
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [selecionada, setSelecionada] = useState<{
    id: number;
    nome: string;
    cuidador: string;
    preco: string;
    duracaoMinutos: number;
  } | null>(null);
  const [observacoes, setObservacoes] = useState('');
  async function solicitar(cuidadorServicoId: number) {
    if (!idosoId || !usuario?.responsavel || !selecionada || enviando) return;
    setEnviando(true);
    setMensagem('');
    try {
      await api.post('/contratacoes', {
        responsavelId: usuario.responsavel.id,
        idosoId,
        cuidadorServicoId,
        precoReferenciaEsperado: Number(selecionada?.preco),
        duracaoEsperadaMinutos: selecionada?.duracaoMinutos,
        ...(observacoes.trim() ? { observacoes: observacoes.trim() } : {}),
      });
      setMensagem(
        'Solicitação salva. Aguarde a resposta do cuidador em Minhas contratações.',
      );
      setSelecionada(null);
      setObservacoes('');
    } catch (error) {
      setMensagem(mensagemErro(error));
      if (isAxiosError(error) && error.response?.status === 409) {
        setSelecionada(null);
        atualizar();
      }
    } finally {
      setEnviando(false);
    }
  }
  return (
    <AppScreenLayout
      title="Buscar cuidador"
      subtitle="Encontre quem pode cuidar com você"
      tab="Buscar"
    >
      <Text style={appStyles.text}>Para quem você procura cuidados?</Text>
      {idosos.map(({ idoso }) => (
        <Button
          key={idoso.id}
          title={idoso.nomeSocial || idoso.nome}
          variant={idoso.id === idosoId ? 'filled' : 'outline'}
          disabled={enviando}
          onPress={() => setIdosoId(idoso.id)}
        />
      ))}
      {!idosos.length && (
        <Notice>
          É necessário ter um idoso vinculado para solicitar uma contratação.
        </Notice>
      )}
      {selecionada && (
        <View style={appStyles.card}>
          <Text style={appStyles.name}>Revisar solicitação</Text>
          <Text style={appStyles.text}>
            {selecionada.cuidador} · {selecionada.nome}
          </Text>
          <Text style={appStyles.text}>
            Idoso: {idosos.find((i) => i.idoso.id === idosoId)?.idoso.nome}
          </Text>
          <Text style={appStyles.text}>
            Preço de referência: R${' '}
            {Number(selecionada.preco).toFixed(2).replace('.', ',')} ·{' '}
            {selecionada.duracaoMinutos} minutos
          </Text>
          <Notice>
            O preço-base e a duração acima serão usados nesta solicitação.
            Aguarde o aceite do cuidador.
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
            disabled={enviando}
            variant="outline"
            onPress={() => setSelecionada(null)}
          />
        </View>
      )}
      {!!mensagem && <Notice>{mensagem}</Notice>}
      {carregando && <ActivityIndicator color={colors.primary} />}
      {!!erro && <Notice>{erro}</Notice>}
      {!carregando && !erro && !dados.length && (
        <Notice>Nenhum cuidador aprovado disponível no momento.</Notice>
      )}
      {dados.map((cuidador) => (
        <View key={cuidador.id} style={appStyles.card}>
          <View style={appStyles.row}>
            <Avatar
              nome={cuidador.usuario.nomeSocial || cuidador.usuario.nome}
              usuarioId={cuidador.usuario.id}
              versao={cuidador.usuario.foto?.updatedAt}
              tamanho={56}
            />
            <Text style={appStyles.name}>
              {cuidador.usuario.nomeSocial || cuidador.usuario.nome}
            </Text>
          </View>
          <Text style={appStyles.text}>
            {cuidador.endereco.cidade}/{cuidador.endereco.estado}
          </Text>
          {!!cuidador.biografia && (
            <Text style={appStyles.text}>{cuidador.biografia}</Text>
          )}
          {cuidador.cuidadorServicos.map((oferta) => (
            <View key={oferta.id} style={{ gap: 8 }}>
              <Text style={appStyles.text}>
                {oferta.servico.nome} · R${' '}
                {Number(oferta.preco).toFixed(2).replace('.', ',')} ·{' '}
                {oferta.duracaoMinutos} minutos (referência)
              </Text>
              <Button
                title="Selecionar serviço"
                disabled={enviando || !idosoId}
                onPress={() => {
                  setSelecionada({
                    id: oferta.id,
                    nome: oferta.servico.nome,
                    cuidador:
                      cuidador.usuario.nomeSocial || cuidador.usuario.nome,
                    preco: oferta.preco,
                    duracaoMinutos: oferta.duracaoMinutos,
                  });
                }}
              />
            </View>
          ))}
        </View>
      ))}
      <Button
        title="Atualizar busca"
        variant="outline"
        disabled={carregando || enviando}
        onPress={atualizar}
      />
      <Button
        title="Ver minhas contratações"
        variant="outline"
        onPress={() => navigation.navigate('Historico')}
      />
    </AppScreenLayout>
  );
}
