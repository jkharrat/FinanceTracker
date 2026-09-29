import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withTiming,
  withDelay,
  withRepeat,
  useReducedMotion,
  Easing,
} from 'react-native-reanimated';
import { useColors, useIsKid, useTheme } from '../context/ThemeContext';
import { ThemeColors, kidHeroGradient } from '../constants/colors';
import { Radius, Type, Elevation, KidRadius, KidType } from '../constants/theme';
import { Spacing } from '../constants/spacing';
import { Springs, Durations } from '../constants/motion';
import { kidFontStyle } from '../constants/fonts';
import AnimatedNumber from './AnimatedNumber';
import CoinBurst from './CoinBurst';

interface BalanceCardProps {
  label: string;
  value: number;
  /** Small line under the amount, e.g. allowance or member count. */
  caption?: string;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export default function BalanceCard(props: BalanceCardProps) {
  const isKid = useIsKid();
  return isKid ? <KidBalanceCard {...props} /> : <DefaultBalanceCard {...props} />;
}

function DefaultBalanceCard({ label, value, caption, children, style }: BalanceCardProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isNegative = value < 0;

  return (
    <View style={[styles.card, style]}>
      <Text style={styles.label}>{label}</Text>
      <AnimatedNumber value={value} style={[styles.amount, isNegative && styles.amountNegative]} />
      {caption && <Text style={styles.caption}>{caption}</Text>}
      {children && <View style={styles.actions}>{children}</View>}
    </View>
  );
}

interface Delta {
  id: number;
  amount: number;
}

function KidBalanceCard({ label, value, caption, children, style }: BalanceCardProps) {
  const { accentPalette } = useTheme();
  const styles = useMemo(() => createKidStyles(), []);
  const reducedMotion = useReducedMotion();
  const gradient = kidHeroGradient(accentPalette);

  const pop = useSharedValue(1);
  const piggyBob = useSharedValue(0);
  const previous = useRef(value);
  const [delta, setDelta] = useState<Delta | null>(null);
  const [burstKey, setBurstKey] = useState<number | null>(null);

  useEffect(() => {
    if (reducedMotion) return;
    piggyBob.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
  }, [reducedMotion, piggyBob]);

  useEffect(() => {
    const diff = value - previous.current;
    previous.current = value;
    if (Math.abs(diff) < 0.005) return;

    const id = Date.now();
    setDelta({ id, amount: diff });
    if (diff > 0) setBurstKey(id);
    if (!reducedMotion) {
      pop.value = withSequence(withTiming(1.08, { duration: Durations.quick }), withSpring(1, Springs.bouncy));
    }
  }, [value, reducedMotion, pop]);

  const clearBurst = useCallback(() => setBurstKey(null), []);
  const clearDelta = useCallback(() => setDelta(null), []);

  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const piggyStyle = useAnimatedStyle(() => ({ transform: [{ translateY: piggyBob.value }, { rotate: '-8deg' }] }));

  const isNegative = value < 0;

  return (
    <View style={[styles.shadow, style]}>
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
        <View style={[styles.blob, styles.blobLarge]} pointerEvents="none" />
        <View style={[styles.blob, styles.blobSmall]} pointerEvents="none" />
        <Animated.Image
          source={require('../../assets/icon.png')}
          style={[styles.piggy, piggyStyle]}
          accessibilityIgnoresInvertColors
        />

        <Text style={styles.label}>{label}</Text>
        <View style={styles.amountRow}>
          <Animated.View style={popStyle}>
            <AnimatedNumber value={value} style={[styles.amount, isNegative && styles.amountNegative]} />
            {burstKey !== null && <CoinBurst key={burstKey} onComplete={clearBurst} />}
          </Animated.View>
          {delta && <DeltaChip key={delta.id} amount={delta.amount} onDone={clearDelta} />}
        </View>
        {caption && <Text style={styles.caption}>{caption}</Text>}
        {children && <View style={styles.actions}>{children}</View>}
      </LinearGradient>
    </View>
  );
}

function DeltaChip({ amount, onDone }: { amount: number; onDone: () => void }) {
  const t = useSharedValue(0);
  const positive = amount > 0;

  useEffect(() => {
    t.value = withSequence(
      withSpring(1, Springs.bouncy),
      withDelay(1100, withTiming(2, { duration: Durations.slow })),
    );
    const timer = setTimeout(onDone, 1700);
    return () => clearTimeout(timer);
  }, [t, onDone]);

  const style = useAnimatedStyle(() => {
    const appear = Math.min(t.value, 1);
    const leave = Math.max(t.value - 1, 0);
    return {
      opacity: appear * (1 - leave),
      transform: [{ translateY: (1 - appear) * 12 - leave * 14 }, { scale: 0.7 + appear * 0.3 }],
    };
  });

  return (
    <Animated.View
      style={[chipStyles.chip, { backgroundColor: positive ? '#DDF8E8' : '#FDE2E3' }, style]}
      accessibilityLiveRegion="polite"
    >
      <Text style={[chipStyles.text, { color: positive ? '#0B7A3B' : '#C4282E' }]}>
        {positive ? '+' : '−'}${Math.abs(amount).toFixed(2)}
      </Text>
    </Animated.View>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    marginLeft: Spacing.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    alignSelf: 'center',
  },
  text: {
    ...kidFontStyle('800'),
    fontSize: 14,
  },
});

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.inverseSurface,
      borderRadius: Radius.xl,
      padding: Spacing.xxl,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.hairline,
      ...Elevation.card,
    },
    label: {
      ...Type.label,
      color: colors.inverseTextSecondary,
      marginBottom: Spacing.xs,
    },
    amount: {
      ...Type.display,
      color: colors.inverseText,
    },
    amountNegative: {
      color: colors.danger,
    },
    caption: {
      ...Type.label,
      color: colors.inverseTextSecondary,
      marginTop: Spacing.xs,
    },
    actions: {
      flexDirection: 'row',
      gap: Spacing.sm,
      marginTop: Spacing.xl,
    },
  });

const createKidStyles = () =>
  StyleSheet.create({
    shadow: {
      borderRadius: KidRadius.card,
      ...Elevation.raised,
    },
    card: {
      borderRadius: KidRadius.card,
      padding: Spacing.xxl,
      overflow: 'hidden',
    },
    blob: {
      position: 'absolute',
      borderRadius: 999,
      backgroundColor: 'rgba(255, 255, 255, 0.12)',
    },
    blobLarge: {
      width: 220,
      height: 220,
      top: -90,
      right: -60,
    },
    blobSmall: {
      width: 110,
      height: 110,
      bottom: -40,
      right: 70,
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
    },
    piggy: {
      position: 'absolute',
      top: Spacing.xl,
      right: Spacing.xl,
      width: 56,
      height: 56,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: 'rgba(255, 255, 255, 0.35)',
      pointerEvents: 'none',
    },
    label: {
      ...KidType.headline,
      fontSize: 16,
      color: 'rgba(255, 255, 255, 0.85)',
      marginBottom: Spacing.xs,
    },
    amountRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    amount: {
      ...KidType.display,
      color: '#FFFFFF',
    },
    amountNegative: {
      color: '#FFD1D3',
    },
    caption: {
      ...Type.label,
      color: 'rgba(255, 255, 255, 0.8)',
      marginTop: Spacing.xs,
    },
    actions: {
      flexDirection: 'row',
      gap: Spacing.sm,
      marginTop: Spacing.xl,
    },
  });
