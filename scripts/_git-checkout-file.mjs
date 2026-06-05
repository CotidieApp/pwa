import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const commit = process.argv[2];
const rel = process.argv[3];
if (!commit || !rel) {
  console.error('Usage: node scripts/_git-checkout-file.mjs <commit> <path>');
  process.exit(1);
}
const raw = execSync(`git show ${commit}:${rel}`, { cwd: rootDir, encoding: 'utf8' });
fs.writeFileSync(path.join(rootDir, rel), raw, 'utf8');
console.log(`restored ${rel} from ${commit}`);
