import { useEffect, useState, type PropsWithChildren } from 'react';
import { Animated, View, type StyleProp, type ViewStyle } from 'react-native';
import { useMotion } from './MotionProvider';
import { motionDurations } from './policy';
import { easeOut } from './useMotionValue';

export function AnimatedCollapse({
  visible,
  children,
  style,
}: PropsWithChildren<{ visible: boolean; style?: StyleProp<ViewStyle> }>) {
  const { reducedMotion, active } = useMotion();
  const [mounted, setMounted] = useState(visible);
  const [measured, setMeasured] = useState(0);
  const [height] = useState(() => new Animated.Value(0));
  // Mantém os filhos até o fechamento terminar, sem render extra em um effect.
  if (visible && !mounted) setMounted(true);
  if (!visible && mounted && (reducedMotion || !active)) setMounted(false);
  useEffect(() => {
    if (reducedMotion || !active) {
      height.setValue(visible ? measured : 0);
      return;
    }
    const animation = Animated.timing(height, {
      toValue: visible ? measured : 0,
      duration: motionDurations.expand,
      useNativeDriver: false,
      easing: easeOut,
      isInteraction: false,
    });
    animation.start(({ finished }) => {
      if (finished && !visible) setMounted(false);
    });
    return () => animation.stop();
  }, [height, visible, measured, reducedMotion, active]);
  if (!visible && !mounted) return null;
  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
      style={[
        { alignSelf: 'stretch' },
        reducedMotion || !active
          ? undefined
          : {
              height,
              overflow: 'hidden',
              opacity: height.interpolate({
                inputRange: [0, Math.max(1, measured)],
                outputRange: [0, 1],
                extrapolate: 'clamp',
              }),
            },
      ]}
    >
      <View
        style={style}
        onLayout={(event) => setMeasured(event.nativeEvent.layout.height)}
      >
        {children}
      </View>
    </Animated.View>
  );
}
