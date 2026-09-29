import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useColors } from '../../context/ThemeContext';
import { Radius, Elevation } from '../../constants/theme';
import { Spacing } from '../../constants/spacing';
import AnimatedPressable from '../AnimatedPressable';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  padded?: boolean;
  accessibilityLabel?: string;
}

export default function Card({ children, style, onPress, padded = true, accessibilityLabel }: CardProps) {
  const colors = useColors();
  const cardStyle = [
    styles.card,
    { backgroundColor: colors.surface, borderColor: colors.hairline },
    padded && styles.padded,
    style,
  ];

  if (onPress) {
    return (
      <AnimatedPressable
        variant="card"
        style={cardStyle}
        hoverBackground={colors.surfaceHover}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        {children}
      </AnimatedPressable>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    ...Elevation.card,
  },
  padded: {
    padding: Spacing.lg,
  },
});
