import React, { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { useColors } from '../../context/ThemeContext';
import { Radius, Type } from '../../constants/theme';
import { Durations, Easings } from '../../constants/motion';
import AnimatedPressable from '../AnimatedPressable';

export type ChipTone = 'neutral' | 'success' | 'danger';

interface ChipProps {
  label: string;
  emoji?: string;
  selected: boolean;
  onPress: () => void;
  tone?: ChipTone;
}

export default function Chip({ label, emoji, selected, onPress, tone = 'neutral' }: ChipProps) {
  const colors = useColors();
  const progress = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(selected ? 1 : 0, { duration: Durations.base, easing: Easings.out });
  }, [selected, progress]);

  const activeBg =
    tone === 'success' ? colors.success : tone === 'danger' ? colors.danger : colors.text;
  const activeFg = tone === 'neutral' ? colors.background : colors.textWhite;
  const restBg = colors.surface;
  const restBorder = colors.border;
  const restFg = colors.textSecondary;

  const containerStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [restBg, activeBg]),
    borderColor: interpolateColor(progress.value, [0, 1], [restBorder, activeBg]),
  }));

  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [restFg, activeFg]),
  }));

  return (
    <AnimatedPressable
      variant="row"
      onPress={onPress}
      style={styles.pressable}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
    >
      <Animated.View style={[styles.chip, containerStyle]}>
        {emoji && <Text style={styles.emoji}>{emoji}</Text>}
        <Animated.Text style={[styles.label, labelStyle]}>{label}</Animated.Text>
      </Animated.View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: Radius.pill,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  emoji: {
    fontSize: 13,
  },
  label: {
    ...Type.label,
  },
});
