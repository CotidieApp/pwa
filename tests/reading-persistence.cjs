/* Regression tests, using Node's built-in runner (no application dependencies added).
 * Install fake-indexeddb in a scratch directory, then:
 * node --require <scratch>/node_modules/fake-indexeddb/auto --test tests/reading-persistence.cjs
 * No iframe/APK/PWA rendering is claimed by these tests.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
assert.ok(global.indexedDB, 'Preload fake-indexeddb/auto from a scratch directory');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText, filename);
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function(name, ...args) {
  if (name.startsWith('@/')) {
    const mapped = path.join(root, 'src', name.slice(2));
    name = fs.existsSync(mapped + '.ts') ? mapped + '.ts' : mapped;
  }
  return originalResolve.call(this, name, ...args);
};
class MemoryStorage {
  data = new Map();
  getItem(key) { return this.data.get(key) ?? null; }
  setItem(key, value) { this.data.set(key, String(value)); }
  removeItem(key) { this.data.delete(key); }
}
global.localStorage = new MemoryStorage();
const store = require('../src/lib/reading-store.ts');
const { EpubProgressRepository, epubProgressKey, parseEpubProgress } = require('../src/lib/epub-reader/progress.ts');
const personal = require('../src/lib/personal-epubs.ts');
const camino = require('../src/lib/camino-progress.ts');
const realLayout = require('../src/lib/epub-reader/layout.ts');
const pagination = require('../src/lib/epub-reader/pagination.ts');
const notebook = require('../src/lib/confession-notebook.ts');
const prayerTimer = require('../src/lib/prayer-timer.ts');
const { persistence } = require('../src/lib/persistence.ts');
const privateStorage = require('../src/lib/private-storage.ts');
const imports = require('../src/lib/import-safety.ts');
const { validateEpubArchive } = require('../src/lib/epub-import-safety.ts');
const { getLocalDateKey } = require('../src/lib/calendar-date.ts');
const { normalizeBackupState } = require('../src/context/settings/normalize.ts');

test('imported remaining time stays within its configured duration and preserves valid pauses', () => {
  assert.equal(normalizeBackupState({ timerDuration: 2, timerTime: Number.MAX_VALUE, timerActive: false }).timerTime, 120);
  assert.equal(normalizeBackupState({ timerDuration: 7, timerTime: 83, timerActive: false }).timerTime, 83);
  assert.equal(normalizeBackupState({ timerDuration: 2, timerTime: -1 }).timerTime, 0);
});

test('developer verifiers accept the existing local credentials without distributing plaintext', async () => {
  const previous = require('node:child_process').execFileSync('git', ['show', 'HEAD:src/lib/dev-credentials.ts'], { cwd: root, encoding: 'utf8' });
  const ast = ts.createSourceFile('previous.ts', previous, ts.ScriptTarget.Latest, true);
  const pairs = [];
  const visit = node => {
    if (ts.isObjectLiteralExpression(node)) {
      const values = {};
      for (const property of node.properties)
        if (ts.isPropertyAssignment(property) && ts.isStringLiteral(property.initializer))
          values[property.name.getText(ast)] = property.initializer.text;
      if (typeof values.user === 'string' && typeof values.pass === 'string') pairs.push(values);
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
  assert.ok(pairs.length > 0);
  const { verifyDeveloperCredentials } = require('../src/lib/dev-credentials.ts');
  for (const pair of pairs) assert.equal(await verifyDeveloperCredentials(pair.user, pair.pass), true, 'Existing credential compatibility');
  assert.equal(await verifyDeveloperCredentials('invalid', 'invalid'), false);
});

test('sensitive storage confirms COMMIT, rejects post-request aborts, and recovers failed opens', async () => {
  await persistence.close();
  const originalOpen = indexedDB.open;
  indexedDB.open = () => { throw new Error('denied'); };
  try { await assert.rejects(persistence.getItem('failed-open'), /denied/); }
  finally { indexedDB.open = originalOpen; }
  await persistence.setItem('commit-first', 42);
  assert.equal(await persistence.getItem('commit-first'), 42);
  const originalPut = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function(...args) {
    const request = originalPut.apply(this, args);
    request.addEventListener('success', () => this.transaction.abort());
    return request;
  };
  try { await assert.rejects(persistence.setItem('aborted', 99)); }
  finally { IDBObjectStore.prototype.put = originalPut; }
  assert.equal(await persistence.getItem('aborted'), null);
});

test('private migration encrypts, verifies before retiring plaintext, and corrupt data cannot become defaults', async () => {
  const key = 'test-private-migration';
  localStorage.setItem(key, JSON.stringify({ text: 'private fictional note', revision: 2 }));
  await persistence.setItem(key, { text: 'older', revision: 1 });
  assert.equal((await privateStorage.migratePrivate(key)).revision, 2);
  assert.equal(localStorage.getItem(key), null);
  assert.equal(await persistence.getItem(key), null);
  const envelope = await persistence.getItem('private:' + key);
  assert.ok(envelope.data instanceof ArrayBuffer);
  assert.ok(!Buffer.from(envelope.data).includes(Buffer.from('private fictional note')));
  const cryptoKey = await persistence.getItem('private-key:' + key);
  assert.equal(cryptoKey.extractable, false);
  new Uint8Array(envelope.data)[0] ^= 1;
  await persistence.setItem('private:' + key, envelope);
  await assert.rejects(privateStorage.migratePrivate(key));
  assert.ok(await persistence.getItem('private:' + key));
  await privateStorage.removePrivate(key);
});

test('migration failure retains plaintext; ordered delete removes both ciphertext and its key', async () => {
  const key = 'test-private-failure';
  localStorage.setItem(key, '{"text":"fictional"}');
  const original = persistence.update;
  persistence.update = async () => { throw new Error('quota'); };
  try { await assert.rejects(privateStorage.migratePrivate(key)); }
  finally { persistence.update = original; }
  assert.equal(localStorage.getItem(key), '{"text":"fictional"}');
  await privateStorage.migratePrivate(key);
  const pending = privateStorage.privateOperation(key, () => privateStorage.writePrivate(key, { text: 'last write' }));
  const removed = privateStorage.privateOperation(key, () => privateStorage.removePrivate(key));
  await Promise.all([pending, removed]);
  assert.equal(await privateStorage.readPrivate(key), null);
  assert.equal(await persistence.getItem('private-key:' + key), null);
  await privateStorage.writePrivate(key, { text: 'expired' }, Date.now() - 1);
  assert.equal(await privateStorage.readPrivate(key), null);
  assert.equal(await persistence.getItem('private-key:' + key), null);
});

test('private revisions reject stale windows and expiry metadata is authenticated', async () => {
  const key = 'test-private-revision';
  await privateStorage.writePrivate(key, { text: 'current' }, Date.now() + 100000);
  const original = await persistence.getItem('private:' + key);
  await assert.rejects(persistence.update([{ key: 'private:' + key, value: { stale: true } }],
    { key: 'private:' + key, revision: 0 }), /otra ventana/);
  assert.equal((await privateStorage.readPrivate(key)).text, 'current');
  await persistence.setItem('private:' + key, { ...original, expiresAt: 0 });
  await assert.rejects(privateStorage.readPrivate(key));
  await persistence.setItem('private:' + key, { ...original, revision: original.revision + 1 });
  await assert.rejects(privateStorage.writePrivate(key, { text: 'stale' }), /otra ventana/);
  await privateStorage.removePrivate(key);
});

test('import privilege exclusion preserves content and rejects oversized, deep and hostile structures', () => {
  const safe = imports.withoutLocalPrivileges({ userLetters: [{ content: 'fictional' }], isDeveloperMode: true,
    isEditModeEnabled: true, devLiveTraceEvents: [{ data: 'private' }], timerActive: true });
  assert.ok(!('isDeveloperMode' in safe) && !('isEditModeEnabled' in safe) && !('devLiveTraceEvents' in safe));
  assert.equal(safe.userLetters[0].content, 'fictional');
  assert.throws(() => imports.parseImportText('{"__proto__":{"isDeveloperMode":true}}'));
  let nested = {};
  for (let i = 0; i < 42; i++) nested = { child: nested };
  assert.throws(() => imports.validateImportPayload(nested));
  assert.throws(() => imports.parseImportText(' '.repeat(imports.MAX_IMPORT_BYTES + 1)));
  assert.deepEqual(imports.parseImportText('\uFEFF{"timerDuration":7}'), { timerDuration: 7 });
});

test('EPUB limits inspect actual expanded bytes, names, duplicates, and the packaged NT remains accepted', async () => {
  const valid = await validEpub();
  assert.doesNotThrow(() => validateEpubArchive(valid));
  const nt = fs.readFileSync(path.join(root, 'public/epub/nuevo-testamento.epub'));
  assert.doesNotThrow(() => validateEpubArchive(nt.buffer.slice(nt.byteOffset, nt.byteOffset + nt.byteLength)));
  const zip = new (require('jszip'))();
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  zip.file('META-INF/container.xml', '<container/>');
  zip.file('bomb.txt', 'a'.repeat(2 * 1024 * 1024));
  const bomb = await zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' });
  assert.throws(() => validateEpubArchive(bomb));
  // Forged declared lengths cannot disguise real expansion.
  const forged = bomb.slice(0), view = new DataView(forged), data = new Uint8Array(forged);
  for (let i = 0; i + 46 < data.length; i++) {
    if (view.getUint32(i, true) === 0x02014b50 && view.getUint32(i + 24, true) > 1000000) {
      view.setUint32(i + 24, 1000, true);
      view.setUint32(view.getUint32(i + 42, true) + 22, 1000, true);
    }
  }
  assert.throws(() => validateEpubArchive(forged));
  assert.throws(() => validateEpubArchive(new ArrayBuffer(10)));
});

test('personal deletion removes binary, legacy mirrors and annotations and defeats late checkpoints', async () => {
  const id = 'epub-delete-safe', resource = 'personal-' + id + '.epub', key = epubProgressKey(resource);
  const meta = { id, name: 'Delete', sizeBytes: 1, updatedAt: 1 };
  await personal.savePersonalEpub(meta, await validEpub());
  const repository = new EpubProgressRepository(resource, trace);
  repository.save(anchor(3), 'checkpoint');
  localStorage.setItem('cotidie_epub_bookmarks_' + resource, 'fictional');
  localStorage.setItem('cotidie_epub_highlights_' + resource, 'fictional');
  localStorage.setItem(personal.personalFileKey(id), 'legacy');
  await legacyWrite(key, { cfi: cfi(8) });
  const deletion = personal.deletePersonalEpub(id);
  repository.save(anchor(5), 'late close');
  await deletion;
  await repository.saveQueued(anchor(7), 'even later').committed;
  assert.equal(await store.readReading(key), null);
  assert.equal(await repository.load(), null);
  assert.equal(localStorage.getItem(key), null);
  assert.equal(localStorage.getItem('cotidie_epub_bookmarks_' + resource), null);
  assert.equal(localStorage.getItem('cotidie_epub_highlights_' + resource), null);
  assert.ok(!(await personal.listPersonalEpubs()).some(book => book.id === id));
  await assert.rejects(personal.openPersonalEpub(meta, trace), /eliminado/);
});

test('civil dates stay local at Santiago midnight and DST, without altering the pastoral cutoff', () => {
  const previous = process.env.TZ;
  try {
    process.env.TZ = 'America/Santiago';
    assert.equal(getLocalDateKey(new Date('2026-10-09T02:30:00Z')), '2026-10-08');
    assert.equal(getLocalDateKey(new Date('2026-09-06T03:30:00Z')), '2026-09-05');
    assert.equal(getLocalDateKey(new Date('2026-09-06T04:30:00Z')), '2026-09-06');
    process.env.TZ = 'Pacific/Auckland';
    assert.equal(getLocalDateKey(new Date('2026-10-08T12:30:00Z')), '2026-10-09');
  } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
});
const traces = [];
const trace = (...entry) => traces.push(entry);
const cfi = page => `epubcfi(/6/${page * 2}!/4/2/1:10)`;
const anchor = page => ({ anchorCfi: cfi(page), startCfi: cfi(page), endCfi: cfi(page + 1), anchorKind: 'center' });
const record = (resourceId, page, updatedAt, revision = 1) => ({ ...anchor(page), version: 1, resourceId, updatedAt, revision });
const tick = () => new Promise(resolve => setImmediate(resolve));
async function validEpub(paddingBytes = 0) {
  const zip = new (require('jszip'))();
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  zip.file('META-INF/container.xml', '<container><rootfiles><rootfile full-path="book.opf"/></rootfiles></container>');
  zip.file('book.opf', '<package/>');
  if (paddingBytes) zip.file('image.bin', require('node:crypto').randomBytes(paddingBytes));
  const bytes = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}
async function legacyWrite(key, value) {
  await store.readLegacyEpub(key); // create old schema if absent
  const db = await new Promise((resolve, reject) => {
    const req = indexedDB.open('cotidie-db', 1);
    req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
  });
  await new Promise((resolve, reject) => {
    const tx = db.transaction('settings-store', 'readwrite');
    tx.objectStore('settings-store').put(value, key);
    tx.oncomplete = resolve; tx.onabort = () => reject(tx.error);
  });
  db.close();
}

test('legacy JSON and plain CFI: synchronous legacy copy wins and unrelated annotations survive', async () => {
  const id = 'nuevo-testamento.epub', key = epubProgressKey(id);
  localStorage.setItem(key, JSON.stringify({ cfi: cfi(9), endCfi: cfi(10), href: 'chapter.xhtml' }));
  localStorage.setItem('cotidie_epub_bookmarks_' + id, 'keep-bookmarks');
  localStorage.setItem('cotidie_epub_highlights_' + id, 'keep-highlights');
  await legacyWrite(key, JSON.stringify({ cfi: cfi(2) }));
  const result = await new EpubProgressRepository(id.toUpperCase(), trace).load();
  assert.equal(result.anchorCfi, cfi(9));
  assert.equal(result.resourceId, id);
  assert.equal(result.version, 1);
  assert.equal((await store.readReading(key)).anchorCfi, cfi(9));
  assert.equal(localStorage.getItem('cotidie_epub_bookmarks_' + id), 'keep-bookmarks');
  assert.equal(localStorage.getItem('cotidie_epub_highlights_' + id), 'keep-highlights');
  assert.equal(parseEpubProgress(cfi(7), id).anchorCfi, cfi(7));
  assert.equal(parseEpubProgress(JSON.stringify(cfi(7)), id).anchorCfi, cfi(7));
  assert.equal(parseEpubProgress('garbage', id), null);
});

test('new local mirror beats stale durable copy after simulated process death; reverse repair works', async () => {
  const id = 'personal-legacy-id.epub', key = epubProgressKey(id);
  await store.putReading(key, record(id, 2, 100));
  localStorage.setItem(key, JSON.stringify(record(id, 8, 200, 2)));
  assert.equal((await new EpubProgressRepository(id, trace).load()).anchorCfi, cfi(8));
  assert.equal((await store.readReading(key)).anchorCfi, cfi(8));
  await store.putReading(key, record(id, 13, 300, 3));
  assert.equal((await new EpubProgressRepository(id, trace).load()).anchorCfi, cfi(13));
  assert.equal(JSON.parse(localStorage.getItem(key)).anchorCfi, cfi(13));
});

test('revision tie-break and atomic comparison prevent old concurrent/queued writes from replacing new', async () => {
  const id = 'race.epub', key = epubProgressKey(id);
  const older = record(id, 2, 500, 1), newer = record(id, 7, 500, 4);
  await Promise.all([store.putReading(key, newer), store.putReading(key, older)]);
  assert.deepEqual(await store.readReading(key), newer);
  await Promise.all([store.queueReading(key, newer, trace), store.queueReading(key, older, trace)]);
  assert.deepEqual(await store.readReading(key), newer);
  assert.equal(JSON.parse(localStorage.getItem(key)).revision, 4);
});

test('save updates local synchronously and a delayed old completion cannot regress its mirror', async () => {
  const id = 'immediate.epub', key = epubProgressKey(id), repo = new EpubProgressRepository(id, trace);
  const first = repo.save(anchor(2), 'next');
  const second = repo.save(anchor(3), 'next');
  assert.equal(JSON.parse(localStorage.getItem(key)).anchorCfi, cfi(3));
  assert.ok(second.revision > first.revision);
  await store.queueReading(key, first, trace);
  assert.equal((await store.readReading(key)).anchorCfi, cfi(3));
  assert.equal(JSON.parse(localStorage.getItem(key)).anchorCfi, cfi(3));
});

test('IDB transaction abort rejects even after a put request succeeds', async () => {
  await assert.rejects(store.readingTransaction('progress', 'readwrite', (objectStore, done) => {
    const req = objectStore.put(record('abort.epub', 4, 1), 'abort');
    req.onsuccess = () => { done('must-not-resolve'); objectStore.transaction.abort(); };
  }));
  assert.equal(await store.readReading('abort'), null);
});

test('local quota failure is traced and durable progress still commits', async () => {
  const id = 'quota.epub', key = epubProgressKey(id), original = localStorage.setItem;
  localStorage.setItem = () => { throw new Error('QuotaExceededError'); };
  try {
    const saved = new EpubProgressRepository(id, trace).save(anchor(6), 'next');
    await store.queueReading(key, saved, trace);
    assert.equal((await store.readReading(key)).anchorCfi, cfi(6));
    assert.ok(traces.some(([message, , error]) => message === 'localStorage error' && error));
  } finally { localStorage.setItem = original; }
});

test('personal legacy bytes migrate without changing IDs; failed migration retains the original', async () => {
  const fixture = await validEpub();
  const encoded = Buffer.from(fixture).toString('base64');
  const meta = { id: 'epub-legacy', name: 'Mi libro', sizeBytes: fixture.byteLength, updatedAt: 10 };
  localStorage.setItem(personal.personalFileKey(meta.id), encoded);
  const data = await personal.openPersonalEpub(meta, trace);
  assert.deepEqual(data, fixture);
  assert.equal(localStorage.getItem(personal.personalFileKey(meta.id)), null);
  assert.deepEqual((await personal.listPersonalEpubs()).find(item => item.id === meta.id), meta);
  assert.deepEqual(await personal.openPersonalEpub(meta, trace), fixture);
  const failing = { ...meta, id: 'epub-fail' };
  localStorage.setItem(personal.personalFileKey(failing.id), encoded);
  const original = indexedDB.open;
  indexedDB.open = () => { throw new Error('storage denied'); };
  try {
    assert.equal((await personal.openPersonalEpub(failing, trace)).byteLength, fixture.byteLength);
    assert.equal(localStorage.getItem(personal.personalFileKey(failing.id)), encoded);
  } finally { indexedDB.open = original; }
});

test('personal binary over localStorage quota uses IDB, rename keeps bytes and progress identity', async () => {
  const fixture = await validEpub(6 * 1024 * 1024);
  const meta = { id: 'epub-large', name: 'Large', sizeBytes: fixture.byteLength, updatedAt: 20 };
  await personal.savePersonalEpub(meta, new Blob([fixture]));
  await personal.renamePersonalEpub({ ...meta, name: 'Renamed' });
  assert.equal((await personal.openPersonalEpub(meta, trace)).byteLength, meta.sizeBytes);
  assert.equal((await personal.listPersonalEpubs()).find(item => item.id === meta.id).name, 'Renamed');
  assert.equal(localStorage.getItem(personal.personalFileKey(meta.id)), null);
  assert.equal(epubProgressKey(`personal-${meta.id}.epub`), 'cotidie_epub_location_personal-epub-large.epub');
});

test('NT URL/base64 and personal ArrayBuffer readers retain their historical progress identities', () => {
  const epubReader = fs.readFileSync(path.join(root, 'src/components/EpubReader.tsx'), 'utf8');
  const ntReader = fs.readFileSync(path.join(root, 'src/components/NuevoTestamentoReader.tsx'), 'utf8');
  const personalReader = fs.readFileSync(path.join(root, 'src/components/PersonalEpubLibrary.tsx'), 'utf8');
  assert.match(ntReader, /fileName=\{NT_FILE\}/);
  assert.equal((ntReader.match(/displayName=\{NT_DISPLAY_NAME\}/g) || []).length, 2);
  assert.match(ntReader, /const NT_DISPLAY_NAME = 'Nuevo Testamento'/);
  assert.match(ntReader, /sourceBase64=\{offlineSource \?\? undefined\}/);
  assert.equal(epubProgressKey('nuevo-testamento.epub'), 'cotidie_epub_location_nuevo-testamento.epub');
  assert.match(personalReader, /fileName=\{`personal-\$\{selected\.id\}\.epub`\}/);
  assert.match(personalReader, /displayName=\{selected\.name\}/);
  assert.match(personalReader, /sourceBuffer=\{selectedSource\}/);
  assert.doesNotMatch(epubReader, />Lector EPUB</);
});

test('reader header uses the visible file name and relative pagination covers the whole EPUB', async () => {
  assert.equal(pagination.getReaderFileName('nuevo-testamento.epub'), 'nuevo-testamento.epub');
  assert.equal(pagination.getReaderFileName('nuevo-testamento.epub', 'Nuevo Testamento'), 'Nuevo Testamento');
  assert.equal(pagination.getReaderFileName('personal-id.epub', 'Magnifica Humanitas.epub'), 'Magnifica Humanitas.epub');
  assert.equal(pagination.getReaderFileName('/books/Mi%20libro.epub'), 'Mi libro.epub');

  const compact = pagination.estimateCharsPerPage({
    width: 360, height: 720, fontSize: 100, fontFamily: "'Literata', serif",
  });
  const enlarged = pagination.estimateCharsPerPage({
    width: 360, height: 720, fontSize: 150, fontFamily: "'Literata', serif",
  });
  assert.ok(enlarged < compact, 'larger type must produce more relative pages');

  const labels = [];
  const breaks = [];
  const locations = {
    total: 0,
    pause: 100,
    load() { this.total = -1; },
    async generate(chars) { breaks.push(chars); this.total = 9; return Array.from({ length: 10 }, (_, i) => String(i)); },
    locationFromCfi(cfiValue) { return Number(cfiValue); },
  };
  const paginator = new pagination.EpubRelativePaginator(
    { locations },
    label => labels.push(label)
  );
  paginator.relocate('4');
  await paginator.rebuild({ width: 360, height: 720, fontSize: 100, fontFamily: "'Literata', serif" });
  assert.deepEqual(labels, ['…/…', '5/10']);
  assert.equal(locations.pause, 100, 'epub.js generation pause is restored');
  paginator.relocate('8');
  assert.equal(labels.at(-1), '9/10');
  assert.deepEqual(breaks, [compact]);
  paginator.close();
});

test('EPUB visual turns do not skip character buckets and remain consecutive across spines', async () => {
  const labels = [];
  const estimates = [];
  const locations = {
    total: 12, load() {},
    async generate() { return ['0:0', '0:1', '0:2', '1:0', '1:1', '1:2', '1:3', '1:4']; },
    locationFromCfi(value) { return Number(value.split(':')[1]); },
  };
  const spine = { spineItems: [{ index: 0, linear: true }, { index: 1, linear: true }],
    get(value) { return { index: Number(value.split(':')[0]) }; } };
  const paginator = new pagination.EpubRelativePaginator({ locations, spine },
    (label, estimated) => { labels.push(label); estimates.push(estimated); });
  const visible = (index, page, total, bucket) => ({ start: { index,
    cfi: `${index}:${bucket}`, displayed: { page, total } } });
  paginator.relocate(visible(0, 5, 8, 4));
  await paginator.rebuild({ width: 360, height: 720, fontSize: 100, fontFamily: 'Literata' });
  assert.equal(labels.at(-1), '5/13');
  paginator.relocate(visible(0, 6, 8, 6)); // Semantic lookup jumps 5 -> 7; actual page must not.
  assert.equal(labels.at(-1), '6/13');
  assert.equal(estimates.at(-1), true, 'unvisited chapter totals are clearly marked estimates');
  paginator.relocate(visible(0, 8, 8, 7));
  paginator.relocate(visible(1, 1, 4, 0));
  assert.equal(labels.at(-1), '9/12');
  assert.equal(estimates.at(-1), false, 'all chapter lengths have now been measured');
  paginator.relocate(visible(0, 8, 8, 7));
  assert.equal(labels.at(-1), '8/12');
  paginator.relocate(visible(0, 7, 8, 6));
  assert.equal(labels.at(-1), '7/12');
  paginator.relocate(visible(0, 3, 4, 4));
  await paginator.rebuild({ width: 720, height: 360, fontSize: 100, fontFamily: 'Lora' });
  assert.equal(labels.at(-1), '3/9', 'reflow discards page lengths measured in the old layout');
  assert.equal(estimates.at(-1), true);
  paginator.close();
});

test('confession expiry is optional, starts at creation and cannot be postponed by editing', () => {
  const storage = new MemoryStorage();
  const day = notebook.CONFESSION_LIFETIME_MS;
  storage.setItem(notebook.CONFESSION_EXPIRY_KEY, 'true');
  const original = notebook.writeConfessionNote(storage, 'Nota de prueba', 100);
  const edited = notebook.writeConfessionNote(storage, 'Nota corregida', day);
  assert.equal(edited.createdAt, original.createdAt);
  assert.ok(notebook.readConfessionNote(storage, day + 99));
  assert.equal(notebook.readConfessionNote(storage, day + 100), null);
  assert.equal(storage.getItem(notebook.CONFESSION_NOTE_KEY), null);
  storage.setItem(notebook.CONFESSION_EXPIRY_KEY, 'false');
  notebook.writeConfessionNote(storage, 'Otra nota', day + 200);
  assert.ok(notebook.readConfessionNote(storage, day * 3));
  storage.setItem(notebook.CONFESSION_EXPIRY_KEY, 'true');
  assert.equal(notebook.readConfessionNote(storage, day * 3), null, 'enabling expiry removes an already expired note');
});

test('confession completion removes storage and a new examination has its own lifetime', () => {
  const storage = new MemoryStorage();
  storage.setItem(notebook.CONFESSION_EXPIRY_KEY, 'true');
  notebook.writeConfessionNote(storage, 'Nota de prueba', 100);
  assert.equal(notebook.writeConfessionNote(storage, '', 500), null);
  assert.equal(storage.getItem(notebook.CONFESSION_NOTE_KEY), null);
  assert.equal(notebook.readConfessionNote(storage, 600), null);
  assert.equal(notebook.writeConfessionNote(storage, 'Examen nuevo', 900).createdAt, 900);
  assert.equal(storage.getItem(notebook.CONFESSION_EXPIRY_KEY), 'true', 'completion keeps the preference only');
});

test('malformed confession records are purged and storage failures are never reported as success', () => {
  const storage = new MemoryStorage();
  for (const raw of ['{broken', '{"text":55,"createdAt":0}', '{"text":"nota"}', '{"text":"nota","createdAt":-1}']) {
    storage.setItem(notebook.CONFESSION_NOTE_KEY, raw);
    assert.equal(notebook.readConfessionNote(storage, 100), null);
    assert.equal(storage.getItem(notebook.CONFESSION_NOTE_KEY), null);
  }
  storage.setItem = () => { throw new Error('Quota exceeded'); };
  assert.throws(() => notebook.writeConfessionNote(storage, 'Nota', 100), /Quota/);
  storage.removeItem = () => { throw new Error('Storage unavailable'); };
  assert.throws(() => notebook.writeConfessionNote(storage, '', 100), /unavailable/);
});

test('timer catches up after suspended callbacks and changing the wall clock does not affect its deadline', () => {
  const monotonicStart = 1000;
  const deadline = monotonicStart + 7 * 60 * 1000;
  assert.equal(prayerTimer.remainingTimerSeconds(deadline, monotonicStart), 420);
  assert.equal(prayerTimer.remainingTimerSeconds(deadline, monotonicStart + 65000), 355);
  assert.equal(prayerTimer.remainingTimerSeconds(deadline, deadline - 1), 1);
  assert.equal(prayerTimer.remainingTimerSeconds(deadline, deadline + 5000), 0);
  assert.equal(prayerTimer.normalizeTimerMinutes(7), 7);
  assert.equal(prayerTimer.normalizeTimerMinutes(NaN), 15);
  assert.equal(prayerTimer.normalizeTimerMinutes(-2), 1);
  assert.equal(prayerTimer.normalizeTimerMinutes(2000), 1440);
});

test('Camino anchor restores same point/fraction when paragraph dimensions change', () => {
  let scroll = 320, scale = 1;
  const tops = [0, 200, 400, 700];
  const elements = tops.map((top, i) => ({ dataset: { caminoPoint: String(i + 1) },
    getBoundingClientRect: () => ({ top: top * scale - scroll, height: 200 * scale }) }));
  const container = { querySelectorAll: () => elements, getBoundingClientRect: () => ({ top: 0 }),
    clientHeight: 400, clientTop: 0, get scrollTop() { return scroll; }, scrollTo({ top }) { scroll = top; } };
  const saved = camino.captureCaminoAnchor(container);
  assert.equal(saved.point, 3);
  scale = 1.8;
  assert.equal(camino.restoreCaminoAnchor(container, saved), true);
  assert.deepEqual(camino.captureCaminoAnchor(container), saved);
  assert.notEqual(scroll, 320);
});

test('central anchor uses the visible second spine document, keeping both boundary diagnostics', () => {
  global.NodeFilter = { SHOW_TEXT: 4 };
  const rect = (left, top, width, height) => ({ left, top, right: left + width, bottom: top + height, width, height });
  const content = (spine, frameTop, frameHeight, textTop) => {
    const node = { textContent: 'abcdefghij', length: 10, parentElement: { closest: () => null } };
    const doc = { body: {}, createTreeWalker: () => {
      let visited = false;
      return { nextNode: () => visited ? null : (visited = true, node) };
    }, createRange: () => ({
      offset: 0, selectNodeContents() {}, setStart(n, i) { this.offset = i; }, setEnd() {}, collapse() {},
      getClientRects: () => [rect(50, textTop, 100, 20)],
      getBoundingClientRect() { return rect(50 + this.offset * 10, textTop, 10, 20); },
    }) };
    node.ownerDocument = doc;
    return { document: doc, window: { frameElement: { clientWidth: 200, clientHeight: frameHeight,
      getBoundingClientRect: () => rect(0, frameTop, 200, frameHeight) } },
      cfiFromRange: range => `spine-${spine}-offset-${range.offset}` };
  };
  const rendition = { getContents: () => [content(1, 0, 100, 50), content(2, 100, 500, 190)],
    currentLocation: () => ({ start: { cfi: cfi(1), href: 'old.xhtml' }, end: { cfi: cfi(2) } }) };
  const result = realLayout.captureEpubAnchor(rendition, { getBoundingClientRect: () => rect(0, 0, 200, 600) }, trace);
  assert.match(result.anchorCfi, /^spine-2-offset-/);
  assert.equal(result.anchorKind, 'center');
  assert.equal(result.startCfi, cfi(1));
  assert.equal(result.endCfi, cfi(2));
});

test('font readiness waits for iframe stylesheet before loading effective faces', async () => {
  const link = new EventTarget(); link.dataset = {}; link.sheet = null;
  let completed = false;
  const faces = [];
  const doc = { body: {}, images: [], getElementById: () => link,
    defaultView: { getComputedStyle: () => ({ fontSize: '18px', fontFamily: 'Literata, serif' }) },
    fonts: { ready: Promise.resolve(), load: async face => { faces.push(face); } } };
  const wait = realLayout.waitForReaderFonts({ document: doc }).then(() => { completed = true; });
  await tick();
  assert.equal(completed, false);
  assert.equal(faces.length, 0);
  link.sheet = {}; link.dispatchEvent(new Event('load'));
  await wait;
  assert.equal(faces.length, 4);
  assert.ok(faces.includes('italic 700 18px Literata, serif'));
});

// The controller is tested against an event-driven rendition double; its geometry capture is isolated.
const layoutPath = require.resolve('../src/lib/epub-reader/layout.ts');
const controllerMetrics = { fontWaits: 0 };
require.cache[layoutPath] = { id: layoutPath, filename: layoutPath, loaded: true, exports: {
  nextFrame: tick, waitForReaderFonts: async () => { controllerMetrics.fontWaits++; },
  captureEpubAnchor: rendition => anchor(rendition.page),
} };
const { EpubReadingController } = require('../src/lib/epub-reader/controller.ts');
const { EventEmitter } = require('node:events');
class RenditionDouble extends EventEmitter {
  page = 1;
  total = 4;
  spine = 0;
  reports = [];
  hold = false;
  calls = [];
  formatCalls = 0;
  expandCalls = 0;
  useDocuments = false;
  document = null;
  q = { enqueue: async fn => fn() };
  manager = { views: { all: () => this.view ? [this.view] : [] } };
  constructor() { super(); this.installDocument(); }
  installDocument() {
    if (!this.useDocuments) { this.document = null; this.view = null; return; }
    this.document = { defaultView: { frameElement: { isConnected: true } } };
    const contents = { document: this.document };
    this.view = { section: { index: this.spine }, contents,
      layout: { format: () => { this.formatCalls++; } }, expand: () => { this.expandCalls++; } };
  }
  enableDocuments() { this.useDocuments = true; this.installDocument(); }
  getContents() { return this.view ? [this.view.contents] : []; }
  location() { return { start: { cfi: cfi(this.page), index: this.spine,
    displayed: { page: this.page, total: this.total } }, end: { cfi: cfi(this.page + 1), index: this.spine,
    displayed: { page: this.page, total: this.total } } }; }
  currentLocation() { return this.location(); }
  async display(target) {
    this.calls.push('display');
    if (target) this.page = Number(target.match(/\/6\/(\d+)/)[1]) / 2;
    void this.reportLocation();
  }
  async next() {
    this.calls.push('next');
    if (this.page >= this.total) { this.spine++; this.page = 1; this.installDocument(); } else this.page++;
    void this.reportLocation();
  }
  async prev() {
    this.calls.push('prev');
    if (this.page <= 1) { this.spine--; this.page = this.total; this.installDocument(); } else this.page--;
    void this.reportLocation();
  }
  async reportLocation() {
    const report = () => this.emit('relocated', this.location());
    if (this.hold) this.reports.push(report); else setImmediate(report);
  }
}
async function until(predicate) { for (let i = 0; i < 1000; i++) { if (predicate()) return; await tick(); } throw new Error('test condition not reached'); }

test('same-spine next/prev use only the original relocated: no display, fonts, layout or expand', async () => {
  const r = new RenditionDouble();
  r.enableDocuments();
  const transitions = [];
  const controller = new EpubReadingController(r, {}, 'fast-page.epub', trace, () => {}, value => transitions.push(value));
  await controller.run('restore');
  transitions.length = 0;
  const baseline = { displays: r.calls.filter(call => call === 'display').length,
    fonts: controllerMetrics.fontWaits, formats: r.formatCalls, expands: r.expandCalls };
  await controller.run('next');
  await controller.run('prev');
  assert.equal(r.calls.filter(call => call === 'display').length, baseline.displays);
  assert.equal(controllerMetrics.fontWaits, baseline.fonts);
  assert.equal(r.formatCalls, baseline.formats);
  assert.equal(r.expandCalls, baseline.expands);
  assert.equal(r.calls.filter(call => call === 'next').length, 1);
  assert.equal(r.calls.filter(call => call === 'prev').length, 1);
  assert.deepEqual(transitions, [], 'fast page turns never activate the visual overlay');
  assert.ok(traces.some(([message, data]) => message === 'operation' && data.includes('mode=fast-page')));
  await controller.close();
});

test('crossing a spine prepares its new iframe exactly once and then confirms the settled CFI', async () => {
  const r = new RenditionDouble();
  r.enableDocuments();
  r.page = r.total;
  const transitions = [];
  const controller = new EpubReadingController(r, {}, 'new-spine.epub', trace, () => {}, value => transitions.push(value));
  await controller.run('restore');
  transitions.length = 0;
  r.page = r.total;
  const baseline = { displays: r.calls.filter(call => call === 'display').length,
    fonts: controllerMetrics.fontWaits, formats: r.formatCalls, expands: r.expandCalls };
  await controller.run('next');
  assert.equal(r.spine, 1);
  assert.equal(controllerMetrics.fontWaits, baseline.fonts + 1);
  assert.equal(r.formatCalls, baseline.formats + 1);
  assert.equal(r.expandCalls, baseline.expands + 1);
  assert.equal(r.calls.filter(call => call === 'display').length, baseline.displays + 1,
    'one same-document display repositions after the only prepared pagination pass');
  assert.deepEqual(transitions, [true, false]);
  assert.ok(traces.some(([message, data]) => message === 'operation' && data.includes('mode=new-spine')));
  await controller.close();
});

test('next promise is insufficient: controller waits for final relocated and serializes rapid navigation', async () => {
  const r = new RenditionDouble(), id = 'controller.epub', key = epubProgressKey(id);
  const controller = new EpubReadingController(r, {}, id, trace, () => {}, () => {});
  await controller.run('restore');
  const initialRevision = JSON.parse(localStorage.getItem(key)).revision;
  r.hold = true;
  const first = controller.run('next');
  const second = controller.run('next');
  await until(() => r.reports.length);
  assert.equal(r.calls.filter(call => call === 'next').length, 1);
  assert.equal(JSON.parse(localStorage.getItem(key)).revision, initialRevision);
  controller.checkpoint('background');
  assert.equal(JSON.parse(localStorage.getItem(key)).anchorCfi, cfi(1));
  r.hold = false;
  r.reports.shift()();
  await Promise.all([first, second]);
  assert.equal(JSON.parse(localStorage.getItem(key)).anchorCfi, cfi(3));
  await controller.close();
});

test('closing cancels an unconfirmed operation; late relocated cannot write after close', async () => {
  const r = new RenditionDouble(), id = 'close.epub', key = epubProgressKey(id);
  const controller = new EpubReadingController(r, {}, id, trace, () => {}, () => {});
  await controller.run('restore');
  r.hold = true;
  const navigation = controller.run('next');
  const rejection = assert.rejects(navigation);
  await until(() => r.reports.length);
  await controller.close();
  const saved = localStorage.getItem(key);
  r.reports.shift()();
  await rejection;
  await tick();
  assert.equal(localStorage.getItem(key), saved);
  assert.equal(JSON.parse(saved).anchorCfi, cfi(1));
});

test('initial ResizeObserver/reflow cannot write before historical restoration', async () => {
  const r = new RenditionDouble(), id = 'early-resize.epub', key = epubProgressKey(id);
  localStorage.setItem(key, JSON.stringify({ cfi: cfi(17) }));
  const controller = new EpubReadingController(r, {}, id, trace, () => {}, () => {});
  let changed = false;
  await controller.run('reflow', undefined, () => { changed = true; });
  assert.equal(changed, false);
  assert.equal(JSON.parse(localStorage.getItem(key)).cfi, cfi(17));
  await controller.run('restore');
  assert.equal(JSON.parse(localStorage.getItem(key)).anchorCfi, cfi(17));
  assert.equal(JSON.parse(localStorage.getItem(key)).anchorKind, 'center');
  await controller.close();
});

test('a saved page spanning two spine items restores its semantic center in the newer item', async () => {
  const r = new RenditionDouble(), id = 'two-spines.epub', key = epubProgressKey(id);
  const previousStart = 'epubcfi(/6/10!/4/2/1:4)';
  const newerCenter = 'epubcfi(/6/12!/4/4/1:18)';
  const newerEnd = 'epubcfi(/6/12!/4/8/1:30)';
  localStorage.setItem(key, JSON.stringify({
    version: 1,
    resourceId: id,
    updatedAt: 100,
    revision: 1,
    anchorCfi: newerCenter,
    anchorKind: 'center',
    startCfi: previousStart,
    endCfi: newerEnd,
    href: 'newer.xhtml',
  }));
  const displayed = [];
  r.display = async target => {
    displayed.push(target);
    r.calls.push('display');
    r.page = 2;
    void r.reportLocation();
  };
  const controller = new EpubReadingController(r, {}, id, trace, () => {}, () => {});
  await controller.run('restore');
  assert.equal(displayed[0], newerCenter, 'restore must not fall back to the preceding spine start');
  assert.equal(JSON.parse(localStorage.getItem(key)).anchorCfi, newerCenter);
  await controller.close();
});

test('font-size and resize reflows use the full route and preserve the original central anchor', async () => {
  const r = new RenditionDouble(), id = 'reflow.epub', key = epubProgressKey(id);
  r.enableDocuments();
  localStorage.setItem(key, JSON.stringify(record(id, 12, 100)));
  const controller = new EpubReadingController(r, {}, id, trace, () => {}, () => {});
  await controller.run('restore');
  const formats = r.formatCalls;
  let fontSizeChanged = false, resized = false;
  await controller.run('reflow', undefined, () => { fontSizeChanged = true; r.page = 99; });
  await controller.run('reflow', undefined, () => { resized = true; r.page = 88; });
  assert.equal(fontSizeChanged, true);
  assert.equal(resized, true);
  assert.equal(r.formatCalls, formats + 2);
  assert.equal(JSON.parse(localStorage.getItem(key)).anchorCfi, cfi(12));
  await controller.close();
});

test('an invalid saved central CFI falls back to diagnostic CFI and records a new central anchor', async () => {
  const r = new RenditionDouble(), id = 'fallback.epub', key = epubProgressKey(id);
  const saved = { ...record(id, 99, 100), startCfi: cfi(4), endCfi: cfi(5) };
  localStorage.setItem(key, JSON.stringify(saved));
  const display = r.display.bind(r);
  r.display = async target => { if (target === cfi(99)) throw new Error('No Section Found'); await display(target); };
  const controller = new EpubReadingController(r, {}, id, trace, () => {}, () => {});
  await controller.run('restore');
  assert.equal(JSON.parse(localStorage.getItem(key)).anchorCfi, cfi(4));
  assert.equal(JSON.parse(localStorage.getItem(key)).anchorKind, 'center');
  assert.ok(traces.some(([message]) => message === 'restore fallback'));
  await controller.close();
});
