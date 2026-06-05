import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { emitKeypressEvents } from 'node:readline';
import { stdin as input, stdout as output } from 'node:process';
import { fileURLToPath } from 'node:url';
import { createZipBuffer } from './lib/zip-utils.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const packageJsonPath = path.join(projectRoot, 'package.json');

const SAME_DESTINATION_ERROR = 'Error: el disco J: no está conectado. Conéctalo e intenta de nuevo.';
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const appVersion = typeof packageJson.version === 'string' && packageJson.version.trim()
  ? packageJson.version.trim()
  : '0.0.0';
const backupZipFileName = `cotidie-backup-v${appVersion}.zip`;

const driveBackupDir = path.join('H:\\', 'Mi unidad', 'Cotidie');
const documentsRootDir = 'C:\\Users\\balca\\Documentos';
// Documents is a user root, so keep the mirror inside a dedicated child folder.
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

function collectBackupFiles(sourceDir, relativeDir = '') {
  const files = [];

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const relativePath = relativeDir ? path.join(relativeDir, entry.name) : entry.name;

    if (shouldExclude(relativePath, entry)) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...collectBackupFiles(sourcePath, relativePath));
      continue;
    }

    files.push({
      absolutePath: sourcePath,
      archivePath: relativePath.split(path.sep).join('/'),
      modifiedAt: fs.statSync(sourcePath).mtime,
    });
  }

  return files;
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

function ensureWritableZipTarget(targetZipPath) {
  if (!fs.existsSync(targetZipPath)) {
    return;
  }

  if (fs.statSync(targetZipPath).isDirectory()) {
    throw new Error(SAME_DESTINATION_ERROR);
  }
}

function writeBackupZip(targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });

  const targetZipPath = path.join(targetDir, backupZipFileName);
  const tempZipPath = `${targetZipPath}.tmp`;
  const backupFiles = collectBackupFiles(projectRoot).sort((left, right) => left.archivePath.localeCompare(right.archivePath));

  ensureWritableZipTarget(targetZipPath);

  if (backupFiles.length === 0) {
    throw new Error('No se encontraron archivos para respaldar.');
  }

  console.log(`Creando respaldo ZIP en ${targetZipPath}...`);

  try {
    fs.writeFileSync(tempZipPath, createZipBuffer(backupFiles));
    if (fs.existsSync(targetZipPath)) {
      fs.rmSync(targetZipPath, { force: true });
    }
    fs.renameSync(tempZipPath, targetZipPath);
  } catch {
    if (fs.existsSync(tempZipPath)) {
      fs.rmSync(tempZipPath, { force: true });
    }
    throw new Error(SAME_DESTINATION_ERROR);
  }

  console.log('Respaldo actualizado correctamente.');
}

function parseModeFromArgs(argv) {
  const args = new Set(argv);

  if (args.has('--help') || args.has('-h')) {
    return 'help';
  }

  if (args.has('--prompt') || args.has('--interactive')) {
    return 'prompt';
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

function getPromptChoices() {
  return [
    { mode: 'disk', label: 'Disco', detail: 'B:\\Cotidie o J:\\Cotidie' },
    { mode: 'drive', label: 'Drive', detail: driveBackupDir },
    { mode: 'documents', label: 'Documentos', detail: documentsBackupDir },
  ];
}

function renderInteractivePrompt(choices, selectedIndex, linesPrinted) {
  const lines = [
    'Selecciona una opción para continuar con el respaldo:',
    ...choices.map((choice, index) => {
      const prefix = index === selectedIndex ? '>' : ' ';
      return `${prefix} ${choice.label} (${choice.detail})`;
    }),
    'Usa ↑ y ↓ para moverte, y Enter para confirmar.',
  ];

  if (linesPrinted > 0) {
    output.write(`\x1B[${linesPrinted}A`);
  }

  for (const line of lines) {
    output.write('\x1B[2K');
    output.write(`${line}\n`);
  }

  return lines.length;
}

async function promptForModeFallback() {
  const cli = readline.createInterface({ input, output });
  const choices = getPromptChoices();

  try {
    console.log('Selecciona una opción para continuar con el respaldo:');
    console.log(`1) ${choices[0].label} (${choices[0].detail})`);
    console.log(`2) ${choices[1].label} (${choices[1].detail})`);
    console.log(`3) ${choices[2].label} (${choices[2].detail})`);

    const rawAnswer = (await cli.question('Opción: ')).trim().toLowerCase();

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

function promptForModeInteractive() {
  const choices = getPromptChoices();

  return new Promise((resolve, reject) => {
    let selectedIndex = 0;
    let linesPrinted = 0;
    let closed = false;

    const cleanup = () => {
      if (closed) {
        return;
      }

      closed = true;
      input.off('keypress', handleKeypress);
      if (typeof input.setRawMode === 'function') {
        input.setRawMode(false);
      }
      output.write('\x1B[?25h');
      input.pause();
    };

    const finish = (mode) => {
      cleanup();
      output.write('\n');
      resolve(mode);
    };

    const fail = (error) => {
      cleanup();
      output.write('\n');
      reject(error);
    };

    const rerender = () => {
      linesPrinted = renderInteractivePrompt(choices, selectedIndex, linesPrinted);
    };

    const handleKeypress = (_, key = {}) => {
      if (key.ctrl && key.name === 'c') {
        fail(new Error('Operación cancelada.'));
        return;
      }

      if (key.name === 'up') {
        selectedIndex = (selectedIndex + choices.length - 1) % choices.length;
        rerender();
        return;
      }

      if (key.name === 'down') {
        selectedIndex = (selectedIndex + 1) % choices.length;
        rerender();
        return;
      }

      if (key.name === 'return' || key.name === 'enter') {
        finish(choices[selectedIndex].mode);
        return;
      }

      if (key.sequence === '1') {
        finish('disk');
        return;
      }

      if (key.sequence === '2') {
        finish('drive');
        return;
      }

      if (key.sequence === '3') {
        finish('documents');
      }
    };

    emitKeypressEvents(input);
    if (typeof input.setRawMode === 'function') {
      input.setRawMode(true);
    }
    input.resume();
    output.write('\x1B[?25l');
    rerender();
    input.on('keypress', handleKeypress);
  });
}

async function promptForMode() {
  if (input.isTTY && output.isTTY && typeof input.setRawMode === 'function') {
    return promptForModeInteractive();
  }

  return promptForModeFallback();
}

function printHelp() {
  console.log('Uso: node scripts/create-backup.mjs [--prompt|--drive|--documents|--disk|--help]');
  console.log('');
  console.log('  --prompt     Abre el selector interactivo de destino');
  console.log(`  --drive      Guarda ${backupZipFileName} en ${driveBackupDir}`);
  console.log(`  --documents  Guarda ${backupZipFileName} en ${documentsBackupDir}`);
  console.log(`  --disk       Guarda ${backupZipFileName} en B:\\Cotidie o J:\\Cotidie, según el primer disco disponible`);
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

  const backupMode = cliMode === 'prompt' || cliMode === null ? await promptForMode() : cliMode;
  const backupDir = resolveBackupDir(backupMode);
  writeBackupZip(backupDir);
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
