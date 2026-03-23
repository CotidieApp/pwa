import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..', '..');

const SAME_DESTINATION_ERROR = 'Error: el disco J: no esta conectado. Conectalo e intenta de nuevo.';

const driveBackupDir = path.join('H:\\', 'Mi unidad', 'Cotidie');
const documentsRootDir = 'C:\\Users\\balca\\Documentos';
const documentsBackupDir = path.join(documentsRootDir, 'Cotidie');
const diskBackupCandidates = [
  path.join('B:\\', 'Cotidie'),
  path.join('J:\\', 'Cotidie'),
];

const excludedDirectories = new Set([
  '.git',
  '.gradle',
  '.gradle-user-home',
  '.android-user-home',
  '.idea',
  '.next',
  '.trae',
  '.turbo',
  '.cache',
  'node_modules',
  'out',
  'output',
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
  '.log',
  '.temp',
  '.tmp',
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

function ensureRootExists(targetDir) {
  const rootDir = path.parse(targetDir).root;
  if (!rootDir || !fs.existsSync(rootDir)) {
    throw new Error(SAME_DESTINATION_ERROR);
  }
}

function ensureDirectoryOrThrow(targetDir) {
  ensureRootExists(targetDir);
  try {
    fs.mkdirSync(targetDir, { recursive: true });
  } catch {
    throw new Error(SAME_DESTINATION_ERROR);
  }
}

function resolveBackupDir(mode) {
  if (mode === 'drive') {
    ensureDirectoryOrThrow(driveBackupDir);
    return driveBackupDir;
  }

  if (mode === 'documents') {
    if (!fs.existsSync(documentsRootDir)) {
      throw new Error(SAME_DESTINATION_ERROR);
    }

    try {
      fs.mkdirSync(documentsBackupDir, { recursive: true });
    } catch {
      throw new Error(SAME_DESTINATION_ERROR);
    }

    return documentsBackupDir;
  }

  if (mode === 'disk') {
    for (const candidateDir of diskBackupCandidates) {
      const candidateRoot = path.parse(candidateDir).root;
      if (!candidateRoot || !fs.existsSync(candidateRoot)) {
        continue;
      }

      try {
        fs.mkdirSync(candidateDir, { recursive: true });
        return candidateDir;
      } catch {
        continue;
      }
    }

    throw new Error(SAME_DESTINATION_ERROR);
  }

  throw new Error('Modo de respaldo no reconocido.');
}

function recreateBackup(targetDir) {
  if (fs.existsSync(targetDir)) {
    console.log(`Limpiando respaldo existente en ${targetDir}...`);
    fs.rmSync(targetDir, { recursive: true, force: true });
  }

  console.log(`Creando respaldo limpio en ${targetDir}...`);
  copyDirectory(projectRoot, targetDir);
  console.log('Respaldo actualizado correctamente.');
}

function parseModeFromArgs(argv) {
  const args = new Set(argv);

  if (args.has('--help') || args.has('-h')) {
    return 'help';
  }

  if (args.has('--documents')) {
    return 'documents';
  }

  if (args.has('--drive') || args.has('--configured-drive')) {
    return 'drive';
  }

  if (args.has('--disk') || args.has('--disco')) {
    return 'disk';
  }

  return argv.length > 0 ? 'invalid' : null;
}

async function promptForMode() {
  const cli = readline.createInterface({ input, output });

  try {
    console.log('Selecciona una opcion para continuar con el respaldo:');
    console.log('1) Disco (B:\\Cotidie o J:\\Cotidie)');
    console.log(`2) Drive (${driveBackupDir})`);
    console.log(`3) Documentos (${documentsBackupDir})`);

    const rawAnswer = (await cli.question('Opcion: ')).trim().toLowerCase();

    switch (rawAnswer) {
      case '1':
      case 'disk':
      case 'disco':
        return 'disk';
      case '2':
      case 'drive':
        return 'drive';
      case '3':
      case 'documents':
      case 'documentos':
        return 'documents';
      default:
        throw new Error('Modo de respaldo no reconocido.');
    }
  } finally {
    cli.close();
  }
}

function printHelp() {
  console.log('Uso: node scripts/create-backup.mjs [--drive|--documents|--disk|--help]');
  console.log('');
  console.log(`  --drive      Respalda en ${driveBackupDir}`);
  console.log(`  --documents  Respalda en ${documentsBackupDir}`);
  console.log('  --disk       Respalda en B:\\Cotidie o J:\\Cotidie, segun el primer disco disponible');
  console.log('  --help       Muestra esta ayuda');
  console.log('');
  console.log('Sin argumentos se abre un selector interactivo.');
}

async function main() {
  const cliMode = parseModeFromArgs(process.argv.slice(2));

  if (cliMode === 'help') {
    printHelp();
    return;
  }

  if (cliMode === 'invalid') {
    throw new Error('Modo de respaldo no reconocido.');
  }

  const backupMode = cliMode ?? await promptForMode();
  const backupDir = resolveBackupDir(backupMode);
  recreateBackup(backupDir);
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);

  if (message === SAME_DESTINATION_ERROR || message === 'Modo de respaldo no reconocido.') {
    console.error(message);
  } else {
    console.error(`Error al crear el respaldo: ${message}`);
  }

  process.exit(1);
}
