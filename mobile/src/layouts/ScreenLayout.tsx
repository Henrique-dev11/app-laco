import type { PropsWithChildren, ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { MotionView } from '../motion/MotionView';

type Props = PropsWithChildren<{
  header?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  backgroundColor?: string;
  topInset?: boolean;
}>;

export function ScreenLayout({
  children,
  header,
  contentStyle,
  backgroundColor = colors.surface,
  topInset = true,
}: Props) {
  return (
    <SafeAreaView
      edges={
        topInset
          ? ['top', 'bottom', 'left', 'right']
          : ['bottom', 'left', 'right']
      }
      style={[styles.safe, { backgroundColor }]}
    >
      {header}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <MotionView preset="fade" style={[styles.content, contentStyle]}>
            {children}
          </MotionView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 24 },
  content: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    flexGrow: 1,
    gap: 20,
  },
});
