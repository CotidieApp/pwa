import { useSyncExternalStore } from 'react';
import type { Prayer } from './types';
import { encryptBytes, decryptBytes } from './encrypted-backup';
import { validateImportPayload } from './import-safety';
import { validateSettingsData } from './settings-validation';
import LettersSecurity from '@/plugins/LettersSecurity';
import { requestSecret } from './security-prompt';

export type LettersVault = { version: 1; wrappedKey: string; iv: string; data: string; device: boolean; failures: number; retryAt: number };
type Status = { ready: boolean; enabled: boolean; locked: boolean; device: boolean; revision: number };
const initialStatus: Status = { ready: false, enabled: false, locked: true, device: false, revision: 0 };
let status = initialStatus;
let record: LettersVault | null = null;
let key: CryptoKey | null = null;
let password: string | null = null;
let epoch = 0;
let unlocking = false;
let enabling = false;
const listeners = new Set<() => void>();
const privacy = new Set<string>();
const bytes = (value: string): Uint8Array<ArrayBuffer> => {
  const binary = atob(value);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
};
const encoded = (value: Uint8Array): string => {
  let binary = '';
  for (let i = 0; i < value.length; i += 8192) binary += String.fromCharCode(...value.subarray(i, i + 8192));
  return btoa(binary);
};
const aad = new TextEncoder().encode('cotidie:letters:v1');
const publish = () => {
  status = { ready: true, enabled: record !== null, locked: record !== null && key === null,
    device: Boolean(record?.device), revision: status.revision + 1 };
  listeners.forEach(listener => listener());
};
export const getLettersSecurityStatus = () => status;
export const getLettersSecurityEpoch = () => epoch;
export const subscribeLettersSecurity = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
export const useLettersSecurityStatus = () => useSyncExternalStore(
  subscribeLettersSecurity,
  getLettersSecurityStatus, () => initialStatus,
);
export function setLettersPrivacySource(source: string, enabled: boolean): void {
  if (enabled) privacy.add(source); else privacy.delete(source);
  void LettersSecurity.setPrivacy({ enabled: privacy.size > 0 }).catch(() => undefined);
}
export function initialiseLettersVault(value: unknown): void {
  let next: LettersVault | null = null;
  if (value === undefined || value === null) next = null;
  else {
    const candidate = value as LettersVault;
    if (candidate.version !== 1 || typeof candidate.device !== 'boolean' ||
      typeof candidate.wrappedKey !== 'string' || candidate.wrappedKey.length !== 128 ||
      typeof candidate.iv !== 'string' || bytes(candidate.iv).length !== 12 ||
      typeof candidate.data !== 'string' || candidate.data.length < 24 || candidate.data.length > 40 * 1024 * 1024 ||
      !Number.isSafeInteger(candidate.failures) || candidate.failures < 0 || candidate.failures > 1000 ||
      !Number.isSafeInteger(candidate.retryAt) || candidate.retryAt < 0 || candidate.retryAt > Date.now() + 900_000)
      throw new Error('La protección guardada de Cartas está dañada. Conserva tus datos y restaura un respaldo.');
    bytes(candidate.wrappedKey); bytes(candidate.data);
    next = { ...candidate };
  }
  epoch++;
  key = null; password = null; record = next;
  publish();
}
export function validateNewLettersPassword(secret: string): void {
  if (secret.length < 8 || secret.length > 256 || !secret.trim()) throw new Error('Usa una clave de 8 a 256 caracteres o un PIN de al menos 8 cifras. Se recomienda una frase larga.');
}
async function seal(letters: Prayer[], encryptionKey: CryptoKey): Promise<{ iv: string; data: string }> {
  validateSettingsData({ userLetters: letters });
  validateImportPayload({ userLetters: letters }, 25 * 1024 * 1024);
  const plain = new TextEncoder().encode(JSON.stringify(letters));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  try { return { iv: encoded(iv), data: encoded(new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad }, encryptionKey, plain))) }; }
  finally { plain.fill(0); }
}
export async function protectLettersForStorage<T extends Record<string, unknown>>(settings: T): Promise<T & { lettersVault?: LettersVault }> {
  const copy = { ...settings };
  delete copy.lettersVault;
  if (!record) return copy;
  const currentRecord = record;
  if (key && !unlocking && Array.isArray(settings.userLetters)) {
    const sealed = await seal(settings.userLetters as Prayer[], key);
    if (record !== currentRecord) throw new Error('La seguridad de Cartas cambió durante el guardado. Reintenta.');
    record = { ...currentRecord, ...sealed };
  }
  return { ...copy, userLetters: [], lettersVault: record };
}
export async function enableLettersVault(secret: string, letters: Prayer[]): Promise<() => void> {
  if (record || enabling) throw new Error('Cartas ya tiene seguridad activa o hay una activación en curso.');
  validateNewLettersPassword(secret);
  enabling = true;
  const started = epoch;
  const raw = crypto.getRandomValues(new Uint8Array(32));
  try {
    const wrappedKey = encoded(await encryptBytes(raw, secret, 'letters-vault'));
    const nextKey = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
    const sealed = await seal(letters, nextKey);
    let device = false;
    try { device = (await LettersSecurity.available()).available; } catch { /* App password remains available. */ }
    if (epoch !== started || record) throw new Error('La aplicación se bloqueó. Activa la seguridad otra vez.');
    if (device) await LettersSecurity.storeSecret({ secret });
    if (epoch !== started || record) {
      if (device) await LettersSecurity.clearSecret().catch(() => undefined);
      throw new Error('La aplicación se bloqueó. Activa la seguridad otra vez.');
    }
    record = { version: 1, wrappedKey, ...sealed, device, failures: 0, retryAt: 0 };
    key = nextKey; password = secret; epoch++; publish();
    return () => { record = null; key = null; password = null; epoch++; publish(); void LettersSecurity.clearSecret().catch(() => undefined); };
  } finally { raw.fill(0); enabling = false; }
}
async function openWithSecret(secret: string): Promise<{ letters: Prayer[]; candidateKey: CryptoKey; candidateRecord: LettersVault }> {
  if (!record) throw new Error('Cartas no tiene seguridad activa.');
  const currentRecord = record;
  const started = epoch;
  if (Date.now() < currentRecord.retryAt) throw new Error(`Espera ${Math.ceil((currentRecord.retryAt - Date.now()) / 1000)} segundos antes de volver a intentar.`);
  let raw: Uint8Array<ArrayBuffer> | undefined;
  try {
    raw = await decryptBytes(bytes(currentRecord.wrappedKey), secret, 'letters-vault');
    if (raw.length !== 32) throw new Error('Clave inválida.');
    const nextKey = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
    const plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes(currentRecord.iv), additionalData: aad }, nextKey, bytes(currentRecord.data)));
    let letters: Prayer[];
    try { letters = JSON.parse(new TextDecoder().decode(plain)); } finally { plain.fill(0); }
    validateImportPayload({ userLetters: letters }, 25 * 1024 * 1024);
    validateSettingsData({ userLetters: letters });
    if (record !== currentRecord || epoch !== started) throw new Error('La protección cambió. Reintenta.');
    return { letters, candidateKey: nextKey, candidateRecord: currentRecord };
  } catch {
    if (record === currentRecord && epoch === started) {
      const failures = Math.min(1000, currentRecord.failures + 1);
      record = { ...currentRecord, failures, retryAt: failures >= 5 ? Date.now() + Math.min(900_000, 30_000 * 2 ** Math.min(5, failures - 5)) : 0 };
      publish();
    }
    throw new Error('No se pudo desbloquear Cartas. La clave es incorrecta o los datos están dañados.');
  } finally { raw?.fill(0); }
}
export async function unlockLettersVault(reason: string, ownPassword = false): Promise<{ letters: Prayer[]; password: string }> {
  if (!record || unlocking) throw new Error('No se puede iniciar otra solicitud de desbloqueo.');
  unlocking = true;
  const started = epoch;
  try {
    let result: Awaited<ReturnType<typeof openWithSecret>> | undefined;
    let secret: string | null = null;
    if (record.device && !ownPassword) {
      try { secret = (await LettersSecurity.unlockSecret({ reason })).secret; }
      catch (error) {
        if ((error as { code?: string }).code === 'CANCELED') throw new Error('Desbloqueo cancelado.');
        // Invalidated or missing device keys never delete the password-protected vault.
      }
    }
    if (epoch !== started) throw new Error('La aplicación se bloqueó. Vuelve a desbloquear Cartas.');
    if (secret !== null) result = await openWithSecret(secret);
    else secret = await requestSecret({ title: reason, description: 'Introduce tu clave de Cartas. Cotidie no puede recuperarla.', verify: async value => {
      result = await openWithSecret(value);
    } });
    if (secret === null || !result) throw new Error('Desbloqueo cancelado.');
    if (epoch !== started) { key = null; password = null; publish(); throw new Error('La aplicación se bloqueó. Vuelve a desbloquear Cartas.'); }
    if (record !== result.candidateRecord) throw new Error('La protección cambió. Reintenta.');
    record = { ...record, failures: 0, retryAt: 0 };
    key = result.candidateKey; password = secret; publish();
    return { letters: result.letters, password: secret };
  } finally { unlocking = false; }
}
export async function lockLettersVault(letters: Prayer[]): Promise<void> {
  epoch++;
  const currentKey = key;
  key = null; password = null; publish();
  if (!record) return;
  if (currentKey) {
    const current = record;
    const sealed = await seal(letters, currentKey);
    if (record === current) record = { ...current, ...sealed };
  }
}
export async function disableLettersVault(persist: () => Promise<void>): Promise<{ cleanupPending: boolean }> {
  const previous = { record, key, password };
  const started = epoch;
  if (!record || !key) throw new Error('Desbloquea Cartas antes de desactivar su seguridad.');
  record = null;
  try { await persist(); }
  catch (error) {
    record = previous.record;
    key = epoch === started ? previous.key : null;
    password = epoch === started ? previous.password : null;
    publish();
    throw error;
  }
  key = null; password = null; epoch++; publish();
  try { await LettersSecurity.clearSecret(); return { cleanupPending: false }; }
  catch { return { cleanupPending: true }; }
}
export function assertLettersUnlocked(): void {
  if (!status.ready || (record && key === null)) throw new Error('Desbloquea Cartas antes de continuar.');
}
export function assertLettersExportAuthorized(expectedEpoch: number): void {
  assertLettersUnlocked();
  if (epoch !== expectedEpoch) throw new Error('La aplicación se bloqueó. Autoriza la exportación otra vez.');
}
