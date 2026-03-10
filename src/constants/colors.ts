export type ThemeColors = {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  success: string;
  successLight: string;
  successDark: string;
  danger: string;
  dangerLight: string;
  dangerDark: string;
  warning: string;
  warningLight: string;
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textSecondary: string;
  textLight: string;
  textWhite: string;
  border: string;
  borderLight: string;
  shadow: string;
};

export const LightColors: ThemeColors = {
  primary: '#6C63FF',
  primaryLight: '#8B85FF',
  primaryDark: '#4A42DB',
  success: '#34D399',
  successLight: '#D1FAE5',
  successDark: '#059669',
  danger: '#F87171',
  dangerLight: '#FEE2E2',
  dangerDark: '#DC2626',
  warning: '#FBBF24',
  warningLight: '#FEF3C7',
  background: '#F8F9FD',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F3F8',
  text: '#1F2937',
  textSecondary: '#6B7280',
  textLight: '#9CA3AF',
  textWhite: '#FFFFFF',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  shadow: 'rgba(108, 99, 255, 0.08)',
};

export const DarkColors: ThemeColors = {
  primary: '#8B85FF',
  primaryLight: '#A5A0FF',
  primaryDark: '#6C63FF',
  success: '#34D399',
  successLight: '#064E3B',
  successDark: '#6EE7B7',
  danger: '#F87171',
  dangerLight: '#7F1D1D',
  dangerDark: '#FCA5A5',
  warning: '#FBBF24',
  warningLight: '#78350F',
  background: '#0F172A',
  surface: '#1E293B',
  surfaceAlt: '#334155',
  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  textLight: '#64748B',
  textWhite: '#FFFFFF',
  border: '#475569',
  borderLight: '#2D3B50',
  shadow: 'rgba(0, 0, 0, 0.3)',
};

export const Colors = LightColors;

export const Avatars = ['😊', '🌟', '🎨', '🚀', '🎵', '📚', '⚽', '🎮', '🏀', '🦋', '🐱', '🐶'];

// --- Accent color palettes ---

export type AccentOverrides = Pick<ThemeColors, 'primary' | 'primaryLight' | 'primaryDark' | 'shadow'>;

export type AccentPaletteId = 'purple' | 'blue' | 'green' | 'rose' | 'orange' | 'teal';

export interface AccentPalette {
  id: AccentPaletteId;
  label: string;
  swatch: string;
  light: AccentOverrides;
  dark: AccentOverrides;
}

export const ACCENT_PALETTES: AccentPalette[] = [
  {
    id: 'purple',
    label: 'Purple',
    swatch: '#6C63FF',
    light: {
      primary: '#6C63FF',
      primaryLight: '#8B85FF',
      primaryDark: '#4A42DB',
      shadow: 'rgba(108, 99, 255, 0.08)',
    },
    dark: {
      primary: '#8B85FF',
      primaryLight: '#A5A0FF',
      primaryDark: '#6C63FF',
      shadow: 'rgba(0, 0, 0, 0.3)',
    },
  },
  {
    id: 'blue',
    label: 'Blue',
    swatch: '#3B82F6',
    light: {
      primary: '#3B82F6',
      primaryLight: '#60A5FA',
      primaryDark: '#2563EB',
      shadow: 'rgba(59, 130, 246, 0.08)',
    },
    dark: {
      primary: '#60A5FA',
      primaryLight: '#93BBFD',
      primaryDark: '#3B82F6',
      shadow: 'rgba(0, 0, 0, 0.3)',
    },
  },
  {
    id: 'green',
    label: 'Green',
    swatch: '#10B981',
    light: {
      primary: '#10B981',
      primaryLight: '#34D399',
      primaryDark: '#059669',
      shadow: 'rgba(16, 185, 129, 0.08)',
    },
    dark: {
      primary: '#34D399',
      primaryLight: '#6EE7B7',
      primaryDark: '#10B981',
      shadow: 'rgba(0, 0, 0, 0.3)',
    },
  },
  {
    id: 'rose',
    label: 'Rose',
    swatch: '#F43F5E',
    light: {
      primary: '#F43F5E',
      primaryLight: '#FB7185',
      primaryDark: '#E11D48',
      shadow: 'rgba(244, 63, 94, 0.08)',
    },
    dark: {
      primary: '#FB7185',
      primaryLight: '#FDA4AF',
      primaryDark: '#F43F5E',
      shadow: 'rgba(0, 0, 0, 0.3)',
    },
  },
  {
    id: 'orange',
    label: 'Orange',
    swatch: '#F59E0B',
    light: {
      primary: '#F59E0B',
      primaryLight: '#FBBF24',
      primaryDark: '#D97706',
      shadow: 'rgba(245, 158, 11, 0.08)',
    },
    dark: {
      primary: '#FBBF24',
      primaryLight: '#FCD34D',
      primaryDark: '#F59E0B',
      shadow: 'rgba(0, 0, 0, 0.3)',
    },
  },
  {
    id: 'teal',
    label: 'Teal',
    swatch: '#14B8A6',
    light: {
      primary: '#14B8A6',
      primaryLight: '#2DD4BF',
      primaryDark: '#0D9488',
      shadow: 'rgba(20, 184, 166, 0.08)',
    },
    dark: {
      primary: '#2DD4BF',
      primaryLight: '#5EEAD4',
      primaryDark: '#14B8A6',
      shadow: 'rgba(0, 0, 0, 0.3)',
    },
  },
];

export function resolveColors(isDark: boolean, accentId: AccentPaletteId): ThemeColors {
  const base = isDark ? DarkColors : LightColors;
  const palette = ACCENT_PALETTES.find((p) => p.id === accentId) ?? ACCENT_PALETTES[0];
  const overrides = isDark ? palette.dark : palette.light;
  return { ...base, ...overrides };
}
