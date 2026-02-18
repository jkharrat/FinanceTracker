import React from 'react';
import Animated, { FadeIn, SlideInRight } from 'react-native-reanimated';
import { StyleSheet } from 'react-native';

type Variant = 'fade' | 'slideRight';

interface PageTransitionProps {
  children: React.ReactNode;
  variant?: Variant;
  duration?: number;
}

const animations = {
  fade: (ms: number) => FadeIn.duration(ms),
  slideRight: (ms: number) => SlideInRight.duration(ms).springify().damping(20).stiffness(90),
};

export default function PageTransition({
  children,
  variant = 'slideRight',
  duration = 350,
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
