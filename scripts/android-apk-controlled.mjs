import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runControlled } from './run-controlled.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.exit(runControlled([{
  executable: process.execPath,
  arguments: [path.join(root, 'scripts', 'android-apk.mjs'), ...process.argv.slice(2)],
}], root));
