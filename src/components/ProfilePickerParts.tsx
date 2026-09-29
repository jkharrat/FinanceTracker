import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  useReducedMotion,
  interpolate,
  Easing,
  ZoomIn,
} from 'react-native-reanimated';
import { useColors } from '../context/ThemeContext';
import type { AccentPalette } from '../constants/colors';
import { KidRadius } from '../constants/theme';
import { Durations, Springs } from '../constants/motion';
import AnimatedPressable from './AnimatedPressable';

export interface Point {
  x: number;
  y: number;
}

export interface Box extends Point {
  width: number;
  height: number;
}

/** Window-relative box of a mounted view, or null if it can't be measured. */
export function measureBox(node: View | null): Promise<Box | null> {
  return new Promise((resolve) => {
    if (!node || typeof node.measureInWindow !== 'function') {
      resolve(null);
      return;
    }
    node.measureInWindow((x, y, width, height) => resolve(width || height ? { x, y, width, height } : null));
  });
}

export const centerOf = (box: Box, relativeTo: Box): Point => ({
  x: box.x - relativeTo.x + box.width / 2,
  y: box.y - relativeTo.y + box.height / 2,
});

export const AVATAR_FLIGHT_MS = 620;
export const RIPPLE_MS = 700;

const TILE = 48;
const TILE_EMOJI = 24;
const FLYER_BOX = 48;
const FLIGHT_ARC = 90;
const RIPPLE_SIZE = 900;

interface AvatarTileProps {
  emoji: string;
  active: boolean;
  onPick: (emoji: string, node: View | null) => void;
}

/** Kid avatar option: hops when tapped, and an accent ring springs in around the selected one. */
export function AvatarTile({ emoji, active, onPick }: AvatarTileProps) {
  const colors = useColors();
  const reducedMotion = useReducedMotion();
  const ref = useRef<View>(null);
  const hop = useSharedValue(0);
  const ring = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) {
      ring.value = withTiming(active ? 1 : 0, { duration: Durations.quick });
      return;
    }
    ring.value = active ? withSpring(1, Springs.bouncy) : withTiming(0, { duration: Durations.quick });
  }, [active, reducedMotion, ring]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: Math.min(ring.value, 1),
    transform: [{ scale: 0.6 + 0.4 * ring.value }],
  }));
  const emojiStyle = useAnimatedStyle(() => ({ transform: [{ translateY: hop.value }] }));

  const handlePress = () => {
    if (!reducedMotion && !active) {
      hop.value = withSequence(withTiming(-10, { duration: 90 }), withSpring(0, Springs.bouncy));
    }
    onPick(emoji, ref.current);
  };

  return (
    <View ref={ref} collapsable={false} style={tileStyles.wrap}>
      <Animated.View pointerEvents="none" style={[tileStyles.ring, { borderColor: colors.primary }, ringStyle]} />
      <AnimatedPressable
        variant="button"
        style={[tileStyles.tile, { backgroundColor: active ? colors.primarySoft : colors.surfaceAlt }]}
        onPress={handlePress}
        accessibilityLabel={`Avatar ${emoji}`}
        accessibilityState={{ selected: active }}
      >
        <Animated.Text style={[tileStyles.emoji, emojiStyle]}>{emoji}</Animated.Text>
      </AnimatedPressable>
    </View>
  );
}

const tileStyles = StyleSheet.create({
  wrap: {
    width: TILE,
    height: TILE,
  },
  ring: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: KidRadius.bubble + 4,
    borderWidth: 2.5,
  },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: KidRadius.bubble,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: TILE_EMOJI,
  },
});

interface FlyingAvatarProps {
  emoji: string;
  from: Point;
  to: Point;
  /** Final size relative to the tile emoji, so it lands at the size of the big avatar. */
  endScale: number;
  onArrive: () => void;
}

