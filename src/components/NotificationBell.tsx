import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { useColors } from '../context/ThemeContext';
import { IconButton } from './ui';
import { fontStyle } from '../constants/fonts';

export default function NotificationBell() {
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuth();
  const { unreadCount, getUnreadCountForKid } = useNotifications();

  const count =
    user?.role === 'kid' ? getUnreadCountForKid(user.kidId) : unreadCount;

  const handlePress = () => {
    if (user?.role === 'admin') {
      router.push('/(admin)/notifications');
    } else if (user?.role === 'kid') {
      router.push('/(kid)/notifications');
    }
  };

  return (
    <IconButton
      icon="notifications-outline"
      onPress={handlePress}
      accessibilityLabel={count > 0 ? `Notifications, ${count} unread` : 'Notifications'}
    >
      {count > 0 && (
        <View style={[styles.badge, { backgroundColor: colors.primary, borderColor: colors.background }]}>
          <Text style={styles.badgeText}>
            {count > 9 ? '9+' : count}
          </Text>
        </View>
      )}
    </IconButton>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    ...fontStyle('700'),
    color: '#FFFFFF',
    fontSize: 10,
  },
});
