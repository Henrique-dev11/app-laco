import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  type ImageSourcePropType,
} from 'react-native';
import { colors } from '../theme';

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
  color = colors.primary,
  imageSource,
  variant = 'filled',
  disabled,
}: Props) {
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
          backgroundColor: variant === 'outline' ? colors.surface : color,
          borderColor: color,
        },
        disabled && styles.disabled,
      ]}
    >
      {imageSource && <Image source={imageSource} style={styles.icon} />}
      <Text
        style={[
          styles.text,
          { color: variant === 'outline' ? color : colors.surface },
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
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
