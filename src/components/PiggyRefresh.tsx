import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, Platform } from 'react-native';
import Animated, {
  SharedValue,
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  useReducedMotion,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  withDelay,
  cancelAnimation,
  interpolate,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { useColors } from '../context/ThemeContext';
import { Elevation } from '../constants/theme';
import { Springs } from '../constants/motion';
import { hapticLight } from '../utils/haptics';
import AnimatedPressable from './AnimatedPressable';

export type RefreshPhase = 'idle' | 'refreshing' | 'done';

/** Pull distance at which the piggy is full size. */
export const PULL_FULL = 72;
/** How long the happy bounce holds the header open after data arrives. */
export const REFRESH_DONE_MS = 650;
export const PIGGY_HEADER_HEIGHT = 64;
const FLIP_MS = 700;

/** Only iOS reports overscroll, so only there does the header follow the finger. */
export const PULL_TRACKING = Platform.OS === 'ios';

/**
 * Drives the fun refresh: `refreshing` stays true through a short "done" phase so the
 * bounce can play before the native control collapses.
 */
export function usePiggyRefresh(refresh: () => Promise<void>) {
  const reducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<RefreshPhase>('idle');
  const busy = useRef(false);
  const mounted = useRef(true);
  const doneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pull = useSharedValue(0);
  const armed = useSharedValue(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (doneTimer.current) clearTimeout(doneTimer.current);
    };
  }, []);

  const onRefresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setPhase('refreshing');
    try {
      await refresh();
    } finally {
      if (mounted.current) {
        if (reducedMotion) {
          busy.current = false;
          setPhase('idle');
        } else {
          hapticLight();
          setPhase('done');
          doneTimer.current = setTimeout(() => {
            busy.current = false;
            setPhase('idle');
          }, REFRESH_DONE_MS);
        }
      }
    }
  }, [refresh, reducedMotion]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      const distance = Math.max(0, -e.contentOffset.y);
      pull.value = distance;
      if (distance >= PULL_FULL && armed.value === 0) {
        armed.value = 1;
        runOnJS(hapticLight)();
      } else if (distance < 8) {
        armed.value = 0;
      }
    },
  });

  return { phase, refreshing: phase !== 'idle', onRefresh, pull, scrollHandler };
}

/** Coin flip while refreshing plus a happy hop when done, shared by the header and web button. */
function useRefreshMotion(phase: RefreshPhase, dropIntoPiggy: boolean) {
  const reducedMotion = useReducedMotion();
  const spin = useSharedValue(0);
  const hop = useSharedValue(0);
  const drop = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) return;
    if (phase === 'refreshing') {
      drop.value = 0;
      spin.value = 0;
      spin.value = withRepeat(withTiming(1, { duration: FLIP_MS, easing: Easing.linear }), -1, false);
    } else if (phase === 'done') {
      cancelAnimation(spin);
      spin.value = withTiming(1, { duration: 160 });
      if (dropIntoPiggy) drop.value = withTiming(1, { duration: 240, easing: Easing.in(Easing.quad) });
      hop.value = withDelay(
        dropIntoPiggy ? 180 : 0,
        withSequence(withTiming(1, { duration: 150, easing: Easing.out(Easing.quad) }), withSpring(0, Springs.celebrate)),
      );
    } else {
      cancelAnimation(spin);
      spin.value = 0;
    }
  }, [phase, reducedMotion, dropIntoPiggy, spin, hop, drop]);

  const coinStyle = useAnimatedStyle(() => ({
    opacity: 1 - drop.value,
    transform: [
      { perspective: 400 },
      { translateY: drop.value * 16 },
      { rotateY: `${spin.value * 360}deg` },
      { scale: 1 - drop.value * 0.5 },
    ],
  }));
  const hopStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -12 * hop.value }, { scale: 1 + 0.22 * hop.value }],
  }));

  return { coinStyle, hopStyle };
}

interface PiggyRefreshHeaderProps {
  phase: RefreshPhase;
  /** Overscroll distance from `usePiggyRefresh`; ignored when `floating`. */
  pull: SharedValue<number>;
  /** Android: no overscroll, so float in as a pill while refreshing instead. */
  floating?: boolean;
}

/** Sits behind (iOS) or above (Android) the list's top edge. */
export function PiggyRefreshHeader({ phase, pull, floating = false }: PiggyRefreshHeaderProps) {
  const colors = useColors();
  const { coinStyle, hopStyle } = useRefreshMotion(phase, true);
  const active = useSharedValue(0);

  useEffect(() => {
    if (phase === 'refreshing') active.value = withSpring(1, Springs.bouncy);
    else if (phase === 'done') active.value = withDelay(REFRESH_DONE_MS - 180, withTiming(0, { duration: 180 }));
    else active.value = withTiming(0, { duration: 120 });
  }, [phase, active]);

  const groupStyle = useAnimatedStyle(() => {
    if (floating) {
      return {
        opacity: active.value,
        transform: [{ translateY: (1 - active.value) * -40 }, { scale: 0.6 + 0.4 * active.value }],
      };
    }
    const progress = Math.max(Math.min(pull.value / PULL_FULL, 1), active.value);
    return {
      opacity: interpolate(progress, [0.08, 0.45], [0, 1], 'clamp'),
      transform: [{ scale: 0.4 + 0.6 * progress }, { rotate: `${-28 * (1 - progress)}deg` }],
    };
  });

  return (
    <View
      pointerEvents="none"
      style={[styles.header, floating && styles.headerFloating]}
      testID="piggy-refresh"
    >
      <Animated.View
        style={[
          styles.group,
          floating && [styles.pill, { backgroundColor: colors.surface }, Elevation.kid],
          groupStyle,
        ]}
      >
        <Animated.Text style={[styles.coin, coinStyle]}>🪙</Animated.Text>
        <Animated.Text style={[styles.piggy, hopStyle]}>🐷</Animated.Text>
      </Animated.View>
    </View>
  );
}

/** Web has no pull gesture, so a coin in the header plays the same flip and hop. */
export function RefreshCoinButton({ phase, onPress }: { phase: RefreshPhase; onPress: () => void }) {
  const colors = useColors();
  const { coinStyle, hopStyle } = useRefreshMotion(phase, false);
  const busy = phase !== 'idle';

  return (
    <AnimatedPressable
      variant="button"
      onPress={onPress}
      disabled={busy}
      style={[styles.button, { backgroundColor: colors.primarySoft }]}
      accessibilityRole="button"
      accessibilityLabel={busy ? 'Refreshing' : 'Refresh'}
      accessibilityState={{ busy }}
    >
      <Animated.View style={hopStyle}>
        <Animated.Text style={[styles.buttonCoin, coinStyle]}>🪙</Animated.Text>
      </Animated.View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: PIGGY_HEADER_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerFloating: {
    top: 8,
    zIndex: 10,
  },
  group: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  coin: {
    fontSize: 18,
    lineHeight: 22,
  },
  piggy: {
    fontSize: 28,
    lineHeight: 32,
    marginTop: -4,
  },
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  buttonCoin: {
    fontSize: 18,
  },
});
