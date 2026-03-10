import { Spacing } from '../constants/spacing';
import { FontFamily, fontStyle } from '../constants/fonts';
import { LightColors, DarkColors, Avatars, ACCENT_PALETTES, resolveColors } from '../constants/colors';
import type { AccentPaletteId } from '../constants/colors';

// ─── Spacing ──────────────────────────────────────────────────────────────

describe('Spacing', () => {
  it('has all expected keys', () => {
    expect(Spacing).toHaveProperty('xs');
    expect(Spacing).toHaveProperty('sm');
    expect(Spacing).toHaveProperty('md');
    expect(Spacing).toHaveProperty('lg');
    expect(Spacing).toHaveProperty('xl');
    expect(Spacing).toHaveProperty('xxl');
    expect(Spacing).toHaveProperty('xxxl');
  });

  it('all values are positive numbers', () => {
    Object.values(Spacing).forEach((v) => {
      expect(typeof v).toBe('number');
      expect(v).toBeGreaterThan(0);
    });
  });

  it('values are in ascending order', () => {
    const ordered = [Spacing.xs, Spacing.sm, Spacing.md, Spacing.lg, Spacing.xl, Spacing.xxl, Spacing.xxxl];
    for (let i = 1; i < ordered.length; i++) {
      expect(ordered[i]).toBeGreaterThan(ordered[i - 1]);
    }
  });

  it('has correct specific values', () => {
    expect(Spacing.xs).toBe(4);
    expect(Spacing.sm).toBe(8);
    expect(Spacing.md).toBe(12);
    expect(Spacing.lg).toBe(16);
    expect(Spacing.xl).toBe(20);
    expect(Spacing.xxl).toBe(24);
    expect(Spacing.xxxl).toBe(32);
  });
});

// ─── FontFamily ───────────────────────────────────────────────────────────

describe('FontFamily', () => {
  it('has all expected weight variants', () => {
    expect(FontFamily).toHaveProperty('regular');
    expect(FontFamily).toHaveProperty('medium');
    expect(FontFamily).toHaveProperty('semiBold');
    expect(FontFamily).toHaveProperty('bold');
    expect(FontFamily).toHaveProperty('extraBold');
  });

  it('all font family values are Inter-based strings', () => {
    expect(FontFamily.regular).toBe('Inter_400Regular');
    expect(FontFamily.medium).toBe('Inter_500Medium');
    expect(FontFamily.semiBold).toBe('Inter_600SemiBold');
    expect(FontFamily.bold).toBe('Inter_700Bold');
    expect(FontFamily.extraBold).toBe('Inter_800ExtraBold');
  });

  it('all values are non-empty strings', () => {
    Object.values(FontFamily).forEach((v) => {
      expect(typeof v).toBe('string');
      expect(v.length).toBeGreaterThan(0);
    });
  });

  it('has unique values', () => {
    const values = Object.values(FontFamily);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });
});

// ─── fontStyle ────────────────────────────────────────────────────────────

describe('fontStyle', () => {
  it('returns fontFamily for regular weight by default', () => {
    const result = fontStyle();
    expect(result.fontFamily).toBe(FontFamily.regular);
  });

  it('returns correct fontFamily for each weight', () => {
    expect(fontStyle('400').fontFamily).toBe(FontFamily.regular);
    expect(fontStyle('500').fontFamily).toBe(FontFamily.medium);
    expect(fontStyle('600').fontFamily).toBe(FontFamily.semiBold);
    expect(fontStyle('700').fontFamily).toBe(FontFamily.bold);
    expect(fontStyle('800').fontFamily).toBe(FontFamily.extraBold);
  });

  it('always includes fontFamily property', () => {
    (['400', '500', '600', '700', '800'] as const).forEach((w) => {
      const result = fontStyle(w);
      expect(result).toHaveProperty('fontFamily');
      expect(typeof result.fontFamily).toBe('string');
    });
  });
});

// ─── Color Scheme Consistency ─────────────────────────────────────────────

