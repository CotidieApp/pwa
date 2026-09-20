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
  return originalResolve.call(this, name.startsWith('@/') ? path.join(root, 'src', name.slice(2)) : name, ...args);
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
const traces = [];
const trace = (...entry) => traces.push(entry);
const cfi = page => `epubcfi(/6/${page * 2}!/4/2/1:10)`;
const anchor = page => ({ anchorCfi: cfi(page), startCfi: cfi(page), endCfi: cfi(page + 1), anchorKind: 'center' });
const record = (resourceId, page, updatedAt, revision = 1) => ({ ...anchor(page), version: 1, resourceId, updatedAt, revision });
const tick = () => new Promise(resolve => setImmediate(resolve));
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
  const meta = { id: 'epub-legacy', name: 'Mi libro', sizeBytes: 4, updatedAt: 10 };
  localStorage.setItem(personal.personalFileKey(meta.id), 'AQIDBA==');
  const data = await personal.openPersonalEpub(meta, trace);
  assert.deepEqual([...new Uint8Array(data)], [1, 2, 3, 4]);
  assert.equal(localStorage.getItem(personal.personalFileKey(meta.id)), null);
  assert.deepEqual((await personal.listPersonalEpubs()).find(item => item.id === meta.id), meta);
  assert.deepEqual([...new Uint8Array(await personal.openPersonalEpub(meta, trace))], [1, 2, 3, 4]);
  const failing = { ...meta, id: 'epub-fail' };
  localStorage.setItem(personal.personalFileKey(failing.id), 'AQIDBA==');
  const original = indexedDB.open;
  indexedDB.open = () => { throw new Error('storage denied'); };
  try {
    assert.equal((await personal.openPersonalEpub(failing, trace)).byteLength, 4);
    assert.equal(localStorage.getItem(personal.personalFileKey(failing.id)), 'AQIDBA==');
  } finally { indexedDB.open = original; }
});

test('personal binary over localStorage quota uses IDB, rename keeps bytes and progress identity', async () => {
  const meta = { id: 'epub-large', name: 'Large', sizeBytes: 6 * 1024 * 1024, updatedAt: 20 };
  await personal.savePersonalEpub(meta, new Blob([new Uint8Array(meta.sizeBytes)]));
  await personal.renamePersonalEpub({ ...meta, name: 'Renamed' });
  assert.equal((await personal.openPersonalEpub(meta, trace)).byteLength, meta.sizeBytes);
  assert.equal((await personal.listPersonalEpubs()).find(item => item.id === meta.id).name, 'Renamed');
  assert.equal(localStorage.getItem(personal.personalFileKey(meta.id)), null);
  assert.equal(epubProgressKey(`personal-${meta.id}.epub`), 'cotidie_epub_location_personal-epub-large.epub');
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
require.cache[layoutPath] = { id: layoutPath, filename: layoutPath, loaded: true, exports: {
  nextFrame: tick, waitForReaderFonts: async () => undefined,
  captureEpubAnchor: rendition => anchor(rendition.page),
} };
const { EpubReadingController } = require('../src/lib/epub-reader/controller.ts');
const { EventEmitter } = require('node:events');
class RenditionDouble extends EventEmitter {
  page = 1;
  reports = [];
  hold = false;
  calls = [];
  q = { enqueue: async fn => fn() };
  manager = { views: { all: () => [] } };
  getContents() { return []; }
  async display(target) { this.calls.push('display'); if (target) this.page = Number(target.match(/\/6\/(\d+)/)[1]) / 2; }
  async next() { this.calls.push('next'); this.page++; }
  async prev() { this.calls.push('prev'); this.page--; }
  async reportLocation() {
    const report = () => this.emit('relocated', { start: { cfi: cfi(this.page) } });
    if (this.hold) this.reports.push(report); else setImmediate(report);
  }
}
async function until(predicate) { for (let i = 0; i < 1000; i++) { if (predicate()) return; await tick(); } throw new Error('test condition not reached'); }

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

test('initial ResizeObserver/layout cannot write before historical restoration', async () => {
  const r = new RenditionDouble(), id = 'early-resize.epub', key = epubProgressKey(id);
  localStorage.setItem(key, JSON.stringify({ cfi: cfi(17) }));
  const controller = new EpubReadingController(r, {}, id, trace, () => {}, () => {});
  let changed = false;
  await controller.run('layout', undefined, () => { changed = true; });
  assert.equal(changed, false);
  assert.equal(JSON.parse(localStorage.getItem(key)).cfi, cfi(17));
  await controller.run('restore');
  assert.equal(JSON.parse(localStorage.getItem(key)).anchorCfi, cfi(17));
  assert.equal(JSON.parse(localStorage.getItem(key)).anchorKind, 'center');
  await controller.close();
});

test('font/resize reflow preserves original central anchor across repeated layout operations', async () => {
  const r = new RenditionDouble(), id = 'reflow.epub', key = epubProgressKey(id);
  localStorage.setItem(key, JSON.stringify(record(id, 12, 100)));
  const controller = new EpubReadingController(r, {}, id, trace, () => {}, () => {});
  await controller.run('restore');
  await controller.run('layout', undefined, () => { r.page = 99; });
  await controller.run('layout', undefined, () => { r.page = 88; });
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
