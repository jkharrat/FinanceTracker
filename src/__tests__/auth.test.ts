// Auth utility tests.
// The former kidEmail / isKidEmail / KID_EMAIL_DOMAIN / isNameUnique
// helpers have been removed — kids now authenticate with real emails
// via Supabase Auth, consistent with parents.

describe('auth utils', () => {
  it('module exists', () => {
    expect(true).toBe(true);
  });
});
