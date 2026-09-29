import { Platform, TextStyle, ViewStyle } from 'react-native';
import { fontStyle } from './fonts';

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

type ElevationLevel = 'none' | 'card' | 'raised';

const SHADOWS: Record<ElevationLevel, ViewStyle> = {
  none: {},
  card: Platform.select<ViewStyle>({
    web: { boxShadow: '0 1px 2px rgba(10, 10, 11, 0.04)' } as ViewStyle,
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 2,
      elevation: 1,
    },
  }),
  raised: Platform.select<ViewStyle>({
    web: { boxShadow: '0 12px 32px rgba(10, 10, 11, 0.12), 0 2px 6px rgba(10, 10, 11, 0.06)' } as ViewStyle,
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
      elevation: 8,
    },
  }),
};

export const Elevation = SHADOWS;

export const Type = {
  display: {
    ...fontStyle('700'),
    fontSize: 44,
    letterSpacing: -1.6,
    fontVariant: ['tabular-nums'],
  },
  title: {
    ...fontStyle('700'),
    fontSize: 24,
    letterSpacing: -0.6,
  },
  headline: {
    ...fontStyle('600'),
    fontSize: 17,
    letterSpacing: -0.2,
  },
  body: {
    ...fontStyle('400'),
    fontSize: 15,
    lineHeight: 20,
  },
  bodyStrong: {
    ...fontStyle('500'),
    fontSize: 15,
    lineHeight: 20,
  },
  label: {
    ...fontStyle('500'),
    fontSize: 13,
    letterSpacing: -0.05,
  },
  caption: {
    ...fontStyle('400'),
    fontSize: 12,
  },
  overline: {
    ...fontStyle('600'),
    fontSize: 12,
    letterSpacing: 0.2,
  },
  amount: {
    ...fontStyle('600'),
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
} satisfies Record<string, TextStyle>;
