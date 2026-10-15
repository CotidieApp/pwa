// Run through npm test with react-test-renderer@18.3.1 in COTIDIE_TEST_DEPS.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const rendererPath = require.resolve('react-test-renderer', {
  paths: [process.env.COTIDIE_TEST_DEPS || root],
});
const React = Module.createRequire(rendererPath)('react');
const { create, act } = require(rendererPath);
require.extensions['.ts'] = (module, filename) => {
  const normalRequire = module.require.bind(module);
  module.require = name => name === 'react' ? React : normalRequire(name);
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText, filename);
};
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function(name, ...args) {
  if (name.startsWith('@/')) {
    const mapped = path.join(root, 'src', name.slice(2));
    name = fs.existsSync(mapped + '.ts') ? mapped + '.ts' : mapped;
  }
  return originalResolve.call(this, name, ...args);
};

function loadSource(file, mocks) {
  const filename = path.join(root, file);
  const module = new Module(filename, moduleParent);
  module.filename = filename;
  module.paths = Module._nodeModulePaths(path.dirname(filename));
  const normalRequire = module.require.bind(module);
  module.require = name => name === 'react' ? React : Object.hasOwn(mocks, name) ? mocks[name] : normalRequire(name);
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true, jsx: ts.JsxEmit.React },
  }).outputText, filename);
  return module.exports;
}
const loadHook = (file, mocks) => loadSource('src/context/settings/' + file + '.ts', mocks)[file];
const moduleParent = module;
const noop = () => {};

async function withSettingsProvider(run, failFirstLoad = false, initialState = null) {
  const oldWindow = global.window;
  const oldStorage = global.localStorage;
  const values = new Map();
  global.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  global.window = Object.assign(new EventTarget(), {
    localStorage: global.localStorage, setInterval: () => 1, clearInterval: noop,
  });
  const counters = { loads: 0, subscriptions: 0, removals: 0, pendingReads: 0, writes: [], toasts: [] };
  const recordToast = value => counters.toasts.push(value);
  const ExternalImportMock = () => null;
  let recovery;
  let settings;
  let listener;
  let pending = [];
  const native = { Capacitor: { isNativePlatform: () => true, getPlatform: () => 'ios' } };
  const { usePrayerTimer } = loadSource('src/hooks/usePrayerTimer.ts', {
    '@capacitor/core': { Capacitor: { isNativePlatform: () => false, getPlatform: () => 'web' } },
  });
  const { SettingsProvider, useSettings } = loadSource('src/context/SettingsContext.tsx', {
    '@capacitor/core': native,
    '@capacitor/app': { App: { addListener: async (_event, callback) => {
      counters.subscriptions++; listener = callback;
      return { remove: () => { counters.removals++; } };
    } } },
    '@/plugins/BackgroundActions': {
      setMovableFeastsEnabled: async () => {},
      getPendingMarkPrayed: async () => { counters.pendingReads++; const items = pending; pending = []; return { items }; },
    },
    '@/hooks/usePrayerTimer': { usePrayerTimer },
    '@/hooks/useConfessionNotebook': { useConfessionNotebook: () => ({}) },
    '@/hooks/use-toast': { useToast: () => ({ toast: recordToast }) },
    '@/context/settings/useSaintOfTheDay': { useSaintOfTheDay: noop },
    '@/context/settings/useHomeBackgroundRotation': { useHomeBackgroundRotation: () => ({ allHomeBackgrounds: [], activeThemeColors: {} }) },
    '@/context/settings/useNotificationScheduling': { useNotificationScheduling: noop },
    '@/lib/data': { initialPrayers: [{ id: 'santa-misa', categoryId: 'plan-de-vida', title: 'Misa' }], categories: [] },
    '@/lib/private-storage': {
      privateOperation: async (_key, operation) => operation(),
      migratePrivate: async () => {
        counters.loads++;
        if (failFirstLoad && counters.loads === 1) throw new Error('Simulated storage failure');
        return initialState;
      },
      writePrivate: async (_key, value) => { counters.writes.push(value); },
    },
    '@/lib/export-file': { cleanExpiredExports: async () => {} },
    '@/components/StorageRecovery': props => { recovery = props; return null; },
    '@/components/ExternalImportDialog': ExternalImportMock,
  });
  function Consumer() { settings = useSettings(); return null; }
  let renderer;
  try {
    await act(async () => { renderer = create(React.createElement(SettingsProvider, null, React.createElement(Consumer))); });
    await run({ counters, getSettings: () => settings, getRecovery: () => recovery,
      getImportDialog: () => renderer.root.findAllByType(ExternalImportMock)[0]?.props,
      resume: items => { pending = items; listener({ isActive: true }); } });
  } finally {
    if (renderer) await act(async () => renderer.unmount());
    global.window = oldWindow;
    global.localStorage = oldStorage;
  }
  assert.equal(counters.removals, counters.subscriptions, 'all native listeners are released');
}

