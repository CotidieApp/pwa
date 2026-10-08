import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { runControlled } from './run-controlled.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const steps = [
  { executable: process.execPath, arguments: [require.resolve('typescript/bin/tsc'), '--noEmit'] },
  { executable: process.execPath, arguments: [require.resolve('next/dist/bin/next'), 'build'] },
];
process.exit(runControlled(steps, root));
