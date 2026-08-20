import React, { useEffect, useMemo } from 'react';
import { Text, View, StyleSheet, StyleProp, TextStyle, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  useReducedMotion,
  Easing,
} from 'react-native-reanimated';

interface AnimatedNumberProps {
  value: number;
  prefix?: string;
  style?: StyleProp<TextStyle>;
  duration?: number;
  decimals?: number;
}

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

/** Each less-significant digit keeps rolling a little longer, which reads as counting up. */
const STAGGER_MS = 70;
const LINE_HEIGHT_RATIO = 1.25;
const DEFAULT_FONT_SIZE = 16;

/**
 * Box-model props belong on the wrapper. Left on the glyphs they would space out
 * the stacked digits inside each column and break the roll alignment.
 */
const LAYOUT_KEYS = new Set([
  'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight',
  'marginVertical', 'marginHorizontal', 'padding', 'paddingTop', 'paddingBottom',
  'paddingLeft', 'paddingRight', 'paddingVertical', 'paddingHorizontal',
  'alignSelf', 'position', 'top', 'bottom', 'left', 'right', 'zIndex', 'flex',
  'width', 'minWidth', 'maxWidth',
]);

function formatValue(v: number, decimals: number, prefix: string) {
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  return `${prefix}${sign}$${abs.toFixed(decimals)}`;
}

interface DigitColumnProps {
  digit: number;
  height: number;
  duration: number;
  textStyle: StyleProp<TextStyle>;
}

function DigitColumn({ digit, height, duration, textStyle }: DigitColumnProps) {
  const offset = useSharedValue(0);

  useEffect(() => {
    offset.value = withTiming(-digit * height, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [digit, height, duration, offset]);

  const stripStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.value }],
  }));

  return (
    <View style={[styles.column, { height }]}>
      <Animated.View style={stripStyle}>
        {DIGITS.map((d) => (
          <Text key={d} style={textStyle}>
            {d}
          </Text>
        ))}
      </Animated.View>
    </View>
  );
}

export default function AnimatedNumber({
  value,
  prefix = '',
  style,
  duration = 600,
  decimals = 2,
}: AnimatedNumberProps) {
  const reducedMotion = useReducedMotion();
  const text = formatValue(value, decimals, prefix);

  const { height, glyphStyle, layoutStyle } = useMemo(() => {
    const flat = StyleSheet.flatten(style) ?? {};
    const fontSize = typeof flat.fontSize === 'number' ? flat.fontSize : DEFAULT_FONT_SIZE;
    const lineHeight = Math.ceil(fontSize * LINE_HEIGHT_RATIO);

    const glyph: Record<string, unknown> = {};
    const layout: Record<string, unknown> = {};
    Object.entries(flat).forEach(([key, val]) => {
      (LAYOUT_KEYS.has(key) ? layout : glyph)[key] = val;
    });

    return {
      height: lineHeight,
      layoutStyle: layout as ViewStyle,
      glyphStyle: {
        ...(glyph as TextStyle),
        height: lineHeight,
        lineHeight,
        textAlign: 'center' as const,
        fontVariant: ['tabular-nums' as const],
      },
    };
  }, [style]);

  if (reducedMotion) {
    return <Text style={style}>{text}</Text>;
  }

  let significance = 0;

  return (
    <View style={[styles.row, layoutStyle]} accessible accessibilityLabel={text}>
      {text.split('').map((char, index) => {
        const digit = DIGITS.indexOf(char);
        if (digit === -1) {
          return (
            <Text key={index} style={glyphStyle}>
              {char}
            </Text>
          );
        }
        const columnDuration = duration + significance * STAGGER_MS;
        significance += 1;
        return (
          <DigitColumn
            key={index}
            digit={digit}
            height={height}
            duration={columnDuration}
            textStyle={glyphStyle}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  column: {
    overflow: 'hidden',
  },
});
