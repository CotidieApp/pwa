export async function register() {
  try {
    const ls: any = (globalThis as any).localStorage;
    const needsPolyfill =
      !ls ||
      typeof ls.getItem !== 'function' ||
      typeof ls.setItem !== 'function' ||
      typeof ls.removeItem !== 'function' ||
      typeof ls.clear !== 'function';

    if (needsPolyfill) {
      const store: Record<string, string> = {};
      (globalThis as any).localStorage = {
        getItem(key: string) {
          return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
        },
        setItem(key: string, value: string) {
          store[key] = String(value);
        },
        removeItem(key: string) {
          delete store[key];
        },
        clear() {
          for (const k of Object.keys(store)) delete store[k];
        },
      };
    }
  } catch {}
}
