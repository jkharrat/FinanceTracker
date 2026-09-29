import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
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
} from 'react-native-reanimated';
import { useColors } from '../context/ThemeContext';
import { ThemeColors } from '../constants/colors';
import { Type, KidType } from '../constants/theme';
import { Spacing } from '../constants/spacing';
import { Springs } from '../constants/motion';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const CHECK_SIZE = 96;
const CHECK_PATH = 'M28 50 L43 64 L69 36';
const CHECK_LENGTH = 60;
const FLIGHT_MS = 650;
const CHECK_DELAY = FLIGHT_MS + 150;

interface SendSuccessProps {
  amount: number;
  recipientName: string;
  recipientAvatar: string;
  onDone: () => void;
}

/** Full-screen "money sent" moment: a coin arcs to the recipient, then a check draws itself. */
export default function SendSuccess({ amount, recipientName, recipientAvatar, onDone }: SendSuccessProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const reducedMotion = useReducedMotion();

  const flight = useSharedValue(reducedMotion ? 1 : 0);
  const avatarPop = useSharedValue(1);
  const check = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (!reducedMotion) {
      flight.value = withTiming(1, { duration: FLIGHT_MS, easing: Easing.inOut(Easing.quad) });
      avatarPop.value = withDelay(FLIGHT_MS, withSequence(withTiming(1.18, { duration: 120 }), withSpring(1, Springs.bouncy)));
      check.value = withDelay(CHECK_DELAY, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }));
    }
    const timer = setTimeout(onDone, reducedMotion ? 1100 : 1900);
    return () => clearTimeout(timer);
  }, [reducedMotion, flight, avatarPop, check, onDone]);

  const coinStyle = useAnimatedStyle(() => {
    const t = flight.value;
    return {
      opacity: interpolate(t, [0, 0.1, 0.9, 1], [0, 1, 1, 0]),
      transform: [
        { translateX: interpolate(t, [0, 1], [-90, 0]) },
        // Parabolic arc: rises above the straight line, then drops into the avatar.
        { translateY: interpolate(t, [0, 1], [220, 0]) - Math.sin(t * Math.PI) * 90 },
        { rotate: `${t * 540}deg` },
        { scale: interpolate(t, [0, 0.5, 1], [0.8, 1.2, 0.6]) },
      ],
    };
  });

  const avatarStyle = useAnimatedStyle(() => ({ transform: [{ scale: avatarPop.value }] }));

  const checkWrapStyle = useAnimatedStyle(() => ({
    opacity: Math.min(check.value * 3, 1),
    transform: [{ scale: interpolate(check.value, [0, 0.4, 1], [0.6, 1.08, 1]) }],
  }));

  const checkProps = useAnimatedProps(() => ({
    strokeDashoffset: CHECK_LENGTH * (1 - check.value),
  }));

  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      style={styles.overlay}
      accessibilityLiveRegion="assertive"
      accessibilityLabel={`Sent $${amount.toFixed(2)} to ${recipientName}`}
    >
      <View style={styles.stage}>
        <Animated.View style={[styles.avatar, avatarStyle]}>
          <Text style={styles.avatarText}>{recipientAvatar}</Text>
        </Animated.View>
        <Animated.Text style={[styles.coin, coinStyle]}>🪙</Animated.Text>
      </View>

      <Animated.View style={checkWrapStyle}>
        <Svg width={CHECK_SIZE} height={CHECK_SIZE} viewBox="0 0 96 96">
          <Circle cx={48} cy={48} r={44} fill={colors.success} />
          <AnimatedPath
            d={CHECK_PATH}
            stroke="#FFFFFF"
            strokeWidth={9}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            strokeDasharray={CHECK_LENGTH}
            animatedProps={checkProps}
          />
        </Svg>
      </Animated.View>

      <Text style={styles.title}>Sent ${amount.toFixed(2)}!</Text>
      <Text style={styles.subtitle}>{recipientName} got your money 🎉</Text>
    </Animated.View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      padding: Spacing.xl,
      zIndex: 10,
    },
    stage: {
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.xl,
    },
    avatar: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: colors.surface,
      borderWidth: 4,
      borderColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontSize: 48,
    },
    coin: {
      position: 'absolute',
      fontSize: 34,
    },
    title: {
      ...KidType.title,
      fontSize: 30,
      color: colors.text,
      marginTop: Spacing.lg,
    },
    subtitle: {
      ...Type.body,
      color: colors.textSecondary,
      marginTop: Spacing.xs,
    },
  });