/** The picked emoji spinning along an arc from its tile into the big avatar. */
export function FlyingAvatar({ emoji, from, to, endScale, onArrive }: FlyingAvatarProps) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withTiming(1, { duration: AVATAR_FLIGHT_MS, easing: Easing.inOut(Easing.quad) });
    const timer = setTimeout(onArrive, AVATAR_FLIGHT_MS);
    return () => clearTimeout(timer);
    // Plays once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => {
    const p = t.value;
    const x = from.x + (to.x - from.x) * p;
    const y = from.y + (to.y - from.y) * p - Math.sin(Math.PI * p) * FLIGHT_ARC;
    return {
      opacity: interpolate(p, [0, 0.92, 1], [1, 1, 0]),
      transform: [
        { translateX: x - FLYER_BOX / 2 },
        { translateY: y - FLYER_BOX / 2 },
        { rotate: `${360 * p}deg` },
        { scale: interpolate(p, [0, 0.5, 1], [1, 1.6, endScale]) },
      ],
    };
  });

  return (
    <Animated.View pointerEvents="none" style={[flyerStyles.flyer, style]}>
      <Text style={flyerStyles.text}>{emoji}</Text>
    </Animated.View>
  );
}

const flyerStyles = StyleSheet.create({
  flyer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: FLYER_BOX,
    height: FLYER_BOX,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: TILE_EMOJI,
  },
});

interface ColorRippleProps {
  color: string;
  origin: Point;
  onDone: () => void;
}

/** A circle of the new accent color that swells out from `origin` and fades. */
export function ColorRipple({ color, origin, onDone }: ColorRippleProps) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withTiming(1, { duration: RIPPLE_MS, easing: Easing.out(Easing.cubic) });
    const timer = setTimeout(onDone, RIPPLE_MS);
    return () => clearTimeout(timer);
    // Plays once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.15, 1], [0, 0.45, 0]),
    transform: [{ scale: interpolate(t.value, [0, 1], [0.08, 1]) }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      testID="color-ripple"
      style={[
        rippleStyles.circle,
        { backgroundColor: color, left: origin.x - RIPPLE_SIZE / 2, top: origin.y - RIPPLE_SIZE / 2 },
        style,
      ]}
    />
  );
}

const rippleStyles = StyleSheet.create({
  circle: {
    position: 'absolute',
    width: RIPPLE_SIZE,
    height: RIPPLE_SIZE,
    borderRadius: RIPPLE_SIZE / 2,
  },
});

interface AccentSwatchProps {
  palette: AccentPalette;
  active: boolean;
  onPick: (palette: AccentPalette) => void;
}

/** Kid accent swatch that pops when tapped. */
export function AccentSwatch({ palette, active, onPick }: AccentSwatchProps) {
  const reducedMotion = useReducedMotion();
  const pop = useSharedValue(1);
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  const handlePress = () => {
    if (!reducedMotion) {
      pop.value = withSequence(withTiming(1.28, { duration: 90 }), withSpring(1, Springs.bouncy));
    }
    onPick(palette);
  };

  return (
    <Animated.View style={popStyle}>
      <AnimatedPressable
        variant="button"
        style={[swatchStyles.ring, { borderColor: active ? palette.swatch : 'transparent' }]}
        onPress={handlePress}
        accessibilityLabel={palette.label}
        accessibilityState={{ selected: active }}
      >
        <View style={[swatchStyles.inner, { backgroundColor: palette.swatch }]}>
          {active && (
            <Animated.View entering={reducedMotion ? undefined : ZoomIn.springify().damping(Springs.bouncy.damping)}>
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            </Animated.View>
          )}
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

const swatchStyles = StyleSheet.create({
  ring: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
  },
  inner: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

interface ThemeIconProps {
  name: keyof typeof Ionicons.glyphMap;
  active: boolean;
  color: string;
  size?: number;
}

/** Theme segment icon that spins and grows in when chosen, and dips when left. */
export function ThemeIcon({ name, active, color, size = 16 }: ThemeIconProps) {
  const reducedMotion = useReducedMotion();
  const spin = useSharedValue(0);
  const scale = useSharedValue(1);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (reducedMotion) return;
    if (active) {
      spin.value = withSequence(withTiming(-180, { duration: 0 }), withSpring(0, Springs.bouncy));
      scale.value = withSequence(withTiming(0.4, { duration: 0 }), withSpring(1, Springs.bouncy));
    } else {
      spin.value = withSequence(withTiming(60, { duration: Durations.quick }), withSpring(0, Springs.gentle));
      scale.value = withSequence(withTiming(0.7, { duration: Durations.quick }), withSpring(1, Springs.gentle));
    }
  }, [active, reducedMotion, spin, scale]);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value}deg` }, { scale: scale.value }],
  }));

  return (
    <Animated.View style={style}>
      <Ionicons name={name} size={size} color={color} />
    </Animated.View>
  );
}
