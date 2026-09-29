import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  cancelAnimation,
  Easing,
  useReducedMotion,
} from 'react-native-reanimated';
import { useColors } from '../context/ThemeContext';
import { Radius } from '../constants/theme';
import { Spacing } from '../constants/spacing';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

function SkeletonBox({ width = '100%', height = 16, borderRadius = Radius.sm, style }: SkeletonProps) {
  const colors = useColors();
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    if (!reducedMotion) {
      opacity.value = withRepeat(
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    }
    return () => {
      cancelAnimation(opacity);
    };
  }, [reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius, backgroundColor: colors.surfaceAlt },
        animatedStyle,
        style,
      ]}
    />
  );
}

export function BalanceCardSkeleton() {
  const colors = useColors();
  return (
    <View style={[styles.balanceCard, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
      <SkeletonBox width={90} height={12} />
      <SkeletonBox width={200} height={40} borderRadius={Radius.md} style={{ marginTop: Spacing.md }} />
    </View>
  );
}

export function KidCardSkeleton() {
  const colors = useColors();
  return (
    <View style={[styles.kidCard, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
      <View style={styles.kidCardRow}>
        <SkeletonBox width={44} height={44} borderRadius={22} />
        <View style={styles.kidCardInfo}>
          <SkeletonBox width={120} height={14} />
          <SkeletonBox width={80} height={10} style={{ marginTop: 8 }} />
        </View>
        <SkeletonBox width={64} height={18} />
      </View>
    </View>
  );
}

export function TransactionSkeleton() {
  const colors = useColors();
  return (
    <View style={[styles.txRow, { backgroundColor: colors.surface }]}>
      <SkeletonBox width={40} height={40} borderRadius={Radius.md} />
      <View style={styles.txContent}>
        <View style={styles.txTopRow}>
          <SkeletonBox width={140} height={14} />
          <SkeletonBox width={60} height={14} />
        </View>
        <SkeletonBox width={100} height={10} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

export function AdminDashboardSkeleton() {
  return (
    <View style={styles.container}>
      <BalanceCardSkeleton />
      <View style={{ paddingHorizontal: Spacing.xl, gap: Spacing.md }}>
        <KidCardSkeleton />
        <KidCardSkeleton />
        <KidCardSkeleton />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Spacing.sm,
  },
  balanceCard: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
    borderRadius: Radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.xxl,
  },
  kidCard: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg,
  },
  kidCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  kidCardInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  txContent: {
    flex: 1,
  },
  txTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
