const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..');
function load(file) {
  const filename = path.join(root, file);
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, filename);
  return loaded.exports;
}
const LetterContent = load('src/components/LetterContent.tsx').default;
const { getMesDeMariaDayIndex, mesDeMariaReflections: reflections } = load('src/lib/mes-de-maria.ts');

test('letters render both italic delimiters, bold, nested emphasis and headings using one safe renderer', () => {
  const html = renderToStaticMarkup(React.createElement(LetterContent, { text: '# Título\n## Sección\n### Apartado\n*primera* y _segunda_ y **firme _también_**\n\n*una línea entera*\n\n<script>alert(1)</script>\n\\*literal\\*', zoom: 1.2 }));
  assert.match(html, /<h1[^>]*>Título<\/h1>/);
  assert.match(html, /<h2[^>]*>Sección<\/h2>/);
  assert.match(html, /<h3[^>]*>Apartado<\/h3>/);
  assert.match(html, /<em>primera<\/em> y <em>segunda<\/em> y <strong>firme <em>también<\/em><\/strong>/);
  assert.match(html, /<p[^>]*><em>una línea entera<\/em><\/p>/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /\*literal\*/);
  assert.match(html, /font-size:1.2em/);
});

test('letters preserve line breaks, ordered and unordered lists, quotes and dividers', () => {
  const html = renderToStaticMarkup(React.createElement(LetterContent, { text: 'Primera\nSegunda\n\n- Uno\n- Dos\n3. Tres\n4. Cuatro\n> *Cita*\n---' }));
  assert.match(html, /Primera\nSegunda/);
  assert.match(html, /<ul[^>]*><li>Uno<\/li><li>Dos<\/li><\/ul>/);
  assert.match(html, /<ol start="3"[^>]*><li>Tres<\/li><li>Cuatro<\/li><\/ol>/);
  assert.match(html, /<blockquote[^>]*><em>Cita<\/em><\/blockquote>/);
  assert.match(html, /<hr/);
});

test('all 31 dates select the corresponding reflection in multiple years; outside dates start on November 8', () => {
  assert.equal(reflections.length, 31);
  assert.equal(new Set(reflections.map(r => `${r.month}-${r.day}`)).size, 31);
  for (const year of [2024, 2026, 2027]) {
    for (let i = 0; i < 31; i++) {
      const date = new Date(year, 10, 8 + i, 12);
      assert.equal(getMesDeMariaDayIndex(date), i);
      assert.equal(reflections[i].month, date.getMonth() + 1);
      assert.equal(reflections[i].day, date.getDate());
      assert.ok(reflections[i].title.length > 3);
      assert.ok(reflections[i].content.length > 300);
    }
    for (const [month, day] of [[0, 1], [10, 7], [11, 9], [11, 31]]) assert.equal(getMesDeMariaDayIndex(new Date(year, month, day)), 0);
  }
  assert.match(reflections[0].content, /^No olvides, amigo mío/);
  assert.match(reflections[30].content, /Damos gracias por tu Inmaculada Concepción\.$/);
  assert.doesNotMatch(reflections.map(r => r.content).join('\n'), /Oración inicial del mes|Padrenuestro \+|PARA MEDITAR|Santo Rosario, pp\./);
});
