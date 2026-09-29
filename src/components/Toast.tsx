import React, { useEffect, useMemo } from 'react';
import { Text, StyleSheet, Platform, Pressable, View } from 'react-native';
import Animated, { Easing, FadeOut, Keyframe } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../context/ThemeContext';
import { ThemeColors } from '../constants/colors';
import { Radius, Type, Elevation } from '../constants/theme';
import { Durations } from '../constants/motion';
import { Spacing } from '../constants/spacing';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  onDismiss: (id: string) => void;
}

const ICON_MAP: Record<ToastType, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error: 'alert-circle',
  info: 'information-circle',
};

const toastIn = new Keyframe({
  0: { opacity: 0, transform: [{ translateY: -16 }, { scale: 0.97 }] },
  100: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }], easing: Easing.out(Easing.cubic) },
}).duration(Durations.slow);

export default function Toast({ id, type, message, onDismiss }: ToastProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const iconColor: Record<ToastType, string> = {
    success: colors.success,
    error: colors.danger,
    info: colors.primary,
  };

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(id), 3000);
    return () => clearTimeout(timer);
  }, [id, onDismiss]);

  return (
    <Animated.View
      entering={toastIn}
      exiting={FadeOut.duration(Durations.base)}
      style={[styles.container, { marginTop: insets.top + Spacing.sm }]}
    >
      <Pressable style={styles.content} onPress={() => onDismiss(id)}>
        <View style={styles.iconWrap}>
          <Ionicons name={ICON_MAP[type]} size={20} color={iconColor[type]} />
        </View>
        <Text style={styles.message} numberOfLines={2}>
          {message}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      top: 0,
      left: Spacing.lg,
      right: Spacing.lg,
      borderRadius: Radius.lg,
      zIndex: 9999,
      backgroundColor: colors.surfaceElevated,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.hairline,
      ...Elevation.raised,
      ...(Platform.OS === 'web' ? { maxWidth: 420, alignSelf: 'center' as const } : {}),
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.lg,
      paddingVertical: 14,
      gap: Spacing.md,
    },
    iconWrap: {
      width: 20,
      alignItems: 'center',
    },
    message: {
      ...Type.bodyStrong,
      flex: 1,
      fontSize: 14,
      color: colors.text,
    },
  });
