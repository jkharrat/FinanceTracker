import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  withDelay,
  withSpring,
  withSequence,
  useReducedMotion,
  interpolate,
  Easing,
  FadeIn,
  FadeInDown,
  ZoomIn,
  SharedValue,
} from 'react-native-reanimated';
import { useColors } from '../context/ThemeContext';
import { ThemeColors } from '../constants/colors';
import { Radius, Type, KidType } from '../constants/theme';
import { kidFontStyle } from '../constants/fonts';
import { Spacing } from '../constants/spacing';
import { Durations, Springs } from '../constants/motion';
import { hapticLight, hapticSuccess } from '../utils/haptics';
import AnimatedNumber from './AnimatedNumber';
import Confetti from './Confetti';
import { Button } from './ui';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const AVATAR_SIZE = 112;
const CHECK_SIZE = 72;
const CHECK_PATH = 'M21 37 L32 48 L52 26';
const CHECK_LENGTH = 46;
const TRAIL_DOTS = 8;
/** How far the flight bows out sideways, in px. */
const ARC_BULGE = 120;

const LIFTOFF_MS = 150;
const FLIGHT_MS = 800;
const ARRIVAL_MS = LIFTOFF_MS + FLIGHT_MS;
/** After this, the sequence has played out and any tap closes. */
const SETTLED_MS = ARRIVAL_MS + 750;
const AUTO_CLOSE_MS = SETTLED_MS + 1700;
/** Ignore taps this early so the press that sent the money doesn't also skip the moment. */
const TAP_GUARD_MS = 400;
const REDUCED_AUTO_CLOSE_MS = 2500;

const CONFETTI_EMOJI = ['💸', '🎉', '⭐', '💰'];

interface SendCelebrationProps {
  amount: number;
  recipientName: string;
  recipientAvatar: string;
  /** Sender's balance before the transfer; the shown balance ticks down from here. */
  previousBalance: number;
  onDone: () => void;
}

/** Flight path relative to the avatar center: starts below (near the send button) and bows left. */
function flightPoint(t: number, startY: number) {
  'worklet';
  return {
    x: -Math.sin(Math.PI * t) * ARC_BULGE,
    y: startY * (1 - t),
  };
}

function TrailDot({ index, flight, startY, color }: { index: number; flight: SharedValue<number>; startY: number; color: string }) {
  const lag = 0.045 * (index + 1);
  const style = useAnimatedStyle(() => {
    const t = Math.max(flight.value - lag, 0);
    const p = flightPoint(t, startY);
    const visible = interpolate(flight.value, [0, lag + 0.02, 0.92, 1], [0, 1, 1, 0], 'clamp');
    return {
      opacity: visible * (1 - index / TRAIL_DOTS),
      transform: [{ translateX: p.x }, { translateY: p.y }, { scale: 1 - (index / TRAIL_DOTS) * 0.6 }],
    };
  });
  return <Animated.View style={[trailStyles.dot, { backgroundColor: color }, style]} />;
}

const trailStyles = StyleSheet.create({
  dot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: -5,
    marginTop: -5,
  },
});

function AmountFloat({ amount, color }: { amount: number; color: string }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withTiming(1, { duration: 1300, easing: Easing.out(Easing.cubic) });
  }, [t]);
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.12, 0.7, 1], [0, 1, 1, 0]),
    transform: [{ translateY: -70 * t.value }, { scale: interpolate(t.value, [0, 0.15, 1], [0.6, 1.15, 1]) }],
  }));
  return (
    <Animated.Text style={[floatStyles.text, { color }, style]}>+${amount.toFixed(2)}</Animated.Text>
  );
}

const floatStyles = StyleSheet.create({
  text: {
    ...kidFontStyle('900'),
    position: 'absolute',
    top: -8,
    fontSize: 26,
  },
});

/**
 * Full-screen "money sent" celebration: the money flies off with a sparkle trail, lands on the
 * recipient with a bounce and confetti, then a check, message and new balance appear.
 * Tap to skip; closes itself if left alone.
 */
