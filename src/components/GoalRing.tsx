import React, { useEffect, useId } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withSpring,
  useReducedMotion,
  Easing,
} from 'react-native-reanimated';
import { Springs } from '../constants/motion';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const MILESTONES = [25, 50, 75];

interface GoalRingProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  trackColor: string;
  /** Two-stop gradient for the progress arc. Overrides `color`. */
  gradient?: [string, string];
  /** Draws small ticks at 25/50/75% on the track. */
  showMilestones?: boolean;
  /** Springs to the new value (with overshoot) instead of easing. */
  bouncy?: boolean;
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
  gradient,
  showMilestones = false,
  bouncy = false,
  duration = 900,
  style,
  children,
}: GoalRingProps) {
  const clamped = Math.min(Math.max(percent, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  // useId output contains colons, which break `url(#…)` references in some browsers.
  const gradientId = `ring-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(reducedMotion ? clamped : 0);

  useEffect(() => {
    if (reducedMotion) {
      progress.value = clamped;
      return;
    }
    progress.value = bouncy
      ? withSpring(clamped, Springs.gentle)
      : withTiming(clamped, { duration, easing: Easing.out(Easing.cubic) });
  }, [clamped, duration, reducedMotion, progress, bouncy]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - Math.min(Math.max(progress.value, 0), 100) / 100),
  }));

  return (
    <View
      style={[{ width: size, height: size }, style]}
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped) }}
    >
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        {gradient && (
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={gradient[0]} />
              <Stop offset="1" stopColor={gradient[1]} />
            </LinearGradient>
          </Defs>
        )}
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
          stroke={gradient ? `url(#${gradientId})` : color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${center} ${center})`}
        />
        {showMilestones &&
          MILESTONES.map((m) => {
            const angle = (m / 100) * 2 * Math.PI - Math.PI / 2;
            return (
              <Circle
                key={m}
                cx={center + radius * Math.cos(angle)}
                cy={center + radius * Math.sin(angle)}
                r={Math.max(strokeWidth / 5, 1.5)}
                fill={clamped >= m ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.18)'}
              />
            );
          })}
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
