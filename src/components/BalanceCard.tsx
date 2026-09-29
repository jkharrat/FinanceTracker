import React, { useMemo } from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useColors } from '../context/ThemeContext';
import { ThemeColors } from '../constants/colors';
import { Radius, Type, Elevation } from '../constants/theme';
import { Spacing } from '../constants/spacing';
import AnimatedNumber from './AnimatedNumber';

interface BalanceCardProps {
  label: string;
  value: number;
  /** Small line under the amount, e.g. allowance or member count. */
  caption?: string;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export default function BalanceCard({ label, value, caption, children, style }: BalanceCardProps) {
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
