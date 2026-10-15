import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
let preload;
try {
  preload = require.resolve('fake-indexeddb/auto', {
    paths: process.env.COTIDIE_TEST_DEPS ? [process.env.COTIDIE_TEST_DEPS] : [root],
  });
  require.resolve('react-test-renderer', {
    paths: process.env.COTIDIE_TEST_DEPS ? [process.env.COTIDIE_TEST_DEPS] : [root],
  });
} catch {
  console.error('Falta fake-indexeddb o react-test-renderer. Instala fake-indexeddb y react-test-renderer@18.3.1 en un directorio auxiliar externo y define COTIDIE_TEST_DEPS con ese directorio. Consulta tests/READING-VALIDATION.md.');
  process.exit(1);
}
const result = spawnSync(process.execPath, ['--require', preload, '--test', '--test-concurrency=1',
  'tests/reading-persistence.cjs', 'tests/notification-patches.cjs', 'tests/settings-lifecycle.cjs', 'tests/prayer-form.cjs', 'tests/dependency-contracts.cjs', 'tests/backup-filter.cjs'], {cwd:root,stdio:'inherit'});
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
