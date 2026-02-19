import React, { useMemo } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '../../src/context/NotificationContext';
import { useAuth } from '../../src/context/AuthContext';
import { useColors } from '../../src/context/ThemeContext';
import { ThemeColors } from '../../src/constants/colors';
import NotificationItem from '../../src/components/NotificationItem';
import { EmptyState } from '../../src/components/EmptyState';
import { FontFamily } from '../../src/constants/fonts';
import { Spacing } from '../../src/constants/spacing';

export default function KidNotificationsScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const { getNotificationsForKid, getUnreadCountForKid, markAsRead, markAllAsRead, clearAll } =
    useNotifications();

  const kidId = user?.role === 'kid' ? user.kidId : '';
  const notifications = getNotificationsForKid(kidId);
  const unreadCount = getUnreadCountForKid(kidId);

  const handleNotificationPress = async (id: string) => {
    await markAsRead(id);
  };

  return (
    <View style={styles.container}>
      {notifications.length > 0 && (
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => markAllAsRead(kidId)}
            disabled={unreadCount === 0}
          >
            <Ionicons
              name="checkmark-done-outline"
              size={18}
              color={unreadCount > 0 ? colors.primary : colors.textLight}
            />
            <Text
              style={[
                styles.actionText,
                { color: unreadCount > 0 ? colors.primary : colors.textLight },
              ]}
            >
              Mark all read
            </Text>
          </TouchableOpacity>
          <View style={styles.countBadge}>
            <Text style={[styles.countText, { color: colors.textSecondary }]}>
              {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      )}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NotificationItem
            notification={item}
            onPress={handleNotificationPress}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="🔔"
            title="No Notifications"
            subtitle="You're all caught up! Notifications about your allowance, transactions, transfers, and savings goals will appear here."
          />
        }
        contentContainerStyle={notifications.length === 0 ? styles.emptyList : undefined}
      />
      {notifications.length > 0 && (
        <TouchableOpacity
          style={[styles.clearButton, { borderTopColor: colors.borderLight }]}
          onPress={() => clearAll(kidId)}
        >
          <Ionicons name="trash-outline" size={16} color={colors.danger} />
          <Text style={[styles.clearText, { color: colors.danger }]}>Clear All</Text>
        </TouchableOpacity>
      )}
    </View>
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
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
      backgroundColor: colors.surface,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: Spacing.xs,
      paddingHorizontal: Spacing.sm,
    },
    actionText: {
      fontSize: 14,
      fontFamily: FontFamily.medium,
      fontWeight: '500',
    },
    countBadge: {
      paddingVertical: Spacing.xs,
      paddingHorizontal: Spacing.sm,
    },
    countText: {
      fontSize: 13,
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
      fontSize: 14,
      fontFamily: FontFamily.medium,
      fontWeight: '500',
    },
  });
