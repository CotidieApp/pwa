export const normalizeTimerMinutes = (value: number) =>
  Number.isFinite(value) ? Math.min(1440, Math.max(1, Math.floor(value))) : 15;

export const remainingTimerSeconds = (deadline: number, now: number) =>
  Math.max(0, Math.ceil((deadline - now) / 1000));
