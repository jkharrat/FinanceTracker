import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useColors } from '../context/ThemeContext';
import { ThemeColors } from '../constants/colors';
import { Transaction, CATEGORIES } from '../types';
import { FontFamily } from '../constants/fonts';
import { Spacing } from '../constants/spacing';

interface TransactionItemProps {
  transaction: Transaction;
  onPress?: () => void;
}

export function TransactionItem({ transaction, onPress }: TransactionItemProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const isAdd = transaction.type === 'add';
  const date = new Date(transaction.date);
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const category = CATEGORIES.find((c) => c.id === transaction.category);
  const iconBg = isAdd ? colors.successLight : colors.dangerLight;
  const iconColor = isAdd ? colors.successDark : colors.dangerDark;

  const transferLabel = transaction.transfer
    ? isAdd
      ? `Received from ${transaction.transfer.fromKidName}`
      : `Sent to ${transaction.transfer.toKidName}`
    : null;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={onPress ? 0.6 : 1}
      disabled={!onPress}
    >
      <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
        <Text style={styles.iconEmoji}>{category?.emoji ?? (isAdd ? '💰' : '💸')}</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.descriptionRow}>
            <Text style={styles.description} numberOfLines={1}>
              {transaction.description}
            </Text>
            {transferLabel && (
              <Text style={[styles.transferLabel, isAdd ? styles.transferLabelAdd : styles.transferLabelSubtract]}>
                {transferLabel}
              </Text>
            )}
          </View>
          <Text style={[styles.amount, isAdd ? styles.amountAdd : styles.amountSubtract]}>
            {isAdd ? '+' : '-'}${transaction.amount.toFixed(2)}
          </Text>
        </View>
        <View style={styles.bottomRow}>
          {category && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryLabel}>{category.label}</Text>
            </View>
          )}
          <Text style={styles.date}>
            {formattedDate} at {formattedTime}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: Spacing.xl,
      marginBottom: 6,
      backgroundColor: colors.surface,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      borderRadius: 12,
      shadowColor: colors.primaryDark,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 4,
      elevation: 1,
    },
    iconCircle: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing.md,
    },
    iconEmoji: {
      fontSize: 18,
    },
    content: {
      flex: 1,
    },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: Spacing.xs,
    },
    descriptionRow: {
      flex: 1,
      marginRight: Spacing.md,
    },
    description: {
      fontSize: 15,
      fontFamily: FontFamily.semiBold,
      fontWeight: '600',
      color: colors.text,
    },
    transferLabel: {
      fontSize: 12,
      fontFamily: FontFamily.medium,
      fontWeight: '500',
      marginTop: 2,
    },
    transferLabelAdd: {
      color: colors.successDark,
    },
    transferLabelSubtract: {
      color: colors.dangerDark,
    },
    bottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    categoryBadge: {
      backgroundColor: colors.surfaceAlt,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      borderRadius: 6,
    },
    categoryLabel: {
      fontSize: 11,
      fontFamily: FontFamily.medium,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    amount: {
      fontSize: 16,
      fontFamily: FontFamily.bold,
      fontWeight: '700',
    },
    amountAdd: {
      color: colors.successDark,
    },
    amountSubtract: {
      color: colors.dangerDark,
    },
    date: {
      fontSize: 12,
      color: colors.textLight,
    },
  });
