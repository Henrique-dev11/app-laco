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
      {Array.from(
        new Set(
          proposta?.itens.flatMap((item) =>
            item.contratacoes
              .filter((contrato) => contrato.financeiroSimulado)
              .map((contrato) => contrato.visitaId ?? contrato.id),
          ) ?? [],
        ),
      ).map((id) => (
        <Button
          key={id}
          title={`Acompanhar visita #${id} e pagamento`}
          variant="outline"
          onPress={() =>
            navigation.navigate('VisitaFinanceira', { contratacaoId: id })
          }
        />
      ))}
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
