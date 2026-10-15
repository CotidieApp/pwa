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
const jsxRuntime = external('react/jsx-runtime');
const { create, act } = require(rendererPath);
const originalLoad = Module._load;
Module._load = function(name, ...args) {
  if (name === 'react') return React;
  if (name === 'react/jsx-runtime') return jsxRuntime;
  return originalLoad.call(this, name, ...args);
};
const { Controller, FormProvider } = require('react-hook-form');
const host = tag => ({ children, ...props }) => React.createElement(tag, props, children);
const pass = ({ children }) => children;
const noop = () => null;
const mocks = {
  '@/context/SettingsContext': { useSettings: () => ({ isDeveloperMode: true, allHomeBackgrounds: [] }) },
  '@/components/ui/button': { Button: host('button') },
  '@/components/ui/input': { Input: React.forwardRef((props, ref) => React.createElement('input', { ...props, ref })) },
  '@/components/ui/textarea': { Textarea: React.forwardRef((props, ref) => React.createElement('textarea', { ...props, ref })) },
  '@/components/ui/card': { Card: pass, CardContent: pass, CardFooter: pass },
  '@/components/ui/form': { Form: FormProvider, FormField: Controller, FormControl: pass, FormItem: pass, FormLabel: pass, FormMessage: noop },
  '@/lib/textFormatter': { renderText: text => text },
  '@/components/ui/ImageCropper': { default: noop, __esModule: true },
  '@/lib/placeholder-images': { PlaceHolderImages: [] },
  'lucide-react': { Eye: noop, Images: noop, Trash2: noop },
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
const Form = load('src/components/AddPrayerForm.tsx').default;

async function fixture(run, initial = {}, extra = {}) {
  const oldWindow = global.window;
  const oldSetInterval = global.setInterval;
  const oldClearInterval = global.clearInterval;
  const values = new Map(Object.entries(initial));
  let failWrite = false, failRemove = false, saves = 0, cancels = 0;
  const intervals = new Set();
  global.setInterval = fn => { intervals.add(fn); return fn; };
  global.clearInterval = fn => intervals.delete(fn);
  global.window = { localStorage: {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { if (failWrite) throw Error('QuotaExceeded'); values.set(key, value); },
    removeItem: key => { if (failRemove) throw Error('Denied'); values.delete(key); },
  } };
  let view;
  let props = { formType: 'devotion', onSave: () => { saves++; }, onCancel: () => { cancels++; }, ...extra };
  const field = name => view.root.findAll(node => typeof node.type === 'string' && node.props.name === name)[0];
  try {
    await act(async () => { view = create(React.createElement(Form, props)); });
    await run({ values, field, get view() { return view; }, get saves() { return saves; }, get cancels() { return cancels; },
      fail: (write, remove = false) => { failWrite = write; failRemove = remove; },
      change: async (name, value) => act(async () => {
        if (name === 'imageUrl') view.root.findByType(FormProvider).props.setValue(name, value);
        else field(name).props.onChange({ target: { name, value } });
      }),
      tick: async () => act(async () => { for (const fn of intervals) fn(); }),
      update: async next => act(async () => { props = { ...props, ...next }; view.update(React.createElement(Form, props)); }),
      submit: async () => act(async () => view.root.findByType('form').props.onSubmit({ preventDefault() {}, persist() {} })),
      unmount: async () => { await act(async () => view.unmount()); view = null; },
    });
  } finally {
    if (view) await act(async () => view.unmount());
    global.window = oldWindow;
    global.setInterval = oldSetInterval;
    global.clearInterval = oldClearInterval;
  }
  assert.equal(intervals.size, 0);
}
const key = 'cotidie_draft_devotion';
const draft = JSON.stringify({ title: '', content: 'Borrador parcial', imageUrl: '/images/test.png' });

test('draft survives initialization and unrelated renders; clearing removes stale draft', async () => {
  await fixture(async f => {
    assert.equal(f.field('content').props.value, 'Borrador parcial');
    await f.change('content', 'Nuevo texto');
    await f.update({});
    assert.equal(f.field('content').props.value, 'Nuevo texto');
    await f.tick();
    assert.equal(JSON.parse(f.values.get(key)).content, 'Nuevo texto');
    await f.change('content', '');
    await f.change('imageUrl', '');
    await f.tick();
    assert.equal(f.values.has(key), false);
  }, { [key]: draft });
});

test('quota failure keeps text and old draft, reports failure, then retries successfully', async () => {
  await fixture(async f => {
    f.fail(true);
    await f.change('content', 'No perder');
    await f.tick();
    assert.equal(f.field('content').props.value, 'No perder');
    assert.equal(f.values.get(key), draft);
    assert.equal(f.view.root.findAllByProps({ role: 'alert' }).length, 1);
    f.fail(false);
    await f.tick();
    assert.equal(JSON.parse(f.values.get(key)).content, 'No perder');
    assert.equal(f.view.root.findAllByProps({ role: 'alert' }).length, 0);
  }, { [key]: draft });
});

test('invalid draft is not overwritten until the user writes; switching types flushes to the old key', async () => {
  await fixture(async f => {
    await f.tick();
    assert.equal(f.values.get(key), '{invalid');
    await f.change('content', 'Recuperado');
    await f.update({ formType: 'letter' });
    assert.equal(JSON.parse(f.values.get(key)).content, 'Recuperado');
    assert.equal(f.field('content').props.value, 'Carta');
    await f.change('content', 'Carta nueva');
    await f.unmount();
    assert.equal(JSON.parse(f.values.get('cotidie_draft_letter')).content, 'Carta nueva');
  }, { [key]: '{invalid', cotidie_draft_letter: JSON.stringify({ content: 'Carta' }) });
});

test('editing an existing prayer preserves the creation draft and unsaved edits on context renders', async () => {
  const prayer = { id: 'one', title: 'Existente', content: 'Texto', imageUrl: '' };
  await fixture(async f => {
    await f.change('content', 'Editado');
    await f.update({ existingPrayer: { ...prayer } });
    assert.equal(f.field('content').props.value, 'Editado');
    await f.submit();
    assert.equal(f.saves, 1);
    assert.equal(f.values.get(key), draft);
  }, { [key]: draft }, { existingPrayer: prayer });
});

test('successful save clears draft without recreating it; failed cleanup does not repeat the save', async () => {
  for (const failRemove of [false, true]) {
    await fixture(async f => {
      await f.change('title', 'Nueva');
      f.fail(false, failRemove);
      await f.submit();
      await f.tick();
      await f.submit();
      assert.equal(f.saves, 1);
      assert.equal(f.cancels, failRemove ? 0 : 1);
      assert.equal(f.values.has(key), failRemove);
    }, { [key]: draft });
  }
});
