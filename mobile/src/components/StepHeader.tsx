import { MotionPressable as TouchableOpacity } from '../motion/MotionPressable';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useMotionValue } from '../motion/useMotionValue';
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
          <ProgressBar key={i} filled={i < step} color={color} />
        ))}
      </View>
      <Text style={styles.label}>
        Etapa {step} de {total}
      </Text>
    </View>
  );
}

function ProgressBar({ filled, color }: { filled: boolean; color: string }) {
  const opacity = useMotionValue(filled ? 1 : 0);
  return (
    <View style={styles.bar}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: color, borderRadius: 2, opacity },
        ]}
      />
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
  bar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  label: { fontSize: 12, color: colors.muted },
});
