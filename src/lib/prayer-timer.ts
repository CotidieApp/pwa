export const normalizeTimerMinutes = (value: number) =>
  Number.isFinite(value) ? Math.min(1440, Math.max(1, Math.floor(value))) : 15;

export const remainingTimerSeconds = (deadline: number, now: number) =>
  Math.max(0, Math.ceil((deadline - now) / 1000));

export const TIMER_CHECKPOINT_KEY = 'cotidie_timer_checkpoint_v1';
export function readTimerCheckpoint(raw: string | null, duration: number): number | null {
  try {
    const value = JSON.parse(raw || 'null');
    return value?.version === 1 && value.duration === duration && Number.isInteger(value.time) &&
      value.time >= 0 && value.time <= duration * 60 ? value.time : null;
  } catch { return null; }
}
