// Deliberately separate from settings, exports, history and diagnostic traces.
export const CONFESSION_NOTE_KEY = 'cotidie_confession_note_v1';
export const CONFESSION_EXPIRY_KEY = 'cotidie_confession_auto_delete_v1';
export const CONFESSION_LIFETIME_MS = 24 * 60 * 60 * 1000;
export type ConfessionNote = { text: string; createdAt: number };
type NotebookStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function readConfessionNote(storage: NotebookStorage, now: number): ConfessionNote | null {
  const raw = storage.getItem(CONFESSION_NOTE_KEY);
  if (!raw) return null;
  let value: unknown;
  try { value = JSON.parse(raw); } catch { value = null; }
  const note = value as ConfessionNote | null;
  if (!note || typeof note.text !== 'string' || !note.text || note.text.length > 20000 ||
      !Number.isFinite(note.createdAt) || note.createdAt < 0 || note.createdAt > now ||
      (storage.getItem(CONFESSION_EXPIRY_KEY) === 'true' && now >= note.createdAt + CONFESSION_LIFETIME_MS)) {
    storage.removeItem(CONFESSION_NOTE_KEY);
    return null;
  }
  return { text: note.text, createdAt: note.createdAt };
}

export function writeConfessionNote(storage: NotebookStorage, text: string, now: number): ConfessionNote | null {
  if (!text) {
    storage.removeItem(CONFESSION_NOTE_KEY);
    return null;
  }
  const previous = readConfessionNote(storage, now);
  const note = { text: text.slice(0, 20000), createdAt: previous?.createdAt ?? now };
  storage.setItem(CONFESSION_NOTE_KEY, JSON.stringify(note));
  return note;
}