const personalImportFixture = {
  theme: 'light', isDeveloperMode: true,
  userPrayers: [{ id: 'personal-prayer', title: 'Oración personal', categoryId: 'oraciones' }],
  userDevotions: [{ id: 'personal-devotion', title: 'Devoción personal', categoryId: 'devociones' }],
  userLetters: [{ id: 'personal-letter', title: 'Carta personal', categoryId: 'cartas' }],
};
const receiveImport = async (raw, storage = false) => act(async () => {
  if (storage) window.localStorage.setItem('cotidie_pending_import', raw);
  else window.cotidie_pending_import = raw;
  window.dispatchEvent(new Event('cotidie-pending-import'));
});

test('invalid date import cannot write and persisted invalid dates recover without losing personal data', async () => {
  await withSettingsProvider(async ({ counters, getSettings }) => {
    const writes = counters.writes.length;
    let result;
    await act(async () => { result = await getSettings().importUserData({theme:'dark',simulatedDate:'not-a-date'}); });
    assert.equal(result.status, 'invalid');
    assert.equal(counters.writes.length, writes);
    assert.equal(getSettings().theme, 'light');
    await act(async () => getSettings().setSimulatedDate('not-a-date'));
    assert.equal(getSettings().simulatedDate, null);
    await act(async () => getSettings().setSimulatedDate('2026-10-15T12:00:00'));
    assert.equal(getSettings().simulatedDate, '2026-10-15T12:00:00');
  }, false, personalImportFixture);
  await withSettingsProvider(async ({ getSettings }) => {
    assert.equal(getSettings().simulatedDate, null);
    assert.deepEqual(getSettings().userPrayers, personalImportFixture.userPrayers);
  }, false, {...personalImportFixture,simulatedDate:'not-a-date'});
});

test('external import dialog requires an explicit action and blocks repeated approval while applying', async () => {
  const primitives = Object.fromEntries(['AlertDialog', 'AlertDialogAction', 'AlertDialogCancel',
    'AlertDialogContent', 'AlertDialogDescription', 'AlertDialogFooter', 'AlertDialogHeader', 'AlertDialogTitle']
    .map(name => [name, name]));
  const Dialog = loadSource('src/components/ExternalImportDialog.tsx', { './ui/alert-dialog': primitives }).default;
  let confirmations = 0, cancellations = 0, complete;
  const pending = new Promise(resolve => { complete = resolve; });
  let renderer;
  try {
    await act(async () => { renderer = create(React.createElement(Dialog, {
      onConfirm: async () => { confirmations++; await pending; }, onCancel: () => { cancellations++; },
    })); });
    assert.equal(confirmations, 0);
    await act(async () => renderer.root.findByType('AlertDialogCancel').props.onClick());
    assert.equal(cancellations, 1);
    const approve = renderer.root.findByType('AlertDialogAction').props.onClick;
    let first, second;
    await act(async () => { first = approve({ preventDefault: noop }); second = approve({ preventDefault: noop }); });
    assert.equal(confirmations, 1);
    assert.equal(renderer.root.findByType('AlertDialogAction').props.disabled, true);
    await act(async () => renderer.root.findByType('AlertDialog').props.onOpenChange(false));
    assert.equal(cancellations, 1, 'closing cannot cancel an import that is already applying');
    await act(async () => { complete(); await Promise.all([first, second]); });
  } finally { if (renderer) await act(async () => renderer.unmount()); }
});

