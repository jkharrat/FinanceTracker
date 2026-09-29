import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors, useIsKid } from '../context/ThemeContext';
import { ThemeColors } from '../constants/colors';
import { Transaction, CATEGORIES } from '../types';
import { Radius, Type, KidRadius, KidType } from '../constants/theme';
import { Spacing } from '../constants/spacing';
import AnimatedPressable from './AnimatedPressable';

/** Where the row sits in its date group, so the group reads as one card. */
export type GroupPosition = 'first' | 'middle' | 'last' | 'only';

export function groupPosition(index: number, count: number): GroupPosition {
  if (count <= 1) return 'only';
  if (index === 0) return 'first';
  if (index === count - 1) return 'last';
  return 'middle';
}

interface TransactionItemProps {
  transaction: Transaction;
  onPress?: () => void;
  position?: GroupPosition;
}

const ICON_SIZE = 40;
const KID_ICON_SIZE = 46;

const KID_BUBBLE_TINTS: Record<string, string> = {
  allowance: 'rgba(255, 185, 56, 0.22)',
  fines: 'rgba(240, 68, 75, 0.16)',
  gift: 'rgba(236, 72, 153, 0.16)',
  food: 'rgba(255, 138, 61, 0.18)',
  toys: 'rgba(124, 92, 255, 0.16)',
  clothing: 'rgba(56, 189, 248, 0.18)',
  savings: 'rgba(15, 169, 88, 0.16)',
  education: 'rgba(59, 130, 246, 0.16)',
};
const KID_DEFAULT_TINT = 'rgba(148, 120, 90, 0.14)';

export function kidBubbleTint(category: string) {
  return KID_BUBBLE_TINTS[category] ?? KID_DEFAULT_TINT;
}

export function TransactionItem({ transaction, onPress, position = 'only' }: TransactionItemProps) {
  const colors = useColors();
  const isKid = useIsKid();
  const styles = useMemo(() => createStyles(colors, isKid), [colors, isKid]);

  const isAdd = transaction.type === 'add';
  const date = new Date(transaction.date);
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
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

  const isTop = position === 'first' || position === 'only';
  const isBottom = position === 'last' || position === 'only';

  const containerStyle = [
    styles.container,
    isTop && styles.top,
    isBottom && styles.bottom,
  ];

  const content = (
    <>
      <View
        style={[
          styles.icon,
          isKid && { backgroundColor: kidBubbleTint(transaction.category) },
        ]}
      >
        <Text style={styles.iconEmoji}>{category?.emoji ?? (isAdd ? '💰' : '💸')}</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.description} numberOfLines={1}>
            {transaction.description}
          </Text>
          <Text style={[styles.amount, isAdd && styles.amountAdd]}>
            {isAdd ? '+' : '-'}${transaction.amount.toFixed(2)}
          </Text>
        </View>
        {transferLabel && (
          <Text style={styles.transferLabel} numberOfLines={1}>{transferLabel}</Text>
        )}
        <View style={styles.bottomRow}>
          {category && <Text style={styles.meta}>{category.label}</Text>}
          {category && <Text style={styles.metaDot}>·</Text>}
          <Text style={styles.meta}>
            {formattedDate}, {formattedTime}
          </Text>
        </View>
      </View>
      {!isBottom && <View style={styles.separator} />}
    </>
  );

  if (!onPress) {
    return <View style={containerStyle}>{content}</View>;
  }

  return (
    <AnimatedPressable
      variant="row"
      style={containerStyle}
      hoverBackground={colors.surfaceHover}
      onPress={onPress}
      accessibilityRole="button"
    >
      {content}
    </AnimatedPressable>
  );
}

const createStyles = (colors: ThemeColors, isKid: boolean) => {
  const iconSize = isKid ? KID_ICON_SIZE : ICON_SIZE;
  const groupRadius = isKid ? 22 : Radius.lg;
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: Spacing.xl,
      backgroundColor: colors.surface,
      paddingVertical: isKid ? 14 : Spacing.md,
      paddingHorizontal: Spacing.lg,
      borderLeftWidth: StyleSheet.hairlineWidth,
      borderRightWidth: StyleSheet.hairlineWidth,
      borderColor: colors.hairline,
    },
    top: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopLeftRadius: groupRadius,
      borderTopRightRadius: groupRadius,
    },
    bottom: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomLeftRadius: groupRadius,
      borderBottomRightRadius: groupRadius,
    },
    separator: {
      position: 'absolute',
      left: Spacing.lg + iconSize + Spacing.md,
      right: 0,
      bottom: 0,
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.hairline,
    },
    icon: {
      width: iconSize,
      height: iconSize,
      borderRadius: isKid ? KidRadius.bubble : Radius.md,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing.md,
    },
    iconEmoji: {
      fontSize: isKid ? 22 : 18,
    },
    content: {
      flex: 1,
    },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: Spacing.md,
    },
    description: {
      ...Type.bodyStrong,
      flex: 1,
      color: colors.text,
    },
    transferLabel: {
      ...Type.caption,
      color: colors.textSecondary,
      marginTop: 2,
    },
    bottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      marginTop: 3,
    },
    meta: {
      ...Type.caption,
      color: colors.textLight,
    },
    metaDot: {
      ...Type.caption,
      color: colors.textLight,
    },
    amount: {
      ...(isKid ? KidType.amount : Type.amount),
      color: colors.text,
    },
    amountAdd: {
      color: colors.success,
    },
  });
};
