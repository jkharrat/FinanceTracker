import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
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

const PIECE_COUNT = 34;
const FALL_DURATION = 2200;

type PieceShape = 'rect' | 'circle' | 'emoji';

interface PieceSpec {
  startX: number;
  driftX: number;
  rotation: number;
  delay: number;
  width: number;
  height: number;
  color: string;
  duration: number;
  shape: PieceShape;
  glyph?: string;
}

interface PieceProps {
  spec: PieceSpec;
  fallDistance: number;
  onDone?: () => void;
}

function Piece({ spec, fallDistance, onDone }: PieceProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      spec.delay,
      withTiming(1, { duration: spec.duration, easing: Easing.out(Easing.quad) }, (finished) => {
        'worklet';
        if (finished && onDone) {
          runOnJS(onDone)();
        }
      }),
    );
  }, [progress, spec.delay, spec.duration, onDone]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.75, 1], [1, 1, 0]),
    transform: [
      { translateX: spec.startX + spec.driftX * progress.value },
      { translateY: interpolate(progress.value, [0, 1], [-40, fallDistance]) },
      { rotate: `${spec.rotation * progress.value}deg` },
    ],
  }));

  if (spec.shape === 'emoji') {
    return (
      <Animated.Text style={[styles.piece, { fontSize: spec.width }, style]}>
        {spec.glyph}
      </Animated.Text>
    );
  }

  return (
    <Animated.View
      style={[
        styles.piece,
        { width: spec.width, height: spec.height, backgroundColor: spec.color },
        spec.shape === 'circle' && { borderRadius: spec.width / 2 },
        style,
      ]}
    />
  );
}

interface ConfettiProps {
  /** Remount with a new key (or flip this) to replay the burst. */
  palette: string[];
  /** Emoji sprinkled in among the paper pieces. */
  emoji?: string[];
  /** Total pieces, including emoji. */
  count?: number;
  onComplete?: () => void;
}

export default function Confetti({ palette, emoji = [], count = PIECE_COUNT, onComplete }: ConfettiProps) {
  const { width, height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();

  const specs = useMemo<PieceSpec[]>(() => {
    return Array.from({ length: count }, (_, i) => {
      const isEmoji = emoji.length > 0 && i % 5 === 0;
      const isCircle = !isEmoji && i % 3 === 0;
      const size = isEmoji ? 20 + Math.random() * 14 : 6 + Math.random() * 8;
      return {
        startX: Math.random() * width,
        driftX: (Math.random() - 0.5) * 140,
        rotation: (Math.random() - 0.5) * (isEmoji ? 240 : 900),
        delay: Math.random() * 350,
        width: size,
        height: isCircle ? size : size * (0.4 + Math.random() * 0.8),
        color: palette[i % palette.length],
        duration: FALL_DURATION * (0.75 + Math.random() * 0.5),
        shape: isEmoji ? 'emoji' : isCircle ? 'circle' : 'rect',
        glyph: isEmoji ? emoji[(i / 5) % emoji.length] : undefined,
      };
    });
  }, [width, palette, emoji, count]);

  /** The last piece to land owns the completion callback, so nothing is cut off early. */
  const lastIndex = useMemo(() => {
    let best = 0;
    specs.forEach((spec, i) => {
      if (spec.delay + spec.duration > specs[best].delay + specs[best].duration) best = i;
    });
    return best;
  }, [specs]);

  useEffect(() => {
    if (reducedMotion && onComplete) {
      onComplete();
    }
  }, [reducedMotion, onComplete]);

  if (reducedMotion) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {specs.map((spec, i) => (
        <Piece
          key={i}
          spec={spec}
          fallDistance={height + 80}
          onDone={i === lastIndex ? onComplete : undefined}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  piece: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderRadius: 2,
  },
});
