const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const vm = require('node:vm');

test('xcode keeps generating unique 24-character project IDs with the patched uuid', () => {
  const project = require('xcode').project('unused.pbxproj');
  project.hash = { project: { objects: {} } };
  const ids = Array.from({ length: 100 }, () => project.generateUuid());
  assert.equal(new Set(ids).size, 100);
  for (const id of ids) assert.match(id, /^[A-F0-9]{24}$/);
});

test('Rollup serializer preserves the function and regex options used by worker minification', () => {
  const pluginRequire = createRequire(require.resolve('@rollup/plugin-terser'));
  const serialize = pluginRequire('serialize-javascript');
  const options = { format: { comments: /copyright/i }, transform: function(value) { return value + 1; } };
  const restored = vm.runInNewContext('(' + serialize(options) + ')');
  assert.equal(restored.format.comments.test('Copyright'), true);
  assert.equal(restored.transform(2), 3);
});

test('Tailwind and nested CSS retain selector parsing with the patched parser', () => {
  const tailwindRequire = createRequire(require.resolve('tailwindcss'));
  const parser = tailwindRequire('postcss-selector-parser');
  const selector = '.dark .hover\\:bg-red-500:hover > :is(.a, .b), [data-state="open"]';
  assert.equal(parser().processSync(selector), selector);
  const classes = [];
  parser(root => root.walkClasses(node => classes.push(node.value))).processSync(selector);
  assert.deepEqual(classes, ['dark', 'hover:bg-red-500', 'a', 'b']);
});
