import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  useReducedMotion,
  interpolate,
} from 'react-native-reanimated';

const SPRING_CONFIG = { damping: 15, stiffness: 200, mass: 0.4 };

const VARIANTS = {
  button: { press: 0.96, hover: 1.03 },
  card: { press: 0.98, hover: 1.015 },
  row: { press: 0.98, hover: 1.02 },
} as const;

export type AnimatedPressableVariant = keyof typeof VARIANTS;

interface AnimatedPressableProps extends Omit<PressableProps, 'style'> {
  variant?: AnimatedPressableVariant;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

const AnimatedPressableView = Animated.createAnimatedComponent(Pressable);

const isWeb = Platform.OS === 'web';
const webCursor = isWeb ? { cursor: 'pointer' as const } : {};

export default function AnimatedPressable({
  variant = 'button',
  style,
  children,
  onPressIn,
  onPressOut,
  disabled,
  ...rest
}: AnimatedPressableProps) {
  const reducedMotion = useReducedMotion();
  const pressed = useSharedValue(false);
  const hoverProgress = useSharedValue(0);

  const { press: pressScale, hover: hoverScale } = VARIANTS[variant];

  const animatedStyle = useAnimatedStyle(() => {
    if (reducedMotion) return {};
    if (pressed.value) {
      return {
        transform: [{ scale: withSpring(pressScale, SPRING_CONFIG) }],
      };
    }
    const scale = interpolate(hoverProgress.value, [0, 1], [1, hoverScale]);
    const shadowOpacity = isWeb && variant === 'card'
      ? interpolate(hoverProgress.value, [0, 1], [0.06, 0.14])
      : undefined;
    return {
      transform: [{ scale: withSpring(scale, SPRING_CONFIG) }],
      ...(shadowOpacity !== undefined ? { shadowOpacity } : {}),
    };
  });

  const handlePressIn: PressableProps['onPressIn'] = (e) => {
    pressed.value = true;
    onPressIn?.(e);
  };

  const handlePressOut: PressableProps['onPressOut'] = (e) => {
    pressed.value = false;
    onPressOut?.(e);
  };

  const webHoverProps = isWeb
    ? {
        onHoverIn: () => { hoverProgress.value = withTiming(1, { duration: 200 }); },
        onHoverOut: () => { hoverProgress.value = withTiming(0, { duration: 200 }); },
      }
    : {};

  return (
    <AnimatedPressableView
      style={[animatedStyle, webCursor, style]}
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
