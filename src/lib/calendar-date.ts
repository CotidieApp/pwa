/** Civil date in the user's timezone; pastoral checks keep their separate 05:00 cutoff. */
export const getLocalDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** Preserve valid legacy date strings; invalid saved state must not poison calendar effects. */
export const normalizeSimulatedDate = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() && Number.isFinite(new Date(value).getTime()) ? value : null;
