import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  type ImageSourcePropType,
} from 'react-native';
import type { Paleta } from '../theme';
import { useStyles, useTheme } from '../theme/ThemeContext';

type Props = {
  title: string;
  onPress: () => void;
  color?: string;
  imageSource?: ImageSourcePropType;
  variant?: 'filled' | 'outline';
  disabled?: boolean;
};

export function Button({
  title,
  onPress,
  color,
  imageSource,
  variant = 'filled',
  disabled,
}: Props) {
  const styles = useStyles(criarStyles);
  const colors = useTheme();
  const cor = color ?? colors.primary;
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      activeOpacity={0.8}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        {
          backgroundColor: variant === 'outline' ? colors.surface : cor,
          borderColor: cor,
        },
        disabled && styles.disabled,
      ]}
    >
      {imageSource && <Image source={imageSource} style={styles.icon} />}
      <Text
        style={[
          styles.text,
          { color: variant === 'outline' ? cor : colors.surface },
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const criarStyles = (colors: Paleta) =>
  StyleSheet.create({
    button: {
      minHeight: 48,
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderRadius: 28,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    text: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
    icon: { width: 24, height: 24, resizeMode: 'contain' },
    disabled: { opacity: 0.5 },
  });
