import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../context/ThemeContext';
import { ThemeColors } from '../constants/colors';
import { Kid, AllowanceFrequency } from '../types';
import AnimatedNumber from './AnimatedNumber';
import { Card } from './ui';
import { Radius, Type, KidType } from '../constants/theme';
import { Springs } from '../constants/motion';
import { Spacing } from '../constants/spacing';

interface KidCardProps {
  kid: Kid;
  onPress: () => void;
}

const frequencyLabel: Record<AllowanceFrequency, string> = {
  weekly: 'week',
  monthly: 'month',
};

function ProgressBar({ progress, color, trackColor }: { progress: number; color: string; trackColor: string }) {
  const value = useSharedValue(0);

  useEffect(() => {
    value.value = withSpring(progress, Springs.bouncy);
  }, [progress, value]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${Math.round(value.value * 1000) / 10}%`,
  }));

  return (
    <View style={[styles.track, { backgroundColor: trackColor }]}>
      <Animated.View style={[styles.fill, { backgroundColor: color }, fillStyle]} />
    </View>
  );
}

export function KidCard({ kid, onPress }: KidCardProps) {
  const colors = useColors();
  const themed = useMemo(() => createThemedStyles(colors), [colors]);
  const isNegative = kid.balance < 0;

  const goal = kid.savingsGoal;
  const progress = goal ? Math.min(Math.max(kid.balance / goal.targetAmount, 0), 1) : 0;
  const progressPercent = Math.round(progress * 100);
  const goalComplete = progressPercent >= 100;

  return (
    <Card onPress={onPress} style={styles.card} accessibilityLabel={`${kid.name}, balance ${kid.balance.toFixed(2)}`}>
      <View style={styles.row}>
        <View style={themed.avatar}>
          <Text style={styles.avatarText}>{kid.avatar}</Text>
        </View>
        <View style={styles.info}>
          <Text style={themed.name} numberOfLines={1}>{kid.name}</Text>
          <View style={themed.allowancePill}>
            <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
            <Text style={themed.allowance}>
              ${kid.allowanceAmount.toFixed(2)} / {frequencyLabel[kid.allowanceFrequency]}
            </Text>
          </View>
        </View>
        <AnimatedNumber
          value={kid.balance}
          style={[themed.balance, isNegative && themed.balanceNegative]}
        />
        <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
      </View>

      {goal && (
        <View style={themed.goalSection}>
          <View style={styles.goalHeader}>
            <Text style={styles.goalEmoji}>{goalComplete ? '🏆' : '🎯'}</Text>
            <Text style={themed.goalName} numberOfLines={1}>{goal.name}</Text>
            <Text style={[themed.goalPercent, goalComplete && themed.goalPercentComplete]}>
              {progressPercent}%
            </Text>
          </View>
          <ProgressBar
            progress={progress}
            color={goalComplete ? colors.success : colors.primary}
            trackColor={colors.surfaceAlt}
          />
          <Text style={themed.goalAmounts}>
            ${Math.max(kid.balance, 0).toFixed(2)} of ${goal.targetAmount.toFixed(2)}
          </Text>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatarText: {
    fontSize: 28,
  },
  info: {
    flex: 1,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  goalEmoji: {
    fontSize: 16,
  },
  track: {
    height: 10,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.pill,
  },
});

const createThemedStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 3,
      borderColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    name: {
      ...KidType.headline,
      fontSize: 19,
      color: colors.text,
    },
    allowancePill: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 4,
      marginTop: 4,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      borderRadius: Radius.pill,
      backgroundColor: colors.surfaceAlt,
    },
    allowance: {
      ...Type.caption,
      color: colors.textSecondary,
    },
    balance: {
      ...KidType.amount,
      fontSize: 21,
      color: colors.success,
    },
    balanceNegative: {
      color: colors.danger,
    },
    goalSection: {
      marginTop: Spacing.lg,
      padding: Spacing.md,
      borderRadius: 18,
      backgroundColor: colors.background,
    },
    goalName: {
      ...KidType.headline,
      fontSize: 15,
      color: colors.text,
      flex: 1,
      marginRight: Spacing.sm,
    },
    goalPercent: {
      ...KidType.amount,
      fontSize: 15,
      color: colors.primary,
    },
    goalPercentComplete: {
      color: colors.success,
    },
    goalAmounts: {
      ...Type.caption,
      color: colors.textLight,
      marginTop: Spacing.sm,
    },
  });
