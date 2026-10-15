const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('source backups exclude signing material and env files while keeping application source', () => {
  const source = fs.readFileSync(path.join(__dirname, '../scripts/create-backup.mjs'), 'utf8');
  // Evaluate only the actual pure filter: never run prompts or write a backup/destination.
  const start = source.indexOf('const excludedDirectories =');
  const end = source.indexOf('function collectBackupFiles');
  assert.ok(start >= 0 && end > start);
  const exclude = vm.runInNewContext(source.slice(start, end) + '\nshouldExclude;', {path});
  const file = {isFile:()=>true};
  for (const name of ['.env', '.env.local', 'android/app/release.keystore', 'nested/key.JKS', 'key.p12', 'key.pfx'])
    assert.equal(exclude(name, file), true, name);
  for (const name of ['src/app/page.tsx', 'android/app/build.gradle', 'package.json', 'public/epub/book.epub'])
    assert.equal(exclude(name, file), false, name);
});
