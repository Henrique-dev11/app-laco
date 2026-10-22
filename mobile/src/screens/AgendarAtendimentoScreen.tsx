import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, Text, View } from 'react-native';
import { AppScreenLayout } from '../layouts/AppScreenLayout';
import { CalendarioDisponivel } from '../components/CalendarioDisponivel';
import { Notice } from '../components/Notice';
import { Button } from '../components/Button';
import { api, mensagemErro } from '../services/api';
import { dataSaoPaulo } from '../utils/calendario';
import { useAppStyles } from '../theme/appStyles';
import type { ScreenProps } from '../types/navigation';

type Horario = {
  inicio: string;
  fim: string;
  horaInicio: string;
  horaFim: string;
};
type Opcoes = {
  duracaoMinutos: number;
  datas: { data: string; horarios: Horario[] }[];
};
export function AgendarAtendimentoScreen({
  route,
  navigation,
}: ScreenProps<'AgendarAtendimento'>) {
  const styles = useAppStyles();
  const [mes, setMes] = useState(dataSaoPaulo().slice(0, 7));
  const [dia, setDia] = useState('');
  const [horario, setHorario] = useState<Horario | null>(null);
  const [opcoes, setOpcoes] = useState<Opcoes | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState('');
  const [tentativa, setTentativa] = useState(0);
  useFocusEffect(
    useCallback(() => {
      if (salvo) return;
      const controller = new AbortController();
      setCarregando(true);
      setOpcoes(null);
      setHorario(null);
      api
        .get<Opcoes>(`/contratacoes/${route.params.contratacaoId}/horarios`, {
          params: { mes },
          signal: controller.signal,
        })
        .then(({ data }) => {
          if (!controller.signal.aborted) {
            setOpcoes(data);
            setDia((atual) =>
              data.datas.some((d) => d.data === atual) ? atual : '',
            );
          }
        })
        .catch((e) => {
          if (!controller.signal.aborted) setErro(mensagemErro(e));
        })
        .finally(() => {
          if (!controller.signal.aborted) setCarregando(false);
        });
      return () => controller.abort();
      // eslint-disable-next-line react-hooks/exhaustive-deps -- tentativa permite repetir a consulta após erro ou alteração.
    }, [mes, route.params.contratacaoId, tentativa, salvo]),
  );
  async function confirmar() {
    if (!horario || salvando) return;
    setSalvando(true);
    setErro('');
    try {
      await api.post(
        `/contratacoes/${route.params.contratacaoId}/agendamento`,
        { inicio: horario.inicio },
      );
      setSalvo(true);
    } catch (e) {
      setErro(mensagemErro(e));
      setTentativa((n) => n + 1);
    } finally {
      setSalvando(false);
    }
  }
  return (
    <AppScreenLayout
      title="Agendar atendimento"
      subtitle="Escolha um dia e um horário disponível"
      tab="Agenda"
    >
      {salvo ? (
        <>
          <Notice>
            Atendimento confirmado. Ele já está nas agendas do responsável e do
            cuidador.
          </Notice>
          <Button
            title="Ver minha agenda"
            onPress={() => navigation.replace('Agenda')}
          />
        </>
      ) : (
        <>
          {!!erro && <Notice>{erro}</Notice>}
          <CalendarioDisponivel
            mes={mes}
            onMes={(m) => {
              setMes(m);
              setDia('');
              setHorario(null);
              setErro('');
            }}
            datas={opcoes?.datas.map((d) => d.data) ?? []}
            selecionada={dia}
            onSelecionar={(d) => {
              setDia(d);
              setHorario(null);
            }}
            disabled={salvando}
          />
          {carregando && <ActivityIndicator />}
          {!carregando && opcoes && !opcoes.datas.length && (
            <Notice>
              Nenhum horário livre neste mês para a duração contratada. Consulte
              outro mês ou aguarde o cuidador atualizar a disponibilidade.
            </Notice>
          )}
          {!!opcoes && (
            <Text style={styles.text}>
              Duração do atendimento: {opcoes.duracaoMinutos} minutos.
            </Text>
          )}
          {!!dia && (
            <View style={styles.card}>
              <Text style={styles.section}>
                Horários em {dia.split('-').reverse().join('/')}
              </Text>
              {opcoes?.datas
                .find((d) => d.data === dia)
                ?.horarios.map((h) => (
                  <Button
                    key={h.inicio}
                    title={`${h.horaInicio} às ${h.horaFim}`}
                    variant={
                      horario?.inicio === h.inicio ? 'filled' : 'outline'
                    }
                    disabled={salvando || carregando}
                    onPress={() => setHorario(h)}
                  />
                ))}
            </View>
          )}
          {!!horario && (
            <Notice>{`Confirmar ${dia.split('-').reverse().join('/')} das ${horario.horaInicio} às ${horario.horaFim}, horário de São Paulo.`}</Notice>
          )}
          <Button
            title={salvando ? 'Confirmando...' : 'Confirmar agendamento'}
            disabled={!horario || salvando || carregando}
            onPress={() => {
              void confirmar();
            }}
          />
          <Button
            title="Atualizar horários livres"
            variant="outline"
            disabled={salvando || carregando}
            onPress={() => {
              setErro('');
              setTentativa((n) => n + 1);
            }}
          />
        </>
      )}
    </AppScreenLayout>
  );
}
