import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppNotification, NotificationType } from '../types';
import { useColors } from '../context/ThemeContext';
import { ThemeColors } from '../constants/colors';
import { FontFamily } from '../constants/fonts';
import { Spacing } from '../constants/spacing';

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function getNotificationIcon(type: NotificationType): {
  name: keyof typeof Ionicons.glyphMap;
  colorKey: keyof ThemeColors;
} {
  switch (type) {
    case 'allowance_received':
      return { name: 'cash-outline', colorKey: 'success' };
    case 'transaction_added':
      return { name: 'add-circle-outline', colorKey: 'primary' };
    case 'transaction_updated':
      return { name: 'create-outline', colorKey: 'warning' };
    case 'transaction_deleted':
      return { name: 'trash-outline', colorKey: 'danger' };
    case 'transfer_received':
      return { name: 'swap-horizontal-outline', colorKey: 'primary' };
    case 'goal_milestone':
      return { name: 'trophy-outline', colorKey: 'warning' };
    default:
      return { name: 'notifications-outline', colorKey: 'textSecondary' };
  }
}

interface NotificationItemProps {
  notification: AppNotification;
  onPress: (id: string) => void;
}

export default function NotificationItem({ notification, onPress }: NotificationItemProps) {
  const colors = useColors();
  const icon = getNotificationIcon(notification.type);
  const iconColor = colors[icon.colorKey];

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: notification.read ? colors.surface : colors.surfaceAlt,
          borderBottomColor: colors.borderLight,
        },
      ]}
      onPress={() => onPress(notification.id)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${iconColor}18` }]}>
        <Ionicons name={icon.name} size={22} color={iconColor} />
      </View>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text
            style={[
              styles.title,
              { color: colors.text },
              !notification.read && styles.titleUnread,
            ]}
            numberOfLines={1}
          >
            {notification.title}
          </Text>
          <Text style={[styles.time, { color: colors.textLight }]}>
            {getRelativeTime(notification.date)}
          </Text>
        </View>
        <Text
          style={[styles.message, { color: colors.textSecondary }]}
          numberOfLines={2}
        >
          {notification.message}
        </Text>
      </View>
      {!notification.read && (
        <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  content: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  title: {
    fontSize: 15,
    fontFamily: FontFamily.medium,
    fontWeight: '500',
    flex: 1,
    marginRight: Spacing.sm,
  },
  titleUnread: {
    fontFamily: FontFamily.bold,
    fontWeight: '700',
  },
  time: {
    fontSize: 12,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
