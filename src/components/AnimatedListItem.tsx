import React from 'react';
import Animated, { FadeInUp, useReducedMotion } from 'react-native-reanimated';

interface AnimatedListItemProps {
  index: number;
  children: React.ReactNode;
}

const MAX_ANIMATED = 15;

export default function AnimatedListItem({ index, children }: AnimatedListItemProps) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion || index >= MAX_ANIMATED) {
    return <>{children}</>;
  }

  return (
    <Animated.View entering={FadeInUp.delay(index * 60).duration(350).springify().damping(18)}>
      {children}
    </Animated.View>
  );
}
