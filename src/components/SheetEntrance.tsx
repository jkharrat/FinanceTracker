import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { Platform, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  useReducedMotion,
  FadeInDown,
  Easing,
} from 'react-native-reanimated';
import { Durations, Springs } from '../constants/motion';

/** Distance the sheet travels on enter and exit. */
const TRAVEL = 80;

/**
 * Native stacks already slide modals in and out. Web gets no screen transition at all,
 * so the sheet motion is ours to draw there.
 */
const DRAW_SHEET = Platform.OS === 'web';

export interface SheetEntranceHandle {
  /** Slides the sheet away, then runs `onDone` (e.g. `router.back`). */
  dismiss: (onDone: () => void) => void;
}

interface SheetEntranceProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Wraps a modal screen so it rises in like a sheet and can slide away before closing. */
const SheetEntrance = forwardRef<SheetEntranceHandle, SheetEntranceProps>(function SheetEntrance(
  { children, style },
  ref,
) {
  const reducedMotion = useReducedMotion();
  const animate = DRAW_SHEET && !reducedMotion;
  const offset = useSharedValue(animate ? TRAVEL : 0);
  const opacity = useSharedValue(animate ? 0 : 1);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!animate) return;
    offset.value = withSpring(0, Springs.sheet);
    opacity.value = withTiming(1, { duration: Durations.slow });
  }, [animate, offset, opacity]);

  useEffect(() => () => {
    if (exitTimer.current) clearTimeout(exitTimer.current);
  }, []);

  const dismiss = useCallback(
    (onDone: () => void) => {
      if (!animate) {
        onDone();
        return;
      }
      offset.value = withTiming(TRAVEL, { duration: Durations.exit, easing: Easing.in(Easing.cubic) });
      opacity.value = withTiming(0, { duration: Durations.exit });
      exitTimer.current = setTimeout(onDone, Durations.exit);
    },
    [animate, offset, opacity],
  );

  useImperativeHandle(ref, () => ({ dismiss }), [dismiss]);

  const sheetStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: offset.value }],
  }));

  return <Animated.View style={[styles.sheet, style, sheetStyle]}>{children}</Animated.View>;
});

export default SheetEntrance;

/** Base delay so sections start rising once the sheet is mostly in place. */
const STAGGER_BASE_MS = 120;

/** `entering` animation for the nth section inside a sheet. `undefined` under reduced motion. */
export function useSheetStagger() {
  const reducedMotion = useReducedMotion();
  return useCallback(
    (order: number) =>
      reducedMotion
        ? undefined
        : FadeInDown.delay(STAGGER_BASE_MS + order * Durations.sheetStagger)
            .springify()
            .damping(Springs.gentle.damping)
            .stiffness(Springs.gentle.stiffness),
    [reducedMotion],
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
  },
});
