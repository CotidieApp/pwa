const DB_NAME = 'cotidie-db';
const STORE_NAME = 'settings-store';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    let abandoned = false;
    request.onblocked = () => { abandoned = true; dbPromise = null; reject(new Error('Almacenamiento ocupado por otra ventana.')); };

    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };

    request.onsuccess = () => {
      if (abandoned) { request.result.close(); return; }
      request.result.onversionchange = () => { request.result.close(); dbPromise = null; };
      request.result.onclose = () => { dbPromise = null; };
      resolve(request.result);
    };

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });

  const opening = dbPromise;
  void opening.catch(() => { if (dbPromise === opening) dbPromise = null; });
  return opening;
}

export const persistence = {
  async close(): Promise<void> { if (dbPromise) (await dbPromise).close(); dbPromise = null; },
  async getItem<T>(key: string): Promise<T | null> {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);

        let value: T | null = null;
        request.onsuccess = () => { value = request.result ?? null; };
        transaction.oncomplete = () => resolve(value);
        transaction.onabort = transaction.onerror = () => reject(transaction.error ?? request.error ?? new Error('Lectura no confirmada.'));
      });
    } catch (e) {
      throw e;
    }
  },

  async setItem(key: string, value: any): Promise<void> {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite', { durability: 'strict' });
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(value, key);

        transaction.oncomplete = () => resolve();
        transaction.onabort = transaction.onerror = () => reject(transaction.error ?? request.error ?? new Error('Guardado no confirmado.'));
      });
    } catch (e) {
      throw e;
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite', { durability: 'strict' });
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(key);

        transaction.oncomplete = () => resolve();
        transaction.onabort = transaction.onerror = () => reject(transaction.error ?? request.error ?? new Error('Borrado no confirmado.'));
      });
    } catch (e) {
      throw e;
    }
  },
  async update(entries: { key: string; value?: unknown }[], expected?: { key: string; revision: number }): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite', { durability: 'strict' });
      transaction.oncomplete = () => resolve();
      transaction.onabort = transaction.onerror = () => reject(transaction.error ?? new Error('Guardado no confirmado.'));
      try {
        const store = transaction.objectStore(STORE_NAME);
        const write = () => {
          for (const entry of entries) {
            if ('value' in entry) store.put(entry.value, entry.key); else store.delete(entry.key);
          }
        };
        if (!expected) write();
        else {
          const current = store.get(expected.key);
          current.onsuccess = () => {
            if ((current.result?.revision ?? 0) !== expected.revision) {
              const error = new Error('Los datos cambiaron en otra ventana. Vuelve a abrir la aplicación.');
              error.name = 'StorageConflictError';
              reject(error);
              transaction.abort();
            } else write();
          };
        }
      } catch (error) { transaction.abort(); reject(error); }
    });
  }
};
