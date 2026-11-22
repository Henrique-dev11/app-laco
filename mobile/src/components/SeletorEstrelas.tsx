import { StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '../accessibility/Texto';
import { MotionPressable as TouchableOpacity } from '../motion/MotionPressable';
import type { Paleta } from '../theme';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { fs } from '../theme/tipografia';
import { NOTA_MAXIMA, rotuloNota } from '../utils/avaliacoes';

type Props = {
  nota: number;
  onChange: (nota: number) => void;
  disabled?: boolean;
};

/**
 * Escolha da nota por estrelas (1 a 5). Cada estrela é um botão grande
 * (fácil de tocar por quem tem pouca precisão) e o texto abaixo confirma a nota.
 */
export function SeletorEstrelas({ nota, onChange, disabled }: Props) {
  const styles = useStyles(criarStyles);
  const colors = useTheme();
  return (
    <View style={styles.grupo}>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="Nota de 1 a 5 estrelas"
        style={styles.linha}
      >
        {Array.from({ length: NOTA_MAXIMA }, (_, i) => i + 1).map((n) => (
          <TouchableOpacity
            key={n}
            accessibilityRole="radio"
            accessibilityLabel={n === 1 ? '1 estrela' : `${n} estrelas`}
            accessibilityState={{ selected: nota === n, disabled }}
            disabled={disabled}
            onPress={() => onChange(n)}
            style={styles.estrela}
          >
            <Ionicons
              name={nota >= n ? 'star' : 'star-outline'}
              size={40}
              color={colors.caregiver}
            />
          </TouchableOpacity>
        ))}
      </View>
      <Text accessibilityLiveRegion="polite" style={styles.rotulo}>
        {nota ? `${nota} de ${NOTA_MAXIMA} · ${rotuloNota(nota)}` : 'Toque nas estrelas'}
      </Text>
    </View>
  );
}

const criarStyles = (colors: Paleta) =>
  StyleSheet.create({
    grupo: { alignItems: 'center', gap: 6 },
    linha: { flexDirection: 'row', gap: 4 },
    estrela: {
      width: 52,
      height: 52,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rotulo: { fontSize: fs(14), fontWeight: '600', color: colors.muted },
  });
