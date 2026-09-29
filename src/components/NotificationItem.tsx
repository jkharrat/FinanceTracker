import React, { useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  cancelAnimation,
  useReducedMotion,
  interpolate,
  runOnJS,
  Easing,
  FadeIn,
  FadeInDown,
  FadeInRight,
  LinearTransition,
  ZoomIn,
} from 'react-native-reanimated';
import { AppNotification, NotificationType } from '../types';
import { useColors, useIsKid } from '../context/ThemeContext';
import { ThemeColors } from '../constants/colors';
import { FontFamily } from '../constants/fonts';
import { KidRadius, KidType, Elevation } from '../constants/theme';
import { Spacing } from '../constants/spacing';
import { Durations, Springs } from '../constants/motion';
import { getRelativeTime } from '../utils/notifications';
import { hapticLight } from '../utils/haptics';
import AnimatedPressable from './AnimatedPressable';

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
  /** Kid only. Position in the list, for the entrance stagger. */
  index?: number;
  /** Kid only. Slide in on mount; false for rows that were already on screen. */
  animateIn?: boolean;
  /** Kid only. Arrived while the list was open: drops in from the top with a fading highlight. */
  fresh?: boolean;
  /** Kid only. When set, the unread dot turns into a check after this many ms ("mark all read" sweep). */
  sweepDelay?: number | null;
  /** Kid only. Called when an unread row is swiped left (native). */
  onSwipeRead?: (id: string) => void;
}

export default function NotificationItem(props: NotificationItemProps) {
  const isKid = useIsKid();
  return isKid ? <KidNotificationItem {...props} /> : <DefaultNotificationItem {...props} />;
}

function DefaultNotificationItem({ notification, onPress }: NotificationItemProps) {
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

const MAX_STAGGERED = 8;
const SWIPE_THRESHOLD = 72;
const SWIPE_FLICK = 110;
const SWIPE_VELOCITY = 700;
const HIGHLIGHT_MS = 1800;
const PULSE_MS = 1100;
const SWIPE_ENABLED = Platform.OS !== 'web';

// Reanimated's web layout transitions animate from stale DOM snapshots; only reflow on native.
const rowLayout = Platform.OS === 'web'
  ? undefined
  : LinearTransition.springify().damping(Springs.gentle.damping).stiffness(Springs.gentle.stiffness);

/** Unread dot with a soft glow that keeps breathing outward. */
function PulseDot({ color, dimAfter }: { color: string; dimAfter: number | null }) {
  const reducedMotion = useReducedMotion();
  const pulse = useSharedValue(0);
  const dim = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) return;
    pulse.value = withRepeat(withTiming(1, { duration: PULSE_MS, easing: Easing.out(Easing.quad) }), -1);
    return () => cancelAnimation(pulse);
  }, [reducedMotion, pulse]);

  useEffect(() => {
    if (dimAfter === null) return;
    dim.value = reducedMotion ? 1 : withDelay(dimAfter, withTiming(1, { duration: Durations.base }));
  }, [dimAfter, reducedMotion, dim]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: (1 - pulse.value) * 0.45 * (1 - dim.value),
    transform: [{ scale: 1 + pulse.value * 1.6 }],
  }));
  const dotStyle = useAnimatedStyle(() => ({
    opacity: 1 - dim.value,
    transform: [{ scale: 1 - dim.value * 0.6 }],
  }));

  return (
    <View style={kidStyles.dotWrap} pointerEvents="none" testID="unread-dot">
      {!reducedMotion && <Animated.View style={[kidStyles.dot, kidStyles.glow, { backgroundColor: color }, glowStyle]} />}
      <Animated.View style={[kidStyles.dot, { backgroundColor: color }, dotStyle]} />
    </View>
  );
}

/** Sweep check that pops in where the unread dot was. */
function SweepCheck({ delay, color }: { delay: number; color: string }) {
  const reducedMotion = useReducedMotion();
  return (
    <Animated.View
      entering={reducedMotion ? undefined : ZoomIn.delay(delay).springify().damping(Springs.bouncy.damping)}
      style={kidStyles.check}
      testID="sweep-check"
      pointerEvents="none"
    >
      <Ionicons name="checkmark-circle" size={20} color={color} />
    </Animated.View>
  );
}

function FreshHighlight({ color }: { color: string }) {
  const fade = useSharedValue(1);
  useEffect(() => {
    fade.value = withDelay(Durations.slow, withTiming(0, { duration: HIGHLIGHT_MS }));
  }, [fade]);
  const style = useAnimatedStyle(() => ({ opacity: fade.value * 0.35 }));
  return (
    <Animated.View
      pointerEvents="none"
      testID="fresh-highlight"
      style={[StyleSheet.absoluteFill, { backgroundColor: color }, style]}
    />
  );
}

