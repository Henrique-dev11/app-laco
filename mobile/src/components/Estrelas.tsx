import { View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../theme/ThemeContext';

/** Estrelas só de exibição (cheia, meia ou vazia) para uma nota de 0 a 5. */
export function Estrelas({
  nota,
  tamanho = 14,
}: {
  nota: number;
  tamanho?: number;
}) {
  const colors = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`Nota ${nota.toFixed(1).replace('.', ',')} de 5`}
      style={{ flexDirection: 'row', gap: 1 }}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons
          key={n}
          name={
            nota >= n - 0.25
              ? 'star'
              : nota >= n - 0.75
                ? 'star-half'
                : 'star-outline'
          }
          size={tamanho}
          color={colors.caregiver}
        />
      ))}
    </View>
  );
}
