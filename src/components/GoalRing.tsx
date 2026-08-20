import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  useReducedMotion,
  Easing,
} from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface GoalRingProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  trackColor: string;
  duration?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export default function GoalRing({
  percent,
  size = 64,
  strokeWidth = 6,
  color,
  trackColor,
  duration = 900,
  style,
  children,
}: GoalRingProps) {
  const clamped = Math.min(Math.max(percent, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(reducedMotion ? clamped : 0);

  useEffect(() => {
    if (reducedMotion) {
      progress.value = clamped;
      return;
    }
    progress.value = withTiming(clamped, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [clamped, duration, reducedMotion, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value / 100),
  }));

  return (
    <View
      style={[{ width: size, height: size }, style]}
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped) }}
    >
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
