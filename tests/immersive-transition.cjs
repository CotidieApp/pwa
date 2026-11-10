const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const rendererPath = require.resolve('react-test-renderer', { paths: [process.env.COTIDIE_TEST_DEPS || root] });
const rendererRequire = Module.createRequire(rendererPath);
const React = rendererRequire('react');
const { create, act } = require(rendererPath);

function harness(reducedMotion = false) {
  const calls = [];
  const exits = [];
  let mounts = 0;
  const controls = {
    start(target, transition) {
      calls.push(transition ? ['start', target, transition] : ['start', target]);
      return target.scale === 1.05 ? new Promise(resolve => exits.push(resolve)) : Promise.resolve();
    },
    set: target => calls.push(['set', target]),
    stop: () => calls.push(['stop']),
  };
  function Surface({ children }) {
    React.useEffect(() => { mounts++; }, []);
    return React.createElement('div', null, children);
  }
  const filename = path.join(root, 'src/components/immersive/ImmersiveStepTransition.tsx');
  const loaded = new Module(filename, module);
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const normalRequire = loaded.require.bind(loaded);
  loaded.require = name => name === 'react' || name === 'react/jsx-runtime' ? rendererRequire(name)
    : name === 'framer-motion' ? {
      motion: { div: Surface }, useAnimationControls: () => controls, useReducedMotion: () => reducedMotion,
    } : normalRequire(name);
  loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, filename);
  const Transition = loaded.exports.default;
  let tree;
  let resets = 0;
  const onStepVisible = () => { resets++; };
  const update = (stepKey, text) => act(async () => {
    const element = React.createElement(Transition, { stepKey, onStepVisible }, React.createElement('p', null, text));
    if (tree) tree.update(element); else tree = create(element);
  });
  return { update, calls, exits, text: () => tree.root.findByType('p').children.join(''),
    counts: () => ({ mounts, resets }), finish: resolve => act(async () => resolve()),
    unmount: () => act(async () => tree.unmount()) };
}

test('immersive transition retains the outgoing prayer, then swaps and resets scroll without remounting its surface', async () => {
  const h = harness();
  await h.update('a', 'original');
  await h.update('a', 'edited');
  const before = h.calls.length;
  await h.update('a', 'latest edit');
  assert.equal(h.calls.length, before, 'same-step edits must not restart the animation');
  await h.update('b', 'next prayer');
  assert.equal(h.text(), 'latest edit');
  assert.deepEqual(h.counts(), { mounts: 1, resets: 1 });
  await h.finish(h.exits.shift());
  assert.equal(h.text(), 'next prayer');
  assert.deepEqual(h.counts(), { mounts: 1, resets: 2 });
  assert.deepEqual(h.calls.slice(-2), [['set', { opacity: 0, scale: 0.95 }],
    ['start', { opacity: 1, scale: 1 }, { type: 'spring', stiffness: 300, damping: 25, velocity: 0 }]]);
  await h.unmount();
});

test('rapid immersive navigation uses the latest destination and ignores cancelled exits and unmounted completions', async () => {
  const h = harness();
  await h.update('a', 'first');
  await h.update('b', 'skipped');
  await h.update('c', 'destination');
  await h.finish(h.exits.shift());
  assert.equal(h.text(), 'first');
  await h.finish(h.exits.shift());
  assert.equal(h.text(), 'destination');
  await h.update('d', 'closed');
  await h.unmount();
  const before = h.calls.length;
  await h.finish(h.exits.shift());
  assert.equal(h.calls.length, before);
});

test('reduced motion advances immediately without leaving the prayer invisible', async () => {
  const h = harness(true);
  await h.update('a', 'first');
  await h.update('b', 'next');
  assert.equal(h.text(), 'next');
  assert.equal(h.exits.length, 0);
  assert.deepEqual(h.counts(), { mounts: 1, resets: 2 });
  await h.unmount();
});
