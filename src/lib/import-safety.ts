export const MAX_IMPORT_BYTES = 15 * 1024 * 1024;
export const LOCAL_PRIVILEGE_KEYS = ['isDeveloperMode', 'isEditModeEnabled', 'devTestNotificationEnabled',
  'devTestNotificationImageEnabled', 'devLiveTraceEnabled', 'devLiveTraceEvents'] as const;

export function withoutLocalPrivileges<T extends Record<string, unknown>>(value: T): Partial<T> {
  const copy = { ...value };
  for (const key of LOCAL_PRIVILEGE_KEYS) delete copy[key];
  return copy;
}

export function validateImportPayload(value: unknown): void {
  const pending = [{ value, depth: 0 }];
  const seen = new Set<object>();
  let count = 0;
  while (pending.length) {
    const entry = pending.pop()!;
    if (++count > 150000 || entry.depth > 40) throw new Error('El respaldo contiene demasiados elementos.');
    if (entry.value && typeof entry.value === 'object') {
      if (seen.has(entry.value)) throw new Error('El respaldo contiene referencias circulares.');
      seen.add(entry.value);
      for (const [key, child] of Object.entries(entry.value)) {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') throw new Error('Campo no permitido.');
        pending.push({ value: child, depth: entry.depth + 1 });
      }
    }
  }
  if (new TextEncoder().encode(JSON.stringify(value)).byteLength > MAX_IMPORT_BYTES) throw new Error('El respaldo supera los 15 MB.');
}

export function parseImportText(text: string): any {
  if (text.length > MAX_IMPORT_BYTES || new TextEncoder().encode(text).byteLength > MAX_IMPORT_BYTES) throw new Error('El respaldo supera los 15 MB.');
  const value: unknown = JSON.parse(text.replace(/^\uFEFF/, '').trim());
  validateImportPayload(value);
  return value;
}
