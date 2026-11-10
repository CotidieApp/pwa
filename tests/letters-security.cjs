const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { webcrypto } = require('node:crypto');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const password = 'test-only Cartas password 2026';
const letters = [{ id: 'test-letter', title: 'Test private heading', categoryId: 'cartas',
  content: 'TEST ONLY PRIVATE LETTER BODY', isUserDefined: true }];
const clone = value => JSON.parse(JSON.stringify(value));
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

// Each harness loads the actual service, prompt, validators and crypto framing
// into independent CommonJS modules. Only React's unused hook and the native
// boundary are mocked; AES-GCM and the production PBKDF2 cost remain real.
function harness(options = {}) {
  const calls = { enroll: [], unlock: [], clear: 0, privacy: [] };
  const clock = { now: Date.now() };
  let decryptGate;
  const subtle = new Proxy(webcrypto.subtle, {
    get(target, name) {
      if (name === 'decrypt') return async (...args) => {
        const result = await target.decrypt(...args);
        const gate = decryptGate;
        if (gate) {
          decryptGate = undefined;
          gate.started.resolve();
          await gate.release.promise;
        }
        return result;
      };
      const value = target[name];
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
  const crypto = { subtle, getRandomValues: value => webcrypto.getRandomValues(value) };
  const native = {
    available: async () => options.available ? options.available() : { available: Boolean(options.device) },
    storeSecret: async value => { calls.enroll.push(value); if (options.enroll) return options.enroll(value); },
    unlockSecret: async value => {
      calls.unlock.push(value);
      return options.unlock ? options.unlock(value) : { secret: password };
    },
    clearSecret: async () => { calls.clear++; if (options.clear) return options.clear(); },
    setPrivacy: async value => { calls.privacy.push(value); },
  };
  const cache = new Map();
  function load(relative) {
    const filename = path.resolve(root, relative);
    if (cache.has(filename)) return cache.get(filename).exports;
    const instance = new Module(filename, module);
    cache.set(filename, instance);
    instance.filename = filename;
    instance.paths = Module._nodeModulePaths(path.dirname(filename));
    const ordinaryRequire = instance.require.bind(instance);
    instance.require = name => {
      if (name === 'react') return { useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot() };
      if (name === '@/plugins/LettersSecurity') return native;
      if (name === '__test_crypto') return crypto;
      if (name === '__test_clock') return { now: () => clock.now };
      if (name.startsWith('./') || name.startsWith('../')) {
        const absolute = path.resolve(path.dirname(filename), name);
        if (fs.existsSync(absolute + '.ts')) return load(path.relative(root, absolute + '.ts'));
      }
      return ordinaryRequire(name);
    };
    const prelude = filename.endsWith(path.join('lib', 'letters-security.ts'))
      ? 'const crypto = require("__test_crypto"); const Date = require("__test_clock");\n' : '';
    const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    }).outputText;
    instance._compile(prelude + compiled, filename);
    return instance.exports;
  }
  const service = load('src/lib/letters-security.ts');
  const prompt = load('src/lib/security-prompt.ts');
  service.initialiseLettersVault(null);
  return { service, prompt, calls, clock,
    pauseNextPayloadDecrypt() {
      const gate = { started: deferred(), release: deferred() };
      decryptGate = gate;
      return gate;
    },
  };
}

const snapshot = async h => (await h.service.protectLettersForStorage({ theme: 'dark' })).lettersVault;
const payload = vault => ({ wrappedKey: vault.wrappedKey, iv: vault.iv, data: vault.data, device: vault.device });
async function makeVault(device = false) {
  const h = harness({ device });
  await h.service.enableLettersVault(password, letters);
  return clone(await snapshot(h));
}
let sharedVault;
const fixture = async () => clone(sharedVault ||= await makeVault());
async function ownUnlock(h, secret = password) {
  const opening = h.service.unlockLettersVault('Test authentication', true);
  const current = h.prompt.getSecretPrompt();
  assert.ok(current, 'a new app-password dialog is required');
  await current.verify(secret);
  h.prompt.finishSecretPrompt(secret);
  return opening;
}

test('enrollment encrypts letters and wraps a random key without plaintext in protected snapshots', async () => {
  const h = harness();
  const rollback = await h.service.enableLettersVault(password, letters);
  assert.equal(h.service.getLettersSecurityStatus().enabled, true);
  assert.equal(h.service.getLettersSecurityStatus().locked, false);
  const source = { theme: 'dark', userLetters: clone(letters), lettersVault: { untrusted: true } };
  const protectedSettings = await h.service.protectLettersForStorage(source);
  assert.deepEqual(protectedSettings.userLetters, []);
  assert.deepEqual(source.userLetters, letters, 'protecting a snapshot must not erase the live letters');
  const serialized = JSON.stringify(protectedSettings);
  for (const marker of [password, letters[0].title, letters[0].content, letters[0].id])
    assert.equal(serialized.includes(marker), false, 'persisted snapshots contain no letter or password plaintext');
  const vault = protectedSettings.lettersVault;
  assert.equal(vault.wrappedKey.length, 128);
  assert.equal(Buffer.from(vault.iv, 'base64').length, 12);
  const other = harness();
  await other.service.enableLettersVault(password, letters);
  assert.notEqual((await snapshot(other)).wrappedKey, vault.wrappedKey);
  rollback();
  assert.equal(h.service.getLettersSecurityStatus().enabled, false);
  assert.equal(h.calls.clear, 1);
});

test('hydrating an encrypted vault starts locked and keeps injected plaintext out of saved state', async () => {
  const h = harness();
  const vault = await fixture();
  h.service.initialiseLettersVault(vault);
  assert.equal(h.service.getLettersSecurityStatus().locked, true);
  assert.throws(() => h.service.assertLettersUnlocked(), /Desbloquea/);
  const saved = await h.service.protectLettersForStorage({ userLetters: clone(letters), theme: 'light' });
  assert.deepEqual(saved.userLetters, []);
  assert.deepEqual(saved.lettersVault, vault);
  assert.equal(JSON.stringify(saved).includes(letters[0].content), false);
});

test('wrong password and dialog cancellation preserve the encrypted content and keep the vault locked', async () => {
  const h = harness();
  h.service.initialiseLettersVault(await fixture());
  const before = payload(await snapshot(h));
  const opening = h.service.unlockLettersVault('Test wrong password', true);
  const rejected = assert.rejects(opening, /cancelado|bloque/i);
  const current = h.prompt.getSecretPrompt();
  await assert.rejects(current.verify('test-only wrong password'), /incorrecta|dañados/);
  assert.equal(h.prompt.getSecretPrompt(), current, 'wrong attempts leave the password dialog open');
  assert.equal(h.service.getLettersSecurityStatus().locked, true);
  assert.deepEqual(payload(await snapshot(h)), before);
  h.prompt.finishSecretPrompt(null);
  await rejected;
  assert.equal(h.service.getLettersSecurityStatus().locked, true);
  assert.deepEqual(payload(await snapshot(h)), before);
});

test('canceling a successful verification cannot install its key or unlock Cartas', async () => {
  const h = harness();
  h.service.initialiseLettersVault(await fixture());
  const before = payload(await snapshot(h));
  const opening = h.service.unlockLettersVault('Test verify then cancel', true);
  const rejected = assert.rejects(opening, /cancelado|bloque/i);
  await h.prompt.getSecretPrompt().verify(password);
  h.prompt.finishSecretPrompt(null);
  await rejected;
  assert.equal(h.service.getLettersSecurityStatus().locked, true);
  assert.deepEqual(payload(await snapshot(h)), before);
});

test('native enrollment cancellation does not enable protection or discard existing letters', async () => {
  const h = harness({ device: true, enroll: async () => { throw Object.assign(new Error('Canceled'), { code: 'CANCELED' }); } });
  await assert.rejects(h.service.enableLettersVault(password, letters), /Canceled/);
  assert.equal(h.service.getLettersSecurityStatus().enabled, false);
  assert.equal((await h.service.protectLettersForStorage({ userLetters: letters })).userLetters, letters);
  assert.equal(h.calls.enroll.length, 1);
});

test('an enrollment started before background locking cannot later install an unlocked vault', async () => {
  const availability = deferred();
  const reachedNative = deferred();
  const h = harness({ available: () => { reachedNative.resolve(); return availability.promise; } });
  const enabling = h.service.enableLettersVault(password, letters);
  const settled = enabling.then(rollback => { rollback(); return 'enabled'; }, () => 'canceled');
  await reachedNative.promise;
  await h.service.lockLettersVault(letters);
  availability.resolve({ available: false });
  assert.equal(await settled, 'canceled', 'a late enrollment result must be rejected after the lock epoch changes');
  assert.equal(h.service.getLettersSecurityStatus().enabled, false);
});

test('a concurrent enrollment cannot replace the first password or encrypted letters', async () => {
  const availability = deferred();
  const reachedNative = deferred();
  let availabilityCalls = 0;
  const h = harness({ available: () => {
    if (++availabilityCalls === 1) { reachedNative.resolve(); return availability.promise; }
    return { available: false };
  } });
  const enabling = h.service.enableLettersVault(password, letters);
  const settled = enabling.catch(() => undefined);
  await reachedNative.promise;
  try {
    await assert.rejects(h.service.enableLettersVault('test-only conflicting password', []), /curso|solicitud|activa/i);
  } finally {
    availability.resolve({ available: false });
    await settled;
  }
  await h.service.lockLettersVault(letters);
  assert.deepEqual((await ownUnlock(h)).letters, letters);
});

test('locking seals the latest edits and every password unlock requires a new verified prompt', async () => {
  const h = harness();
  h.service.initialiseLettersVault(await fixture());
  assert.deepEqual((await ownUnlock(h)).letters, letters);
  const edited = [{ ...letters[0], content: 'TEST ONLY UPDATED PRIVATE BODY' }];
  const epoch = h.service.getLettersSecurityEpoch();
  await h.service.lockLettersVault(edited);
  assert.equal(h.service.getLettersSecurityStatus().locked, true);
  assert.throws(() => h.service.assertLettersExportAuthorized(epoch), /Desbloquea|bloque/);
  assert.deepEqual((await ownUnlock(h)).letters, edited);
  const opening = h.service.unlockLettersVault('Second explicit password authorization', true);
  const rejected = assert.rejects(opening, /cancelado/);
  assert.ok(h.prompt.getSecretPrompt());
  h.prompt.finishSecretPrompt(password); // Bypassing verification is never sufficient.
  await rejected;
});

test('each fresh OS authorization calls native auth and own-password authorization bypasses native auth', async () => {
  const h = harness({ device: true });
  h.service.initialiseLettersVault({ ...await fixture(), device: true });
  assert.deepEqual((await h.service.unlockLettersVault('First OS authorization')).letters, letters);
  await h.service.lockLettersVault(letters);
  assert.deepEqual((await h.service.unlockLettersVault('Second OS authorization')).letters, letters);
  assert.equal(h.calls.unlock.length, 2);
  await ownUnlock(h);
  assert.equal(h.calls.unlock.length, 2, 'changing/exporting passwords may insist on the Cartas password');
});

test('OS cancel preserves data and does not silently open a password fallback dialog', async () => {
  const h = harness({ device: true, unlock: async () => { throw Object.assign(new Error('Canceled'), { code: 'CANCELED' }); } });
  h.service.initialiseLettersVault({ ...await fixture(), device: true });
  const before = payload(await snapshot(h));
  await assert.rejects(h.service.unlockLettersVault('Test canceled OS dialog'), /cancelado/);
  assert.equal(h.prompt.getSecretPrompt(), null);
  assert.equal(h.service.getLettersSecurityStatus().locked, true);
  assert.deepEqual(payload(await snapshot(h)), before);
  assert.equal(h.calls.clear, 0);
});

test('invalidated OS enrollment falls back to the app password without deleting ciphertext or native data', async () => {
  const h = harness({ device: true, unlock: async () => { throw Object.assign(new Error('Invalidated'), { code: 'KEY_INVALIDATED' }); } });
  h.service.initialiseLettersVault({ ...await fixture(), device: true });
  const before = payload(await snapshot(h));
  const opening = h.service.unlockLettersVault('Test invalidated key');
  await new Promise(resolve => setImmediate(resolve));
  const current = h.prompt.getSecretPrompt();
  assert.ok(current);
  await current.verify(password);
  h.prompt.finishSecretPrompt(password);
  assert.deepEqual((await opening).letters, letters);
  assert.deepEqual(payload(await snapshot(h)), before);
  assert.equal(h.calls.clear, 0);
});

test('failed disable restores protection and does not clear native enrollment', async () => {
  const h = harness();
  h.service.initialiseLettersVault(await fixture());
  await ownUnlock(h);
  const before = payload(await snapshot(h));
  await assert.rejects(h.service.disableLettersVault(async () => { throw new Error('Test disk full'); }), /disk full/);
  assert.equal(h.service.getLettersSecurityStatus().enabled, true);
  assert.equal(h.service.getLettersSecurityStatus().locked, false);
  assert.deepEqual(payload(await snapshot(h)), before);
  assert.equal(h.calls.clear, 0);
});

test('post-commit native cleanup failure preserves a confirmed disable and plaintext content', async () => {
  const h = harness({ clear: async () => { throw new Error('Test cleanup failure'); } });
  h.service.initialiseLettersVault(await fixture());
  await ownUnlock(h);
  let persisted;
  const result = await h.service.disableLettersVault(async () => { persisted = await h.service.protectLettersForStorage({ userLetters: letters }); });
  assert.equal(result.cleanupPending, true);
  assert.equal(h.service.getLettersSecurityStatus().enabled, false);
  assert.deepEqual(persisted.userLetters, letters);
  assert.equal(persisted.lettersVault, undefined);
});

test('failed disable cannot restore an old unlocked key after a background lock', async () => {
  const h = harness();
  h.service.initialiseLettersVault(await fixture());
  await ownUnlock(h);
  const before = payload(await snapshot(h));
  const persistence = deferred();
  const disabling = h.service.disableLettersVault(() => persistence.promise);
  const rejected = assert.rejects(disabling, /Test disk full/);
  await h.service.lockLettersVault(letters);
  persistence.reject(new Error('Test disk full'));
  await rejected;
  assert.equal(h.service.getLettersSecurityStatus().enabled, true);
  assert.equal(h.service.getLettersSecurityStatus().locked, true);
  assert.throws(() => h.service.assertLettersUnlocked(), /Desbloquea/);
  assert.deepEqual(payload(await snapshot(h)), before);
});

test('canceling and locking during async password verification prevents a late key resurrection', async () => {
  const h = harness();
  h.service.initialiseLettersVault(await fixture());
  const before = payload(await snapshot(h));
  const opening = h.service.unlockLettersVault('Test async cancellation', true);
  const rejected = assert.rejects(opening, /cancelado|bloque/i);
  const gate = h.pauseNextPayloadDecrypt();
  const verifying = h.prompt.getSecretPrompt().verify(password);
  const settledVerification = verifying.catch(() => undefined);
  await gate.started.promise;
  h.prompt.finishSecretPrompt(null);
  await rejected;
  await h.service.lockLettersVault(letters);
  gate.release.resolve();
  await settledVerification;
  assert.equal(h.service.getLettersSecurityStatus().locked, true);
  assert.throws(() => h.service.assertLettersUnlocked(), /Desbloquea/);
  assert.deepEqual(payload(await snapshot(h)), before);
});

test('background locking cancels pending native unlock results and concurrent attempts', async () => {
  const authentication = deferred();
  const h = harness({ device: true, unlock: () => authentication.promise });
  h.service.initialiseLettersVault({ ...await fixture(), device: true });
  const opening = h.service.unlockLettersVault('Test late native result');
  const rejected = assert.rejects(opening, /bloque|cancelado/i);
  await assert.rejects(h.service.unlockLettersVault('Concurrent attempt'), /otra solicitud/);
  await h.service.lockLettersVault(letters);
  authentication.resolve({ secret: password });
  await rejected;
  assert.equal(h.service.getLettersSecurityStatus().locked, true);
  assert.equal(h.calls.unlock.length, 1);
});

test('cooldown starts after repeated failures, stays bounded and cannot damage ciphertext', async () => {
  const h = harness();
  h.service.initialiseLettersVault({ ...await fixture(), failures: 4, retryAt: 0 });
  const before = payload(await snapshot(h));
  const opening = h.service.unlockLettersVault('Test cooldown', true);
  const rejected = assert.rejects(opening, /cancelado|bloque/i);
  const current = h.prompt.getSecretPrompt();
  await assert.rejects(current.verify('test-only incorrect password'), /incorrecta|dañados/);
  let vault = await snapshot(h);
  assert.equal(vault.failures, 5);
  assert.ok(vault.retryAt > h.clock.now && vault.retryAt <= h.clock.now + 900000);
  await assert.rejects(current.verify(password), /Espera/);
  assert.equal((await snapshot(h)).failures, 5, 'blocked attempts do not escalate failure counters');
  h.prompt.finishSecretPrompt(null);
  await rejected;
  h.service.initialiseLettersVault({ ...vault, failures: 1000, retryAt: 0 });
  const another = h.service.unlockLettersVault('Test maximum cooldown', true);
  const anotherRejected = assert.rejects(another, /cancelado|bloque/i);
  await assert.rejects(h.prompt.getSecretPrompt().verify('test-only incorrect password'), /incorrecta|dañados/);
  vault = await snapshot(h);
  assert.equal(vault.failures, 1000);
  assert.ok(vault.retryAt <= h.clock.now + 900000);
  assert.deepEqual(payload(vault), before);
  h.prompt.finishSecretPrompt(null);
  await anotherRejected;
});

test('malformed vault metadata cannot destroy an active vault or create an unbounded cooldown', async () => {
  const h = harness();
  const original = await fixture();
  h.service.initialiseLettersVault(original);
  await ownUnlock(h);
  for (const changes of [{ version: 2 }, { iv: 'AA==' }, { wrappedKey: '!'.repeat(128) },
    { data: '!'.repeat(24) }, { failures: 1001 }, { retryAt: -1 }]) {
    assert.throws(() => h.service.initialiseLettersVault({ ...original, ...changes }));
    assert.equal(h.service.getLettersSecurityStatus().locked, false);
    assert.doesNotThrow(() => h.service.assertLettersUnlocked(), 'rejected metadata must preserve the active key and record');
  }
  try { h.service.initialiseLettersVault({ ...original, retryAt: Number.MAX_SAFE_INTEGER }); }
  catch { /* Rejecting hostile metadata is also a valid bounded policy. */ }
  const current = await snapshot(h);
  assert.ok(current.retryAt <= h.clock.now + 900000, 'untrusted retryAt must be bounded or rejected');
});
