import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Notice } from '../components/Notice';
import { AppScreenLayout } from '../layouts/AppScreenLayout';
import { statusLabels, useAppStyles } from '../theme/appStyles';
import { useListaApi } from '../hooks/useListaApi';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import type { ScreenProps } from '../types/navigation';

type Agendamento = {
  id: number;
  inicio: string;
  fim: string;
  ativo: boolean;
  contratacao: {
    id: number;
    nomeServico: string;
    status: string;
    duracaoMinutos: number;
    valorAcordado: string;
    observacoes: string | null;
    idoso: { id: number; nome: string; nomeSocial: string | null };
    cuidadorServico: { cuidador: { usuario: { nome: string } } };
  };
};
type Disponibilidade = {
  id: number;
  diaSemana: string;
  horaInicio: string;
  horaFim: string;
  ativo: boolean;
};
export function AgendaScreen({ navigation }: ScreenProps<'Agenda'>) {
  const styles = useAppStyles(),
    colors = useTheme();
  const { usuario } = useAuth();
  const [idosoId, setIdosoId] = useState<number | null>(null);
  const agenda = useListaApi<Agendamento>(
    `/agendamentos${idosoId ? `?idosoId=${idosoId}` : ''}`,
  );
  const atualizarAgenda = agenda.atualizar;
  useFocusEffect(
    useCallback(() => {
      const timer = setInterval(atualizarAgenda, 10000);
      return () => clearInterval(timer);
    }, [atualizarAgenda]),
  );
  const semanal = useListaApi<Disponibilidade>(
    usuario?.cuidador
      ? `/cuidadores/${usuario.cuidador.id}/disponibilidades`
      : null,
  );
  const idosos = usuario?.responsavel?.responsavelIdosos ?? [];
  const formato = (v: string) =>
    new Date(v).toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  return (
    <AppScreenLayout
      title="Agenda"
      subtitle="Atendimentos e horários de trabalho"
      tab="Agenda"
    >
      <Notice>Datas e horários apresentados no fuso de São Paulo.</Notice>
      {!!usuario?.cuidador && (
        <>
          <Text style={styles.section}>
            Disponibilidade semanal · recorrente
          </Text>
          <Text style={styles.text}>
            Estes intervalos indicam quando você normalmente pode trabalhar. Os
            atendimentos confirmados aparecem abaixo.
          </Text>
          {semanal.carregando && <ActivityIndicator />}
          {!!semanal.erro && <Notice>{semanal.erro}</Notice>}
          {!semanal.carregando && !semanal.erro && !semanal.dados.length && (
            <Notice>Você ainda não cadastrou disponibilidade.</Notice>
          )}
          {semanal.dados.map((d) => (
            <View
              key={d.id}
              style={[
                styles.card,
                { backgroundColor: colors.chip, borderStyle: 'dashed' },
              ]}
            >
              <Text style={styles.name}>{statusLabels[d.diaSemana]}</Text>
              <Text style={styles.text}>
                {d.horaInicio} às {d.horaFim} ·{' '}
                {d.ativo ? 'Disponível toda semana' : 'Intervalo desativado'}
              </Text>
            </View>
          ))}
          <Button
            title="Editar minha disponibilidade"
            variant="outline"
            onPress={() => navigation.navigate('Disponibilidade')}
          />
        </>
      )}
      {!!usuario?.responsavel && (
        <>
          <Text style={styles.section}>Filtrar por idoso</Text>
          <Button
            title="Todos os idosos"
            variant={idosoId === null ? 'filled' : 'outline'}
            onPress={() => setIdosoId(null)}
          />
          {idosos.map(({ idoso }) => (
            <Button
              key={idoso.id}
              title={idoso.nomeSocial || idoso.nome}
              variant={idosoId === idoso.id ? 'filled' : 'outline'}
              onPress={() => setIdosoId(idoso.id)}
            />
          ))}
        </>
      )}
      <Text style={styles.section}>Atendimentos agendados</Text>
      {agenda.carregando && <ActivityIndicator color={colors.primary} />}
      {!!agenda.erro && <Notice>{agenda.erro}</Notice>}
      {!agenda.carregando && !agenda.erro && !agenda.dados.length && (
        <Notice>
          Nenhum atendimento agendado para esta seleção. Solicitações aceitas
          podem ser agendadas em Minhas contratações.
        </Notice>
      )}
      {agenda.dados.map((a) => (
        <View key={a.id} style={styles.card}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {a.ativo
                ? a.contratacao.status === 'ACEITA'
                  ? 'Confirmado'
                  : statusLabels[a.contratacao.status]
                : 'Cancelado'}
            </Text>
          </View>
          <Text style={styles.name}>{a.contratacao.nomeServico}</Text>
          <Text style={styles.text}>
            Idoso: {a.contratacao.idoso.nomeSocial || a.contratacao.idoso.nome}
          </Text>
          <Text style={styles.text}>
            Cuidador: {a.contratacao.cuidadorServico.cuidador.usuario.nome}
          </Text>
          <Text style={styles.text}>Início: {formato(a.inicio)}</Text>
          <Text style={styles.text}>Término: {formato(a.fim)}</Text>
          <Text style={styles.text}>
            Duração: {a.contratacao.duracaoMinutos} minutos
          </Text>
          <Text style={styles.text}>
            Valor acordado:{' '}
            {Number(a.contratacao.valorAcordado).toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            })}
          </Text>
          {!!a.contratacao.observacoes && (
            <Text style={styles.text}>
              Observações: {a.contratacao.observacoes}
            </Text>
          )}
        </View>
      ))}
      <Button
        title="Atualizar agenda"
        variant="outline"
        disabled={agenda.carregando || semanal.carregando}
        onPress={() => {
          agenda.atualizar();
          semanal.atualizar();
        }}
      />
      <Button
        title="Minhas contratações"
        variant="outline"
        onPress={() => navigation.navigate('Historico')}
      />
    </AppScreenLayout>
  );
}
