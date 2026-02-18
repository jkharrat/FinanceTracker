import { kidEmail, isKidEmail, isNameUnique, KID_EMAIL_DOMAIN } from '../utils/auth';

// ─── KID_EMAIL_DOMAIN ────────────────────────────────────────────────────

describe('KID_EMAIL_DOMAIN', () => {
  it('is the expected domain', () => {
    expect(KID_EMAIL_DOMAIN).toBe('kid.financetracker.internal');
  });
});

// ─── kidEmail ────────────────────────────────────────────────────────────

describe('kidEmail', () => {
  it('generates correct email from kid ID', () => {
    expect(kidEmail('abc-123')).toBe('abc-123@kid.financetracker.internal');
  });

  it('generates correct email for UUID-style IDs', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    expect(kidEmail(uuid)).toBe(`${uuid}@kid.financetracker.internal`);
  });

  it('handles empty kid ID', () => {
    expect(kidEmail('')).toBe('@kid.financetracker.internal');
  });

  it('handles kid ID with special characters', () => {
    expect(kidEmail('kid+1')).toBe('kid+1@kid.financetracker.internal');
  });
});

// ─── isKidEmail ──────────────────────────────────────────────────────────

describe('isKidEmail', () => {
  it('returns true for kid emails', () => {
    expect(isKidEmail('abc@kid.financetracker.internal')).toBe(true);
  });

  it('returns false for regular emails', () => {
    expect(isKidEmail('parent@gmail.com')).toBe(false);
  });

  it('returns false for similar but incorrect domains', () => {
    expect(isKidEmail('abc@kid.financetracker.com')).toBe(false);
    expect(isKidEmail('abc@financetracker.internal')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isKidEmail('')).toBe(false);
  });

  it('returns true for any prefix with kid domain', () => {
    expect(isKidEmail('anything@kid.financetracker.internal')).toBe(true);
  });
});

// ─── isNameUnique ────────────────────────────────────────────────────────

describe('isNameUnique', () => {
  const existingKids = [
    { name: 'Alice', id: 'kid-1' },
    { name: 'Bob', id: 'kid-2' },
    { name: 'Charlie', id: 'kid-3' },
  ];

  it('returns true when name does not exist', () => {
    expect(isNameUnique('Diana', existingKids)).toBe(true);
  });

  it('returns false when name already exists', () => {
    expect(isNameUnique('Alice', existingKids)).toBe(false);
  });

  it('is case insensitive', () => {
    expect(isNameUnique('alice', existingKids)).toBe(false);
    expect(isNameUnique('ALICE', existingKids)).toBe(false);
    expect(isNameUnique('aLiCe', existingKids)).toBe(false);
  });

  it('returns true when name matches the excluded ID', () => {
    expect(isNameUnique('Alice', existingKids, 'kid-1')).toBe(true);
  });

  it('returns false when name matches a different kid', () => {
    expect(isNameUnique('Bob', existingKids, 'kid-1')).toBe(false);
  });

  it('returns true for empty kids list', () => {
    expect(isNameUnique('Anyone', [])).toBe(true);
  });

  it('returns true for empty name when no kid has empty name', () => {
    expect(isNameUnique('', existingKids)).toBe(true);
  });

  it('handles names with whitespace correctly (no trim)', () => {
    expect(isNameUnique(' Alice', existingKids)).toBe(true);
    expect(isNameUnique('Alice ', existingKids)).toBe(true);
  });
});
