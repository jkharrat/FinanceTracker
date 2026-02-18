import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  useReducedMotion,
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
  const hovered = useSharedValue(false);

  const { press: pressScale, hover: hoverScale } = VARIANTS[variant];

  const animatedStyle = useAnimatedStyle(() => {
    if (reducedMotion) return {};
    let target = 1;
    if (pressed.value) {
      target = pressScale;
    } else if (hovered.value) {
      target = hoverScale;
    }
    return {
      transform: [{ scale: withSpring(target, SPRING_CONFIG) }],
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

  const webHoverProps = Platform.OS === 'web'
    ? {
        onHoverIn: () => { hovered.value = true; },
        onHoverOut: () => { hovered.value = false; },
      }
    : {};

  return (
    <AnimatedPressableView
      style={[animatedStyle, style]}
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
