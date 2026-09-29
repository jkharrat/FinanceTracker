import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withTiming,
  useReducedMotion,
  ZoomIn,
} from 'react-native-reanimated';
import { useColors, useIsKid } from '../context/ThemeContext';
import { ThemeColors, KidGoalGradient } from '../constants/colors';
import { SavingsGoal } from '../types';
import { Radius, Type, KidType } from '../constants/theme';
import { Spacing } from '../constants/spacing';
import { Springs, Durations } from '../constants/motion';
import { hapticLight } from '../utils/haptics';
import GoalRing from './GoalRing';
import { Card } from './ui';

interface GoalCardProps {
  goal: SavingsGoal;
  balance: number;
  onPress?: () => void;
}

const MILESTONES = [25, 50, 75];

function percentOf(goal: SavingsGoal, balance: number) {
  return Math.round(Math.min(Math.max(balance / goal.targetAmount, 0), 1) * 100);
}

export default function GoalCard(props: GoalCardProps) {
  const isKid = useIsKid();
  return isKid ? <KidGoalCard {...props} /> : <DefaultGoalCard {...props} />;
}

function DefaultGoalCard({ goal, balance, onPress }: GoalCardProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const percent = percentOf(goal, balance);
  const complete = percent >= 100;

  return (
    <Card onPress={onPress} accessibilityLabel={onPress ? 'Edit savings goal' : undefined}>
      <View style={styles.row}>
        <GoalRing
          percent={percent}
          size={64}
          strokeWidth={6}
          color={complete ? colors.success : colors.primary}
          trackColor={colors.surfaceAlt}
        >
          <Text style={[styles.percent, complete && styles.percentComplete]}>{percent}%</Text>
        </GoalRing>
        <View style={styles.text}>
          <Text style={styles.label}>{complete ? 'Goal reached' : 'Savings goal'}</Text>
          <Text style={styles.name} numberOfLines={2}>{goal.name}</Text>
          <Text style={styles.amounts}>
            ${Math.max(balance, 0).toFixed(2)} of ${goal.targetAmount.toFixed(2)}
          </Text>
        </View>
        {onPress && <Ionicons name="chevron-forward" size={16} color={colors.textLight} />}
      </View>
    </Card>
  );
}

function KidGoalCard({ goal, balance, onPress }: GoalCardProps) {
  const colors = useColors();
  const styles = useMemo(() => createKidStyles(colors), [colors]);
  const reducedMotion = useReducedMotion();
  const percent = percentOf(goal, balance);
  const complete = percent >= 100;
  const remaining = Math.max(goal.targetAmount - Math.max(balance, 0), 0);

  const pulse = useSharedValue(1);
  const glow = useSharedValue(0);
  const previousPercent = useRef(percent);

  useEffect(() => {
    const prev = previousPercent.current;
    previousPercent.current = percent;
    const crossed = MILESTONES.some((m) => prev < m && percent >= m);
    if (!crossed || reducedMotion) return;
    hapticLight();
    pulse.value = withSequence(withTiming(1.14, { duration: Durations.base }), withSpring(1, Springs.celebrate));
    glow.value = withSequence(withTiming(1, { duration: Durations.base }), withTiming(0, { duration: 900 }));
  }, [percent, reducedMotion, pulse, glow]);

  const ringStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value * 0.5,
    transform: [{ scale: 1 + glow.value * 0.25 }],
  }));

  const ringGradient: [string, string] = complete
    ? [colors.success, colors.success]
    : [KidGoalGradient.start, colors.primary];

  return (
    <Card onPress={onPress} accessibilityLabel={onPress ? 'Edit savings goal' : undefined}>
      <View style={styles.row}>
        <Animated.View style={ringStyle}>
          <Animated.View style={[styles.glow, { backgroundColor: complete ? colors.success : colors.primary }, glowStyle]} />
          <GoalRing
            percent={percent}
            size={88}
            strokeWidth={11}
            color={colors.primary}
            gradient={ringGradient}
            trackColor={colors.surfaceAlt}
            showMilestones
            bouncy
          >
            <Text style={styles.ringEmoji}>{complete ? '🏆' : '🎯'}</Text>
          </GoalRing>
        </Animated.View>
        <View style={styles.text}>
          <Text style={styles.label}>Saving for</Text>
          <Text style={styles.name} numberOfLines={2}>{goal.name}</Text>
          {complete ? (
            <Animated.View entering={reducedMotion ? undefined : ZoomIn.springify().damping(8)} style={styles.badge}>
              <Text style={styles.badgeText}>Goal reached! 🎉</Text>
            </Animated.View>
          ) : (
            <>
              <Text style={styles.toGo}>
                Only <Text style={styles.toGoAmount}>${remaining.toFixed(2)}</Text> to go!
              </Text>
              <Text style={styles.amounts}>
                {percent}% · ${Math.max(balance, 0).toFixed(2)} of ${goal.targetAmount.toFixed(2)}
              </Text>
            </>
          )}
        </View>
        {onPress && <Ionicons name="pencil" size={16} color={colors.textLight} />}
      </View>
    </Card>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.lg,
    },
    text: {
      flex: 1,
    },
    percent: {
      ...Type.label,
      fontSize: 14,
      fontVariant: ['tabular-nums'],
      color: colors.text,
    },
    percentComplete: {
      color: colors.success,
    },
    label: {
      ...Type.caption,
      color: colors.textSecondary,
      marginBottom: 2,
    },
    name: {
      ...Type.headline,
      color: colors.text,
      marginBottom: 2,
    },
    amounts: {
      ...Type.label,
      fontVariant: ['tabular-nums'],
      color: colors.textSecondary,
    },
  });

const createKidStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.lg,
    },
    glow: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: 88,
      height: 88,
      borderRadius: 44,
    },
    ringEmoji: {
      fontSize: 30,
    },
    text: {
      flex: 1,
    },
    label: {
      ...Type.label,
      color: colors.textSecondary,
      marginBottom: 2,
    },
    name: {
      ...KidType.headline,
      fontSize: 20,
      color: colors.text,
      marginBottom: 4,
    },
    toGo: {
      ...Type.bodyStrong,
      color: colors.text,
    },
    toGoAmount: {
      ...KidType.amount,
      color: colors.primary,
    },
    amounts: {
      ...Type.caption,
      fontVariant: ['tabular-nums'],
      color: colors.textLight,
      marginTop: 2,
    },
    badge: {
      alignSelf: 'flex-start',
      backgroundColor: colors.successLight,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: Radius.pill,
      marginTop: 2,
    },
    badgeText: {
      ...KidType.button,
      fontSize: 14,
      color: colors.successDark,
    },
  });
