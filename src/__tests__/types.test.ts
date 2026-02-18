import { CATEGORIES } from '../types';
import { Avatars, LightColors, DarkColors } from '../constants/colors';

// ─── CATEGORIES ──────────────────────────────────────────────────────────

describe('CATEGORIES', () => {
  it('has 11 categories', () => {
    expect(CATEGORIES).toHaveLength(11);
  });

  it('includes all expected category IDs', () => {
    const ids = CATEGORIES.map((c) => c.id);
    expect(ids).toContain('allowance');
    expect(ids).toContain('fines');
    expect(ids).toContain('gift');
    expect(ids).toContain('food');
    expect(ids).toContain('toys');
    expect(ids).toContain('clothing');
    expect(ids).toContain('savings');
    expect(ids).toContain('education');
    expect(ids).toContain('entertainment');
    expect(ids).toContain('transfer');
    expect(ids).toContain('other');
  });

  it('all categories have an id, label, and emoji', () => {
    CATEGORIES.forEach((cat) => {
      expect(typeof cat.id).toBe('string');
      expect(cat.id.length).toBeGreaterThan(0);
      expect(typeof cat.label).toBe('string');
      expect(cat.label.length).toBeGreaterThan(0);
      expect(typeof cat.emoji).toBe('string');
      expect(cat.emoji.length).toBeGreaterThan(0);
    });
  });

  it('has unique IDs', () => {
    const ids = CATEGORIES.map((c) => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('has unique labels', () => {
    const labels = CATEGORIES.map((c) => c.label);
    const uniqueLabels = new Set(labels);
    expect(uniqueLabels.size).toBe(labels.length);
  });
});

// ─── Avatars ─────────────────────────────────────────────────────────────

describe('Avatars', () => {
  it('has 12 avatars', () => {
    expect(Avatars).toHaveLength(12);
  });

  it('all avatars are non-empty strings', () => {
    Avatars.forEach((avatar) => {
      expect(typeof avatar).toBe('string');
      expect(avatar.length).toBeGreaterThan(0);
    });
  });

  it('has unique avatars', () => {
    const uniqueAvatars = new Set(Avatars);
    expect(uniqueAvatars.size).toBe(Avatars.length);
  });
});

// ─── Theme Colors ────────────────────────────────────────────────────────

describe('Theme Colors', () => {
  const requiredKeys: (keyof typeof LightColors)[] = [
    'primary', 'primaryLight', 'primaryDark',
    'success', 'successLight', 'successDark',
    'danger', 'dangerLight', 'dangerDark',
    'warning', 'warningLight',
    'background', 'surface', 'surfaceAlt',
    'text', 'textSecondary', 'textLight', 'textWhite',
    'border', 'borderLight', 'shadow',
  ];

  describe('LightColors', () => {
    it('has all required color keys', () => {
      requiredKeys.forEach((key) => {
        expect(LightColors).toHaveProperty(key);
      });
    });

    it('all values are non-empty strings', () => {
      Object.values(LightColors).forEach((value) => {
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
      });
    });

    it('has a light background', () => {
      expect(LightColors.background).toBe('#F8F9FD');
    });

    it('has a white surface', () => {
      expect(LightColors.surface).toBe('#FFFFFF');
    });
  });

  describe('DarkColors', () => {
    it('has all required color keys', () => {
      requiredKeys.forEach((key) => {
        expect(DarkColors).toHaveProperty(key);
      });
    });

    it('all values are non-empty strings', () => {
      Object.values(DarkColors).forEach((value) => {
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
      });
    });

    it('has a dark background', () => {
      expect(DarkColors.background).toBe('#0F172A');
    });

    it('has matching keys with LightColors', () => {
      const lightKeys = Object.keys(LightColors).sort();
      const darkKeys = Object.keys(DarkColors).sort();
      expect(lightKeys).toEqual(darkKeys);
    });
  });
});
