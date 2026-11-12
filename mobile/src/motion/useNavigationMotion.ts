import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Platform } from 'react-native';
import { useMotion } from './MotionProvider';
import {
  navigationMotion,
  motionDurations,
  type NavigationSnapshot,
} from './policy';
import { easeOut } from './useMotionValue';

/** Native stack anima no celular. Na web, o mesmo fluxo ganha entrada e volta inversas. */
export function useNavigationMotion() {
  const { reducedMotion, active } = useMotion();
  const before = useRef<NavigationSnapshot | undefined>(undefined);
  const [opacity] = useState(() => new Animated.Value(1));
  const [x] = useState(() => new Animated.Value(0));
  const [y] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reducedMotion || !active) {
      opacity.stopAnimation();
      x.stopAnimation();
      y.stopAnimation();
      opacity.setValue(1);
      x.setValue(0);
      y.setValue(0);
    }
    return () => {
      opacity.stopAnimation();
      x.stopAnimation();
      y.stopAnimation();
    };
  }, [reducedMotion, active, opacity, x, y]);
  const navigate = useCallback(
    (after: NavigationSnapshot) => {
      const kind = navigationMotion(before.current, after);
      before.current = after;
      if (Platform.OS !== 'web' || reducedMotion || !active || kind === 'none')
        return;
      opacity.stopAnimation();
      x.stopAnimation();
      y.stopAnimation();
      opacity.setValue(kind === 'tab' ? 0.8 : 0.65);
      x.setValue(kind === 'forward' ? 20 : kind === 'back' ? -20 : 0);
      y.setValue(kind === 'form' ? 12 : 0);
      const options = {
        duration: motionDurations.navigation,
        useNativeDriver: false,
        easing: easeOut,
        isInteraction: false,
      };
      Animated.parallel([
        Animated.timing(opacity, { ...options, toValue: 1 }),
        Animated.timing(x, { ...options, toValue: 0 }),
        Animated.timing(y, { ...options, toValue: 0 }),
      ]).start();
    },
    [reducedMotion, active, opacity, x, y],
  );
  return {
    navigate,
    style: {
      flex: 1,
      opacity,
      transform: [{ translateX: x }, { translateY: y }],
    },
  };
}
