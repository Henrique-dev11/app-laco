import { useEffect, useState } from 'react';
import { Animated, Easing, Platform } from 'react-native';
import { useMotion } from './MotionProvider';
import { motionDurations } from './policy';

export const nativeDriver = Platform.OS !== 'web';
export const easeOut = Easing.out(Easing.cubic);

/** Usado somente em opacity/transform; propriedades de layout têm tratamento separado. */
export function useMotionValue(
  target: number,
  duration: number = motionDurations.reveal,
) {
  const [value] = useState(() => new Animated.Value(target));
  const { reducedMotion, active } = useMotion();
  useEffect(() => {
    value.stopAnimation();
    if (reducedMotion || !active) {
      value.setValue(target);
      return;
    }
    const animation = Animated.timing(value, {
      toValue: target,
      duration,
      easing: easeOut,
      useNativeDriver: nativeDriver,
      isInteraction: false,
    });
    animation.start();
    return () => animation.stop();
  }, [value, target, duration, reducedMotion, active]);
  return value;
}
