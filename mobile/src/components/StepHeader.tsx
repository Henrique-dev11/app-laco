import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme';

type Props = { step: number; total: number; onBack: () => void; color: string };

export function StepHeader({ step, total, onBack, color }: Props) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        onPress={onBack}
        style={styles.back}
      >
        <Text style={[styles.arrow, { color }]}>←</Text>
      </TouchableOpacity>
      <View
        style={styles.progress}
        accessibilityLabel={`Etapa ${step} de ${total}`}
      >
        {Array.from({ length: total }, (_, i) => (
          <View
            key={i}
            style={[
              styles.bar,
              { backgroundColor: i < step ? color : colors.border },
            ]}
          />
        ))}
      </View>
      <Text style={styles.label}>
        Etapa {step} de {total}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  back: { width: 44, height: 44, justifyContent: 'center' },
  arrow: { fontSize: 26, fontWeight: '700' },
  progress: { flexDirection: 'row', flex: 1, gap: 6, marginRight: 16 },
  bar: { flex: 1, height: 4, borderRadius: 2 },
  label: { fontSize: 12, color: colors.muted },
});
