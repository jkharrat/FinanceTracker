import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../context/ThemeContext';
import { ThemeColors } from '../constants/colors';
import { SavingsGoal } from '../types';
import { Type } from '../constants/theme';
import { Spacing } from '../constants/spacing';
import GoalRing from './GoalRing';
import { Card } from './ui';

interface GoalCardProps {
  goal: SavingsGoal;
  balance: number;
  onPress?: () => void;
}

export default function GoalCard({ goal, balance, onPress }: GoalCardProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const percent = Math.round(Math.min(Math.max(balance / goal.targetAmount, 0), 1) * 100);
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
