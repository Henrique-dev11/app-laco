import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button } from './Button';
import { FormField } from './FormField';
import { Notice } from './Notice';
import { useAppStyles, statusLabels } from '../theme/appStyles';
import { useAuth } from '../contexts/AuthContext';
import { api, mensagemErro } from '../services/api';
import {
  dataProposta,
  statusProposta,
  urlPropostas,
  valorProposta,
  type Proposta,
} from '../services/propostas';
type Props = {
  proposta: Proposta;
  contatoId: number;
  podeRevisar: boolean;
  atualizar: () => Promise<void>;
  novaVersao: () => void;
  verAgenda: () => void;
};
export function PropostaCard({
  proposta: p,
  contatoId,
  podeRevisar,
  atualizar,
  novaVersao,
  verAgenda,
}: Props) {
  const styles = useAppStyles();
  const { usuario } = useAuth();
  const [resposta, setResposta] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  async function responder(status: string) {
    if (salvando) return;
    setSalvando(true);
    setErro('');
    try {
      await api.post(`${urlPropostas(contatoId)}/${p.id}/resposta`, {
        status,
        ...(resposta.trim() ? { resposta: resposta.trim() } : {}),
      });
      setResposta('');
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      await atualizar();
      setSalvando(false);
    }
  }
  return (
    <View style={[styles.card, { width: '100%' }]}>
      <Text style={styles.name}>PROPOSTA DE ATENDIMENTO · v{p.versao}</Text>
      <Text style={styles.text}>Idoso: {p.idoso.nome}</Text>
      <Text style={styles.text}>Cuidador: {p.cuidador.usuario.nome}</Text>
      {p.itens.map((i) => (
        <View key={i.id} style={{ gap: 6 }}>
          <Text style={styles.section}>{i.nomeServico}</Text>
          <Text style={styles.text}>
            {valorProposta(i.preco)} por atendimento · {i.duracaoMinutos}{' '}
            minutos · {i.inicios.length} atendimento(s)
          </Text>
          {i.inicios.map((d) => (
            <Text style={styles.text} key={d}>
              {dataProposta(d)} até{' '}
              {dataProposta(
                new Date(
                  new Date(d).getTime() + i.duracaoMinutos * 60000,
                ).toISOString(),
              )}
            </Text>
          ))}
          {!!i.contratacaoOrigemId && (
            <Text style={styles.helper}>
              Atualiza a contratação #{i.contratacaoOrigemId} no primeiro
              atendimento.
            </Text>
          )}
          {i.contratacoes.map((c) => (
            <Text key={c.id} style={styles.text}>
              Contratação #{c.id}:{' '}
              {c.agendamento?.ativo ? statusLabels[c.status] : 'Cancelada'}
            </Text>
          ))}
        </View>
      ))}
      {!!p.observacoes && (
        <Text style={styles.text}>Observações: {p.observacoes}</Text>
      )}
      <Text style={styles.section}>Total: {valorProposta(p.total)}</Text>
      <Text style={styles.section}>{statusProposta[p.status]}</Text>
      {!!p.resposta && <Text style={styles.text}>Resposta: {p.resposta}</Text>}
      {!!erro && <Notice>{erro}</Notice>}
      {!!usuario?.responsavel && p.status === 'PENDENTE' && (
        <>
          <Notice>
            Ao aceitar, todos os atendimentos acima serão confirmados nas
            agendas. Horário de São Paulo.
          </Notice>
          <FormField
            label="Alterações desejadas ou motivo da resposta"
            value={resposta}
            onChangeText={setResposta}
            maxLength={2000}
            multiline
            editable={!salvando}
          />
          <Button
            title={salvando ? 'Processando...' : 'Aceitar proposta'}
            disabled={salvando}
            onPress={() => {
              void responder('ACEITA');
            }}
          />
          <Button
            title="Solicitar alterações"
            variant="outline"
            disabled={salvando || !resposta.trim()}
            onPress={() => {
              void responder('ALTERACOES_SOLICITADAS');
            }}
          />
          <Button
            title="Recusar proposta"
            variant="outline"
            disabled={salvando}
            onPress={() => {
              void responder('RECUSADA');
            }}
          />
        </>
      )}
      {!!usuario?.cuidador && podeRevisar && (
        <Button
          title="Criar nova versão"
          variant="outline"
          onPress={novaVersao}
        />
      )}
      {p.status === 'ACEITA' && (
        <Button title="Ver atendimentos na agenda" onPress={verAgenda} />
      )}
    </View>
  );
}
