import React, { useEffect, useState, useCallback } from 'react';
import { Text, StyleProp, TextStyle, Platform } from 'react-native';
import {
  useSharedValue,
  withTiming,
  useAnimatedReaction,
  runOnJS,
  useReducedMotion,
  Easing,
} from 'react-native-reanimated';

interface AnimatedNumberProps {
  value: number;
  prefix?: string;
  style?: StyleProp<TextStyle>;
  duration?: number;
  decimals?: number;
}

function formatValue(v: number, decimals: number, prefix: string) {
  'worklet';
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  return `${prefix}${sign}$${abs.toFixed(decimals)}`;
}

export default function AnimatedNumber({
  value,
  prefix = '',
  style,
  duration = 600,
  decimals = 2,
}: AnimatedNumberProps) {
  const reducedMotion = useReducedMotion();
  const skipAnimation = reducedMotion || Platform.OS === 'web';
  const [display, setDisplay] = useState(() => formatValue(value, decimals, prefix));
  const animatedValue = useSharedValue(value);

  const updateDisplay = useCallback((text: string) => {
    setDisplay(text);
  }, []);

  useEffect(() => {
    if (skipAnimation) {
      animatedValue.value = value;
      setDisplay(formatValue(value, decimals, prefix));
    } else {
      animatedValue.value = withTiming(value, {
        duration,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [value, duration, skipAnimation, decimals, prefix]);

  useAnimatedReaction(
    () => animatedValue.value,
    (current) => {
      const text = formatValue(current, decimals, prefix);
      runOnJS(updateDisplay)(text);
    },
  );

  return <Text style={style}>{display}</Text>;
}
