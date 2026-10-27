import { MotionView } from '../motion/MotionView';
import { MotionPressable as TouchableOpacity } from '../motion/MotionPressable';
import { Text, View } from 'react-native';
import { Button } from './Button';
import { useAppStyles } from '../theme/appStyles';
import { useTheme } from '../theme/ThemeContext';
import { dataSaoPaulo, diasCalendario, mudarMes } from '../utils/calendario';
export function CalendarioDisponivel({
  mes,
  onMes,
  datas,
  selecionada,
  onSelecionar,
  disabled = false,
}: {
  mes: string;
  onMes: (mes: string) => void;
  datas: string[];
  selecionada: string;
  onSelecionar: (dia: string) => void;
  disabled?: boolean;
}) {
  const styles = useAppStyles(),
    colors = useTheme();
  const atual = dataSaoPaulo().slice(0, 7);
  const limite = mudarMes(atual, 12);
  return (
    <View style={styles.card}>
      <Text style={styles.name}>
        {new Date(`${mes}-01T12:00:00Z`).toLocaleDateString('pt-BR', {
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        })}
      </Text>
      <View style={styles.row}>
        <Button
          title="Mês anterior"
          variant="outline"
          disabled={disabled || mes <= atual}
          onPress={() => onMes(mudarMes(mes, -1))}
        />
        <Button
          title="Próximo mês"
          variant="outline"
          disabled={disabled || mes >= limite}
          onPress={() => onMes(mudarMes(mes, 1))}
        />
      </View>
      <MotionView
        trigger={mes}
        preset="fade"
        style={{ flexDirection: 'row', flexWrap: 'wrap' }}
      >
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dia) => (
          <Text
            key={dia}
            style={[
              styles.helper,
              { width: '14.285%', textAlign: 'center', paddingVertical: 8 },
            ]}
          >
            {dia}
          </Text>
        ))}
        {diasCalendario(mes).map((dia, index) =>
          dia ? (
            <TouchableOpacity
              key={dia}
              accessibilityRole="button"
              accessibilityLabel={`Agendar em ${dia.split('-').reverse().join('/')}`}
              accessibilityState={{
                disabled: disabled || !datas.includes(dia),
                selected: dia === selecionada,
              }}
              disabled={disabled || !datas.includes(dia)}
              onPress={() => onSelecionar(dia)}
              style={{
                width: '14.285%',
                minHeight: 44,
                justifyContent: 'center',
                alignItems: 'center',
                borderRadius: 12,
                backgroundColor:
                  dia === selecionada
                    ? colors.primary
                    : datas.includes(dia)
                      ? colors.chip
                      : colors.surface,
                opacity: datas.includes(dia) ? 1 : 0.35,
              }}
            >
              <Text
                style={{
                  color: dia === selecionada ? colors.surface : colors.text,
                  fontWeight: datas.includes(dia) ? '700' : '400',
                }}
              >
                {Number(dia.slice(8))}
              </Text>
            </TouchableOpacity>
          ) : (
            <View key={`vazio-${index}`} style={{ width: '14.285%' }} />
          ),
        )}
      </MotionView>
      <Text style={styles.helper}>
        Dias destacados têm horários livres. Horário de São Paulo.
      </Text>
    </View>
  );
}
