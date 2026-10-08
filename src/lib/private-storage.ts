import { Capacitor, registerPlugin } from '@capacitor/core';
import { persistence } from './persistence';

const native = registerPlugin<{
  get(options: { key: string }): Promise<{ value: string | null; revision: number }>;
  set(options: { key: string; value: string; expiresAt: number; expectedRevision: number }): Promise<{ revision: number }>;
  remove(options: { key: string }): Promise<void>;
}>('PrivateStorage');
type Envelope = { version: 1; iv: Uint8Array; data: ArrayBuffer; expiresAt: number; revision: number };
const queues = new Map<string, Promise<unknown>>();
const revisions = new Map<string, number>();
const authenticatedMetadata = (key: string, expiresAt: number, revision: number) =>
  new TextEncoder().encode(JSON.stringify([key, expiresAt, revision]));
const isAndroid = () => Capacitor.getPlatform() === 'android' && Capacitor.isNativePlatform();

export function privateOperation<T>(key: string, operation: () => Promise<T>): Promise<T> {
  const next = (queues.get(key) ?? Promise.resolve()).catch(() => undefined).then(operation);
  queues.set(key, next);
  void next.finally(() => { if (queues.get(key) === next) queues.delete(key); }).catch(() => undefined);
  return next;
}

// Browser keys protect the stored representation, not a compromised origin.
export async function readPrivate<T>(key: string): Promise<T | null> {
  if (isAndroid()) {
    const { value, revision } = await native.get({ key });
    revisions.set(key, revision);
    return value === null ? null : JSON.parse(value) as T;
  }
  const envelope = await persistence.getItem<Envelope>('private:' + key);
  if (!envelope) { revisions.set(key, 0); return null; }
  if (envelope.expiresAt > 0 && Date.now() >= envelope.expiresAt) {
    try { await removePrivate(key, envelope.revision ?? 0); return null; }
    catch (error) {
      if (error instanceof Error && error.name === 'StorageConflictError') return readPrivate<T>(key);
      throw error;
    }
  }
  const cryptoKey = await persistence.getItem<CryptoKey>('private-key:' + key);
  if (!cryptoKey || envelope.version !== 1) throw new Error('No se puede leer el almacenamiento privado.');
  const bytes = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: envelope.iv as Uint8Array<ArrayBuffer>,
    additionalData: authenticatedMetadata(key, envelope.expiresAt, envelope.revision ?? 0) }, cryptoKey, envelope.data);
  revisions.set(key, envelope.revision ?? 0);
  return JSON.parse(new TextDecoder().decode(bytes)) as T;
}

export async function writePrivate(key: string, value: unknown, expiresAt = 0): Promise<void> {
  const text = JSON.stringify(value);
  const expectedRevision = revisions.get(key) ?? 0;
  if (isAndroid()) {
    const { revision } = await native.set({ key, value: text, expiresAt, expectedRevision });
    revisions.set(key, revision);
    return;
  }
  const cryptoKey = await persistence.getItem<CryptoKey>('private-key:' + key) ??
    await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv,
    additionalData: authenticatedMetadata(key, expiresAt, expectedRevision + 1) }, cryptoKey, new TextEncoder().encode(text));
  await persistence.update([{ key: 'private-key:' + key, value: cryptoKey },
    { key: 'private:' + key, value: { version: 1, iv, data, expiresAt, revision: expectedRevision + 1 } satisfies Envelope }],
    { key: 'private:' + key, revision: expectedRevision });
  revisions.set(key, expectedRevision + 1);
}

export async function removePrivate(key: string, expectedRevision?: number): Promise<void> {
  if (isAndroid()) await native.remove({ key });
  else await persistence.update([{ key: 'private:' + key }, { key: 'private-key:' + key }],
    expectedRevision === undefined ? undefined : { key: 'private:' + key, revision: expectedRevision });
  revisions.set(key, 0);
}

export async function migratePrivate<T>(key: string): Promise<T | null> {
  let value: T | null = await readPrivate<T>(key);
  if (value === null) {
    const durable = await persistence.getItem<T>(key);
    const mirror = localStorage.getItem(key);
    // The old synchronous mirror followed the old unawaited IDB request.
    value = mirror ? JSON.parse(mirror) as T : durable;
    if (value !== null) {
      await writePrivate(key, value);
      if (JSON.stringify(await readPrivate(key)) !== JSON.stringify(value)) throw new Error('Migración no confirmada.');
    }
  }
  await persistence.removeItem(key);
  localStorage.removeItem(key);
  return value;
}
