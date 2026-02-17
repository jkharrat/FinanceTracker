import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useColors } from '../context/ThemeContext';
import { ThemeColors } from '../constants/colors';
import { Transaction, CATEGORIES } from '../types';

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
      <View style={[styles.indicator, isAdd ? styles.indicatorAdd : styles.indicatorSubtract]} />
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
            {category && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryEmoji}>{category.emoji}</Text>
                <Text style={styles.categoryLabel}>{category.label}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.amount, isAdd ? styles.amountAdd : styles.amountSubtract]}>
            {isAdd ? '+' : '-'}${transaction.amount.toFixed(2)}
          </Text>
        </View>
        <Text style={styles.date}>
          {formattedDate} at {formattedTime}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'stretch',
      marginBottom: 1,
      backgroundColor: colors.surface,
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    indicator: {
      width: 3,
      borderRadius: 2,
      marginRight: 14,
    },
    indicatorAdd: {
      backgroundColor: colors.success,
    },
    indicatorSubtract: {
      backgroundColor: colors.danger,
    },
    content: {
      flex: 1,
    },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 4,
    },
    descriptionRow: {
      flex: 1,
      marginRight: 12,
    },
    description: {
      fontSize: 15,
      fontWeight: '500',
      color: colors.text,
      marginBottom: 4,
    },
    transferLabel: {
      fontSize: 12,
      fontWeight: '600',
      marginBottom: 4,
    },
    transferLabelAdd: {
      color: colors.successDark,
    },
    transferLabelSubtract: {
      color: colors.dangerDark,
    },
    categoryBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceAlt,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
      alignSelf: 'flex-start',
      gap: 4,
    },
    categoryEmoji: {
      fontSize: 11,
    },
    categoryLabel: {
      fontSize: 11,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    amount: {
      fontSize: 16,
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
      marginTop: 2,
    },
  });
