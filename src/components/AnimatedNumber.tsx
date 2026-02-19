import React, { useEffect } from 'react';
import { TextInput, StyleProp, TextStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  useReducedMotion,
  Easing,
} from 'react-native-reanimated';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

interface AnimatedNumberProps {
  value: number;
  prefix?: string;
  style?: StyleProp<TextStyle>;
  duration?: number;
  decimals?: number;
}

export default function AnimatedNumber({
  value,
  prefix = '',
  style,
  duration = 600,
  decimals = 2,
}: AnimatedNumberProps) {
  const reducedMotion = useReducedMotion();
  const animatedValue = useSharedValue(value);

  useEffect(() => {
    if (reducedMotion) {
      animatedValue.value = value;
    } else {
      animatedValue.value = withTiming(value, {
        duration,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [value, duration, reducedMotion]);

  const animatedProps = useAnimatedProps(() => {
    const v = animatedValue.value;
    const abs = Math.abs(v);
    const sign = v < 0 ? '-' : '';
    const text = `${prefix}${sign}$${abs.toFixed(decimals)}`;
    return {
      text,
      defaultValue: text,
    } as any;
  });

  return (
    <AnimatedTextInput
      editable={false}
      animatedProps={animatedProps}
      style={[{ padding: 0, margin: 0 }, style]}
    />
  );
}
