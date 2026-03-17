import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const driveRoot = 'J:\\';
const backupRoot = path.join(driveRoot, 'BENJA');
const backupDir = path.join(backupRoot, 'CotidieApp');

const excludedDirectories = new Set([
  '.git',
  '.next',
  '.gradle-user-home',
  '.trae',
  '.turbo',
  '.cache',
  'node_modules',
  'out',
  'coverage',
  'build',
  'tmp',
  'temp',
]);

const excludedFiles = new Set([
  '.DS_Store',
  '.modified',
  'tsc.out',
  'tsconfig.tsbuildinfo',
  'npm-debug.log',
  'yarn-debug.log',
  'yarn-error.log',
  'firebase-debug.log',
  'firestore-debug.log',
]);

const excludedExtensions = new Set([
  '.apk',
  '.tmp',
  '.temp',
  '.log',
]);

function normalizePath(filePath) {
  return filePath.replace(/\//g, '\\');
}

function shouldExclude(relativePath, directoryEntry) {
  const normalized = normalizePath(relativePath);
  const parts = normalized.split('\\').filter(Boolean);
  const baseName = parts.at(-1) ?? '';

  if (parts.some((part) => excludedDirectories.has(part))) {
    return true;
  }

  if (normalized === 'android\\build' || normalized.startsWith('android\\build\\')) {
    return true;
  }

  if (normalized === 'android\\app\\build' || normalized.startsWith('android\\app\\build\\')) {
    return true;
  }

  if (directoryEntry.isFile()) {
    if (excludedFiles.has(baseName)) {
      return true;
    }

    const extension = path.extname(baseName).toLowerCase();
    if (excludedExtensions.has(extension)) {
      return true;
    }
  }

  return false;
}

function copyDirectory(sourceDir, targetDir, relativeDir = '') {
  fs.mkdirSync(targetDir, { recursive: true });

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const relativePath = relativeDir ? path.join(relativeDir, entry.name) : entry.name;

    if (shouldExclude(relativePath, entry)) {
      continue;
    }

    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(sourcePath, targetPath, relativePath);
      continue;
    }

    fs.copyFileSync(sourcePath, targetPath);
  }
}

try {
  if (!fs.existsSync(driveRoot)) {
    console.error('Error: el disco J: no esta conectado. Conectalo e intenta de nuevo.');
    process.exit(1);
  }

  fs.mkdirSync(backupRoot, { recursive: true });

  if (fs.existsSync(backupDir)) {
    console.log(`Limpiando respaldo existente en ${backupDir}...`);
    fs.rmSync(backupDir, { recursive: true, force: true });
  }

  console.log(`Creando respaldo limpio en ${backupDir}...`);
  copyDirectory(projectRoot, backupDir);
  console.log('Respaldo actualizado correctamente.');
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error al crear el respaldo: ${message}`);
  process.exit(1);
}
