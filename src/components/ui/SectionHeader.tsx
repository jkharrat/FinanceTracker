import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useColors } from '../../context/ThemeContext';
import { Type } from '../../constants/theme';
import { Spacing } from '../../constants/spacing';

interface SectionHeaderProps {
  title: string;
  right?: React.ReactNode;
  /** `large` is for screen-level section titles, `small` for list group headers like dates. */
  size?: 'large' | 'small';
  style?: StyleProp<ViewStyle>;
}

export default function SectionHeader({ title, right, size = 'small', style }: SectionHeaderProps) {
  const colors = useColors();
  const large = size === 'large';

  return (
    <View style={[styles.row, large ? styles.rowLarge : styles.rowSmall, style]}>
      <Text
        style={[large ? styles.large : styles.small, { color: large ? colors.text : colors.textSecondary }]}
        accessibilityRole="header"
      >
        {title}
      </Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
  },
  rowLarge: {
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  rowSmall: {
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  large: {
    ...Type.headline,
    fontSize: 20,
    letterSpacing: -0.4,
  },
  small: {
    ...Type.overline,
  },
});
