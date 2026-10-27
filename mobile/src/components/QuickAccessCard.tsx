import { MotionPressable as TouchableOpacity } from '../motion/MotionPressable';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text } from 'react-native';
import type { ComponentProps } from 'react';
import type { Paleta } from '../theme';
import { useStyles, useTheme } from '../theme/ThemeContext';

type Props = {
  title: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
};

export function QuickAccessCard({ title, icon, onPress }: Props) {
  const styles = useStyles(criarStyles);
  const colors = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={styles.card}
      activeOpacity={0.8}
    >
      <Ionicons name={icon} size={24} color={colors.primaryDark} />
      <Text style={styles.title}>{title}</Text>
    </TouchableOpacity>
  );
}

const criarStyles = (colors: Paleta) =>
  StyleSheet.create({
    card: {
      flexGrow: 1,
      flexBasis: 140,
      minHeight: 110,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      backgroundColor: colors.surface,
      padding: 20,
      justifyContent: 'space-between',
      gap: 16,
    },
    title: { color: colors.text, fontSize: 14, fontWeight: '700' },
  });