function KidNotificationItem({
  notification,
  onPress,
  index = 0,
  animateIn = false,
  fresh = false,
  sweepDelay = null,
  onSwipeRead,
}: NotificationItemProps) {
  const colors = useColors();
  const styles = useMemo(() => createKidStyles(colors), [colors]);
  const reducedMotion = useReducedMotion();
  const icon = getNotificationIcon(notification.type);
  const iconColor = colors[icon.colorKey];
  const unread = !notification.read;
  const swipeable = SWIPE_ENABLED && unread && !!onSwipeRead;

  const offset = useSharedValue(0);

  const pan = useMemo(() => {
    const markRead = () => {
      hapticLight();
      onSwipeRead?.(notification.id);
    };
    return Gesture.Pan()
      .enabled(swipeable)
      .activeOffsetX([-12, 12])
      .failOffsetY([-10, 10])
      .onUpdate((e) => {
        offset.value = Math.min(0, e.translationX);
      })
      .onEnd((e) => {
        if (offset.value < -SWIPE_THRESHOLD || e.velocityX < -SWIPE_VELOCITY) {
          offset.value = withSequence(
            withTiming(-SWIPE_FLICK, { duration: 110 }),
            withSpring(0, Springs.bouncy),
          );
          runOnJS(markRead)();
        } else {
          offset.value = withSpring(0, Springs.snappy);
        }
      });
  }, [swipeable, offset, onSwipeRead, notification.id]);

  const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.value }] }));
  const actionStyle = useAnimatedStyle(() => ({
    opacity: interpolate(offset.value, [-SWIPE_THRESHOLD, -16, 0], [1, 0.4, 0], 'clamp'),
    transform: [{ scale: interpolate(offset.value, [-SWIPE_THRESHOLD, 0], [1, 0.6], 'clamp') }],
  }));

  const entering = reducedMotion
    ? FadeIn.duration(Durations.base)
    : fresh
      ? FadeInDown.springify().damping(Springs.bouncy.damping)
      : animateIn
        ? FadeInRight.delay(Math.min(index, MAX_STAGGERED) * Durations.stagger)
            .springify()
            .damping(Springs.gentle.damping)
            .stiffness(Springs.gentle.stiffness)
        : undefined;

  const row = (
    <Animated.View style={rowStyle}>
      <AnimatedPressable
        variant="row"
        style={[styles.card, unread && styles.cardUnread]}
        hoverBackground={colors.surfaceHover}
        onPress={() => onPress(notification.id)}
        accessibilityRole="button"
        accessibilityLabel={`${notification.title}. ${notification.message}${unread ? '. Unread' : ''}`}
        accessibilityHint={unread ? 'Marks as read' : undefined}
      >
        {fresh && <FreshHighlight color={colors.primary} />}
        <View style={[styles.iconContainer, { backgroundColor: `${iconColor}22` }]}>
          <Ionicons name={icon.name} size={22} color={iconColor} />
        </View>
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, !unread && styles.titleRead]} numberOfLines={1}>
              {notification.title}
            </Text>
            <Text style={styles.time}>{getRelativeTime(notification.date)}</Text>
          </View>
          <Text style={styles.message} numberOfLines={2}>
            {notification.message}
          </Text>
        </View>
        {unread && (
          <View style={styles.status}>
            <PulseDot color={colors.primary} dimAfter={sweepDelay} />
            {sweepDelay !== null && <SweepCheck delay={sweepDelay} color={colors.success} />}
          </View>
        )}
      </AnimatedPressable>
    </Animated.View>
  );

  return (
    <Animated.View entering={entering} layout={rowLayout} style={styles.slot}>
      {swipeable && (
        <Animated.View style={[styles.swipeAction, actionStyle]} pointerEvents="none" testID="swipe-action">
          <Ionicons name="checkmark-done" size={20} color={colors.primary} />
          <Text style={styles.swipeActionText}>Read</Text>
        </Animated.View>
      )}
      {SWIPE_ENABLED ? <GestureDetector gesture={pan}>{row}</GestureDetector> : row}
    </Animated.View>
  );
}

const kidStyles = StyleSheet.create({
  dotWrap: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  glow: {
    position: 'absolute',
  },
  check: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});

const createKidStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    slot: {
      marginHorizontal: Spacing.lg,
      marginBottom: Spacing.sm,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.lg,
      paddingVertical: 14,
      borderRadius: 22,
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.hairline,
      overflow: 'hidden',
      ...Elevation.kid,
    },
    cardUnread: {
      borderColor: colors.primary,
      borderWidth: 1.5,
    },
    iconContainer: {
      width: 44,
      height: 44,
      borderRadius: KidRadius.bubble,
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
      ...KidType.headline,
      fontSize: 15,
      flex: 1,
      marginRight: Spacing.sm,
      color: colors.text,
    },
    titleRead: {
      color: colors.textSecondary,
    },
    time: {
      fontSize: 12,
      color: colors.textLight,
    },
    message: {
      fontSize: 13,
      lineHeight: 18,
      color: colors.textSecondary,
    },
    status: {
      width: 20,
      height: 20,
    },
    swipeAction: {
      ...StyleSheet.absoluteFillObject,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 6,
      paddingRight: Spacing.xl,
      borderRadius: 22,
      backgroundColor: colors.primarySoft,
    },
    swipeActionText: {
      ...KidType.button,
      fontSize: 14,
      color: colors.primary,
    },
  });
