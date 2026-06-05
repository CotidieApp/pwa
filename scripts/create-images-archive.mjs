import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createZipBuffer } from './lib/zip-utils.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const outputDir = path.join(projectRoot, 'output', 'images');
const outputZipPath = path.join(outputDir, 'cotidie-app-images.zip');

const imageExtensions = new Set([
  '.gif',
  '.jpeg',
  '.jpg',
  '.png',
  '.svg',
  '.webp',
]);

const sourceDirectories = [
  path.join(projectRoot, 'public'),
  path.join(projectRoot, 'android', 'app', 'src', 'main', 'assets', 'public'),
  path.join(projectRoot, 'android', 'app', 'src', 'main', 'res'),
];

function toArchivePath(filePath) {
  return path.relative(projectRoot, filePath).split(path.sep).join('/');
}

function collectImageFiles(sourceDir) {
  if (!fs.existsSync(sourceDir)) {
    return [];
  }

  const results = [];
  const pending = [sourceDir];

  while (pending.length > 0) {
    const currentDir = pending.pop();

    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const absolutePath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        pending.push(absolutePath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const extension = path.extname(entry.name).toLowerCase();
      if (!imageExtensions.has(extension)) {
        continue;
      }

      results.push({
        absolutePath,
        archivePath: toArchivePath(absolutePath),
        modifiedAt: fs.statSync(absolutePath).mtime,
      });
    }
  }

  return results;
}

function main() {
  const imageFiles = sourceDirectories
    .flatMap((sourceDir) => collectImageFiles(sourceDir))
    .sort((left, right) => left.archivePath.localeCompare(right.archivePath));

  if (imageFiles.length === 0) {
    throw new Error('No se encontraron imagenes para empaquetar.');
  }

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputZipPath, createZipBuffer(imageFiles));

  console.log(`ZIP creado: ${outputZipPath}`);
  console.log(`Imagenes incluidas: ${imageFiles.length}`);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error al crear el zip de imagenes: ${message}`);
  process.exit(1);
}
