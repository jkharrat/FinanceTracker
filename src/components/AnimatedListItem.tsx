import React, { useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  Keyframe,
  LinearTransition,
  useReducedMotion,
} from 'react-native-reanimated';
import { Durations, Springs } from '../constants/motion';

interface AnimatedListItemProps {
  index: number;
  /**
   * Stagger the rise-in entrance. Pass the value from `useEntranceWindow` so only the
   * first paint staggers; rows that appear later (e.g. after a filter change) just fade in.
   */
  stagger?: boolean;
  children: React.ReactNode;
}

const MAX_STAGGERED = 8;
const STAGGER_MS = 30;

const layoutTransition = LinearTransition.springify()
  .damping(Springs.gentle.damping)
  .stiffness(Springs.gentle.stiffness);

/** True until `ms` after `ready` first becomes true, i.e. while the list's first paint is revealing. */
export function useEntranceWindow(ready = true, ms = 600) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!ready || !open) return;
    const timer = setTimeout(() => setOpen(false), ms);
    return () => clearTimeout(timer);
  }, [ready, open, ms]);

  return open;
}

export default function AnimatedListItem({ index, stagger = true, children }: AnimatedListItemProps) {
  const reducedMotion = useReducedMotion();

  // Decided once per mount so later re-renders never swap the entrance animation.
  const [entering] = useState(() => {
    if (!stagger) return FadeIn.duration(Durations.quick);
    const delay = Math.min(index, MAX_STAGGERED) * STAGGER_MS;
    // On web, Reanimated pins custom Keyframe entrances with `position: absolute` once they
    // finish, pulling rows out of the layout. The predefined preset doesn't get pinned.
    if (Platform.OS === 'web') return FadeInDown.delay(delay).duration(Durations.base);
    return new Keyframe({
      0: { opacity: 0, transform: [{ translateY: 8 }] },
      100: { opacity: 1, transform: [{ translateY: 0 }], easing: Easing.out(Easing.cubic) },
    })
      .delay(delay)
      .duration(Durations.base);
  });

  const exiting = useMemo(() => FadeOut.duration(Durations.quick), []);

  if (reducedMotion) {
    return <>{children}</>;
  }

  return (
    <Animated.View entering={entering} exiting={exiting} layout={layoutTransition}>
      {children}
    </Animated.View>
  );
}
