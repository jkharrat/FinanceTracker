import React from 'react';
import { Text, StyleSheet, StyleProp, ViewStyle, ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, useIsKid } from '../../context/ThemeContext';
import { ThemeColors } from '../../constants/colors';
import { Radius, Type, KidRadius, KidType, KID_BUTTON_LEDGE } from '../../constants/theme';
import AnimatedPressable from '../AnimatedPressable';

/**
 * `onInverse` is the secondary style for use on dark inverse surfaces like the balance card.
 * `onHero` is a solid white button for the colorful kid balance card.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'onInverse' | 'onHero';
export type ButtonSize = 'sm' | 'md';

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Renders instead of `icon`, receiving the variant's foreground color. Used for animated icons. */
  renderIcon?: (color: string, size: number) => React.ReactNode;
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
    case 'onHero':
      return { bg: '#FFFFFF', hover: '#F4F2FF', fg: '#2A1E14' };
  }
}

function kidLedgeColor(colors: ThemeColors, variant: ButtonVariant): string | undefined {
  switch (variant) {
    case 'primary':
      return colors.primaryDark;
    case 'ghost':
      return undefined;
    case 'onInverse':
    case 'onHero':
      return 'rgba(0, 0, 0, 0.18)';
    default:
      return 'rgba(0, 0, 0, 0.10)';
  }
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  renderIcon,
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  accessibilityLabel,
}: ButtonProps) {
  const colors = useColors();
  const isKid = useIsKid();
  const { bg, hover, fg } = palette(colors, variant);
  const inactive = disabled || loading;
  const sizeStyle = size === 'sm' ? styles.sm : styles.md;
  const textSize = isKid
    ? size === 'sm' ? styles.kidTextSm : styles.kidTextMd
    : size === 'sm' ? styles.textSm : styles.textMd;
  const ledge = isKid && !inactive ? kidLedgeColor(colors, variant) : undefined;

  return (
    <AnimatedPressable
      variant="button"
      onPress={onPress}
      disabled={inactive}
      hoverBackground={inactive || hover === bg ? undefined : hover}
      pressDepth={ledge ? KID_BUTTON_LEDGE / 2 : 0}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={[
        styles.base,
        sizeStyle,
        isKid && (size === 'sm' ? styles.kidSm : styles.kidMd),
        { backgroundColor: bg },
        ledge ? { borderBottomWidth: KID_BUTTON_LEDGE, borderBottomColor: ledge } : null,
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        style,
      ]}
    >
      <View style={[styles.content, loading && styles.hidden]}>
        {renderIcon
          ? renderIcon(fg, size === 'sm' ? 16 : 18)
          : icon && <Ionicons name={icon} size={size === 'sm' ? 16 : 18} color={fg} />}
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
  kidSm: {
    height: 42,
    borderRadius: KidRadius.bubble,
    paddingHorizontal: 16,
  },
  kidMd: {
    height: 54,
    borderRadius: KidRadius.button,
    paddingHorizontal: 22,
  },
  kidTextSm: {
    ...KidType.button,
    fontSize: 15,
  },
  kidTextMd: {
    ...KidType.button,
    fontSize: 17,
  },
});
