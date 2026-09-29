export type ThemeColors = {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primarySoft: string;
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
  surfaceElevated: string;
  surfaceHover: string;
  inverseSurface: string;
  inverseText: string;
  inverseTextSecondary: string;
  text: string;
  textSecondary: string;
  textLight: string;
  textWhite: string;
  border: string;
  borderLight: string;
  hairline: string;
  overlay: string;
  shadow: string;
};

export const LightColors: ThemeColors = {
  primary: '#5B5BD6',
  primaryLight: '#7C7CE8',
  primaryDark: '#4747B8',
  primarySoft: 'rgba(91, 91, 214, 0.10)',
  success: '#12A150',
  successLight: '#E3F7EA',
  successDark: '#0B7A3B',
  danger: '#E5484D',
  dangerLight: '#FDECEC',
  dangerDark: '#C4282E',
  warning: '#F5A524',
  warningLight: '#FFF4DB',
  background: '#F7F7F8',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F1F3',
  surfaceElevated: '#FFFFFF',
  surfaceHover: '#F9F9FA',
  inverseSurface: '#111113',
  inverseText: '#FFFFFF',
  inverseTextSecondary: 'rgba(255, 255, 255, 0.6)',
  text: '#0A0A0B',
  textSecondary: '#5E5E68',
  textLight: '#9B9BA4',
  textWhite: '#FFFFFF',
  border: '#E4E4E8',
  borderLight: '#EFEFF2',
  hairline: 'rgba(10, 10, 11, 0.08)',
  overlay: 'rgba(10, 10, 11, 0.40)',
  shadow: 'rgba(10, 10, 11, 0.08)',
};

export const DarkColors: ThemeColors = {
  primary: '#8B8BF5',
  primaryLight: '#A9A9FA',
  primaryDark: '#6E6EE8',
  primarySoft: 'rgba(139, 139, 245, 0.14)',
  success: '#3DD68C',
  successLight: '#0F2A1C',
  successDark: '#6EE7A8',
  danger: '#FF6369',
  dangerLight: '#361218',
  dangerDark: '#FF9592',
  warning: '#FFC53D',
  warningLight: '#33270A',
  background: '#0A0A0B',
  surface: '#141416',
  surfaceAlt: '#1D1D20',
  surfaceElevated: '#1A1A1D',
  surfaceHover: '#19191C',
  inverseSurface: '#1D1D20',
  inverseText: '#F4F4F5',
  inverseTextSecondary: 'rgba(244, 244, 245, 0.55)',
  text: '#F4F4F5',
  textSecondary: '#A1A1AA',
  textLight: '#6B6B75',
  textWhite: '#FFFFFF',
  border: '#27272B',
  borderLight: '#1F1F23',
  hairline: 'rgba(255, 255, 255, 0.08)',
  overlay: 'rgba(0, 0, 0, 0.60)',
  shadow: 'rgba(0, 0, 0, 0.50)',
};

export const Colors = LightColors;

export const Avatars = ['😊', '🌟', '🎨', '🚀', '🎵', '📚', '⚽', '🎮', '🏀', '🦋', '🐱', '🐶'];

// --- Accent color palettes ---

