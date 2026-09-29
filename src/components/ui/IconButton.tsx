import React from 'react';
import { StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../context/ThemeContext';
import AnimatedPressable from '../AnimatedPressable';

interface IconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  accessibilityLabel: string;
  color?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export default function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  color,
  size = 36,
  style,
  children,
}: IconButtonProps) {
  const colors = useColors();

  return (
    <AnimatedPressable
      variant="button"
      onPress={onPress}
      hoverBackground={colors.border}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.button,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surfaceAlt },
        style,
      ]}
    >
      <Ionicons name={icon} size={Math.round(size * 0.53)} color={color ?? colors.text} />
      {children}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