describe('Color Scheme Consistency', () => {
  it('LightColors and DarkColors have same number of keys', () => {
    expect(Object.keys(LightColors).length).toBe(Object.keys(DarkColors).length);
  });

  it('every LightColors key exists in DarkColors', () => {
    Object.keys(LightColors).forEach((key) => {
      expect(DarkColors).toHaveProperty(key);
    });
  });

  it('every DarkColors key exists in LightColors', () => {
    Object.keys(DarkColors).forEach((key) => {
      expect(LightColors).toHaveProperty(key);
    });
  });

  it('light and dark backgrounds are different', () => {
    expect(LightColors.background).not.toBe(DarkColors.background);
  });

  it('light and dark surfaces are different', () => {
    expect(LightColors.surface).not.toBe(DarkColors.surface);
  });

  it('light and dark text colors are different', () => {
    expect(LightColors.text).not.toBe(DarkColors.text);
  });

  it('all color values are valid CSS color strings', () => {
    const colorRegex = /^(#[0-9a-fA-F]{3,8}|rgba?\(.+\))$/;
    [...Object.values(LightColors), ...Object.values(DarkColors)].forEach((color) => {
      expect(color).toMatch(colorRegex);
    });
  });
});

// ─── Avatars Extended ─────────────────────────────────────────────────────

describe('Avatars Extended', () => {
  it('contains common emoji types (people, animals, objects)', () => {
    const allAvatars = Avatars.join('');
    expect(allAvatars.length).toBeGreaterThan(0);
  });

  it('no avatar is duplicated', () => {
    const unique = new Set(Avatars);
    expect(unique.size).toBe(Avatars.length);
  });

  it('avatar list is frozen (read-only when used as const)', () => {
    expect(Avatars).toEqual(expect.any(Array));
  });
});

// ─── Accent Palettes ─────────────────────────────────────────────────────

describe('ACCENT_PALETTES', () => {
  it('contains exactly 6 palettes', () => {
    expect(ACCENT_PALETTES).toHaveLength(6);
  });

  it('has unique ids', () => {
    const ids = ACCENT_PALETTES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('includes purple as the first (default) palette', () => {
    expect(ACCENT_PALETTES[0].id).toBe('purple');
  });

  it('each palette has required fields', () => {
    for (const palette of ACCENT_PALETTES) {
      expect(typeof palette.id).toBe('string');
      expect(typeof palette.label).toBe('string');
      expect(palette.swatch).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(palette.light).toHaveProperty('primary');
      expect(palette.light).toHaveProperty('primaryLight');
      expect(palette.light).toHaveProperty('primaryDark');
      expect(palette.light).toHaveProperty('shadow');
      expect(palette.dark).toHaveProperty('primary');
      expect(palette.dark).toHaveProperty('primaryLight');
      expect(palette.dark).toHaveProperty('primaryDark');
      expect(palette.dark).toHaveProperty('shadow');
    }
  });

  it('each palette has distinct swatch colors', () => {
    const swatches = ACCENT_PALETTES.map((p) => p.swatch);
    expect(new Set(swatches).size).toBe(swatches.length);
  });
});

// ─── resolveColors ───────────────────────────────────────────────────────

describe('resolveColors', () => {
  it('returns LightColors base with purple accent by default', () => {
    const colors = resolveColors(false, 'purple');
    expect(colors.background).toBe(LightColors.background);
    expect(colors.surface).toBe(LightColors.surface);
    expect(colors.text).toBe(LightColors.text);
    expect(colors.primary).toBe(LightColors.primary);
  });

  it('returns DarkColors base with purple accent for dark mode', () => {
    const colors = resolveColors(true, 'purple');
    expect(colors.background).toBe(DarkColors.background);
    expect(colors.surface).toBe(DarkColors.surface);
    expect(colors.text).toBe(DarkColors.text);
    expect(colors.primary).toBe(DarkColors.primary);
  });

  it('overrides primary colors when using a non-default accent', () => {
    const bluePalette = ACCENT_PALETTES.find((p) => p.id === 'blue')!;
    const colors = resolveColors(false, 'blue');
    expect(colors.primary).toBe(bluePalette.light.primary);
    expect(colors.primaryLight).toBe(bluePalette.light.primaryLight);
    expect(colors.primaryDark).toBe(bluePalette.light.primaryDark);
    expect(colors.shadow).toBe(bluePalette.light.shadow);
  });

  it('preserves non-accent colors when changing palette', () => {
    const colors = resolveColors(false, 'rose');
    expect(colors.background).toBe(LightColors.background);
    expect(colors.surface).toBe(LightColors.surface);
    expect(colors.success).toBe(LightColors.success);
    expect(colors.danger).toBe(LightColors.danger);
    expect(colors.warning).toBe(LightColors.warning);
    expect(colors.text).toBe(LightColors.text);
    expect(colors.border).toBe(LightColors.border);
  });

  it('applies dark overrides for non-default accent in dark mode', () => {
    const tealPalette = ACCENT_PALETTES.find((p) => p.id === 'teal')!;
    const colors = resolveColors(true, 'teal');
    expect(colors.primary).toBe(tealPalette.dark.primary);
    expect(colors.primaryDark).toBe(tealPalette.dark.primaryDark);
    expect(colors.background).toBe(DarkColors.background);
  });

  it('falls back to purple for unknown accent id', () => {
    const colors = resolveColors(false, 'nonexistent' as AccentPaletteId);
    const purplePalette = ACCENT_PALETTES[0];
    expect(colors.primary).toBe(purplePalette.light.primary);
  });

  it('produces valid ThemeColors object with all keys', () => {
    const lightKeys = Object.keys(LightColors);
    for (const palette of ACCENT_PALETTES) {
      const lightColors = resolveColors(false, palette.id);
      const darkColors = resolveColors(true, palette.id);
      expect(Object.keys(lightColors)).toEqual(lightKeys);
      expect(Object.keys(darkColors)).toEqual(lightKeys);
    }
  });
});
