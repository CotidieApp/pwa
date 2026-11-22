/** Civil date in the user's timezone; pastoral checks keep their separate 05:00 cutoff. */
export const getLocalDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** A bare YYYY-MM-DD represents a civil date, even west of UTC. */
export function parseCalendarDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = match ? new Date(`${value}T00:00:00`) : new Date(value);
  if (!Number.isFinite(date.getTime()) || (match && getLocalDateKey(date) !== value)) return null;
  return date;
}

/** Preserve valid legacy date strings; invalid saved state must not poison calendar effects. */
export const normalizeSimulatedDate = (value: unknown): string | null =>
  typeof value === 'string' && parseCalendarDate(value) ? value : null;
