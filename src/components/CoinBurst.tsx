import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS,
  useReducedMotion,
  interpolate,
  Easing,
} from 'react-native-reanimated';

interface CoinSpec {
  dx: number;
  rise: number;
  spin: number;
  delay: number;
  size: number;
  glyph: string;
}

const GLYPHS = ['🪙', '🪙', '✨', '🪙', '⭐'];
const DURATION = 950;

function Coin({ spec, onDone }: { spec: CoinSpec; onDone?: () => void }) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withDelay(
      spec.delay,
      withTiming(1, { duration: DURATION, easing: Easing.out(Easing.cubic) }, (finished) => {
        'worklet';
        if (finished && onDone) runOnJS(onDone)();
      }),
    );
  }, [t, spec.delay, onDone]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.15, 0.7, 1], [0, 1, 1, 0]),
    transform: [
      { translateX: spec.dx * t.value },
      { translateY: -spec.rise * t.value },
      { scale: interpolate(t.value, [0, 0.2, 1], [0.4, 1.1, 0.8]) },
      { rotate: `${spec.spin * t.value}deg` },
    ],
  }));

  return (
    <Animated.View style={[styles.coin, style]}>
      <Text style={{ fontSize: spec.size }}>{spec.glyph}</Text>
    </Animated.View>
  );
}

interface CoinBurstProps {
  count?: number;
  onComplete?: () => void;
}

/** A handful of coins and sparkles that float up from the parent's center. Remount to replay. */
export default function CoinBurst({ count = 8, onComplete }: CoinBurstProps) {
  const reducedMotion = useReducedMotion();

  const specs = useMemo<CoinSpec[]>(
    () =>
      Array.from({ length: count }, (_, i) => ({
        dx: (Math.random() - 0.5) * 160,
        rise: 60 + Math.random() * 70,
        spin: (Math.random() - 0.5) * 360,
        delay: i * 40,
        size: 16 + Math.random() * 10,
        glyph: GLYPHS[i % GLYPHS.length],
      })),
    [count],
  );

  useEffect(() => {
    if (reducedMotion) onComplete?.();
  }, [reducedMotion, onComplete]);

  if (reducedMotion) return null;

  return (
    <View style={styles.layer} pointerEvents="none">
      {specs.map((spec, i) => (
        <Coin key={i} spec={spec} onDone={i === specs.length - 1 ? onComplete : undefined} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coin: {
    position: 'absolute',
  },
});
