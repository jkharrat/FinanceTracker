import React, { useMemo, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { useColors } from '../context/ThemeContext';
import { ThemeColors } from '../constants/colors';
import { Kid, AllowanceFrequency } from '../types';
import AnimatedPressable from './AnimatedPressable';
import AnimatedNumber from './AnimatedNumber';
import { FontFamily } from '../constants/fonts';
import { Spacing } from '../constants/spacing';

interface KidCardProps {
  kid: Kid;
  onPress: () => void;
}

const frequencyLabel: Record<AllowanceFrequency, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
};

export function KidCard({ kid, onPress }: KidCardProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isNegative = kid.balance < 0;

  const goal = kid.savingsGoal;
  const progress = goal ? Math.min(Math.max(kid.balance / goal.targetAmount, 0), 1) : 0;
  const progressPercent = Math.round(progress * 100);

  const accentColor = kid.balance > 0 ? colors.success : kid.balance < 0 ? colors.danger : colors.border;

  const progressAnim = useSharedValue(0);
  useEffect(() => {
    progressAnim.value = withTiming(progressPercent, { duration: 800, easing: Easing.out(Easing.cubic) });
  }, [progressPercent]);
  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressAnim.value}%`,
  }));

  return (
    <AnimatedPressable variant="card" style={[styles.card, { borderLeftColor: accentColor }]} onPress={onPress}>
      <View style={styles.leftSection}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatar}>{kid.avatar}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{kid.name}</Text>
          <Text style={styles.allowance}>
            ${kid.allowanceAmount.toFixed(2)} {frequencyLabel[kid.allowanceFrequency]}
          </Text>
        </View>
      </View>
      <View style={styles.rightSection}>
        <AnimatedNumber
          value={kid.balance}
          style={[styles.balance, kid.balance > 0 && styles.balancePositive, isNegative && styles.balanceNegative]}
        />
        <Text style={styles.balanceLabel}>Balance</Text>
      </View>
      {goal && (
        <View style={styles.goalSection}>
          <View style={styles.goalHeader}>
            <Text style={styles.goalName} numberOfLines={1}>{goal.name}</Text>
            <Text style={styles.goalPercent}>{progressPercent}%</Text>
          </View>
          <View style={styles.progressBarBg}>
            <Animated.View
              style={[
                styles.progressBarFill,
                progressStyle,
                progressPercent >= 100 && styles.progressBarComplete,
              ]}
            />
          </View>
          <Text style={styles.goalAmounts}>
            ${Math.max(kid.balance, 0).toFixed(2)} of ${goal.targetAmount.toFixed(2)}
          </Text>
        </View>
      )}
    </AnimatedPressable>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: Spacing.lg,
      marginBottom: Spacing.md,
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderLeftWidth: 4,
      shadowColor: colors.primaryDark,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 3,
    },
    leftSection: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    avatarContainer: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatar: {
      fontSize: 26,
    },
    info: {
      marginLeft: 14,
      flex: 1,
    },
    name: {
      fontSize: 17,
      fontFamily: FontFamily.semiBold,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 3,
    },
    allowance: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    rightSection: {
      alignItems: 'flex-end',
    },
    balance: {
      fontSize: 20,
      fontFamily: FontFamily.bold,
      fontWeight: '700',
      color: colors.text,
    },
    balancePositive: {
      color: colors.success,
    },
    balanceNegative: {
      color: colors.danger,
    },
    balanceLabel: {
      fontSize: 11,
      color: colors.textLight,
      marginTop: 2,
    },
    goalSection: {
      width: '100%',
      marginTop: Spacing.md,
      paddingTop: Spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
    },
    goalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    goalName: {
      fontSize: 13,
      fontFamily: FontFamily.semiBold,
      fontWeight: '600',
      color: colors.textSecondary,
      flex: 1,
      marginRight: Spacing.sm,
    },
    goalPercent: {
      fontSize: 13,
      fontFamily: FontFamily.bold,
      fontWeight: '700',
      color: colors.primary,
    },
    progressBarBg: {
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.surfaceAlt,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 4,
      backgroundColor: colors.primary,
    },
    progressBarComplete: {
      backgroundColor: colors.success,
    },
    goalAmounts: {
      fontSize: 11,
      color: colors.textLight,
      marginTop: Spacing.xs,
    },
  });
