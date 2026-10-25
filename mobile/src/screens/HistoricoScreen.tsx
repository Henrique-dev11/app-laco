import type { ScreenProps } from '../types/navigation';
import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Notice } from '../components/Notice';
import { CodigoDestaque } from '../components/CodigoDestaque';
import { AppScreenLayout } from '../layouts/AppScreenLayout';
import { statusLabels, useAppStyles } from '../theme/appStyles';
import { useListaApi } from '../hooks/useListaApi';
import { useAuth } from '../contexts/AuthContext';
import { api, mensagemErro } from '../services/api';
import { useTheme } from '../theme/ThemeContext';
import { FormField } from '../components/FormField';

type Contratacao = {
  id: number;
  status: string;
  valorAcordado: string;
  precoReferencia: string;
  duracaoMinutos: number;
  nomeServico: string;
  itemProposta: { propostaId: number; proposta: { versao: number } } | null;
  observacoes: string | null;
  agendamento: null | { inicio: string };
  idoso: { nome: string };
  responsavel: { usuario: { nome: string } };
  cuidadorServico: {
    cuidador: {
      usuario: { nome: string };
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
  const colors = useTheme();
  const { usuario } = useAuth();
  const { dados, carregando, erro, atualizar } =
    useListaApi<Contratacao>('/contratacoes');
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState('');
  // Código digitado pelo cuidador e código mostrado ao responsável, por contratação.
  const [codigos, setCodigos] = useState<Record<number, string>>({});
  const [codigosGerados, setCodigosGerados] = useState<Record<number, string>>(
    {},
  );
  async function gerarCodigo(id: number) {
    setEnviando(true);
    setMensagem('');
    try {
      const { data } = await api.post<{ codigo: string }>(
        `/contratacoes/${id}/codigo-conclusao`,
      );
      setCodigosGerados((current) => ({ ...current, [id]: data.codigo }));
    } catch (error) {
      setMensagem(mensagemErro(error));
    } finally {
      setEnviando(false);
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
    setEnviando(true);
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
    }
  }
  return (
    <AppScreenLayout
      title="Histórico"
      subtitle="Acompanhe suas contratações"
      tab="Início"
    >
      {carregando && <ActivityIndicator color={colors.primary} />}
      {!!erro && <Notice>{erro}</Notice>}
      {!!mensagem && <Notice>{mensagem}</Notice>}
      {!carregando && !erro && !dados.length && (
        <Notice>Você ainda não tem contratações.</Notice>
      )}
      {dados.map((contrato) => (
        <View key={contrato.id} style={appStyles.card}>
          <Text style={appStyles.text}>
            {contrato.nomeServico} · {statusLabels[contrato.status]}
          </Text>
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
          <Text style={appStyles.text}>
            {contrato.status === 'SOLICITADA'
              ? 'Valor solicitado'
              : 'Valor acordado'}
            : R$ {Number(contrato.valorAcordado).toFixed(2).replace('.', ',')}
          </Text>
          <Text style={appStyles.text}>
            Duração registrada: {contrato.duracaoMinutos} minutos
          </Text>
          <Text style={appStyles.text}>
            Preço-base na solicitação: R${' '}
            {Number(contrato.precoReferencia).toFixed(2).replace('.', ',')}
          </Text>
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
          {!!usuario?.responsavel &&
            contrato.status === 'ACEITA' &&
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
                disabled={enviando}
                onPress={() => {
                  void mudarStatus(contrato.id, 'ACEITA');
                }}
              />
              <Button
                title="Recusar"
                variant="outline"
                disabled={enviando}
                onPress={() => {
                  void mudarStatus(contrato.id, 'RECUSADA');
                }}
              />
            </>
          )}
          {usuario?.cuidador && contrato.status === 'ACEITA' && (
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
                disabled={enviando}
                onPress={() => {
                  void concluir(contrato.id);
                }}
              />
            </>
          )}
          {!!usuario?.responsavel && contrato.status === 'ACEITA' && (
            <>
              {!!codigosGerados[contrato.id] && (
                <CodigoDestaque codigo={codigosGerados[contrato.id]} />
              )}
              <Button
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
          {['SOLICITADA', 'ACEITA'].includes(contrato.status) && (
            <Button
              title="Cancelar contratação"
              variant="outline"
              disabled={enviando}
              onPress={() => {
                void mudarStatus(contrato.id, 'CANCELADA');
              }}
            />
          )}
        </View>
      ))}
      <Button
        title="Atualizar contratações"
        variant="outline"
        disabled={carregando || enviando}
        onPress={atualizar}
      />
    </AppScreenLayout>
  );
}
