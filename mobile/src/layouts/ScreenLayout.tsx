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
import { useTheme } from '../theme/ThemeContext';
import { MotionView } from '../motion/MotionView';
import { ESPACO_BOTAO } from '../utils/acessibilidade';

type Props = PropsWithChildren<{
  header?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  backgroundColor?: string;
  topInset?: boolean;
  animateEntry?: boolean;
}>;

export function ScreenLayout({
  children,
  header,
  contentStyle,
  backgroundColor,
  topInset = true,
  animateEntry = true,
}: Props) {
  const colors = useTheme();
  return (
    <SafeAreaView
      edges={
        topInset
          ? ['top', 'bottom', 'left', 'right']
          : ['bottom', 'left', 'right']
      }
      style={[
        styles.safe,
        { backgroundColor: backgroundColor ?? colors.surface },
      ]}
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
          <MotionView
            animate={animateEntry}
            preset="fade"
            style={[styles.content, contentStyle]}
          >
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
  // O espaço extra no fim deixa o conteúdo rolar para fora de trás do botão de acessibilidade.
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24 + ESPACO_BOTAO,
  },
  content: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    flexGrow: 1,
    gap: 20,
  },
});
