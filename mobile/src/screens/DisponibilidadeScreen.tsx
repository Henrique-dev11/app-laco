import { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button } from '../components/Button';
import { FormField } from '../components/FormField';
import { Notice } from '../components/Notice';
import { AppScreenLayout } from '../layouts/AppScreenLayout';
import { useListaApi } from '../hooks/useListaApi';
import { useAuth } from '../contexts/AuthContext';
import { api, mensagemErro } from '../services/api';
import type { Paleta } from '../theme';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { statusLabels, useAppStyles } from '../theme/appStyles';

type Disponibilidade = {
  id: number;
  diaSemana: string;
  horaInicio: string;
  horaFim: string;
  ativo: boolean;
};
const dias = [
  'DOMINGO',
  'SEGUNDA',
  'TERCA',
  'QUARTA',
  'QUINTA',
  'SEXTA',
  'SABADO',
];
const abreviacoes = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
function formatarHora(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2
    ? `${digits.slice(0, 2)}:${digits.slice(2)}`
    : digits;
}
function FormularioDisponibilidade({ cuidadorId }: { cuidadorId: number }) {
  const appStyles = useAppStyles();
  const styles = useStyles(criarStyles);
  const colors = useTheme();
  const { dados, carregando, erro, atualizar } = useListaApi<Disponibilidade>(
    `/cuidadores/${cuidadorId}/disponibilidades`,
  );
  const [diaSemana, setDia] = useState('SEGUNDA');
  const [horaInicio, setInicio] = useState('08:00');
  const [horaFim, setFim] = useState('12:00');
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [editandoId, setEditandoId] = useState<number | null>(null);
  async function executar(acao: () => Promise<unknown>) {
    if (enviando) return;
    setEnviando(true);
    setMensagem('');
    try {
      await acao();
      atualizar();
      setMensagem(
        'Disponibilidade salva. Atendimentos já confirmados foram mantidos.',
      );
      setEditandoId(null);
    } catch (error) {
      setMensagem(mensagemErro(error));
    } finally {
      setEnviando(false);
    }
  }
  return (
    <>
      <View style={appStyles.card}>
        <Text style={appStyles.section}>Quando você pode cuidar?</Text>
        <Text style={appStyles.text}>
          Disponibilidade semanal recorrente. Você pode adicionar vários
          intervalos por dia; isso não confirma um atendimento.
        </Text>
        <View style={styles.days}>
          {dias.map((dia, index) => (
            <TouchableOpacity
              key={dia}
              accessibilityRole="radio"
              accessibilityLabel={statusLabels[dia]}
              accessibilityState={{
                selected: dia === diaSemana,
                disabled: enviando,
              }}
              disabled={enviando}
              onPress={() => setDia(dia)}
              style={[styles.day, dia === diaSemana && styles.selectedDay]}
            >
              <Text
                style={[
                  styles.dayText,
                  dia === diaSemana && styles.selectedText,
                ]}
              >
                {abreviacoes[index]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={appStyles.helper}>
          {statusLabels[diaSemana]} · horário de São Paulo
        </Text>
        <View style={styles.hours}>
          <View style={styles.half}>
            <FormField
              label="Hora inicial"
              placeholder="08:00"
              keyboardType="numeric"
              value={horaInicio}
              onChangeText={(value) => setInicio(formatarHora(value))}
              maxLength={5}
            />
          </View>
          <View style={styles.half}>
            <FormField
              label="Hora final"
              placeholder="12:00"
              keyboardType="numeric"
              value={horaFim}
              onChangeText={(value) => setFim(formatarHora(value))}
              maxLength={5}
            />
          </View>
        </View>
        <Button
          title={
            enviando
              ? 'Salvando...'
              : editandoId
                ? 'Salvar edição do horário'
                : 'Adicionar horário'
          }
          color={colors.caregiver}
          disabled={enviando}
          onPress={() => {
            if (
              !/^([01]\d|2[0-3]):[0-5]\d$/.test(horaInicio) ||
              !/^([01]\d|2[0-3]):[0-5]\d$/.test(horaFim) ||
              horaFim <= horaInicio
            ) {
              setMensagem(
                'Informe horários válidos e término posterior ao início.',
              );
              return;
            }
            void executar(() =>
              editandoId
                ? api.patch(`/disponibilidades/${editandoId}`, {
                    diaSemana,
                    horaInicio,
                    horaFim,
                  })
                : api.post(`/cuidadores/${cuidadorId}/disponibilidades`, {
                    diaSemana,
                    horaInicio,
                    horaFim,
                  }),
            );
          }}
        />
        {!!editandoId && (
          <Button
            title="Cancelar edição"
            variant="outline"
            disabled={enviando}
            onPress={() => setEditandoId(null)}
          />
        )}
      </View>
      {!!mensagem && <Notice>{mensagem}</Notice>}
      <Text style={appStyles.section}>Meus horários</Text>
      {carregando && <ActivityIndicator color={colors.caregiver} />}
      {!!erro && <Notice>{erro}</Notice>}
      {!carregando && !erro && !dados.length && (
        <Notice>
          Você ainda não definiu seus horários. Adicione sua primeira
          disponibilidade acima.
        </Notice>
      )}
      {dados.map((item) => (
        <View key={item.id} style={appStyles.card}>
          <View style={appStyles.row}>
            <Text style={appStyles.name}>{statusLabels[item.diaSemana]}</Text>
            <View style={appStyles.badge}>
              <Text style={appStyles.badgeText}>
                {item.ativo ? 'Disponível' : 'Inativo'}
              </Text>
            </View>
          </View>
          <Text style={appStyles.text}>
            {item.horaInicio} às {item.horaFim}
          </Text>
          <Button
            title="Editar intervalo"
            variant="outline"
            disabled={enviando}
            onPress={() => {
              setEditandoId(item.id);
              setDia(item.diaSemana);
              setInicio(item.horaInicio);
              setFim(item.horaFim);
              setMensagem('Edite o intervalo no formulário acima.');
            }}
          />
          <Button
            title={item.ativo ? 'Desativar horário' : 'Reativar horário'}
            variant="outline"
            color={colors.caregiver}
            disabled={enviando}
            onPress={() => {
              void executar(() =>
                api.patch(`/disponibilidades/${item.id}`, {
                  ativo: !item.ativo,
                }),
              );
            }}
          />
        </View>
      ))}
      <Button
        title="Atualizar horários"
        variant="outline"
        disabled={enviando || carregando}
        onPress={atualizar}
      />
    </>
  );
}
export function DisponibilidadeScreen() {
  const { usuario } = useAuth();
  return (
    <AppScreenLayout
      title="Disponibilidade"
      subtitle="Organize seus dias de atendimento"
      tab="Agenda"
    >
      {usuario?.cuidador ? (
        <FormularioDisponibilidade cuidadorId={usuario.cuidador.id} />
      ) : (
        <Notice>
          Os horários são definidos pelo cuidador. Consulte sua agenda para
          acompanhar os atendimentos.
        </Notice>
      )}
    </AppScreenLayout>
  );
}
const criarStyles = (colors: Paleta) =>
  StyleSheet.create({
    days: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginVertical: 4 },
    day: {
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 11,
      minHeight: 44,
    },
    selectedDay: {
      backgroundColor: colors.caregiver,
      borderColor: colors.caregiver,
    },
    dayText: { color: colors.primaryDark, fontWeight: '600', fontSize: 12 },
    selectedText: { color: colors.surface },
    hours: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
    half: { flex: 1, minWidth: 120 },
  });
