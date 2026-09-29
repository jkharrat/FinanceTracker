import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, FlatList, StyleSheet, Text, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useReducedMotion } from 'react-native-reanimated';
import { useNotifications } from '../../src/context/NotificationContext';
import { useColors } from '../../src/context/ThemeContext';
import { ThemeColors } from '../../src/constants/colors';
import NotificationItem from '../../src/components/NotificationItem';
import AnimatedPressable from '../../src/components/AnimatedPressable';
import { useEntranceWindow } from '../../src/components/AnimatedListItem';
import { EmptyState } from '../../src/components/EmptyState';
import { KidType } from '../../src/constants/theme';
import { Spacing } from '../../src/constants/spacing';
import { hapticLight, hapticSuccess } from '../../src/utils/haptics';

/** Time between rows as the "mark all read" check moves down the list, capped for long lists. */
const SWEEP_STEP_MS = 90;
const SWEEP_MAX_MS = 1100;
const SWEEP_SETTLE_MS = 350;

export default function AdminNotificationsScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const { notifications, markAsRead, markAllAsRead, clearAll, unreadCount } = useNotifications();

  const entranceOpen = useEntranceWindow(true, 700);
  const seenIds = useRef<Set<string>>(new Set());
  const [freshIds, setFreshIds] = useState<Set<string>>(() => new Set());
  const [sweepStep, setSweepStep] = useState<number | null>(null);
  const sweepTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const added = notifications.filter((n) => !seenIds.current.has(n.id)).map((n) => n.id);
    if (added.length === 0) return;
    added.forEach((id) => seenIds.current.add(id));
    if (entranceOpen) return;
    setFreshIds((prev) => new Set([...prev, ...added]));
    hapticLight();
  }, [notifications, entranceOpen]);

  useEffect(() => () => {
    if (sweepTimer.current) clearTimeout(sweepTimer.current);
  }, []);

  const handleNotificationPress = useCallback(async (id: string) => {
    await markAsRead(id);
  }, [markAsRead]);

  const handleMarkAll = useCallback(() => {
    if (unreadCount === 0 || sweepStep !== null) return;
    if (reducedMotion) {
      markAllAsRead();
      return;
    }
    const step = Math.min(SWEEP_STEP_MS, SWEEP_MAX_MS / Math.max(notifications.length, 1));
    setSweepStep(step);
    sweepTimer.current = setTimeout(() => {
      hapticSuccess();
      markAllAsRead().finally(() => setSweepStep(null));
    }, step * notifications.length + SWEEP_SETTLE_MS);
  }, [unreadCount, sweepStep, reducedMotion, markAllAsRead, notifications.length]);

  const canMarkAll = unreadCount > 0 && sweepStep === null;

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.actionBar}>
        {notifications.length > 0 ? (
          <AnimatedPressable
            variant="button"
            style={styles.actionButton}
            onPress={handleMarkAll}
            disabled={!canMarkAll}
            accessibilityLabel="Mark all read"
          >
            <Ionicons
              name="checkmark-done-outline"
              size={18}
              color={canMarkAll ? colors.primary : colors.textLight}
            />
            <Text style={[styles.actionText, { color: canMarkAll ? colors.primary : colors.textLight }]}>
              Mark all read
            </Text>
          </AnimatedPressable>
        ) : (
          <View />
        )}
        <AnimatedPressable
          variant="button"
          style={[styles.actionButton, styles.settingsButton]}
          hoverBackground={colors.border}
          onPress={() => router.push('/(admin)/notification-settings')}
          accessibilityLabel="Notification settings"
        >
          <Ionicons name="settings-outline" size={18} color={colors.textSecondary} />
          <Text style={[styles.actionText, { color: colors.textSecondary }]}>Settings</Text>
        </AnimatedPressable>
      </View>
      {notifications.length > 0 && (
        <Text style={styles.countText}>
          {unreadCount > 0 ? `${unreadCount} unread · ` : ''}
          {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
          {Platform.OS !== 'web' && unreadCount > 0 ? ' · Swipe left to mark read' : ''}
        </Text>
      )}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <NotificationItem
            notification={item}
            onPress={handleNotificationPress}
            onSwipeRead={handleNotificationPress}
            index={index}
            animateIn={entranceOpen}
            fresh={freshIds.has(item.id)}
            sweepDelay={sweepStep === null ? null : index * sweepStep}
          />
        )}
        extraData={[sweepStep, freshIds, entranceOpen]}
        ListEmptyComponent={
          <EmptyState
            icon="🔔"
            title="All caught up!"
            subtitle="Allowances, transactions, transfers, and savings goal milestones for the whole family will show up here."
          />
        }
        contentContainerStyle={notifications.length === 0 ? styles.emptyList : styles.list}
      />
      {notifications.length > 0 && (
        <AnimatedPressable
          variant="row"
          style={[styles.clearButton, { borderTopColor: colors.borderLight }]}
          onPress={() => clearAll()}
          accessibilityLabel="Clear all notifications"
        >
          <Ionicons name="trash-outline" size={16} color={colors.danger} />
          <Text style={[styles.clearText, { color: colors.danger }]}>Clear All</Text>
        </AnimatedPressable>
      )}
    </GestureHandlerRootView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    actionBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: Spacing.lg,
      paddingTop: 10,
      paddingBottom: Spacing.xs,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 6,
      paddingHorizontal: Spacing.md,
      borderRadius: 14,
      backgroundColor: colors.primarySoft,
    },
    settingsButton: {
      backgroundColor: colors.surfaceAlt,
    },
    actionText: {
      ...KidType.button,
      fontSize: 14,
    },
    countText: {
      fontSize: 12,
      color: colors.textLight,
      paddingHorizontal: Spacing.xl,
      marginBottom: Spacing.sm,
    },
    list: {
      paddingTop: Spacing.xs,
      paddingBottom: Spacing.lg,
    },
    emptyList: {
      flexGrow: 1,
      justifyContent: 'center',
    },
    clearButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 14,
      borderTopWidth: 1,
      backgroundColor: colors.surface,
    },
    clearText: {
      ...KidType.button,
      fontSize: 14,
    },
  });