test('external import waits for consent and cancellation preserves saved personal content', async () => {
  await withSettingsProvider(async ({ counters, getSettings, getImportDialog }) => {
    const writes = counters.writes.length;
    await receiveImport('{"theme":"dark"}');
    assert.ok(getImportDialog());
    assert.equal(getSettings().theme, 'light');
    assert.deepEqual(getSettings().userPrayers, personalImportFixture.userPrayers);
    assert.equal(counters.writes.length, writes, 'receiving a file must not save it');
    assert.equal(window.cotidie_pending_import, undefined);
    await act(async () => getImportDialog().onCancel());
    assert.equal(getImportDialog(), undefined);
    assert.equal(counters.writes.length, writes);
    assert.equal(getSettings().theme, 'light');
    await receiveImport('{"theme":"dark"}');
    assert.ok(getImportDialog(), 'a cancelled file can be shared again deliberately');
    await act(async () => getImportDialog().onCancel());
  }, false, personalImportFixture);
});

test('consent applies the captured localStorage payload once and preserves omitted fields and privileges', async () => {
  await withSettingsProvider(async ({ counters, getSettings, getImportDialog }) => {
    await receiveImport('{"theme":"dark","isDeveloperMode":false}', true);
    const approved = getImportDialog();
    await receiveImport('{"theme":"light","userPrayers":[],"userLetters":[],"userDevotions":[]}');
    assert.equal(getSettings().theme, 'light');
    assert.equal(window.localStorage.getItem('cotidie_pending_import'), null);
    await act(async () => { await Promise.all([approved.onConfirm(), approved.onConfirm()]); });
    assert.equal(getSettings().theme, 'dark', 'a second arrival cannot replace the approved file');
    assert.deepEqual(getSettings().userPrayers, personalImportFixture.userPrayers);
    assert.deepEqual(getSettings().userLetters, personalImportFixture.userLetters);
    assert.deepEqual(getSettings().userDevotions, personalImportFixture.userDevotions);
    assert.equal(getSettings().isDeveloperMode, true);
    assert.equal(getImportDialog(), undefined);
    assert.equal(counters.toasts.filter(value => value.title === 'Respaldo cargado con exito.').length, 1);
  }, false, personalImportFixture);
});

test('approved legacy full backup replaces supplied collections; stale approval cannot apply a later file', async () => {
  await withSettingsProvider(async ({ getSettings, getImportDialog }) => {
    await receiveImport('{"theme":"dark"}');
    const stale = getImportDialog();
    await act(async () => stale.onCancel());
    await receiveImport('{"theme":"dark","userPrayers":[],"userLetters":[],"userDevotions":[]}');
    await act(async () => stale.onConfirm());
    assert.deepEqual(getSettings().userPrayers, personalImportFixture.userPrayers);
    assert.ok(getImportDialog());
    await act(async () => getImportDialog().onConfirm());
    assert.deepEqual(getSettings().userPrayers, []);
    assert.deepEqual(getSettings().userDevotions, []);
    assert.deepEqual(getSettings().userLetters, []);
  }, false, personalImportFixture);
});

test('direct partial import preserves omitted collections and malformed external input cannot request approval', async () => {
  await withSettingsProvider(async ({ getSettings, getImportDialog }) => {
    await receiveImport('{"theme":"dark","userPrayers":null}');
    assert.equal(getImportDialog(), undefined);
    assert.equal(getSettings().theme, 'light');
    let result;
    await act(async () => { result = await getSettings().importUserData({ theme: 'dark' }, { silent: true }); });
    assert.equal(result.status, 'applied');
    assert.equal(getSettings().theme, 'dark');
    assert.deepEqual(getSettings().userPrayers, personalImportFixture.userPrayers);
  }, false, personalImportFixture);
});

