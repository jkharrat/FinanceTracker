import { Platform, TextStyle, ViewStyle } from 'react-native';
import { fontStyle, kidFontStyle } from './fonts';

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

type ElevationLevel = 'none' | 'card' | 'raised' | 'kid';

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
  kid: Platform.select<ViewStyle>({
    web: { boxShadow: '0 6px 20px rgba(120, 72, 20, 0.08), 0 1px 3px rgba(120, 72, 20, 0.06)' } as ViewStyle,
    default: {
      shadowColor: '#784814',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 20,
      elevation: 3,
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

export const KidRadius = {
  card: 28,
  button: 18,
  bubble: 16,
} as const;

/** Height of the solid "ledge" under kid buttons that compresses on press. */
export const KID_BUTTON_LEDGE = 4;

export const KidType = {
  display: {
    ...kidFontStyle('900'),
    fontSize: 50,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  title: {
    ...kidFontStyle('900'),
    fontSize: 26,
    letterSpacing: -0.2,
  },
  headline: {
    ...kidFontStyle('800'),
    fontSize: 18,
  },
  button: {
    ...kidFontStyle('800'),
    fontSize: 16,
  },
  amount: {
    ...kidFontStyle('800'),
    fontSize: 16,
    fontVariant: ['tabular-nums'],
  },
} satisfies Record<string, TextStyle>;