export default function SendCelebration({
  amount,
  recipientName,
  recipientAvatar,
  previousBalance,
  onDone,
}: SendCelebrationProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const reducedMotion = useReducedMotion();
  const { height } = useWindowDimensions();
  const startY = height * 0.42;

  const backdrop = useSharedValue(0);
  const flight = useSharedValue(0);
  const squash = useSharedValue(0);
  const check = useSharedValue(reducedMotion ? 1 : 0);

  const [arrived, setArrived] = useState(reducedMotion);
  const [shownBalance, setShownBalance] = useState(reducedMotion ? previousBalance - amount : previousBalance);
  const mountedAt = useRef(Date.now());
  const settled = useRef(false);
  const finished = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    onDone();
  }, [onDone]);

  useEffect(() => {
    const after = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));

    if (reducedMotion) {
      hapticSuccess();
      settled.current = true;
      after(REDUCED_AUTO_CLOSE_MS, finish);
      return () => timers.current.forEach(clearTimeout);
    }

    backdrop.value = withTiming(1, { duration: Durations.base });
    flight.value = withDelay(LIFTOFF_MS, withTiming(1, { duration: FLIGHT_MS, easing: Easing.inOut(Easing.quad) }));
    after(LIFTOFF_MS, hapticLight);
    after(ARRIVAL_MS, () => {
      hapticSuccess();
      setArrived(true);
      squash.value = withSequence(withTiming(1, { duration: 90 }), withSpring(0, Springs.celebrate));
      check.value = withDelay(Durations.quick, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }));
    });
    after(ARRIVAL_MS + 350, () => setShownBalance(previousBalance - amount));
    after(SETTLED_MS, () => { settled.current = true; });
    after(AUTO_CLOSE_MS, finish);

    return () => timers.current.forEach(clearTimeout);
    // Plays once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBackdropPress = useCallback(() => {
    if (Date.now() - mountedAt.current < TAP_GUARD_MS) return;
    finish();
  }, [finish]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: reducedMotion ? 0.96 : backdrop.value * 0.96,
  }));

  const planeStyle = useAnimatedStyle(() => {
    const t = flight.value;
    const p = flightPoint(t, startY);
    return {
      opacity: interpolate(t, [0, 0.08, 0.9, 1], [0, 1, 1, 0]),
      transform: [
        { translateX: p.x },
        { translateY: p.y },
        { rotate: `${Math.sin(t * Math.PI * 3) * 14}deg` },
        { scale: interpolate(t, [0, 0.5, 1], [0.8, 1.3, 0.5]) },
      ],
    };
  });

  const avatarStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: 1 + squash.value * 0.25 }, { scaleY: 1 - squash.value * 0.2 }],
  }));

  const checkProps = useAnimatedProps(() => ({
    strokeDashoffset: CHECK_LENGTH * (1 - check.value),
  }));
  const checkWrapStyle = useAnimatedStyle(() => ({
    opacity: Math.min(check.value * 3, 1),
    transform: [{ scale: interpolate(check.value, [0, 0.4, 1], [0.5, 1.1, 1]) }],
  }));

  const textIn = (delay: number) =>
    reducedMotion ? FadeIn.duration(Durations.base) : FadeInDown.delay(delay).springify().damping(Springs.bouncy.damping);

  return (
    <View
      style={styles.overlay}
      accessibilityViewIsModal
      accessibilityLiveRegion="assertive"
      accessibilityLabel={`Money sent. ${recipientName} got $${amount.toFixed(2)} from you`}
    >
      <Animated.View style={[styles.backdrop, backdropStyle]} pointerEvents="none" />
      <Pressable style={StyleSheet.absoluteFill} onPress={handleBackdropPress} accessibilityLabel="Close" />

      <View style={styles.column} pointerEvents="box-none">
        <View style={styles.stage} pointerEvents="none">
          {!reducedMotion &&
            Array.from({ length: TRAIL_DOTS }, (_, i) => (
              <TrailDot key={i} index={i} flight={flight} startY={startY} color={i % 2 ? colors.warning : colors.primaryLight} />
            ))}

          <Animated.View entering={reducedMotion ? undefined : ZoomIn.springify().damping(Springs.bouncy.damping)}>
            <Animated.View style={[styles.avatar, avatarStyle]}>
              <Text style={styles.avatarText}>{recipientAvatar}</Text>
            </Animated.View>
          </Animated.View>

          {!reducedMotion && <Animated.Text style={[styles.plane, planeStyle]}>💸</Animated.Text>}
          {arrived && !reducedMotion && <AmountFloat amount={amount} color={colors.success} />}
          {arrived && !reducedMotion && (
            <View style={styles.confettiAnchor}>
              <Confetti
                palette={[colors.primary, colors.success, colors.warning, colors.primaryLight]}
                emoji={CONFETTI_EMOJI}
                count={50}
                origin={{ x: 0, y: 0 }}
              />
            </View>
          )}
        </View>

        <Animated.View style={[styles.check, checkWrapStyle]} pointerEvents="none">
          <Svg width={CHECK_SIZE} height={CHECK_SIZE} viewBox="0 0 72 72">
            <Circle cx={36} cy={36} r={34} fill={colors.success} />
            <AnimatedPath
              d={CHECK_PATH}
              stroke="#FFFFFF"
              strokeWidth={7}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              strokeDasharray={CHECK_LENGTH}
              animatedProps={checkProps}
            />
          </Svg>
        </Animated.View>

        {arrived && (
          <>
            <Animated.Text entering={textIn(250)} style={styles.title}>Money sent! 🎉</Animated.Text>
            <Animated.Text entering={textIn(330)} style={styles.subtitle}>
              {recipientName} got ${amount.toFixed(2)} from you
            </Animated.Text>
            <Animated.View entering={textIn(420)} style={styles.balancePill} pointerEvents="none">
              <Text style={styles.balanceLabel}>Your balance</Text>
              <AnimatedNumber value={shownBalance} style={styles.balanceValue} duration={700} />
            </Animated.View>
            <Animated.View entering={textIn(700)} style={styles.done}>
              <Button title="Done" onPress={finish} fullWidth />
            </Animated.View>
          </>
        )}
      </View>
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
    stage: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2,
    },
    avatar: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      borderRadius: AVATAR_SIZE / 2,
      backgroundColor: colors.surface,
      borderWidth: 4,
      borderColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontSize: 56,
    },
    plane: {
      position: 'absolute',
      fontSize: 44,
    },
    confettiAnchor: {
      position: 'absolute',
      left: AVATAR_SIZE / 2,
      top: AVATAR_SIZE / 2,
      width: 0,
      height: 0,
    },
    check: {
      marginTop: Spacing.lg,
    },
    title: {
      ...KidType.title,
      fontSize: 32,
      color: colors.text,
      marginTop: Spacing.md,
      textAlign: 'center',
    },
    subtitle: {
      ...Type.body,
      color: colors.textSecondary,
      marginTop: Spacing.xs,
      textAlign: 'center',
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
