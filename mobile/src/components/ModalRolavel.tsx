import type { PropsWithChildren } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { CamadaLeitura } from '../accessibility/Texto';
import { useTheme } from '../theme/ThemeContext';
import { useMotion } from '../motion/MotionProvider';

export function ModalRolavel({
  children,
  fechar,
}: PropsWithChildren<{ fechar: () => void }>) {
  const colors = useTheme();
  const { reducedMotion } = useMotion();
  return (
    <Modal
      transparent
      animationType={reducedMotion ? 'none' : 'slide'}
      onRequestClose={fechar}
    >
      <CamadaLeitura>
        <View style={styles.fundo}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={fechar}
            accessible={false}
          />
          <View
            style={[styles.folha, { backgroundColor: colors.surface }]}
            accessibilityViewIsModal
          >
            <ScrollView
              contentContainerStyle={styles.conteudo}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>
          </View>
        </View>
      </CamadaLeitura>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fundo: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  folha: {
    height: '88%',
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  conteudo: { padding: 20, paddingBottom: 36, gap: 12 },
});
