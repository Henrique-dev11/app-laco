import { MotionView } from '../motion/MotionView';
import { staggerDelay } from '../motion/policy';
import { SkeletonList } from '../motion/SkeletonList';
import { useState } from 'react';
import { View } from 'react-native';
import { Text } from '../accessibility/Texto';
import { ModalRolavel } from '../components/ModalRolavel';
import { MotionPressable } from '../motion/MotionPressable';
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
    visitaId?: number | null;
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
  const [visitaAberta, setVisitaAberta] = useState<number | null>(null);
  const [idosoId, setIdosoId] = useState<number | null>(null);
  const agenda = useListaApi<Agendamento>(
    `/agendamentos${idosoId ? `?idosoId=${idosoId}` : ''}`,
    10000,
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
  const visitas = new Map<number, Agendamento[]>();
  for (const agendamento of agenda.dados) {
    const chave =
      agendamento.contratacao.visitaId ?? agendamento.contratacao.id;
    const atual = visitas.get(chave);
    if (atual) atual.push(agendamento);
    else visitas.set(chave, [agendamento]);
  }
  return (
    <AppScreenLayout
      title="Agenda"
      subtitle="Atendimentos e horários de trabalho"
      tab="Agenda"
      atualizacao={{
        carregando: agenda.carregando || semanal.carregando,
        atualizar: () => {
          void agenda.atualizar();
          void semanal.atualizar();
        },
      }}
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
          {semanal.carregando && !semanal.dados.length && <SkeletonList />}
          {!!semanal.erro && <Notice>{semanal.erro}</Notice>}
          {!semanal.carregando && !semanal.erro && !semanal.dados.length && (
            <Notice>Você ainda não cadastrou disponibilidade.</Notice>
          )}
          {semanal.dados.map((d, index) => (
            <MotionView
              delay={staggerDelay(index)}
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
            </MotionView>
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
            selected={idosoId === null}
            title="Todos os idosos"
            variant={idosoId === null ? 'filled' : 'outline'}
            onPress={() => setIdosoId(null)}
          />
          {idosos.map(({ idoso }) => (
            <Button
              key={idoso.id}
              selected={idosoId === idoso.id}
              title={idoso.nomeSocial || idoso.nome}
              variant={idosoId === idoso.id ? 'filled' : 'outline'}
              onPress={() => setIdosoId(idoso.id)}
            />
          ))}
        </>
      )}
      <Text style={styles.section}>Atendimentos agendados</Text>
      {agenda.carregando && !agenda.dados.length && <SkeletonList />}
      {!!agenda.erro && <Notice>{agenda.erro}</Notice>}
      {!agenda.carregando && !agenda.erro && !agenda.dados.length && (
        <Notice>
          Nenhum atendimento agendado para esta seleção. Solicitações aceitas
          podem ser agendadas em Minhas contratações.
        </Notice>
      )}
      {Array.from(visitas.entries()).map(([chave, servicos], index) => {
        const a = servicos[0];
        return (
          <MotionPressable
            enter
            delay={staggerDelay(index)}
            key={chave}
            style={styles.card}
            accessibilityRole="button"
            onPress={() => setVisitaAberta(chave)}
          >
            <MotionView
              trigger={`${a.ativo}:${a.contratacao.status}`}
              preset="fade"
              style={styles.badge}
            >
              <Text style={styles.badgeText}>
                {a.ativo
                  ? a.contratacao.status === 'ACEITA'
                    ? 'Confirmado'
                    : statusLabels[a.contratacao.status]
                  : 'Cancelado'}
              </Text>
            </MotionView>
            <Text style={styles.name}>
              {servicos.map((s) => s.contratacao.nomeServico).join(' + ')}
            </Text>
            <Text style={styles.text}>
              Idoso:{' '}
              {a.contratacao.idoso.nomeSocial || a.contratacao.idoso.nome}
            </Text>
            <Text style={styles.text}>
              Cuidador: {a.contratacao.cuidadorServico.cuidador.usuario.nome}
            </Text>
            <Text style={styles.text}>Início: {formato(a.inicio)}</Text>
            <Text style={styles.text}>
              Término:{' '}
              {formato(
                servicos.reduce(
                  (fim, item) => (item.fim > fim ? item.fim : fim),
                  a.fim,
                ),
              )}
            </Text>
            <Text style={styles.text}>
              Duração:{' '}
              {servicos.reduce(
                (total, item) => total + item.contratacao.duracaoMinutos,
                0,
              )}{' '}
              minutos
            </Text>
            <Text style={styles.text}>
              Valor acordado:{' '}
              {servicos
                .reduce(
                  (total, item) =>
                    total + Number(item.contratacao.valorAcordado),
                  0,
                )
                .toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
            </Text>
            {!!a.contratacao.observacoes && (
              <Text style={styles.text}>
                Observações: {a.contratacao.observacoes}
              </Text>
            )}
          </MotionPressable>
        );
      })}
      {visitaAberta !== null && (
        <ModalRolavel fechar={() => setVisitaAberta(null)}>
          <Text accessibilityRole="header" style={styles.section}>
            Serviços agendados
          </Text>
          {!visitas.get(visitaAberta)?.length && (
            <Notice>Este agendamento está indisponível.</Notice>
          )}
          {visitas.get(visitaAberta)?.map((item) => (
            <View key={item.id} style={styles.card}>
              <Text style={styles.name}>{item.contratacao.nomeServico}</Text>
              <Text style={styles.text}>
                {item.ativo
                  ? (statusLabels[item.contratacao.status] ??
                    item.contratacao.status)
                  : 'Cancelado'}
              </Text>
              <Text style={styles.text}>
                {formato(item.inicio)} às {formato(item.fim)}
              </Text>
              <Text style={styles.text}>
                {item.contratacao.duracaoMinutos} minutos ·{' '}
                {Number(item.contratacao.valorAcordado).toLocaleString(
                  'pt-BR',
                  { style: 'currency', currency: 'BRL' },
                )}
              </Text>
            </View>
          ))}
          <Button title="Fechar" onPress={() => setVisitaAberta(null)} />
        </ModalRolavel>
      )}
      <Button
        title="Minhas contratações"
        variant="outline"
        onPress={() => navigation.navigate('Historico')}
      />
    </AppScreenLayout>
  );
}
