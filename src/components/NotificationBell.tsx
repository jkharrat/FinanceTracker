import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { useColors } from '../context/ThemeContext';
import AnimatedPressable from './AnimatedPressable';
import { FontFamily } from '../constants/fonts';

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
    <AnimatedPressable variant="button" onPress={handlePress} style={styles.container} hitSlop={8}>
      <Ionicons name="notifications-outline" size={24} color={colors.text} />
      {count > 0 && (
        <View style={[styles.badge, { backgroundColor: colors.danger }]}>
          <Text style={styles.badgeText}>
            {count > 9 ? '9+' : count}
          </Text>
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginRight: 4,
    padding: 4,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
  },
});
