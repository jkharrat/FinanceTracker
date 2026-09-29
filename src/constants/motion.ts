import { Easing } from 'react-native-reanimated';

export const Springs = {
  /** Press feedback and small toggles. */
  snappy: { damping: 26, stiffness: 420, mass: 0.6 },
  /** Layout shifts and content that moves into place. */
  gentle: { damping: 28, stiffness: 220, mass: 1 },
  /** Sheets and larger surfaces. */
  sheet: { damping: 32, stiffness: 300, mass: 1 },
} as const;

export const Durations = {
  quick: 140,
  base: 220,
  slow: 320,
} as const;

export const Easings = {
  out: Easing.bezier(0.22, 1, 0.36, 1),
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
} as const;
