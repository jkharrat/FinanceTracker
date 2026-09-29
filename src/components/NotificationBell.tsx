import React, { useEffect, useRef } from 'react';
import { Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
  useReducedMotion,
  ZoomIn,
} from 'react-native-reanimated';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { useColors } from '../context/ThemeContext';
import { IconButton } from './ui';
import { fontStyle } from '../constants/fonts';
import { Springs } from '../constants/motion';

export default function NotificationBell() {
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuth();
  const { unreadCount, getUnreadCountForKid } = useNotifications();
  const reducedMotion = useReducedMotion();

  const count =
    user?.role === 'kid' ? getUnreadCountForKid(user.kidId) : unreadCount;

  const swing = useSharedValue(0);
  const previousCount = useRef(count);

  useEffect(() => {
    const increased = count > previousCount.current;
    previousCount.current = count;
    if (!increased || reducedMotion) return;
    swing.value = withSequence(
      withTiming(18, { duration: 80 }),
      withTiming(-16, { duration: 110 }),
      withTiming(12, { duration: 110 }),
      withTiming(-8, { duration: 110 }),
      withSpring(0, Springs.bouncy),
    );
  }, [count, reducedMotion, swing]);

  const swingStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${swing.value}deg` }],
  }));

  const handlePress = () => {
    if (user?.role === 'admin') {
      router.push('/(admin)/notifications');
    } else if (user?.role === 'kid') {
      router.push('/(kid)/notifications');
    }
  };

  return (
    <Animated.View style={[styles.swing, swingStyle]}>
      <IconButton
        icon="notifications-outline"
        onPress={handlePress}
        accessibilityLabel={count > 0 ? `Notifications, ${count} unread` : 'Notifications'}
      >
        {count > 0 && (
          <Animated.View
            key={count}
            entering={reducedMotion ? undefined : ZoomIn.springify().damping(Springs.bouncy.damping)}
            style={[styles.badge, { backgroundColor: colors.primary, borderColor: colors.background }]}
          >
            <Text style={styles.badgeText}>
              {count > 9 ? '9+' : count}
            </Text>
          </Animated.View>
        )}
      </IconButton>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  swing: {
    transformOrigin: 'top',
  },
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
