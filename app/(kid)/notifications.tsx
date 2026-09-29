import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, FlatList, StyleSheet, Text, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useReducedMotion } from 'react-native-reanimated';
import { useNotifications } from '../../src/context/NotificationContext';
import { useAuth } from '../../src/context/AuthContext';
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

export default function KidNotificationsScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const reducedMotion = useReducedMotion();
  const { user } = useAuth();
  const { getNotificationsForKid, getUnreadCountForKid, markAsRead, markAllAsRead, clearAll } =
    useNotifications();

  const kidId = user?.role === 'kid' ? user.kidId : '';
  const notifications = getNotificationsForKid(kidId);
  const unreadCount = getUnreadCountForKid(kidId);

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
      markAllAsRead(kidId);
      return;
    }
    const step = Math.min(SWEEP_STEP_MS, SWEEP_MAX_MS / Math.max(notifications.length, 1));
    setSweepStep(step);
    sweepTimer.current = setTimeout(() => {
      hapticSuccess();
      markAllAsRead(kidId).finally(() => setSweepStep(null));
    }, step * notifications.length + SWEEP_SETTLE_MS);
  }, [unreadCount, sweepStep, reducedMotion, markAllAsRead, kidId, notifications.length]);

  const canMarkAll = unreadCount > 0 && sweepStep === null;

  return (
    <GestureHandlerRootView style={styles.container}>
      {notifications.length > 0 && (
        <View style={styles.actionBar}>
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
          <Text style={styles.countText}>
            {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
          </Text>
        </View>
      )}
      {Platform.OS !== 'web' && unreadCount > 0 && (
        <Text style={styles.hint}>Swipe left on a message to mark it read</Text>
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
            title="No Notifications"
            subtitle="You're all caught up! Notifications about your allowance, transactions, transfers, and savings goals will appear here."
          />
        }
        contentContainerStyle={notifications.length === 0 ? styles.emptyList : styles.list}
      />
      {notifications.length > 0 && (
        <AnimatedPressable
          variant="row"
          style={[styles.clearButton, { borderTopColor: colors.borderLight }]}
          onPress={() => clearAll(kidId)}
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
      paddingVertical: 10,
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
    actionText: {
      ...KidType.button,
      fontSize: 14,
    },
    countText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    hint: {
      fontSize: 12,
      color: colors.textLight,
      textAlign: 'center',
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