test('failed hydration cannot turn a partial external or recovery import into defaults', async () => {
  const damaged = { ...personalImportFixture, customPlans: [{ slot: 0, name: 'Invalid', prayerIds: [] }] };
  await withSettingsProvider(async ({ counters, getRecovery, getImportDialog, getSettings }) => {
    assert.ok(getRecovery());
    await receiveImport('{"theme":"dark"}');
    assert.equal(getImportDialog(), undefined);
    let partial;
    await act(async () => { partial = await getRecovery().restore({ theme: 'dark' }); });
    assert.equal(partial.status, 'invalid');
    assert.equal(counters.writes.length, 0, 'unreadable stored data must not be overwritten by defaults');
    let full;
    await act(async () => { full = await getRecovery().restore(personalImportFixture); });
    assert.equal(full.status, 'applied', 'deliberate complete recovery remains available');
    assert.deepEqual(getSettings().userPrayers, personalImportFixture.userPrayers);
  }, false, damaged);
});

test('legacy language preferences restore into Spanish while omitted profiles remain intact', async () => {
  await withSettingsProvider(async ({ getSettings }) => {
    await act(async () => {
      await getSettings().importUserData({ theme: 'dark', prayerLanguagePreferences: { 'santa-misa': 'latin' } }, { silent: true });
    });
    assert.equal(getSettings().prayerLanguagePreferences['santa-misa'], 'latin');
    assert.deepEqual(getSettings().userLetters, personalImportFixture.userLetters);
  }, false, personalImportFixture);
});

test('external custom plan is added only after approval', async () => {
  await withSettingsProvider(async ({ getSettings, getImportDialog }) => {
    await receiveImport('{"name":"Plan recibido","prayerIds":["santa-misa"]}', true);
    assert.ok(getSettings().customPlans.every(plan => plan === null));
    await act(async () => getImportDialog().onConfirm());
    assert.equal(getSettings().customPlans[0].name, 'Plan recibido');
    assert.deepEqual(getSettings().customPlans[0].prayerIds, ['santa-misa']);
  }, false, personalImportFixture);
});

test('provider does not rehydrate or reinstall its native listener after settings changes; pending actions see current date', async () => {
  await withSettingsProvider(async ({ counters, getSettings, resume }) => {
    assert.equal(counters.loads, 1);
    assert.equal(counters.subscriptions, 1);
    await act(async () => {
      getSettings().setTheme('dark');
      getSettings().setTimerDuration(23);
      getSettings().setSimulatedDate('2026-10-12T12:00:00');
    });
    assert.equal(getSettings().timerDuration, 23);
    assert.equal(counters.loads, 1, 'state changes must not reload the saved snapshot');
    assert.equal(counters.subscriptions, 1, 'state changes must not reinstall native listeners');
    assert.equal(counters.pendingReads, 1);
    await act(async () => resume([{ id: 'santa-misa' }]));
    assert.deepEqual(getSettings().planDeVidaCalendar['2026-10-12'], ['santa-misa']);
    assert.equal(counters.pendingReads, 2);
    assert.equal(counters.subscriptions, 1);
  });
});

test('provider hydration still retries explicitly after a read failure', async () => {
  await withSettingsProvider(async ({ counters, getRecovery, getSettings }) => {
    assert.match(getRecovery().message, /Simulated storage failure/);
    assert.equal(counters.loads, 1);
    assert.equal(counters.pendingReads, 0, 'failed hydration must not consume native actions');
    assert.equal(counters.subscriptions, 0);
    await act(async () => getRecovery().retry());
    assert.equal(counters.loads, 2);
    assert.equal(getSettings().isLoaded, true);
    assert.equal(counters.subscriptions, 1);
    assert.equal(counters.pendingReads, 1);
    await act(async () => getSettings().setTimerDuration(19));
    assert.equal(counters.loads, 2);
  }, true);
});

