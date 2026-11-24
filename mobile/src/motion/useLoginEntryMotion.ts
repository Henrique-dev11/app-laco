import { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';
import { useMotion } from './MotionProvider';
import { nativeDriver } from './useMotionValue';

const delays = [0, 100, 180, 220, 260, 300];
const easing = Easing.bezier(0.22, 1, 0.36, 1);

/** Entrada local: não bloqueia ações nem altera o ritmo das demais telas. */
export function useLoginEntryMotion() {
  const { reducedMotion, active } = useMotion();
  const [values] = useState(() =>
    delays.map(() => new Animated.Value(reducedMotion || !active ? 1 : 0)),
  );
  const settled = useRef(reducedMotion || !active);

  useEffect(() => {
    if (settled.current || reducedMotion || !active) {
      settled.current = true;
      values.forEach((value) => {
        value.stopAnimation();
        value.setValue(1);
      });
      return;
    }
    const animation = Animated.parallel(
      values.map((value, index) =>
        Animated.timing(value, {
          toValue: 1,
          duration: 280,
          delay: delays[index],
          easing,
          useNativeDriver: nativeDriver,
          isInteraction: false,
        }),
      ),
    );
    animation.start(({ finished }) => {
      if (finished) settled.current = true;
    });
    return () => animation.stop();
  }, [values, reducedMotion, active]);

  function reveal(value: Animated.Value, distance: number) {
    return {
      opacity: value,
      transform: [
        {
          translateY: value.interpolate({
            inputRange: [0, 1],
            outputRange: [distance, 0],
          }),
        },
      ],
    };
  }
  const logo = reveal(values[0], 12);
  return {
    logo: {
      ...logo,
      transform: [
        ...logo.transform,
        {
          scale: values[0].interpolate({
            inputRange: [0, 1],
            outputRange: [0.96, 1],
          }),
        },
      ],
    },
    heading: reveal(values[1], 8),
    buttons: values.slice(2, 5).map((value) => reveal(value, 12)),
    footer: { opacity: values[5] },
  };
}
