import React, { useEffect, useMemo } from 'react';
import { Text, StyleSheet, Platform, Pressable } from 'react-native';
import Animated, { SlideInUp, SlideOutUp, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../context/ThemeContext';
import { ThemeColors } from '../constants/colors';
import { FontFamily } from '../constants/fonts';
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

export default function Toast({ id, type, message, onDismiss }: ToastProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const colorMap: Record<ToastType, { bg: string; icon: string; text: string }> = {
    success: { bg: colors.successLight, icon: colors.successDark, text: colors.successDark },
    error: { bg: colors.dangerLight, icon: colors.dangerDark, text: colors.dangerDark },
    info: { bg: colors.primaryLight + '30', icon: colors.primary, text: colors.primary },
  };

  const palette = colorMap[type];

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(id), 3000);
    return () => clearTimeout(timer);
  }, [id, onDismiss]);

  return (
    <Animated.View
      entering={SlideInUp.springify().damping(20).stiffness(150)}
      exiting={SlideOutUp.duration(200).withCallback(() => {})}
      style={[
        styles.container,
        { backgroundColor: palette.bg, marginTop: insets.top + Spacing.sm },
      ]}
    >
      <Pressable style={styles.content} onPress={() => onDismiss(id)}>
        <Ionicons name={ICON_MAP[type]} size={22} color={palette.icon} />
        <Text style={[styles.message, { color: palette.text }]} numberOfLines={2}>
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
      borderRadius: 14,
      zIndex: 9999,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 6,
      ...(Platform.OS === 'web' ? { maxWidth: 480, alignSelf: 'center' as const } : {}),
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      gap: Spacing.md,
    },
    message: {
      flex: 1,
      fontSize: 14,
      fontFamily: FontFamily.semiBold,
      fontWeight: '600',
      lineHeight: 20,
    },
  });
