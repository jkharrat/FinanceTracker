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
  /** Burst mode: launch from a point with this velocity (px over the whole flight) and fall. */
  burst?: { x: number; y: number; vx: number; vy: number; gravity: number };
}

const BURST_DURATION = 1700;

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
      withTiming(1, { duration: spec.duration, easing: spec.burst ? Easing.linear : Easing.out(Easing.quad) }, (finished) => {
        'worklet';
        if (finished && onDone) {
          runOnJS(onDone)();
        }
      }),
    );
  }, [progress, spec.delay, spec.duration, onDone]);

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    if (spec.burst) {
      const b = spec.burst;
      return {
        opacity: interpolate(p, [0, 0.05, 0.7, 1], [0, 1, 1, 0]),
        transform: [
          { translateX: b.x + b.vx * p },
          { translateY: b.y + b.vy * p + b.gravity * p * p },
          { rotate: `${spec.rotation * p}deg` },
        ],
      };
    }
    return {
      opacity: interpolate(p, [0, 0.75, 1], [1, 1, 0]),
      transform: [
        { translateX: spec.startX + spec.driftX * p },
        { translateY: interpolate(p, [0, 1], [-40, fallDistance]) },
        { rotate: `${spec.rotation * p}deg` },
      ],
    };
  });

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
  /**
   * Burst from this point (relative to the parent) instead of raining from the top.
   * The parent must not clip overflow.
   */
  origin?: { x: number; y: number };
  onComplete?: () => void;
}

export default function Confetti({ palette, emoji = [], count = PIECE_COUNT, origin, onComplete }: ConfettiProps) {
  const { width, height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const originX = origin?.x;
  const originY = origin?.y;

  const specs = useMemo<PieceSpec[]>(() => {
    return Array.from({ length: count }, (_, i) => {
      const isEmoji = emoji.length > 0 && i % 5 === 0;
      const isCircle = !isEmoji && i % 3 === 0;
      const size = isEmoji ? 20 + Math.random() * 14 : 6 + Math.random() * 8;
      const shared = {
        rotation: (Math.random() - 0.5) * (isEmoji ? 240 : 900),
        width: size,
        height: isCircle ? size : size * (0.4 + Math.random() * 0.8),
        color: palette[i % palette.length],
        shape: (isEmoji ? 'emoji' : isCircle ? 'circle' : 'rect') as PieceShape,
        glyph: isEmoji ? emoji[(i / 5) % emoji.length] : undefined,
      };
      if (originX !== undefined && originY !== undefined) {
        // Upward fan, roughly -165° to -15°, so pieces pop up and out before gravity wins.
        const angle = (-165 + Math.random() * 150) * (Math.PI / 180);
        const speed = 150 + Math.random() * 190;
        return {
          ...shared,
          startX: 0,
          driftX: 0,
          delay: Math.random() * 80,
          duration: BURST_DURATION * (0.8 + Math.random() * 0.4),
          burst: {
            x: originX - size / 2,
            y: originY - size / 2,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            gravity: 420 + Math.random() * 160,
          },
        };
      }
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
  }, [width, palette, emoji, count, originX, originY]);

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
