import { useEffect, useState } from 'react';
import { Image } from 'react-native';
import { Text } from '../accessibility/Texto';
import { useAuth } from '../contexts/AuthContext';
import { api, mensagemErro } from '../services/api';
import { AppScreenLayout } from '../layouts/AppScreenLayout';
import { PropostaCard } from '../components/PropostaCard';
import { Notice } from '../components/Notice';
import { Button } from '../components/Button';
import { useListaApi } from '../hooks/useListaApi';
import { urlPropostas, type Proposta } from '../services/propostas';
import type { ScreenProps } from '../types/navigation';

export function DetalhePropostaScreen({
  navigation,
  route,
}: ScreenProps<'DetalheProposta'>) {
  const { usuarioId, propostaId } = route.params;
  const { dados, carregando, erro, atualizar } = useListaApi<Proposta>(
    urlPropostas(usuarioId),
  );
  const proposta = dados.find((item) => item.id === propostaId);
  const atual =
    proposta &&
    dados
      .filter((item) => item.negociacaoId === proposta.negociacaoId)
      .reduce(
        (ultima, item) => (item.versao > ultima.versao ? item : ultima),
        proposta,
      );
  return (
    <AppScreenLayout title="Visualizar proposta">
      {carregando && !proposta && <Notice>Carregando proposta...</Notice>}
      {!!erro && <Notice>{erro}</Notice>}
      {!carregando && !erro && !proposta && (
        <Notice>Proposta não encontrada.</Notice>
      )}
      {atual && atual.id !== proposta?.id && (
        <Button
          title="Abrir versão mais recente"
          variant="outline"
          onPress={() =>
            navigation.replace('DetalheProposta', {
              usuarioId,
              propostaId: atual.id,
            })
          }
        />
      )}
      {proposta?.status === 'ACEITA' && (
        <PixTeste
          key={proposta.id}
          url={`${urlPropostas(usuarioId)}/${proposta.id}/pix`}
        />
      )}
      {proposta && (
        <PropostaCard
          proposta={proposta}
          contatoId={usuarioId}
          atualizar={async () => atualizar()}
          podeRevisar={
            atual?.id === proposta.id &&
            ['PENDENTE', 'RECUSADA', 'ALTERACOES_SOLICITADAS'].includes(
              proposta.status,
            )
          }
          novaVersao={() =>
            navigation.navigate('CriarProposta', {
              usuarioId,
              anterior: proposta,
            })
          }
          verAgenda={() => navigation.navigate('Agenda')}
        />
      )}
    </AppScreenLayout>
  );
}

type Pix = {
  habilitado: boolean;
  total: string;
  status: string;
  codigo?: string;
  imagem?: string;
};
function PixTeste({ url }: { url: string }) {
  const { usuario } = useAuth();
  const [pix, setPix] = useState<Pix>();
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    api
      .get<Pix>(url, { signal: controller.signal })
      .then(({ data }) => setPix(data))
      .catch((e) => {
        if (!controller.signal.aborted) setErro(mensagemErro(e));
      });
    return () => controller.abort();
  }, [url]);
  async function atualizar(gerar: boolean) {
    setCarregando(true);
    setErro('');
    try {
      setPix((await (gerar ? api.post<Pix>(url) : api.get<Pix>(url))).data);
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setCarregando(false);
    }
  }
  if (!pix?.habilitado && !erro) return null;
  const gerar = pix?.status === 'SEM_COBRANCA' && !!usuario?.responsavel;
  const situacoes: Record<string, string> = {
    SEM_COBRANCA: 'Aguardando geração',
    PENDENTE: 'Pendente',
    CONFIRMADO: 'Confirmado',
    EXPIRADO: 'Expirado',
  };
  return (
    <>
      <Notice>
        {pix
          ? `Pix de teste · R$ ${pix.total.replace('.', ',')} · ${situacoes[pix.status]}`
          : 'Pix de teste'}
      </Notice>
      {!!pix?.imagem && (
        <Image
          accessibilityLabel="QR Code do Pix de teste"
          source={{ uri: 'data:image/png;base64,' + pix.imagem }}
          style={{ width: 180, height: 180, alignSelf: 'center' }}
        />
      )}
      {!!pix?.codigo && (
        <>
          <Text>Pix Copia e Cola</Text>
          <Text selectable>{pix.codigo}</Text>
        </>
      )}
      {!!erro && <Notice>{erro}</Notice>}
      <Button
        title={gerar ? 'Gerar Pix' : 'Atualizar pagamento'}
        loading={carregando}
        disabled={carregando}
        onPress={() => void atualizar(gerar)}
      />
    </>
  );
}