export type AccentOverrides = Pick<ThemeColors, 'primary' | 'primaryLight' | 'primaryDark' | 'primarySoft' | 'shadow'>;

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
    label: 'Indigo',
    swatch: '#5B5BD6',
    light: {
      primary: LightColors.primary,
      primaryLight: LightColors.primaryLight,
      primaryDark: LightColors.primaryDark,
      primarySoft: LightColors.primarySoft,
      shadow: LightColors.shadow,
    },
    dark: {
      primary: DarkColors.primary,
      primaryLight: DarkColors.primaryLight,
      primaryDark: DarkColors.primaryDark,
      primarySoft: DarkColors.primarySoft,
      shadow: DarkColors.shadow,
    },
  },
  {
    id: 'blue',
    label: 'Blue',
    swatch: '#0A84FF',
    light: {
      primary: '#0A7AEB',
      primaryLight: '#3D9BF5',
      primaryDark: '#0862BD',
      primarySoft: 'rgba(10, 122, 235, 0.10)',
      shadow: LightColors.shadow,
    },
    dark: {
      primary: '#3D9BF5',
      primaryLight: '#70B6F8',
      primaryDark: '#0A84FF',
      primarySoft: 'rgba(61, 155, 245, 0.14)',
      shadow: DarkColors.shadow,
    },
  },
  {
    id: 'green',
    label: 'Green',
    swatch: '#12A150',
    light: {
      primary: '#12A150',
      primaryLight: '#34C06F',
      primaryDark: '#0B7A3B',
      primarySoft: 'rgba(18, 161, 80, 0.10)',
      shadow: LightColors.shadow,
    },
    dark: {
      primary: '#3DD68C',
      primaryLight: '#6EE7A8',
      primaryDark: '#12A150',
      primarySoft: 'rgba(61, 214, 140, 0.14)',
      shadow: DarkColors.shadow,
    },
  },
  {
    id: 'rose',
    label: 'Rose',
    swatch: '#E54666',
    light: {
      primary: '#E54666',
      primaryLight: '#EE6F88',
      primaryDark: '#C42D4D',
      primarySoft: 'rgba(229, 70, 102, 0.10)',
      shadow: LightColors.shadow,
    },
    dark: {
      primary: '#FF6B88',
      primaryLight: '#FF94A8',
      primaryDark: '#E54666',
      primarySoft: 'rgba(255, 107, 136, 0.14)',
      shadow: DarkColors.shadow,
    },
  },
  {
    id: 'orange',
    label: 'Orange',
    swatch: '#F76B15',
    light: {
      primary: '#E8590C',
      primaryLight: '#F7843D',
      primaryDark: '#C2480A',
      primarySoft: 'rgba(232, 89, 12, 0.10)',
      shadow: LightColors.shadow,
    },
    dark: {
      primary: '#FF8B3E',
      primaryLight: '#FFA76B',
      primaryDark: '#F76B15',
      primarySoft: 'rgba(255, 139, 62, 0.14)',
      shadow: DarkColors.shadow,
    },
  },
  {
    id: 'teal',
    label: 'Teal',
    swatch: '#12A594',
    light: {
      primary: '#0D9B8A',
      primaryLight: '#2DB9A7',
      primaryDark: '#0A7D70',
      primarySoft: 'rgba(13, 155, 138, 0.10)',
      shadow: LightColors.shadow,
    },
    dark: {
      primary: '#2DD4BF',
      primaryLight: '#5EEAD4',
      primaryDark: '#12A594',
      primarySoft: 'rgba(45, 212, 191, 0.14)',
      shadow: DarkColors.shadow,
    },
  },
];

export function resolveColors(isDark: boolean, accentId: AccentPaletteId): ThemeColors {
  const base = isDark ? DarkColors : LightColors;
  const palette = ACCENT_PALETTES.find((p) => p.id === accentId) ?? ACCENT_PALETTES[0];
  const overrides = isDark ? palette.dark : palette.light;
  return { ...base, ...overrides };
}

// --- Kid palette: warmer surfaces and brighter status colors ---

const KidLightBase: Partial<ThemeColors> = {
  background: '#FFF8EF',
  surface: '#FFFFFF',
  surfaceAlt: '#FFF0DE',
  surfaceHover: '#FFFBF5',
  border: '#F1E3CF',
  borderLight: '#F7ECDD',
  hairline: 'rgba(120, 72, 20, 0.10)',
  text: '#2A1E14',
  textSecondary: '#6E5B4A',
  textLight: '#A08C78',
  success: '#0FA958',
  successLight: '#DDF8E8',
  warning: '#FF9F1C',
  warningLight: '#FFF1D6',
  danger: '#F0444B',
};

const KidDarkBase: Partial<ThemeColors> = {
  background: '#130F1C',
  surface: '#1E1929',
  surfaceAlt: '#2A2338',
  surfaceElevated: '#241E31',
  surfaceHover: '#231D2F',
  border: '#352D45',
  borderLight: '#2A2338',
  success: '#34E08F',
  warning: '#FFB938',
};

export function resolveKidColors(isDark: boolean, accentId: AccentPaletteId): ThemeColors {
  return { ...resolveColors(isDark, accentId), ...(isDark ? KidDarkBase : KidLightBase) };
}

/**
 * Two-stop gradient for kid hero surfaces. Always uses the light-mode accent shades:
 * the dark-mode ones are pastel and would wash out white text.
 */
export function kidHeroGradient(accentId: AccentPaletteId): [string, string] {
  const palette = ACCENT_PALETTES.find((p) => p.id === accentId) ?? ACCENT_PALETTES[0];
  return [palette.light.primary, palette.light.primaryDark];
}

export const KidGoalGradient = { start: '#FFB938', end: '#0FA958' } as const;
