// Carry an authenticated import's password only in memory until it is applied.
// It is never added to JSON, app settings, a restore marker, or a log.
const authenticated = new WeakMap<object, string>();
export function rememberBackupPassword<T>(value: T, password: string | null): T {
  if (password !== null && value !== null && typeof value === 'object') authenticated.set(value, password);
  return value;
}
export function consumeBackupPassword(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const password = authenticated.get(value) ?? null;
  authenticated.delete(value);
  return password;
}
