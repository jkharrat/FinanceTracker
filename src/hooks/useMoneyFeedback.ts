import { useCallback, useEffect, useRef, useState } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  useReducedMotion,
  withSequence,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { Durations } from '../constants/motion';

/** Long enough for the transaction sheet to slide away before the balance rolls. */
export const CONFIRM_DELAY_MS = Durations.slow;

export function moneyConfirmation(type: 'add' | 'subtract', amount: number, name: string) {
  const value = `$${amount.toFixed(2)}`;
  return type === 'add' ? `Added ${value} to ${name}` : `Removed ${value} from ${name}`;
}

/**
 * Keeps the shown balance on its old value while the sheet closes, then lets it roll
 * and gives the avatar a small bounce so the change is noticed.
 */
export function useMoneyFeedback(balance: number) {
  const reducedMotion = useReducedMotion();
  const [held, setHeld] = useState<number | null>(null);
  const latest = useRef(balance);
  latest.current = balance;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bounce = useSharedValue(0);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const hold = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!reducedMotion) setHeld(latest.current);
  }, [reducedMotion]);

  const release = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setHeld(null);
  }, []);

  const settle = useCallback(
    ({ withBounce = false, then }: { withBounce?: boolean; then?: () => void } = {}) => {
      if (timer.current) clearTimeout(timer.current);
      const finish = () => {
        setHeld(null);
        if (withBounce && !reducedMotion) {
          bounce.value = withSequence(
            withTiming(1, { duration: 140, easing: Easing.out(Easing.quad) }),
            withSpring(0, { damping: 12, stiffness: 320, mass: 0.7 }),
          );
        }
        then?.();
      };
      if (reducedMotion) finish();
      else timer.current = setTimeout(finish, CONFIRM_DELAY_MS);
    },
    [reducedMotion, bounce],
  );

  const avatarStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -4 * bounce.value }, { scale: 1 + 0.12 * bounce.value }],
  }));

  return { shownBalance: held ?? balance, avatarStyle, hold, settle, release };
}
