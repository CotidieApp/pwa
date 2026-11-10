const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const token = 'bf76c099-675d-4a71-a0cf-224beb14efbd';
const password = 'Native import test password';
const compileCache = new Map();
function compiled(relative) {
  if (!compileCache.has(relative)) compileCache.set(relative, ts.transpileModule(
    fs.readFileSync(path.join(root, relative), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    }).outputText);
  return compileCache.get(relative);
}
function load(relative, resolve, globals = {}) {
  const exports = {};
  vm.runInNewContext(compiled(relative), {
    exports, require: resolve, Blob, File, TextEncoder, Uint8Array, DataView, ArrayBuffer,
    crypto: webcrypto, JSON, ...globals,
  }, { filename: relative });
  return exports;
}

function nativeHarness(options = {}) {
  const calls = { resolve: [], clear: [], fetch: [], convert: [], parse: [] };
  const file = options.file || { path: '/data/user/0/com.benjamin.studio/cache/cotidie-backup-import/test.ctd', name: 'source.ctd', size: 8 };
  const native = {
    resolve: async value => { calls.resolve.push(value); if (options.resolveError) throw options.resolveError; return file; },
    clear: async value => { calls.clear.push(value); if (options.clearError) throw options.clearError; },
  };
  const helper = load('src/lib/native-backup-import.ts', name => {
    if (name === '@capacitor/core') return { Capacitor: {
      isNativePlatform: () => options.native !== false,
      getPlatform: () => options.platform || 'android',
      convertFileSrc: value => { calls.convert.push(value); return 'https://localhost/_capacitor_file_' + value; },
    } };
    if (name === '@/plugins/BackupImport') return native;
    if (name === './encrypted-backup') return { MAX_ENCRYPTED_BACKUP_BYTES: 128 * 1024 * 1024 + 64 };
    if (name === './backup-archive') return { parseCotidieBackupFile: async value => {
      calls.parse.push(value);
      return options.parse ? options.parse(value) : { imported: true };
    } };
    throw new Error('Unexpected native helper dependency: ' + name);
  }, { fetch: async url => {
    calls.fetch.push(url);
    if (options.fetchError) throw options.fetchError;
    return { ok: options.ok !== false, blob: async () => options.blob || new Blob(['CTD2data']) };
  } });
  return { read: helper.readNativeBackupImport, calls, file };
}

test('native import resolves only its token, fetches the converted native path, parses exact bytes and clears capability', async () => {
  const h = nativeHarness();
  assert.equal((await h.read(token)).imported, true);
  assert.equal(h.calls.resolve.length, 1);
  assert.equal(JSON.stringify(h.calls.resolve[0]), JSON.stringify({ token }));
  assert.equal(JSON.stringify(h.calls.clear), JSON.stringify([{ token }]));
  assert.deepEqual(h.calls.convert, [h.file.path]);
  assert.deepEqual(h.calls.fetch, ['https://localhost/_capacitor_file_' + h.file.path]);
  assert.equal(h.calls.parse[0].name, 'respaldo.ctd');
  assert.equal(await h.calls.parse[0].text(), 'CTD2data');
});

test('browser, iOS and caller-supplied paths never resolve, fetch or clear native capabilities', async () => {
  for (const options of [{ native: false }, { platform: 'ios' }, {}]) {
    const h = nativeHarness(options);
    const input = Object.keys(options).length ? token : '/data/user/0/private/arbitrary.ctd';
    await assert.rejects(h.read(input), /Usa Importar respaldo/);
    assert.equal(h.calls.resolve.length, 0);
    assert.equal(h.calls.fetch.length, 0);
    assert.equal(h.calls.clear.length, 0);
  }
});

test('untrusted resolved metadata is bounded before any file fetch and is always cleared by the same token', async () => {
  for (const value of [NaN, Infinity, -1, 7, 8.5, 128 * 1024 * 1024 + 65]) {
    const h = nativeHarness({ file: { path: '/private/staged.ctd', size: value } });
    await assert.rejects(h.read(token), /inválido o demasiado grande/);
    assert.equal(h.calls.fetch.length, 0);
    assert.equal(h.calls.parse.length, 0);
    assert.equal(JSON.stringify(h.calls.clear), JSON.stringify([{ token }]));
  }
  for (const value of ['relative.ctd', 'https://external.example/backup.ctd', null]) {
    const h = nativeHarness({ file: { path: value, size: 8 } });
    await assert.rejects(h.read(token));
    assert.equal(h.calls.fetch.length, 0);
    assert.equal(h.calls.clear[0].token, token);
  }
});

test('incomplete and oversized returned blobs never reach the parser', async () => {
  for (const content of ['CTD', 'CTD2too-many-bytes']) {
    const h = nativeHarness({ blob: new Blob([content]) });
    await assert.rejects(h.read(token), /incompleto/);
    assert.equal(h.calls.parse.length, 0);
    assert.equal(h.calls.clear[0].token, token);
  }
});

test('resolve, fetch, HTTP, parser and user cancellation failures clear the owned capability', async () => {
  const failure = new Error('test-only failure');
  for (const options of [
    { resolveError: failure }, { fetchError: failure }, { ok: false },
    { parse: async () => { throw failure; } },
    { parse: async () => { throw new Error('Importación cancelada. Tus datos se conservaron.'); } },
  ]) {
    const h = nativeHarness(options);
    await assert.rejects(h.read(token));
    assert.equal(JSON.stringify(h.calls.clear), JSON.stringify([{ token }]));
  }
  const h = nativeHarness({ clearError: failure });
  assert.equal((await h.read(token)).imported, true, 'cleanup error does not discard an already parsed result');
});

