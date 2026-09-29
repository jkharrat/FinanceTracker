import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  withSequence,
  withRepeat,
  cancelAnimation,
  useReducedMotion,
  interpolate,
  Easing,
  FadeIn,
  FadeInDown,
  ZoomIn,
} from 'react-native-reanimated';
import { useColors } from '../context/ThemeContext';
import { ThemeColors } from '../constants/colors';
import { Radius, Type, KidType, KidRadius, Elevation } from '../constants/theme';
import { kidFontStyle } from '../constants/fonts';
import { Spacing } from '../constants/spacing';
import { Durations, Springs } from '../constants/motion';
import { hapticLight, hapticSuccess } from '../utils/haptics';
import type { ArrivalSource } from '../utils/moneyArrived';
import AnimatedNumber from './AnimatedNumber';
import CoinBurst from './CoinBurst';
import { Button } from './ui';

const PIGGY_SIZE = 150;
/** Where coins disappear into the piggy's back, relative to its center. */
const LAND_Y = -PIGGY_SIZE * 0.28;
const COIN_COUNT = 9;
const COIN_GLYPHS = ['🪙', '💰', '🪙'];

const RAIN_START_MS = 350;
const COIN_GAP_MS = 150;
const FALL_MS = 560;
const REVEAL_MS = RAIN_START_MS + (COIN_COUNT - 1) * COIN_GAP_MS + FALL_MS;
/** After this, the sequence has played out and any tap closes. */
const SETTLED_MS = 750;
const AUTO_CLOSE_AFTER_REVEAL_MS = SETTLED_MS + 2600;
/** Ignore taps this early so the tap that opened the dashboard doesn't also skip the moment. */
const TAP_GUARD_MS = 400;
const HAPTIC_GAP_MS = 120;
const REDUCED_AUTO_CLOSE_MS = 3500;
const MAX_LISTED = 4;

interface ReceiveCelebrationProps {
  total: number;
  sources: ArrivalSource[];
  /** Balance before the money arrived; the shown balance ticks up from here. */
  previousBalance: number;
  onDone: () => void;
}

interface CoinSpec {
  dx: number;
  spin: number;
  size: number;
  delay: number;
  glyph: string;
}

function RainCoin({ spec, startY }: { spec: CoinSpec; startY: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(spec.delay, withTiming(1, { duration: FALL_MS, easing: Easing.in(Easing.quad) }));
  }, [t, spec.delay]);
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.05, 0.9, 1], [0, 1, 1, 0]),
    transform: [
      { translateX: spec.dx * (1 - t.value) },
      { translateY: interpolate(t.value, [0, 1], [-startY, LAND_Y]) },
      { rotate: `${spec.spin * t.value}deg` },
      { scale: interpolate(t.value, [0, 0.85, 1], [1, 1, 0.4]) },
    ],
  }));
  return <Animated.Text style={[coinStyles.coin, { fontSize: spec.size }, style]}>{spec.glyph}</Animated.Text>;
}

const coinStyles = StyleSheet.create({
  coin: {
    position: 'absolute',
  },
});

