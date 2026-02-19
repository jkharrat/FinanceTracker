import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  useReducedMotion,
} from 'react-native-reanimated';
import { useColors } from '../context/ThemeContext';
import { Spacing } from '../constants/spacing';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

function SkeletonBox({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  const colors = useColors();
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    if (!reducedMotion) {
      opacity.value = withRepeat(
        withTiming(0.7, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    }
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
    <View style={[styles.balanceCard, { backgroundColor: colors.surfaceAlt }]}>
      <SkeletonBox width={100} height={14} borderRadius={7} style={styles.center} />
      <SkeletonBox width={180} height={36} borderRadius={10} style={[styles.center, { marginTop: Spacing.sm }]} />
    </View>
  );
}

export function KidCardSkeleton() {
  const colors = useColors();
  return (
    <View style={[styles.kidCard, { backgroundColor: colors.surface }]}>
      <View style={styles.kidCardRow}>
        <SkeletonBox width={52} height={52} borderRadius={16} />
        <View style={styles.kidCardInfo}>
          <SkeletonBox width={120} height={16} />
          <SkeletonBox width={80} height={12} style={{ marginTop: 6 }} />
        </View>
        <View style={styles.kidCardRight}>
          <SkeletonBox width={70} height={20} />
          <SkeletonBox width={40} height={10} style={{ marginTop: 4 }} />
        </View>
      </View>
    </View>
  );
}

export function TransactionSkeleton() {
  const colors = useColors();
  return (
    <View style={[styles.txRow, { backgroundColor: colors.surface }]}>
      <SkeletonBox width={3} height={40} borderRadius={2} />
      <View style={styles.txContent}>
        <View style={styles.txTopRow}>
          <SkeletonBox width={140} height={14} />
          <SkeletonBox width={60} height={14} />
        </View>
        <SkeletonBox width={100} height={10} style={{ marginTop: 6 }} />
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
  center: {
    alignSelf: 'center',
  },
  balanceCard: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
    borderRadius: 20,
    padding: Spacing.xxl,
    alignItems: 'center',
  },
  kidCard: {
    borderRadius: 16,
    padding: Spacing.lg,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  kidCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  kidCardInfo: {
    flex: 1,
    marginLeft: 14,
  },
  kidCardRight: {
    alignItems: 'flex-end',
  },
  txRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    gap: 14,
  },
  txContent: {
    flex: 1,
  },
  txTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
