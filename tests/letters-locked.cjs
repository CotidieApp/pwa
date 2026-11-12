const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const rendererPath = require.resolve('react-test-renderer', { paths: [process.env.COTIDIE_TEST_DEPS || root] });
const external = Module.createRequire(rendererPath);
const React = external('react');
const { create, act } = require(rendererPath);
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

async function fixture(run, { device = false, hidden = false, unlock = async () => {} } = {}) {
  const originalDocument = global.document;
  const listeners = new Set();
  const document = {
    visibilityState: hidden ? 'hidden' : 'visible',
    addEventListener: (name, fn) => { assert.equal(name, 'visibilitychange'); listeners.add(fn); },
    removeEventListener: (name, fn) => { assert.equal(name, 'visibilitychange'); listeners.delete(fn); },
  };
  global.document = document;
  const calls = [];
  let settings = {
    lettersDeviceUnlockEnabled: device,
    unlockLettersSecurity: ownPassword => { calls.push(ownPassword); return unlock(ownPassword); },
  };
  const mocks = {
    react: React,
    'react/jsx-runtime': external('react/jsx-runtime'),
    'lucide-react': { LockKeyhole: () => null },
    '@/context/SettingsContext': { useSettings: () => settings },
    '@/components/ui/button': { Button: props => React.createElement('button', props) },
  };
  function load(file) {
    const filename = path.join(root, file);
    const loaded = new Module(filename, module);
    loaded.filename = filename;
    loaded.paths = Module._nodeModulePaths(path.dirname(filename));
    const normal = loaded.require.bind(loaded);
    loaded.require = name => Object.hasOwn(mocks, name) ? mocks[name] : normal(name);
    loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
    }).outputText, filename);
    return loaded.exports;
  }
  mocks['@/hooks/useCommittedCallback'] = load('src/hooks/useCommittedCallback.ts');
  const Locked = load('src/components/LettersLocked.tsx').default;
  let view;
  const mount = async () => act(async () => { view = create(React.createElement(React.StrictMode, null, React.createElement(Locked))); });
  try {
    await mount();
    await run({
      calls,
      get view() { return view; },
      buttons: () => view.root.findAllByType('button'),
      update: async next => act(async () => { settings = { ...settings, ...next }; view.update(React.createElement(React.StrictMode, null, React.createElement(Locked))); }),
      visibility: async state => act(async () => { document.visibilityState = state; for (const fn of listeners) fn(); }),
      remount: async () => { await act(async () => view.unmount()); await mount(); },
    });
  } finally {
    if (view) await act(async () => view.unmount());
    global.document = originalDocument;
  }
  assert.equal(listeners.size, 0, 'leaving Cartas removes its automatic-entry listener');
}

test('entering protected Cartas immediately requests its configured method, once across rerenders', async () => {
  for (const device of [false, true]) {
    const pending = deferred();
    await fixture(async f => {
      assert.deepEqual(f.calls, [false], 'the service chooses device authentication or the Cartas password');
      assert.ok(f.buttons().every(button => button.props.disabled));
      await f.update({});
      await f.visibility('visible');
      assert.equal(f.calls.length, 1);
      await act(async () => pending.resolve());
      await f.update({});
      assert.equal(f.calls.length, 1, 'settling the automatic attempt must not start another');
    }, { device, unlock: () => pending.promise });
  }
});

test('canceling automatic entry keeps private content hidden and permits an explicit retry without a loop', async () => {
  await fixture(async f => {
    assert.deepEqual(f.calls, [false]);
    assert.match(f.view.root.findByProps({ role: 'alert' }).children.join(''), /cancelado/);
    assert.equal(f.buttons()[0].props.disabled, false);
    await f.visibility('hidden');
    await f.visibility('visible');
    await f.update({});
    assert.equal(f.calls.length, 1, 'canceling must not reopen the prompt on focus or rerender');
    const rendered = JSON.stringify(f.view.toJSON());
    assert.match(rendered, /Cartas protegidas/);
    assert.doesNotMatch(rendered, /PRIVATE LETTER BODY/);
    await act(async () => f.buttons()[0].props.onClick());
    assert.deepEqual(f.calls, [false, false]);
  }, { unlock: async () => { throw new Error('Desbloqueo cancelado'); } });
});

test('the own-password alternative remains explicit after canceling device authentication', async () => {
  await fixture(async f => {
    assert.deepEqual(f.calls, [false]);
    await act(async () => f.buttons()[1].props.onClick());
    assert.deepEqual(f.calls, [false, true]);
  }, { device: true, unlock: async () => { throw new Error('Desbloqueo cancelado'); } });
});

test('rapid retries cannot start simultaneous authentication operations', async () => {
  const pending = deferred();
  let attempts = 0;
  await fixture(async f => {
    assert.deepEqual(f.calls, [false]);
    await act(async () => {
      const click = f.buttons()[0].props.onClick;
      click();
      click();
    });
    assert.deepEqual(f.calls, [false, false]);
    await act(async () => pending.resolve());
  }, { unlock: () => ++attempts === 1 ? Promise.reject(new Error('Desbloqueo cancelado')) : pending.promise });
});

test('a locked screen mounted in the background waits for visibility and does not authenticate after leaving', async () => {
  await fixture(async f => {
    assert.deepEqual(f.calls, []);
    await f.update({});
    await f.visibility('visible');
    assert.deepEqual(f.calls, [false]);
    await f.visibility('visible');
    assert.equal(f.calls.length, 1);
  }, { hidden: true });
});

test('leaving and reentering protected Cartas starts a fresh automatic request with the latest callback', async () => {
  await fixture(async f => {
    const latest = [];
    await f.update({ unlockLettersSecurity: async ownPassword => { latest.push(ownPassword); } });
    assert.equal(f.calls.length, 1);
    await f.remount();
    assert.deepEqual(latest, [false]);
  });
});
