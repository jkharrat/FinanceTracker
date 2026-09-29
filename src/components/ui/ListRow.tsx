import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../context/ThemeContext';
import { Radius, Type, Elevation } from '../../constants/theme';
import { Spacing } from '../../constants/spacing';
import AnimatedPressable from '../AnimatedPressable';

interface ListRowProps {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  /** `accent` renders a filled primary-colored row for the main call to action. */
  tone?: 'default' | 'accent';
  /** Grouped rows sit inside a Card, so they skip their own surface and border. */
  grouped?: boolean;
  right?: React.ReactNode;
  showChevron?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function ListRow({
  title,
  subtitle,
  icon,
  onPress,
  tone = 'default',
  grouped = false,
  right,
  showChevron = true,
  style,
}: ListRowProps) {
  const colors = useColors();
  const accent = tone === 'accent';

  const bg = accent ? colors.primary : grouped ? 'transparent' : colors.surface;
  const hover = accent ? colors.primaryDark : colors.surfaceHover;
  const fg = accent ? colors.textWhite : colors.text;
  const subFg = accent ? 'rgba(255,255,255,0.75)' : colors.textSecondary;
  const iconBg = accent ? 'rgba(255,255,255,0.18)' : colors.primarySoft;
  const iconFg = accent ? colors.textWhite : colors.primary;
  const chevronFg = accent ? 'rgba(255,255,255,0.8)' : colors.textLight;

  return (
    <AnimatedPressable
      variant="row"
      onPress={onPress}
      disabled={!onPress}
      hoverBackground={hover}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={[
        styles.row,
        { backgroundColor: bg },
        !grouped && styles.standalone,
        !grouped && !accent && { borderColor: colors.hairline, borderWidth: StyleSheet.hairlineWidth },
        style,
      ]}
    >
      {icon && (
        <View style={[styles.icon, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={18} color={iconFg} />
        </View>
      )}
      <View style={styles.text}>
        <Text style={[styles.title, { color: fg }]} numberOfLines={1}>{title}</Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: subFg }]} numberOfLines={1}>{subtitle}</Text>
        )}
      </View>
      {right}
      {showChevron && <Ionicons name="chevron-forward" size={18} color={chevronFg} />}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
  },
  standalone: {
    borderRadius: Radius.lg,
    ...Elevation.card,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: Radius.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
  },
  title: {
    ...Type.bodyStrong,
  },
  subtitle: {
    ...Type.caption,
    marginTop: 2,
  },
});
