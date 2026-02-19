import { useCallback } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';
import { hapticError } from '../utils/haptics';

export function useShake() {
  const offset = useSharedValue(0);
  const reducedMotion = useReducedMotion();

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  const triggerShake = useCallback(() => {
    hapticError();
    if (reducedMotion) return;
    offset.value = withSequence(
      withTiming(10, { duration: 50 }),
      withTiming(-10, { duration: 50 }),
      withTiming(8, { duration: 50 }),
      withTiming(-8, { duration: 50 }),
      withTiming(4, { duration: 50 }),
      withTiming(0, { duration: 50 }),
    );
  }, [reducedMotion]);

  return { shakeStyle, triggerShake };
}
