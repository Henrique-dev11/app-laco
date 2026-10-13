import { StyleSheet, Text } from 'react-native';
import { colors } from '../theme';

export function Notice({ children }: { children: string }) {
  return (
    <Text accessibilityLiveRegion="polite" style={styles.notice}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  notice: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    color: colors.primaryDark,
    fontSize: 14,
    lineHeight: 21,
  },
});
