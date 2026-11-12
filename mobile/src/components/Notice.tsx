import { fs, lh } from '../theme/tipografia';
import { StyleSheet, Text } from 'react-native';
import type { Paleta } from '../theme';
import { useStyles } from '../theme/ThemeContext';
import { MotionView } from '../motion/MotionView';
import { motionDurations } from '../motion/policy';

export function Notice({ children }: { children: string }) {
  const styles = useStyles(criarStyles);
  return (
    <MotionView
      trigger={children}
      preset="fade"
      duration={motionDurations.feedback}
    >
      <Text accessibilityLiveRegion="polite" style={styles.notice}>
        {children}
      </Text>
    </MotionView>
  );
}

const criarStyles = (colors: Paleta) =>
  StyleSheet.create({
    notice: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 16,
      color: colors.primaryDark,
      fontSize: fs(14),
      lineHeight: lh(21),
    },
  });
