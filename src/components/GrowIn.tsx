import React, { useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  useReducedMotion,
} from 'react-native-reanimated';
import { Springs } from '../constants/motion';

interface GrowInProps {
  /** `y` grows upward from the bottom edge; `x` grows rightward from the left edge. */
  axis: 'x' | 'y';
  delay?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/** Scales a bar in from zero along one axis on mount. */
export default function GrowIn({ axis, delay = 0, style, children }: GrowInProps) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) return;
    scale.value = withDelay(delay, withSpring(1, Springs.gentle));
  }, [reducedMotion, delay, scale]);

  const animatedStyle = useAnimatedStyle(() =>
    axis === 'y' ? { transform: [{ scaleY: scale.value }] } : { transform: [{ scaleX: scale.value }] },
  );

  return (
    <Animated.View
      style={[style, { transformOrigin: axis === 'y' ? 'bottom' : 'left' }, animatedStyle]}
    >
      {children}
    </Animated.View>
  );
}
