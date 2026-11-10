const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const ts = require('typescript');

const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/lib/encrypted-backup.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
function load(crypto = webcrypto) {
  const exports = {};
  vm.runInNewContext(source, { exports, crypto, Blob, TextEncoder, Uint8Array, DataView, ArrayBuffer, Error });
  return exports;
}
const backup = load();
const password = 'Una contraseña privada 🕯 con espacios ';
const marker = 'CTD2 contenido íntimo que nunca debe aparecer en claro';

test('encrypted CTD3 backup round trips binary archive and legacy JSON without exposing plaintext', async () => {
  for (const content of [new Blob([marker, new Uint8Array([0, 255, 17])]), new Blob(['{"letters":"' + marker + '"}']), new Blob([])]) {
    const encrypted = await backup.encryptBackup(content, password);
    assert.equal(encrypted.type, 'application/octet-stream');
    assert.equal(encrypted.size, content.size + backup.ENCRYPTED_BACKUP_OVERHEAD);
    assert.equal(await backup.isEncryptedBackup(encrypted), true);
    assert.equal((await encrypted.text()).includes(marker), false);
    assert.deepEqual(Buffer.from(await (await backup.decryptBackup(encrypted, password)).arrayBuffer()), Buffer.from(await content.arrayBuffer()));
  }
  assert.equal(await backup.isEncryptedBackup(new Blob(['CTD2'])), false);
  assert.equal(await backup.isEncryptedBackup(new Blob(['{}'])), false);
  assert.equal(await backup.isEncryptedBackup(new Blob(['CTD3'])), true);
});

test('fresh salt and IV randomize repeated exports with the same password', async () => {
  const first = new Uint8Array(await (await backup.encryptBackup(new Blob([marker]), password)).arrayBuffer());
  const second = new Uint8Array(await (await backup.encryptBackup(new Blob([marker]), password)).arrayBuffer());
  assert.notDeepEqual(first.slice(16, 32), second.slice(16, 32));
  assert.notDeepEqual(first.slice(32, 44), second.slice(32, 44));
  assert.notDeepEqual(first.slice(48), second.slice(48));
});

test('wrong password, tampered header/ciphertext/tag and truncation all reject without plaintext', async () => {
  const encrypted = new Uint8Array(await (await backup.encryptBackup(new Blob([marker]), password)).arrayBuffer());
  let expected;
  try { await backup.decryptBytes(encrypted, 'incorrecta'); } catch (error) { expected = error.message; }
  assert.ok(expected);
  for (const offset of [0, 4, 5, 6, 7, 8, 12, 16, 32, 44, 48, encrypted.length - 1]) {
    const changed = encrypted.slice(); changed[offset] ^= 1;
    await assert.rejects(backup.decryptBytes(changed, password), error => error.message === expected, 'offset ' + offset);
  }
  for (const changed of [encrypted.slice(0, -1), new Uint8Array([...encrypted, 0])]) {
    await assert.rejects(backup.decryptBackup(new Blob([changed]), password), error => error.message === expected);
  }
});

test('vault wrapping uses authenticated purpose separation and preserves exact Unicode password', async () => {
  const secret = new Uint8Array([1, 2, 3, 4]);
  const encrypted = await backup.encryptBytes(secret, password, 'letters-vault');
  assert.deepEqual(await backup.decryptBytes(encrypted, password, 'letters-vault'), secret);
  await assert.rejects(backup.decryptBytes(encrypted, password, 'backup'));
  await assert.rejects(backup.decryptBytes(encrypted, password.trim(), 'letters-vault'));
  assert.deepEqual(secret, new Uint8Array([1, 2, 3, 4]), 'encryption does not erase caller-owned bytes');
  await assert.rejects(backup.encryptBytes(secret, ''));
  await assert.rejects(backup.encryptBytes(secret, 'a'.repeat(4097)));
});

test('invalid versions, sizes, KDF bombs and downgrade parameters reject before any key derivation or body read', async () => {
  let cryptoCalls = 0;
  const guarded = load({ subtle: { importKey() { cryptoCalls++; throw new Error('must not derive'); } } });
  const valid = new Uint8Array(await (await backup.encryptBackup(new Blob([marker]), password)).arrayBuffer());
  const malformed = [];
  for (const offset of [4, 5, 6, 7, 44]) { const bytes = valid.slice(); bytes[offset] = 255; malformed.push(bytes); }
  for (const workFactor of [0, 1, 599999, 600001, 0xffffffff]) {
    const bytes = valid.slice(); new DataView(bytes.buffer).setUint32(8, workFactor, true); malformed.push(bytes);
  }
  const huge = valid.slice();
  new DataView(huge.buffer).setUint32(12, backup.MAX_ENCRYPTED_BACKUP_CONTENT_BYTES + 1, true);
  malformed.push(huge, valid.slice(0, 47));
  for (const bytes of malformed) {
    await assert.rejects(guarded.decryptBytes(bytes, password));
    let readBody = false;
    const file = {
      size: bytes.byteLength,
      slice: (start, end) => new Blob([bytes.slice(start, end)]),
      arrayBuffer: () => { readBody = true; throw new Error('must not read body'); },
    };
    await assert.rejects(guarded.decryptBackup(file, password));
    assert.equal(readBody, false);
  }
  const oversized = {
    size: backup.MAX_ENCRYPTED_BACKUP_BYTES + 1,
    slice() { throw new Error('must not read'); },
    arrayBuffer() { throw new Error('must not read'); },
  };
  await assert.rejects(guarded.decryptBackup(oversized, password));
  await assert.rejects(guarded.encryptBackup(oversized, password));
  assert.equal(cryptoCalls, 0);
});
