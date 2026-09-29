import React, { useMemo } from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle, Platform, StyleSheet } from 'react-native';
import { hapticLight } from '../utils/haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  useReducedMotion,
  interpolate,
  interpolateColor,
} from 'react-native-reanimated';
import { Springs, Durations } from '../constants/motion';

const VARIANTS = {
  button: { press: 0.96, hoverOpacity: 0.88 },
  card: { press: 0.985, hoverOpacity: 0.94 },
  row: { press: 0.98, hoverOpacity: 0.92 },
} as const;

export type AnimatedPressableVariant = keyof typeof VARIANTS;

interface AnimatedPressableProps extends Omit<PressableProps, 'style'> {
  variant?: AnimatedPressableVariant;
  style?: StyleProp<ViewStyle>;
  /** Background to fade to on web hover. Without it, hover dims the element slightly. */
  hoverBackground?: string;
  children: React.ReactNode;
}

const AnimatedPressableView = Animated.createAnimatedComponent(Pressable);

const isWeb = Platform.OS === 'web';
const webCursor = isWeb ? { cursor: 'pointer' as const } : {};

export default function AnimatedPressable({
  variant = 'button',
  style,
  hoverBackground,
  children,
  onPressIn,
  onPressOut,
  disabled,
  ...rest
}: AnimatedPressableProps) {
  const reducedMotion = useReducedMotion();
  const pressed = useSharedValue(0);
  const hovered = useSharedValue(0);

  const { press: pressScale, hoverOpacity } = VARIANTS[variant];
  const { restBackground, restOpacity } = useMemo(() => {
    const flat = StyleSheet.flatten(style) ?? {};
    return {
      restBackground: typeof flat.backgroundColor === 'string' ? flat.backgroundColor : undefined,
      restOpacity: typeof flat.opacity === 'number' ? flat.opacity : 1,
    };
  }, [style]);
  const tintOnHover = isWeb && !!hoverBackground && !!restBackground;

  const animatedStyle = useAnimatedStyle(() => {
    const scale = reducedMotion ? 1 : interpolate(pressed.value, [0, 1], [1, pressScale]);
    if (tintOnHover) {
      return {
        transform: [{ scale }],
        backgroundColor: interpolateColor(hovered.value, [0, 1], [restBackground!, hoverBackground!]),
      };
    }
    return {
      transform: [{ scale }],
      opacity: restOpacity * interpolate(hovered.value, [0, 1], [1, hoverOpacity]),
    };
  });

  const handlePressIn: PressableProps['onPressIn'] = (e) => {
    pressed.value = withSpring(1, Springs.snappy);
    if (variant === 'button') hapticLight();
    onPressIn?.(e);
  };

  const handlePressOut: PressableProps['onPressOut'] = (e) => {
    pressed.value = withSpring(0, Springs.snappy);
    onPressOut?.(e);
  };

  const webHoverProps = isWeb
    ? {
        onHoverIn: () => { hovered.value = withTiming(1, { duration: Durations.quick }); },
        onHoverOut: () => { hovered.value = withTiming(0, { duration: Durations.base }); },
      }
    : {};

  return (
    <AnimatedPressableView
      style={[webCursor, style, animatedStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      {...webHoverProps}
      {...rest}
    >
      {children}
    </AnimatedPressableView>
  );
}
