import { useEffect, useState } from 'react';
import { Animated, BackHandler, Easing, StyleSheet, View } from 'react-native';
import { Text } from '../accessibility/Texto';
import { useTheme } from '../theme/ThemeContext';
import { fs } from '../theme/tipografia';
import { useMotion } from './MotionProvider';
import { PRESENTATION_DURATION, usePresentation } from './PresentationProvider';
import { nativeDriver } from './useMotionValue';

export function PresentationOverlay({ waiting }: { waiting: boolean }) {
  const { presentation } = usePresentation();
  const { reducedMotion, active } = useMotion();
  const colors = useTheme();
  const [clock] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const elapsed = Math.min(
      PRESENTATION_DURATION,
      Date.now() - presentation.startedAt,
    );
    clock.stopAnimation();
    clock.setValue(elapsed);
    if (reducedMotion || !active) return;
    const animation = Animated.timing(clock, {
      toValue: PRESENTATION_DURATION,
      duration: PRESENTATION_DURATION - elapsed,
      easing: Easing.linear,
      useNativeDriver: nativeDriver,
      isInteraction: false,
    });
    animation.start();
    return () => animation.stop();
  }, [clock, presentation, reducedMotion, active]);
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => true,
    );
    return () => subscription.remove();
  }, []);
  const segment = (from: number, to: number, outputRange: number[]) =>
    clock.interpolate({
      inputRange: [from, to],
      outputRange,
      extrapolate: 'clamp',
      easing: Easing.bezier(0.22, 1, 0.36, 1),
    });
  return (
    <Animated.View
      testID="apresentacao-laco"
      style={[
        styles.overlay,
        {
          backgroundColor: colors.background,
          opacity: reducedMotion || waiting ? 1 : segment(2700, 3000, [1, 0]),
        },
      ]}
    >
      <Animated.View
        style={{
          transform: [
            { translateY: reducedMotion ? -24 : segment(600, 1200, [0, -24]) },
          ],
        }}
      >
        <Animated.Image
          accessible={false}
          source={require('../../assets/laco/logo-profile-selection.png')}
          tintColor={colors.text}
          style={[
            styles.logo,
            {
              opacity: reducedMotion ? 1 : segment(0, 600, [0, 1]),
              transform: [
                { scale: reducedMotion ? 1 : segment(0, 600, [0.96, 1]) },
              ],
            },
          ]}
        />
      </Animated.View>
      <Animated.View
        style={{ opacity: reducedMotion ? 1 : segment(600, 1200, [0, 1]) }}
      >
        <Text
          accessibilityRole="header"
          style={[styles.name, { color: colors.text }]}
        >
          Laço
        </Text>
      </Animated.View>
      <View style={styles.status} accessibilityLiveRegion="polite">
        <Text style={[styles.statusText, { color: colors.muted }]}>
          {waiting ? 'Verificando sessão...' : ' '}
        </Text>
      </View>
    </Animated.View>
  );
}
const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { width: 160, height: 160, resizeMode: 'contain' },
  name: { fontSize: fs(32), fontWeight: '700', textAlign: 'center' },
  status: { marginTop: 24, paddingHorizontal: 24 },
  statusText: { fontSize: fs(14), textAlign: 'center' },
});
