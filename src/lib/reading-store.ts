/** Critical reading data: transactions resolve on COMMIT and never swallow errors. */
export type ReadingStamp = { version: 1; resourceId: string; updatedAt: number; revision: number };
export type ReadingTrace = (message: string, data: string, error?: boolean) => void;
export const compareReading = (a: ReadingStamp, b: ReadingStamp) =>
  a.updatedAt - b.updatedAt || a.revision - b.revision;

export async function openReadingDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('cotidie-reading', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('progress');
      request.result.createObjectStore('books');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Reading database blocked'));
  });
}

export async function readingTransaction<T>(store: 'progress' | 'books', mode: IDBTransactionMode,
  run: (store: IDBObjectStore, result: (value: T) => void) => void): Promise<T> {
  const db = await openReadingDB();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(store, mode);
      let value: T;
      tx.oncomplete = () => resolve(value);
      tx.onabort = tx.onerror = () => reject(tx.error ?? new Error('Reading transaction failed'));
      try { run(tx.objectStore(store), result => { value = result; }); }
      catch (error) { tx.abort(); reject(error); }
    });
  } finally { db.close(); }
}

export function readReading<T>(key: string): Promise<T | null> {
  return readingTransaction('progress', 'readonly', (store, done) => {
    const request = store.get(key);
    request.onsuccess = () => done(request.result ?? null);
  });
}

// The get + compare + put share ONE readwrite transaction (also safe across tabs).
export function putReading<T extends ReadingStamp>(key: string, value: T): Promise<T> {
  return readingTransaction('progress', 'readwrite', (store, done) => {
    const request = store.get(key);
    request.onsuccess = () => {
      const current = request.result as T | undefined;
      if (current && compareReading(current, value) >= 0) { done(current); return; }
      store.put(value, key);
      done(value);
    };
  });
}

const queues = new Map<string, Promise<unknown>>();
const latest = new Map<string, ReadingStamp>();
export function rememberReading<T extends ReadingStamp>(key: string, record: T): T {
  const current = latest.get(key) as T | undefined;
  if (current && compareReading(current, record) > 0) return current;
  latest.set(key, record);
  return record;
}

export function nextReadingStamp(key: string, resourceId: string): ReadingStamp {
  const previous = latest.get(key);
  return { version: 1, resourceId, updatedAt: Math.max(Date.now(), (previous?.updatedAt ?? 0) + 1),
    revision: (previous?.revision ?? 0) + 1 };
}

export function mirrorReading<T extends ReadingStamp>(key: string, record: T, trace: ReadingTrace) {
  const newest = rememberReading(key, record);
  try {
    const raw = localStorage.getItem(key);
    let stored: T | null = null;
    try { stored = raw ? JSON.parse(raw) : null; } catch { /* legacy CFI */ }
    if (stored?.version === 1 && compareReading(stored, newest) > 0) {
      return rememberReading(key, stored);
    }
    localStorage.setItem(key, JSON.stringify(newest));
  } catch (error) { trace('localStorage error', `${record.resourceId}: ${String(error)}`, true); }
  return newest;
}

export function queueReading<T extends ReadingStamp>(key: string, record: T, trace: ReadingTrace): Promise<void> {
  const next = (queues.get(key) ?? Promise.resolve()).catch(() => undefined).then(async () => {
    const durable = await putReading(key, record);
    mirrorReading(key, durable, trace);
  });
  queues.set(key, next);
  // Catch for callers such as pagehide that cannot await. Return the original rejecting promise.
  void next.catch(error => trace('IndexedDB error', `${record.resourceId}: ${String(error)}`, true));
  return next;
}

export async function readLegacyEpub(key: string): Promise<unknown> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('cotidie-db', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('settings-store');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Legacy database blocked'));
  });
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('settings-store', 'readonly');
      const request = tx.objectStore('settings-store').get(key);
      let value: unknown;
      request.onsuccess = () => { value = request.result; };
      tx.oncomplete = () => resolve(value);
      tx.onabort = tx.onerror = () => reject(tx.error);
    });
  } finally { db.close(); }
}
