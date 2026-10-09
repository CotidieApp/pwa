/** Stable family identity, independent of occurrence/year and matching the native legacy decoder. */
export function notificationEventSource(extra?: Record<string, unknown>): string {
  if (!extra) return '';
  if (typeof extra.fixedKey === 'string') return extra.fixedKey;
  if (typeof extra.feast === 'string') return 'feast:' + extra.feast;
  if (typeof extra.season === 'string') return 'season:' + extra.season;
  if (extra.cartasInactivityReminder === true && typeof extra.anchorAt === 'number') return 'cartas:' + extra.anchorAt;
  return '';
}

/** Android persists a complete calendar; its immediate publisher does not extend fixed recurrences. */
export function fixedNotificationOccurrenceLimit(platform: string, kind: string, requiresNotificationsEnabled?: boolean): number | null {
  if (platform === 'android') return null;
  if (kind === 'monthly' || kind === 'relative-monthly') return 12;
  return !requiresNotificationsEnabled && kind === 'yearly' ? 1 : null;
}
