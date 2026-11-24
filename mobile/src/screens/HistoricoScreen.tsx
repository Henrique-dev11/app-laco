import { MotionView } from '../motion/MotionView';
import { staggerDelay } from '../motion/policy';
import { SkeletonList } from '../motion/SkeletonList';
import type { ScreenProps } from '../types/navigation';
import { useState } from 'react';
import { View } from 'react-native';
import { Text } from '../accessibility/Texto';
import { AvaliarCuidador } from '../components/AvaliarCuidador';
import { Button } from '../components/Button';
import { Estrelas } from '../components/Estrelas';
import { Notice } from '../components/Notice';
import { CodigoDestaque } from '../components/CodigoDestaque';
import { AppScreenLayout } from '../layouts/AppScreenLayout';
import { statusLabels, useAppStyles } from '../theme/appStyles';
import { useListaApi } from '../hooks/useListaApi';
import { useAuth } from '../contexts/AuthContext';
import { api, mensagemErro } from '../services/api';
import { FormField } from '../components/FormField';

type Contratacao = {
  id: number;
  status: string;
  valorAcordado: string;
  precoReferencia: string;
  duracaoMinutos: number;
  nomeServico: string;
  visitaId?: number | null;
  financeiroSimulado?: boolean;
  avaliacaoResponsavel?: {
    id: number;
    nota: number;
    comentario: string | null;
  } | null;
  itemProposta: { propostaId: number; proposta: { versao: number } } | null;
  observacoes: string | null;
  /** Avaliação do cuidador feita nesta contratação (`null` = ainda não avaliada). */
  avaliacao?: { id: number; nota: number; comentario: string | null } | null;
  agendamento: null | { inicio: string };
  idoso: { nome: string };
  responsavel: { usuario: { nome: string; id: number } };
  cuidadorServico: {
    cuidador: {
      usuario: { nome: string; id: number };
      disponibilidades: {
        diaSemana: string;
        horaInicio: string;
        horaFim: string;
      }[];
    };
    servico: { nome: string };
  };
};
export function HistoricoScreen({ navigation }: ScreenProps<'Historico'>) {
  const appStyles = useAppStyles();
  const { usuario } = useAuth();
  const { dados, carregando, erro, atualizar } =
    useListaApi<Contratacao>('/contratacoes');
  const [enviando, setEnviando] = useState(false);
  const [acaoPendente, setAcaoPendente] = useState('');
  const [mensagem, setMensagem] = useState('');
  // Contratação concluída cujo cuidador está sendo avaliado (modal aberto).
  const [avaliando, setAvaliando] = useState<{
    id: number;
    cuidador: string;
  } | null>(null);
  // Código digitado pelo cuidador e código mostrado ao responsável, por contratação.
  const [codigos, setCodigos] = useState<Record<number, string>>({});
  const [codigosGerados, setCodigosGerados] = useState<Record<number, { codigo: string; expiraEm: string }>>({});
  async function gerarCodigo(id: number) {
    if (enviando) return;
    setEnviando(true);
    setAcaoPendente(`${id}:codigo`);
    setMensagem('');
    try {
      const { data } = await api.post<{ codigo: string; expiraEm: string }>(
        `/contratacoes/${id}/codigo-conclusao`,
      );
      setCodigosGerados((current) => ({ ...current, [id]: data }));
    } catch (error) {
      setMensagem(mensagemErro(error));
    } finally {
      setEnviando(false);
      setAcaoPendente('');
    }
  }
  async function concluir(id: number) {
    const codigo = (codigos[id] ?? '').trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(codigo)) {
      setMensagem('Informe o código de 6 letras ou números do responsável.');
      return;
    }
    await mudarStatus(id, 'CONCLUIDA', codigo);
  }
  async function mudarStatus(id: number, status: string, codigo?: string) {
    if (enviando) return;
    setEnviando(true);
    setAcaoPendente(`${id}:${status}`);
    setMensagem('');
    try {
      await api.patch(`/contratacoes/${id}/status`, {
        status,
        ...(codigo ? { codigo } : {}),
      });
      atualizar();
    } catch (error) {
      setMensagem(mensagemErro(error));
    } finally {
      setEnviando(false);
      setAcaoPendente('');
    }
  }
  return (
    <AppScreenLayout
      title="Histórico"
      subtitle="Acompanhe suas contratações"
      tab="Início"
      atualizacao={{ atualizar, carregando }}
    >
      {carregando && !dados.length && <SkeletonList />}
      {!!erro && <Notice>{erro}</Notice>}
      {!!mensagem && <Notice>{mensagem}</Notice>}
      <Button
        title={
          usuario?.cuidador ? 'Carteira virtual' : 'Histórico de pagamentos'
        }
        variant="outline"
        onPress={() =>
          usuario?.cuidador
            ? navigation.navigate('CarteiraVirtual')
            : navigation.navigate('HistoricoFinanceiro')
        }
      />
      {!carregando && !erro && !dados.length && (
        <Notice>Você ainda não tem contratações.</Notice>
      )}
      {dados
        .filter(
          (contrato) => !contrato.visitaId || contrato.visitaId === contrato.id,
        )
        .map((contrato) => {
          if (!contrato.visitaId) return contrato;
          const servicos = dados.filter(
            (item) => item.visitaId === contrato.visitaId,
          );
          return {
            ...contrato,
            nomeServico: servicos.map((item) => item.nomeServico).join(' + '),
            valorAcordado: String(
              servicos.reduce(
                (total, item) => total + Number(item.valorAcordado),
                0,
              ),
            ),
            duracaoMinutos: servicos.reduce(
              (total, item) => total + item.duracaoMinutos,
              0,
            ),
          };
        })
        .map((contrato, index) => (
          <MotionView
            delay={staggerDelay(index)}
            key={contrato.id}
            style={appStyles.card}
          >
            <MotionView trigger={contrato.status} preset="fade">
              <Text accessibilityLiveRegion="polite" style={appStyles.text}>
                {contrato.nomeServico} · {statusLabels[contrato.status]}
              </Text>
            </MotionView>
            {!!contrato.itemProposta && (
              <Text style={appStyles.text}>
                Proposta #{contrato.itemProposta.propostaId} · versão{' '}
                {contrato.itemProposta.proposta.versao}
              </Text>
            )}
            <Text style={appStyles.text}>Idoso: {contrato.idoso.nome}</Text>
            <Text style={appStyles.text}>
              Cuidador: {contrato.cuidadorServico.cuidador.usuario.nome}
            </Text>
            <Text style={appStyles.text}>
              Contratante: {contrato.responsavel.usuario.nome}
            </Text>
            <Button
              title={
                usuario?.cuidador
                  ? 'Ver perfil do responsável'
                  : 'Ver perfil do cuidador'
              }
              variant="outline"
              onPress={() =>
                navigation.navigate(
                  'PerfilConsulta',
                  usuario?.cuidador
                    ? {
                        tipo: 'responsavel',
                        usuarioId: contrato.responsavel.usuario.id,
                      }
                    : {
                        tipo: 'cuidador',
                        usuarioId: contrato.cuidadorServico.cuidador.usuario.id,
                      },
                )
              }
            />
            <Text style={appStyles.text}>
              {contrato.status === 'SOLICITADA'
                ? 'Valor solicitado'
                : 'Valor acordado'}
              : R$ {Number(contrato.valorAcordado).toFixed(2).replace('.', ',')}
            </Text>
            <Text style={appStyles.text}>
              Duração registrada: {contrato.duracaoMinutos} minutos
            </Text>
            {!contrato.visitaId && (
              <Text style={appStyles.text}>
                Preço-base na solicitação: R${' '}
                {Number(contrato.precoReferencia).toFixed(2).replace('.', ',')}
              </Text>
            )}
            {contrato.financeiroSimulado && (
              <Button
                title="Acompanhar visita e pagamento"
                onPress={() =>
                  navigation.navigate('VisitaFinanceira', {
                    contratacaoId: contrato.id,
                  })
                }
              />
            )}
            {!!contrato.observacoes && (
              <Text style={appStyles.text}>
                Observações: {contrato.observacoes}
              </Text>
            )}
            {!!contrato.agendamento && (
              <Text style={appStyles.text}>
                Agendado:{' '}
                {new Date(contrato.agendamento.inicio).toLocaleString('pt-BR', {
                  timeZone: 'America/Sao_Paulo',
                })}
              </Text>
            )}
            {contrato.status === 'CONCLUIDA' &&
              !!contrato.avaliacaoResponsavel && (
                <View style={appStyles.row}>
                  <Text style={appStyles.text}>
                    {usuario?.cuidador
                      ? 'Sua avaliação do responsável:'
                      : 'Avaliação recebida do cuidador:'}
                  </Text>
                  <Estrelas
                    nota={contrato.avaliacaoResponsavel.nota}
                    tamanho={18}
                  />
                  {!!contrato.avaliacaoResponsavel.comentario && (
                    <Text style={appStyles.text}>
                      {contrato.avaliacaoResponsavel.comentario}
                    </Text>
                  )}
                </View>
              )}
            {!!(usuario?.responsavel || usuario?.cuidador) &&
              contrato.status === 'ACEITA' &&
              !contrato.financeiroSimulado &&
              !contrato.itemProposta &&
              !contrato.agendamento && (
                <Button
                  title="Agendar atendimento"
                  disabled={enviando}
                  onPress={() =>
                    navigation.navigate('AgendarAtendimento', {
                      contratacaoId: contrato.id,
                    })
                  }
                />
              )}
            {usuario?.cuidador && contrato.status === 'SOLICITADA' && (
              <>
                <Button
                  title="Aceitar"
                  loading={acaoPendente === `${contrato.id}:ACEITA`}
                  disabled={enviando}
                  onPress={() => {
                    void mudarStatus(contrato.id, 'ACEITA');
                  }}
                />
                <Button
                  title="Recusar"
                  loading={acaoPendente === `${contrato.id}:RECUSADA`}
                  variant="outline"
                  disabled={enviando}
                  onPress={() => {
                    void mudarStatus(contrato.id, 'RECUSADA');
                  }}
                />
              </>
            )}
            {!contrato.financeiroSimulado &&
              usuario?.cuidador &&
              contrato.status === 'ACEITA' && (
                <>
                  <FormField
                    label="Código de confirmação (peça ao contratante)"
                    value={codigos[contrato.id] ?? ''}
                    maxLength={6}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    onChangeText={(codigo) =>
                      setCodigos((current) => ({
                        ...current,
                        [contrato.id]: codigo.toUpperCase(),
                      }))
                    }
                  />
                  <Button
                    title="Concluir atendimento"
                    loading={acaoPendente === `${contrato.id}:CONCLUIDA`}
                    disabled={enviando}
                    onPress={() => {
                      void concluir(contrato.id);
                    }}
                  />
                </>
              )}
            {!contrato.financeiroSimulado &&
              !!usuario?.responsavel &&
              contrato.status === 'ACEITA' && (
                <>
                  {!!codigosGerados[contrato.id] && (
                    <CodigoDestaque {...codigosGerados[contrato.id]} />
                  )}
                  <Button
                    loading={acaoPendente === `${contrato.id}:codigo`}
                    title={
                      codigosGerados[contrato.id]
                        ? 'Gerar novo código'
                        : 'Mostrar código de conclusão'
                    }
                    variant="outline"
                    disabled={enviando}
                    onPress={() => {
                      void gerarCodigo(contrato.id);
                    }}
                  />
                </>
              )}
            {/* Avaliação: só depois de concluída; cada atendimento é avaliado uma vez. */}
            {contrato.status === 'CONCLUIDA' && !!contrato.avaliacao && (
              <View style={appStyles.row}>
                <Text style={appStyles.text}>
                  {usuario?.cuidador ? 'Avaliação recebida:' : 'Sua avaliação:'}
                </Text>
                <Estrelas nota={contrato.avaliacao.nota} tamanho={18} />
                {!!contrato.avaliacao.comentario && (
                  <Text style={appStyles.text}>
                    “{contrato.avaliacao.comentario}”
                  </Text>
                )}
              </View>
            )}
            {!!(usuario?.responsavel || usuario?.cuidador) &&
              contrato.status === 'CONCLUIDA' &&
              !(usuario?.cuidador
                ? contrato.avaliacaoResponsavel
                : contrato.avaliacao) && (
                <Button
                  title={usuario?.cuidador ? 'Avaliar responsável' : 'Avaliar cuidador'}
                  disabled={enviando}
                  onPress={() =>
                    setAvaliando({
                      id: contrato.id,
                      cuidador: usuario?.cuidador
                        ? contrato.responsavel.usuario.nome
                        : contrato.cuidadorServico.cuidador.usuario.nome,
                    })
                  }
                />
              )}
            {!contrato.financeiroSimulado &&
              ['SOLICITADA', 'ACEITA'].includes(contrato.status) && (
                <Button
                  title={
                    contrato.visitaId
                      ? 'Cancelar visita'
                      : 'Cancelar contratação'
                  }
                  loading={acaoPendente === `${contrato.id}:CANCELADA`}
                  variant="outline"
                  disabled={enviando}
                  onPress={() => {
                    void mudarStatus(contrato.id, 'CANCELADA');
                  }}
                />
              )}
          </MotionView>
        ))}
      <AvaliarCuidador
        contratacaoId={avaliando?.id ?? null}
        avaliadoNome={avaliando?.cuidador ?? ''}
        onClose={() => setAvaliando(null)}
        onEnviada={() => {
          setAvaliando(null);
          setMensagem('Avaliação enviada.');
          atualizar();
        }}
      />
    </AppScreenLayout>
  );
}
