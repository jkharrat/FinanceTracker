import React from 'react';
import Animated, { Easing, FadeIn, Keyframe } from 'react-native-reanimated';
import { StyleSheet } from 'react-native';
import { Durations } from '../constants/motion';

type Variant = 'fade' | 'rise';

interface PageTransitionProps {
  children: React.ReactNode;
  variant?: Variant;
  duration?: number;
}

const animations = {
  fade: (ms: number) => FadeIn.duration(ms),
  rise: (ms: number) =>
    new Keyframe({
      0: { opacity: 0, transform: [{ translateY: 12 }] },
      100: { opacity: 1, transform: [{ translateY: 0 }], easing: Easing.out(Easing.cubic) },
    }).duration(ms),
};

export default function PageTransition({
  children,
  variant = 'rise',
  duration = Durations.slow,
}: PageTransitionProps) {
  return (
    <Animated.View
      entering={animations[variant](duration)}
      style={styles.container}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