// Load the real encrypted importer, prompt state and validators. Persistence and
// library I/O are traps: parsing and password cancellation must never apply data.
function parserHarness() {
  const cache = new Map();
  const calls = { json: 0, settings: 0, writes: 0 };
  const noWrite = () => { calls.writes++; throw new Error('Parsing must not mutate persistence'); };
  function actual(relative) {
    if (cache.has(relative)) return cache.get(relative);
    const instance = load(relative, name => {
      if (name === 'zod') return require('zod');
      if (relative === 'src/lib/backup-archive.ts') {
        if (name === './reading-store') return { openReadingDB: noWrite, readingTransaction: noWrite, isReadingDeleted: noWrite, resetReadingMemory: noWrite };
        if (name === './persistence') return { persistence: { setItem: noWrite, removeItem: noWrite, getItem: noWrite } };
        if (name === './personal-epubs') return { listPersonalEpubs: noWrite, openPersonalEpub: noWrite };
        if (name === './epub-import-safety') return { validateEpubArchive: noWrite };
        if (name === './rosary-immersive/storage') return { parseRosaryIntentions: noWrite, parseRosaryJaculatorias: noWrite };
        if (name === './import-safety') {
          const safety = actual('src/lib/import-safety.ts');
          return { ...safety, parseImportText: value => { calls.json++; return safety.parseImportText(value); } };
        }
        if (name === './settings-validation') {
          const validation = actual('src/lib/settings-validation.ts');
          return { ...validation, validateSettingsData: value => { calls.settings++; return validation.validateSettingsData(value); } };
        }
      }
      if (name.startsWith('./')) return actual(path.posix.normalize(path.posix.join(path.posix.dirname(relative), name + '.ts')));
      throw new Error('Unexpected importer dependency: ' + name);
    });
    cache.set(relative, instance);
    return instance;
  }
  const parser = actual('src/lib/backup-archive.ts');
  return { parser, prompt: actual('src/lib/security-prompt.ts'), crypto: actual('src/lib/encrypted-backup.ts'),
    auth: actual('src/lib/backup-authentication.ts'), calls };
}

async function awaitPrompt(h) {
  for (let tick = 0; tick < 30; tick++) {
    const prompt = h.prompt.getSecretPrompt();
    if (prompt) return prompt;
    await new Promise(resolve => setImmediate(resolve));
  }
  assert.fail('Importer did not request the backup password');
}

test('encrypted external CTD waits for a verified password before parsing and clears its native file afterward', async () => {
  const h = parserHarness();
  const encrypted = await h.crypto.encryptBackup(new Blob(['{"settings":{"theme":"dark"}}']), password);
  const native = nativeHarness({ blob: encrypted, file: { path: '/private/one.ctd', size: encrypted.size },
    parse: file => h.parser.parseCotidieBackupFile(file) });
  const opening = native.read(token);
  const prompt = await awaitPrompt(h);
  assert.equal(h.calls.json, 0);
  assert.equal(h.calls.settings, 0);
  assert.equal(native.calls.clear.length, 0, 'native file remains available during the password request');
  await assert.rejects(prompt.verify('wrong password'));
  assert.equal(h.prompt.getSecretPrompt(), prompt, 'wrong password leaves the same request open for retry');
  assert.equal(h.calls.json, 0);
  await prompt.verify(password);
  h.prompt.finishSecretPrompt(password);
  const parsed = await opening;
  assert.equal(parsed.settings.theme, 'dark');
  assert.equal(h.calls.json, 1);
  assert.equal(h.auth.consumeBackupPassword(parsed), password);
  assert.equal(h.auth.consumeBackupPassword(parsed), null, 'authenticated password is consumed once');
  assert.equal(native.calls.clear[0].token, token);
  assert.equal(h.calls.writes, 0);
});

test('cancelling encrypted external CTD applies no data and clears its native capability', async () => {
  const h = parserHarness();
  const encrypted = await h.crypto.encryptBackup(new Blob(['{"settings":{"theme":"dark"}}']), password);
  const native = nativeHarness({ blob: encrypted, file: { path: '/private/cancel.ctd', size: encrypted.size },
    parse: file => h.parser.parseCotidieBackupFile(file) });
  const opening = native.read(token);
  await awaitPrompt(h);
  h.prompt.finishSecretPrompt(null);
  await assert.rejects(opening, /Importación cancelada/);
  assert.equal(h.calls.json, 0);
  assert.equal(h.calls.settings, 0);
  assert.equal(h.calls.writes, 0);
  assert.equal(native.calls.clear[0].token, token);
});

test('legacy CTD2 and JSON still parse without password prompts or persistence mutations', async () => {
  const h = parserHarness();
  const metadata = new TextEncoder().encode(JSON.stringify({ format: 'cotidie-backup-2',
    settings: { theme: 'dark' }, local: {}, progress: [], files: [] }));
  const header = new Uint8Array(8);
  header.set([67, 84, 68, 50]); new DataView(header.buffer).setUint32(4, metadata.length, true);
  const complete = await h.parser.parseCotidieBackupFile(new File([header, metadata], 'legacy.ctd'));
  assert.equal(complete.format, 'cotidie-backup-2');
  assert.equal(complete.settings.theme, 'dark');
  const json = await h.parser.parseCotidieBackupFile(new File(['{"settings":{"theme":"light"}}'], 'legacy.json'));
  assert.equal(json.settings.theme, 'light');
  assert.equal(h.prompt.getSecretPrompt(), null);
  assert.equal(h.auth.consumeBackupPassword(complete), null);
  assert.equal(h.auth.consumeBackupPassword(json), null);
  assert.equal(h.calls.writes, 0);
});
