import { useEffect, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Pressable,
  type TouchableOpacityProps,
} from 'react-native';
import { useMotion } from './MotionProvider';
import { motionDurations } from './policy';
import { easeOut, nativeDriver } from './useMotionValue';

const Touchable = Animated.createAnimatedComponent(Pressable);
type Props = TouchableOpacityProps & { enter?: boolean; delay?: number };
/** Mantém o mesmo nó de toque, os callbacks, o tamanho e a semântica de acessibilidade. */
export function MotionPressable({
  style,
  disabled,
  enter = false,
  delay = 0,
  onPressIn,
  onPressOut,
  activeOpacity = 0.85,
  ...props
}: Props) {
  const { reducedMotion, active } = useMotion();
  const [scale] = useState(() => new Animated.Value(1));
  const [pressedOpacity] = useState(() => new Animated.Value(1));
  const [entryDelay] = useState(() => Math.min(100, Math.max(0, delay)));
  const [entry] = useState(
    () => new Animated.Value(enter && !reducedMotion ? 0 : 1),
  );
  const selected =
    props.accessibilityState?.selected ?? props.accessibilityState?.checked;
  useEffect(() => {
    if (reducedMotion || !active || disabled) {
      scale.stopAnimation();
      scale.setValue(1);
      pressedOpacity.stopAnimation();
      pressedOpacity.setValue(1);
    }
    return () => {
      scale.stopAnimation();
      pressedOpacity.stopAnimation();
    };
  }, [scale, pressedOpacity, reducedMotion, active, disabled]);
  useEffect(() => {
    if (!enter || reducedMotion || !active) {
      entry.setValue(1);
      return;
    }
    entry.setValue(0);
    const animation = Animated.timing(entry, {
      toValue: 1,
      duration: motionDurations.reveal,
      delay: entryDelay,
      useNativeDriver: nativeDriver,
      easing: easeOut,
      isInteraction: false,
    });
    animation.start();
    return () => animation.stop();
  }, [entry, enter, entryDelay, reducedMotion, active]);
  useEffect(() => {
    if (!selected || disabled || reducedMotion || !active) return;
    const animation = Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.98,
        duration: motionDurations.press,
        useNativeDriver: nativeDriver,
        isInteraction: false,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: motionDurations.release,
        useNativeDriver: nativeDriver,
        isInteraction: false,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [selected, scale, disabled, reducedMotion, active]);
  function press(toValue: number, opacity: number, duration: number) {
    if (reducedMotion || !active || disabled) return;
    scale.stopAnimation();
    pressedOpacity.stopAnimation();
    const options = {
      duration,
      easing: easeOut,
      useNativeDriver: nativeDriver,
      isInteraction: false,
    };
    Animated.parallel([
      Animated.timing(scale, { ...options, toValue }),
      Animated.timing(pressedOpacity, { ...options, toValue: opacity }),
    ]).start();
  }
  const flattened = StyleSheet.flatten(style);
  const transforms = flattened?.transform;
  return (
    <Touchable
      {...props}
      disabled={disabled}
      aria-busy={props['aria-busy'] ?? props.accessibilityState?.busy}
      aria-expanded={
        props['aria-expanded'] ?? props.accessibilityState?.expanded
      }
      aria-selected={
        props['aria-selected'] ?? props.accessibilityState?.selected
      }
      aria-checked={props['aria-checked'] ?? props.accessibilityState?.checked}
      aria-disabled={
        props['aria-disabled'] ?? disabled ?? props.accessibilityState?.disabled
      }
      onPressIn={(event) => {
        press(0.98, activeOpacity, motionDurations.press);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        press(1, 1, motionDurations.release);
        onPressOut?.(event);
      }}
      style={[
        style,
        {
          opacity: Animated.multiply(
            Animated.multiply(entry, pressedOpacity),
            flattened?.opacity ?? 1,
          ),
          transform: [
            ...(Array.isArray(transforms) ? transforms : []),
            { scale },
          ],
        },
      ]}
    />
  );
}