test('saint widget refreshes when liturgical type changes with the same name and biography', async () => {
  const calls = [];
  const useSaint = loadHook('useSaintOfTheDay', {
    '@capacitor/core': { Capacitor: { isNativePlatform: () => true, getPlatform: () => 'android' } },
    '@capacitor/app': { App: { addListener: async () => ({ remove: noop }) } },
    '@/plugins/BackgroundActions': { refreshSaintWidgets: async value => calls.push(value) },
  });
  const oldDocument = global.document;
  global.document = { addEventListener: noop, removeEventListener: noop };
  let renderer;
  const props = {
    isLoaded: true, simulatedDate: '2026-10-10T12:00:00', movableFeastsEnabled: true,
    saintOfTheDay: { name: 'Test', bio: 'Same biography', title: 'Memoria', type: 'martyr' },
    setLastSaintUpdate: noop, setSaintOfTheDay: noop, setSaintOfTheDayImage: noop,
    setSaintOfTheDayPrayerId: noop, setOverriddenFixedSaint: noop, setOverriddenFixedSaintImage: noop,
  };
  function Harness(p) { useSaint(p); return null; }
  try {
    await act(async () => { renderer = create(React.createElement(Harness, props)); });
    await act(async () => { renderer.update(React.createElement(Harness, {
      ...props, saintOfTheDay: { ...props.saintOfTheDay, type: 'virgin' },
    })); });
    assert.equal(calls.length, 2);
    assert.notEqual(calls[0].backgroundColor, calls[1].backgroundColor);
  } finally {
    if (renderer) await act(async () => renderer.unmount());
    global.document = oldDocument;
  }
});

test('theme changes preserve pending schedule and next sync uses the latest icon; unmount cancels pending work', async () => {
  const scheduled = [];
  const timers = new Map();
  let timerId = 0;
  const useScheduling = loadHook('useNotificationScheduling', {
    '@capacitor/core': { Capacitor: { isNativePlatform: () => true, getPlatform: () => 'ios' } },
    '@capacitor/app': { App: { addListener: async () => ({ remove: noop }) } },
    '@capacitor/local-notifications': { LocalNotifications: {
      checkPermissions: async () => ({ display: 'granted' }),
      getPending: async () => ({ notifications: [] }),
      registerActionTypes: async () => {},
      schedule: async value => scheduled.push(value),
    } },
    '@/lib/fixed-notifications': { fixedNotifications: [] },
    '@/lib/data': { categories: [] },
  });
  const oldSetTimeout = global.setTimeout;
  const oldClearTimeout = global.clearTimeout;
  global.setTimeout = callback => { timers.set(++timerId, callback); return timerId; };
  global.clearTimeout = id => timers.delete(id);
  const props = {
    isLoaded: true, notificationsEnabled: true, dailyReminders: [],
    cartasReminderEnabled: true, cartasReminderAnchorAt: Date.now(),
    theme: 'light', notificationSyncVersion: 0, allPrayers: [], planDeVidaCalendar: {},
    getPrayerById: noop, getRootPlanDeVidaId: noop, exactAlarmSettingsRequestedRef: { current: false }, toast: noop,
  };
  function Harness(p) { useScheduling(p); return null; }
  let renderer;
  const flush = async () => {
    const callbacks = [...timers.values()]; timers.clear();
    await act(async () => { callbacks.forEach(callback => callback()); });
  };
  try {
    await act(async () => { renderer = create(React.createElement(Harness, props)); });
    const pendingId = [...timers.keys()][0];
    props.theme = 'dark';
    await act(async () => renderer.update(React.createElement(Harness, props)));
    assert.deepEqual([...timers.keys()], [pendingId], 'theme must not replace the scheduled synchronization');
    await flush();
    assert.equal(scheduled.length, 1);
    assert.ok(scheduled[0].notifications.every(item => item.smallIcon === 'small_icon_white'));
    props.theme = 'light';
    await act(async () => renderer.update(React.createElement(Harness, props)));
    assert.equal(timers.size, 0, 'theme alone must not reschedule');
    props.notificationSyncVersion++;
    await act(async () => renderer.update(React.createElement(Harness, props)));
    await flush();
    assert.equal(scheduled.length, 2);
    assert.ok(scheduled[1].notifications.every(item => item.smallIcon === 'small_icon_black'));
    props.notificationSyncVersion++;
    await act(async () => renderer.update(React.createElement(Harness, props)));
    assert.equal(timers.size, 1);
    await act(async () => renderer.unmount()); renderer = null;
    assert.equal(timers.size, 0);
  } finally {
    if (renderer) await act(async () => renderer.unmount());
    global.setTimeout = oldSetTimeout;
    global.clearTimeout = oldClearTimeout;
  }
});
