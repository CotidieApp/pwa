/**
 * CTD3 wraps the complete existing archive in authenticated encryption. No
 * filenames, settings, password verifier or application data remain in cleartext.
 * Crypto primitives come exclusively from Web Crypto; this is only framing.
 *
 * Header (48 bytes, authenticated as AES-GCM additionalData):
 *   0..3 CTD3; 4 version=1; 5 AES256-GCM=1; 6 PBKDF2-SHA256=1;
 *   7 purpose; 8..11 iterations LE; 12..15 plaintext length LE;
 *   16..31 random salt; 32..43 random IV; 44..47 reserved zero.
 * Followed by ciphertext and the 16-byte GCM authentication tag.
 */
export const MAX_ENCRYPTED_BACKUP_CONTENT_BYTES = 128 * 1024 * 1024;
export const ENCRYPTED_BACKUP_OVERHEAD = 64;
export const MAX_ENCRYPTED_BACKUP_BYTES = MAX_ENCRYPTED_BACKUP_CONTENT_BYTES + ENCRYPTED_BACKUP_OVERHEAD;
export const BACKUP_PBKDF2_ITERATIONS = 600_000;
export type EncryptionPurpose = 'backup' | 'letters-vault';

const HEADER_BYTES = 48;
const TAG_BYTES = 16;
const MAGIC = [67, 84, 68, 51];
const MAX_PASSWORD_BYTES = 4096;
const DECRYPT_ERROR = 'No se pudo abrir el respaldo: la contraseña es incorrecta o el archivo está dañado o es incompatible.';

function invalid(): never { throw new Error(DECRYPT_ERROR); }

function purposeId(purpose: EncryptionPurpose): number {
  if (purpose === 'backup') return 1;
  if (purpose === 'letters-vault') return 2;
  return invalid();
}

function cryptoApi(): Crypto {
  if (!globalThis.crypto?.subtle) throw new Error('El cifrado requiere un contexto seguro con Web Crypto disponible.');
  return globalThis.crypto;
}

function validatePassword(password: string): Uint8Array<ArrayBuffer> {
  if (typeof password !== 'string' || !password.length || password.length > MAX_PASSWORD_BYTES)
    throw new Error('Introduce una contraseña válida para el cifrado.');
  // Preserve the exact password, including whitespace and Unicode: no trim or truncation.
  const bytes = new TextEncoder().encode(password);
  if (bytes.byteLength > MAX_PASSWORD_BYTES) { bytes.fill(0); throw new Error('La contraseña es demasiado larga.'); }
  return bytes;
}

async function deriveKey(password: string, salt: Uint8Array<ArrayBuffer>, usage: 'encrypt' | 'decrypt'): Promise<CryptoKey> {
  const api = cryptoApi();
  const bytes = validatePassword(password);
  try {
    const material = await api.subtle.importKey('raw', bytes, 'PBKDF2', false, ['deriveKey']);
    return await api.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: BACKUP_PBKDF2_ITERATIONS, hash: 'SHA-256' },
      material, { name: 'AES-GCM', length: 256 }, false, [usage],
    );
  } finally { bytes.fill(0); }
}

function validateSize(size: number, maximum: number): void {
  if (!Number.isSafeInteger(size) || size < 0 || size > maximum) invalid();
}

/** Validate every untrusted parameter before deriving a key or reading a large body. */
function validateHeader(header: Uint8Array, totalSize: number, purpose: EncryptionPurpose): number {
  validateSize(totalSize, MAX_ENCRYPTED_BACKUP_BYTES);
  if (header.byteLength !== HEADER_BYTES || totalSize < ENCRYPTED_BACKUP_OVERHEAD ||
      MAGIC.some((byte, index) => header[index] !== byte) ||
      header[4] !== 1 || header[5] !== 1 || header[6] !== 1 || header[7] !== purposeId(purpose) ||
      header.subarray(44).some(byte => byte !== 0)) invalid();
  const view = new DataView(header.buffer, header.byteOffset, header.byteLength);
  // Fixed work factor prevents both attacker-controlled KDF bombs and downgrades.
  if (view.getUint32(8, true) !== BACKUP_PBKDF2_ITERATIONS) invalid();
  const length = view.getUint32(12, true);
  if (length > MAX_ENCRYPTED_BACKUP_CONTENT_BYTES || totalSize !== length + ENCRYPTED_BACKUP_OVERHEAD) invalid();
  return length;
}

