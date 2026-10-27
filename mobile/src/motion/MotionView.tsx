import { useEffect, useState } from 'react';
import { Animated, type ViewProps } from 'react-native';
import { useMotion } from './MotionProvider';
import { motionDurations } from './policy';
import { easeOut, nativeDriver } from './useMotionValue';

type Props = ViewProps & {
  animate?: boolean;
  trigger?: string | number;
  delay?: number;
  duration?: number;
  preset?: 'fade' | 'rise' | 'pop';
};
export function MotionView({
  animate = true,
  trigger,
  delay = 0,
  duration = motionDurations.reveal,
  preset = 'rise',
  style,
  ...props
}: Props) {
  const { reducedMotion, active } = useMotion();
  const [entryDelay] = useState(() => Math.min(100, Math.max(0, delay)));
  const [progress] = useState(
    () => new Animated.Value(animate && !reducedMotion ? 0 : 1),
  );
  useEffect(() => {
    progress.stopAnimation();
    if (!animate || reducedMotion || !active) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration,
      delay: entryDelay,
      easing: easeOut,
      useNativeDriver: nativeDriver,
      isInteraction: false,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, animate, trigger, entryDelay, duration, reducedMotion, active]);
  return (
    <Animated.View
      {...props}
      style={[
        style,
        {
          opacity: progress,
          transform:
            preset === 'rise'
              ? [
                  {
                    translateY: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [6, 0],
                    }),
                  },
                ]
              : preset === 'pop'
                ? [
                    {
                      scale: progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.97, 1],
                      }),
                    },
                  ]
                : [],
        },
      ]}
    />
  );
}
