import React from 'react';
import { Text, StyleSheet, StyleProp, ViewStyle, ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../context/ThemeContext';
import { ThemeColors } from '../../constants/colors';
import { Radius, Type } from '../../constants/theme';
import AnimatedPressable from '../AnimatedPressable';

/** `onInverse` is the secondary style for use on dark inverse surfaces like the balance card. */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'onInverse';
export type ButtonSize = 'sm' | 'md';

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

function palette(colors: ThemeColors, variant: ButtonVariant) {
  switch (variant) {
    case 'primary':
      return { bg: colors.primary, hover: colors.primaryDark, fg: colors.textWhite };
    case 'secondary':
      return { bg: colors.surfaceAlt, hover: colors.border, fg: colors.text };
    case 'ghost':
      return { bg: 'transparent', hover: colors.primarySoft, fg: colors.primary };
    case 'destructive':
      return { bg: colors.dangerLight, hover: colors.dangerLight, fg: colors.dangerDark };
    case 'onInverse':
      return { bg: 'rgba(255, 255, 255, 0.12)', hover: 'rgba(255, 255, 255, 0.2)', fg: colors.inverseText };
  }
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  accessibilityLabel,
}: ButtonProps) {
  const colors = useColors();
  const { bg, hover, fg } = palette(colors, variant);
  const inactive = disabled || loading;
  const sizeStyle = size === 'sm' ? styles.sm : styles.md;
  const textSize = size === 'sm' ? styles.textSm : styles.textMd;

  return (
    <AnimatedPressable
      variant="button"
      onPress={onPress}
      disabled={inactive}
      hoverBackground={inactive || hover === bg ? undefined : hover}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={[
        styles.base,
        sizeStyle,
        { backgroundColor: bg },
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        style,
      ]}
    >
      <View style={[styles.content, loading && styles.hidden]}>
        {icon && <Ionicons name={icon} size={size === 'sm' ? 16 : 18} color={fg} />}
        <Text style={[textSize, { color: fg }]} numberOfLines={1}>
          {title}
        </Text>
      </View>
      {loading && <ActivityIndicator style={StyleSheet.absoluteFill} color={fg} size="small" />}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  sm: {
    height: 36,
    paddingHorizontal: 14,
  },
  md: {
    height: 48,
    paddingHorizontal: 20,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  disabled: {
    opacity: 0.45,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hidden: {
    opacity: 0,
  },
  textSm: {
    ...Type.label,
    fontSize: 14,
  },
  textMd: {
    ...Type.bodyStrong,
    fontSize: 15,
  },
});
