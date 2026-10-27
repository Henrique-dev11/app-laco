import { useEffect, useState } from 'react';
import { Animated, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useMotion } from './MotionProvider';
import { nativeDriver } from './useMotionValue';
import { useTheme } from '../theme/ThemeContext';

export function SkeletonList({ count = 3 }: { count?: number }) {
  const { reducedMotion, active } = useMotion();
  const focused = useIsFocused();
  const colors = useTheme();
  const [opacity] = useState(() => new Animated.Value(0.7));
  useEffect(() => {
    if (reducedMotion || !active || !focused) {
      opacity.setValue(0.7);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 700,
          useNativeDriver: nativeDriver,
          isInteraction: false,
        }),
        Animated.timing(opacity, {
          toValue: 0.85,
          duration: 700,
          useNativeDriver: nativeDriver,
          isInteraction: false,
        }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      opacity.stopAnimation();
    };
  }, [opacity, reducedMotion, active, focused]);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Carregando informações"
      accessibilityState={{ busy: true }}
      aria-busy
      style={{ gap: 12 }}
    >
      {Array.from({ length: Math.min(5, Math.max(1, count)) }, (_, index) => (
        <View
          key={index}
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 16,
            padding: 20,
            gap: 12,
            backgroundColor: colors.surface,
          }}
        >
          <Animated.View
            importantForAccessibility="no-hide-descendants"
            style={{ gap: 12, opacity }}
          >
            <View
              style={{
                height: 16,
                width: '58%',
                borderRadius: 6,
                backgroundColor: colors.border,
              }}
            />
            <View
              style={{
                height: 12,
                width: '90%',
                borderRadius: 6,
                backgroundColor: colors.border,
              }}
            />
            <View
              style={{
                height: 12,
                width: '72%',
                borderRadius: 6,
                backgroundColor: colors.border,
              }}
            />
          </Animated.View>
        </View>
      ))}
    </View>
  );
}
