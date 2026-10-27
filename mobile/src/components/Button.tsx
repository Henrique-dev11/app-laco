import { MotionPressable as TouchableOpacity } from '../motion/MotionPressable';
import {
  Image,
  ActivityIndicator,
  StyleSheet,
  Text,
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
  loading?: boolean;
  selected?: boolean;
};

export function Button({
  title,
  onPress,
  color,
  imageSource,
  variant = 'filled',
  disabled,
  loading = false,
  selected,
}: Props) {
  const styles = useStyles(criarStyles);
  const colors = useTheme();
  const cor = color ?? colors.primary;
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{
        disabled: !!disabled || loading,
        busy: loading,
        selected,
      }}
      activeOpacity={0.8}
      disabled={disabled || loading}
      onPress={onPress}
      style={[
        styles.button,
        {
          backgroundColor: variant === 'outline' ? colors.surface : cor,
          borderColor: cor,
        },
        (disabled || loading) && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' ? cor : colors.surface}
          size="small"
        />
      ) : (
        imageSource && <Image source={imageSource} style={styles.icon} />
      )}
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