export async function encryptBytes(
  plaintext: Uint8Array, password: string, purpose: EncryptionPurpose = 'backup',
): Promise<Uint8Array<ArrayBuffer>> {
  validateSize(plaintext.byteLength, MAX_ENCRYPTED_BACKUP_CONTENT_BYTES);
  const api = cryptoApi();
  const header = new Uint8Array(HEADER_BYTES);
  header.set(MAGIC); header.set([1, 1, 1, purposeId(purpose)], 4);
  const view = new DataView(header.buffer);
  view.setUint32(8, BACKUP_PBKDF2_ITERATIONS, true);
  view.setUint32(12, plaintext.byteLength, true);
  api.getRandomValues(header.subarray(16, 32));
  api.getRandomValues(header.subarray(32, 44));
  const key = await deriveKey(password, header.slice(16, 32), 'encrypt');
  // Own the buffer passed to Web Crypto (also accepts callers with a shared backing buffer).
  const bytes = new Uint8Array(plaintext);
  try {
    const ciphertext = await api.subtle.encrypt(
      { name: 'AES-GCM', iv: header.slice(32, 44), additionalData: header, tagLength: TAG_BYTES * 8 }, key, bytes,
    );
    const result = new Uint8Array(header.byteLength + ciphertext.byteLength);
    result.set(header); result.set(new Uint8Array(ciphertext), HEADER_BYTES);
    return result;
  } finally { bytes.fill(0); }
}

export async function decryptBytes(
  encrypted: Uint8Array, password: string, purpose: EncryptionPurpose = 'backup',
): Promise<Uint8Array<ArrayBuffer>> {
  try {
    validateSize(encrypted.byteLength, MAX_ENCRYPTED_BACKUP_BYTES);
    const header = new Uint8Array(encrypted.subarray(0, HEADER_BYTES));
    const length = validateHeader(header, encrypted.byteLength, purpose);
    const key = await deriveKey(password, header.slice(16, 32), 'decrypt');
    const plaintext = await cryptoApi().subtle.decrypt(
      { name: 'AES-GCM', iv: header.slice(32, 44), additionalData: header, tagLength: TAG_BYTES * 8 },
      key, new Uint8Array(encrypted.subarray(HEADER_BYTES)),
    );
    if (plaintext.byteLength !== length) invalid();
    return new Uint8Array(plaintext);
  } catch { return invalid(); }
}

export async function isEncryptedBackup(file: Blob): Promise<boolean> {
  if (file.size < MAGIC.length) return false;
  const prefix = new Uint8Array(await file.slice(0, MAGIC.length).arrayBuffer());
  // Detect the family even with an invalid version/header so it cannot fall back to a plaintext importer.
  return MAGIC.every((byte, index) => prefix[index] === byte);
}

export async function encryptBackup(file: Blob, password: string): Promise<Blob> {
  validateSize(file.size, MAX_ENCRYPTED_BACKUP_CONTENT_BYTES);
  const plaintext = new Uint8Array(await file.arrayBuffer());
  try { return new Blob([await encryptBytes(plaintext, password)], { type: 'application/octet-stream' }); }
  finally { plaintext.fill(0); }
}

export async function decryptBackup(file: Blob, password: string): Promise<Blob> {
  try {
    validateSize(file.size, MAX_ENCRYPTED_BACKUP_BYTES);
    const header = new Uint8Array(await file.slice(0, HEADER_BYTES).arrayBuffer());
    validateHeader(header, file.size, 'backup');
    const plaintext = await decryptBytes(new Uint8Array(await file.arrayBuffer()), password);
    try { return new Blob([plaintext], { type: 'application/octet-stream' }); }
    finally { plaintext.fill(0); }
  } catch { return invalid(); }
}
