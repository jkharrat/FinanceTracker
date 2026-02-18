export const KID_EMAIL_DOMAIN = 'kid.financetracker.internal';

export function kidEmail(kidId: string): string {
  return `${kidId}@${KID_EMAIL_DOMAIN}`;
}

export function isKidEmail(email: string): boolean {
  return email.endsWith(`@${KID_EMAIL_DOMAIN}`);
}

export function isNameUnique(name: string, kids: { name: string; id: string }[], excludeId?: string): boolean {
  return !kids.some(
    (kid) => kid.name.toLowerCase() === name.toLowerCase() && kid.id !== excludeId
  );
}