function joinNames(names: string[]) {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

export function arrivalSubtitle(sources: ArrivalSource[]) {
  if (sources.length === 1) return sources[0].subtitle;
  if (sources.length <= 3) return `from ${joinNames(sources.map((s) => s.label))}`;
  return `from ${sources.length} places`;
}

/**
 * Full-screen "money arrived" celebration: coins rain into a piggy bank that wiggles and swells
 * with each one, then the total, where it came from and the new balance appear.
 * Tapping during the rain skips to the reveal; tapping after closes. Closes itself if left alone.
 */
export default function ReceiveCelebration({ total, sources, previousBalance, onDone }: ReceiveCelebrationProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const reducedMotion = useReducedMotion();
  const { height } = useWindowDimensions();
  const startY = height * 0.55;

  const backdrop = useSharedValue(0);
  const fill = useSharedValue(1);
  const pulse = useSharedValue(0);
  const wiggle = useSharedValue(0);
  const bob = useSharedValue(0);
  const squash = useSharedValue(0);

  const [revealed, setRevealed] = useState(reducedMotion);
  const [raining, setRaining] = useState(!reducedMotion);
  const [shownBalance, setShownBalance] = useState(reducedMotion ? previousBalance + total : previousBalance);
  const mountedAt = useRef(Date.now());
  const revealedRef = useRef(reducedMotion);
  const settled = useRef(reducedMotion);
  const finished = useRef(false);
  const lastHaptic = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const coins = useMemo<CoinSpec[]>(
    () =>
      Array.from({ length: COIN_COUNT }, (_, i) => ({
        dx: (Math.random() - 0.5) * 140,
        spin: (Math.random() - 0.5) * 540,
        size: 30 + Math.random() * 12,
        delay: RAIN_START_MS + i * COIN_GAP_MS,
        glyph: COIN_GLYPHS[i % COIN_GLYPHS.length],
      })),
    [],
  );

  const after = useCallback((ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    onDone();
  }, [onDone]);

  const landCoin = useCallback((index: number) => {
    const now = Date.now();
    if (now - lastHaptic.current >= HAPTIC_GAP_MS) {
      lastHaptic.current = now;
      hapticLight();
    }
    fill.value = withSpring(1 + ((index + 1) / COIN_COUNT) * 0.14, Springs.bouncy);
    pulse.value = withSequence(withTiming(1, { duration: 70 }), withSpring(0, Springs.bouncy));
    wiggle.value = withSequence(
      withTiming(index % 2 ? 9 : -9, { duration: 60 }),
      withTiming(index % 2 ? -6 : 6, { duration: 80 }),
      withSpring(0, Springs.bouncy),
    );
  }, [fill, pulse, wiggle]);

  const reveal = useCallback(() => {
    if (revealedRef.current) return;
    revealedRef.current = true;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    hapticSuccess();
    setRaining(false);
    setRevealed(true);
    cancelAnimation(bob);
    bob.value = withSpring(0, Springs.gentle);
    fill.value = withSpring(1, Springs.celebrate);
    squash.value = withSequence(withTiming(1, { duration: 90 }), withSpring(0, Springs.celebrate));
    after(350, () => setShownBalance(previousBalance + total));
    after(SETTLED_MS, () => { settled.current = true; });
    after(AUTO_CLOSE_AFTER_REVEAL_MS, finish);
  }, [after, bob, fill, squash, previousBalance, total, finish]);

  useEffect(() => {
    if (reducedMotion) {
      hapticSuccess();
      after(REDUCED_AUTO_CLOSE_MS, finish);
      return () => timers.current.forEach(clearTimeout);
    }

    backdrop.value = withTiming(1, { duration: Durations.base });
    bob.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 320, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 320, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
    );
    coins.forEach((coin, i) => after(coin.delay + FALL_MS, () => landCoin(i)));
    after(REVEAL_MS + 60, reveal);

    return () => timers.current.forEach(clearTimeout);
    // Plays once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBackdropPress = useCallback(() => {
    if (Date.now() - mountedAt.current < TAP_GUARD_MS) return;
    if (!revealedRef.current) {
      reveal();
      return;
    }
    finish();
  }, [reveal, finish]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: reducedMotion ? 0.96 : backdrop.value * 0.96,
  }));

  const piggyStyle = useAnimatedStyle(() => {
    const s = fill.value * (1 + pulse.value * 0.12);
    return {
      transform: [
        { translateY: bob.value },
        { rotate: `${wiggle.value}deg` },
        { scaleX: s * (1 + squash.value * 0.22) },
        { scaleY: s * (1 - squash.value * 0.18) },
      ],
    };
  });

  const finalBalance = previousBalance + total;
  const subtitle = arrivalSubtitle(sources);
  const listed = sources.slice(0, MAX_LISTED);
  const hidden = sources.length - listed.length;

  const textIn = (delay: number) =>
    reducedMotion ? undefined : FadeInDown.delay(delay).springify().damping(Springs.bouncy.damping);

  const details = (
    <>
      <Animated.Text entering={textIn(150)} style={styles.title}>You got ${total.toFixed(2)}!</Animated.Text>
      <Animated.Text entering={textIn(230)} style={styles.subtitle}>{subtitle}</Animated.Text>
      {sources.length > 1 && (
        <Animated.View entering={textIn(310)} style={styles.sourceList} pointerEvents="none">
          {listed.map((source) => (
            <View key={source.label} style={styles.sourceRow}>
              <Text style={styles.sourceEmoji}>{source.emoji}</Text>
              <Text style={styles.sourceLabel} numberOfLines={1}>{source.label}</Text>
              <Text style={styles.sourceAmount}>+${source.amount.toFixed(2)}</Text>
            </View>
          ))}
          {hidden > 0 && <Text style={styles.sourceMore}>and {hidden} more</Text>}
        </Animated.View>
      )}
      <Animated.View entering={textIn(400)} style={styles.balancePill} pointerEvents="none">
        <Text style={styles.balanceLabel}>Your balance</Text>
        <AnimatedNumber value={shownBalance} style={styles.balanceValue} duration={700} />
      </Animated.View>
      <Animated.View entering={textIn(650)} style={styles.done}>
        <Button title="Done" onPress={finish} fullWidth />
      </Animated.View>
    </>
  );

  return (
    <View
      style={styles.overlay}
      accessibilityViewIsModal
      accessibilityLiveRegion="assertive"
      accessibilityLabel={`Money arrived. You got $${total.toFixed(2)} ${subtitle}. Balance $${finalBalance.toFixed(2)}`}
    >
      <Animated.View style={[styles.backdrop, backdropStyle]} pointerEvents="none" />
      <Pressable style={StyleSheet.absoluteFill} onPress={handleBackdropPress} accessibilityLabel="Close" />

      {reducedMotion ? (
        <View style={styles.column} pointerEvents="box-none">
          <Animated.View entering={FadeIn.duration(Durations.slow)} style={styles.card} pointerEvents="box-none">
            <Text style={styles.cardPiggy}>🐷</Text>
            {details}
          </Animated.View>
        </View>
      ) : (
        <View style={styles.column} pointerEvents="box-none">
          <View style={styles.stage} pointerEvents="none">
            <Animated.View entering={ZoomIn.springify().damping(Springs.bouncy.damping)}>
              <Animated.View style={[styles.piggy, piggyStyle]}>
                <Text style={styles.piggyText}>🐷</Text>
              </Animated.View>
            </Animated.View>
            {raining && coins.map((coin, i) => <RainCoin key={i} spec={coin} startY={startY} />)}
            {revealed && <CoinBurst count={10} />}
          </View>
          {revealed && details}
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 10,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.background,
    },
    column: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: Spacing.xl,
    },
    card: {
      alignItems: 'center',
      alignSelf: 'stretch',
      maxWidth: 400,
      width: '100%',
      marginHorizontal: 'auto',
      padding: Spacing.xl,
      borderRadius: KidRadius.card,
      backgroundColor: colors.surface,
      ...Elevation.kid,
    },
    cardPiggy: {
      fontSize: 64,
    },
    stage: {
      width: PIGGY_SIZE,
      height: PIGGY_SIZE,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2,
    },
    piggy: {
      width: PIGGY_SIZE,
      height: PIGGY_SIZE,
      borderRadius: PIGGY_SIZE / 2,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    piggyText: {
      fontSize: 92,
    },
    title: {
      ...KidType.title,
      fontSize: 32,
      color: colors.text,
      marginTop: Spacing.lg,
      textAlign: 'center',
    },
    subtitle: {
      ...Type.body,
      color: colors.textSecondary,
      marginTop: Spacing.xs,
      textAlign: 'center',
    },
    sourceList: {
      alignSelf: 'stretch',
      maxWidth: 320,
      width: '100%',
      marginHorizontal: 'auto',
      marginTop: Spacing.md,
      paddingVertical: Spacing.xs,
      paddingHorizontal: Spacing.md,
      borderRadius: KidRadius.bubble,
      backgroundColor: colors.surfaceAlt,
    },
    sourceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingVertical: 6,
    },
    sourceEmoji: {
      fontSize: 18,
    },
    sourceLabel: {
      ...Type.bodyStrong,
      flex: 1,
      color: colors.text,
    },
    sourceAmount: {
      ...KidType.amount,
      fontSize: 15,
      color: colors.success,
    },
    sourceMore: {
      ...Type.caption,
      color: colors.textSecondary,
      textAlign: 'center',
      paddingVertical: 4,
    },
    balancePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      marginTop: Spacing.lg,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      borderRadius: Radius.pill,
      backgroundColor: colors.surfaceAlt,
    },
    balanceLabel: {
      ...Type.label,
      color: colors.textSecondary,
    },
    balanceValue: {
      ...KidType.amount,
      ...kidFontStyle('900'),
      fontSize: 18,
      color: colors.text,
    },
    done: {
      alignSelf: 'stretch',
      marginTop: Spacing.xl,
      maxWidth: 360,
      width: '100%',
      marginHorizontal: 'auto',
    },
  });
