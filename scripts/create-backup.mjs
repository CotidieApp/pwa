import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const rootDir = process.cwd();
const backupDir = path.join(rootDir, `cotidie-backup-temp-${Date.now()}`);
const zipFile = path.join(rootDir, 'cotidie-backup.zip');

console.log('Iniciando script de respaldo...');

function copyRecursive(src, dest) {
    try {
        const stats = fs.statSync(src);
        if (stats.isDirectory()) {
            if (!fs.existsSync(dest)) fs.mkdirSync(dest);
            const items = fs.readdirSync(src);
            for (const item of items) {
                copyRecursive(path.join(src, item), path.join(dest, item));
            }
        } else {
            fs.copyFileSync(src, dest);
        }
    } catch (e) {
        console.warn(`⚠️ Error copiando ${src}: ${e.message}`);
    }
}

try {
    if (fs.existsSync(zipFile)) {
        console.log('Eliminando zip anterior...');
        fs.rmSync(zipFile);
    }

    const exclude = ['node_modules', '.next', 'out', '.git', '.vercel', 'cotidie-backup.zip', 'cotidie-backup-temp', 'android', 'cotidie-installer-v3.2.3.apk', 'backup_temp'];

    const items = fs.readdirSync(rootDir);
    console.log(`Encontrados ${items.length} elementos en la raíz.`);
    
    console.log(`Creando directorio: ${backupDir}`);
    fs.mkdirSync(backupDir);

    for (const item of items) {
        if (exclude.includes(item)) continue;
        if (item.startsWith('cotidie-backup')) continue;
        
        const src = path.join(rootDir, item);
        const dest = path.join(backupDir, item);
        console.log(`Copiando ${item}...`);
        copyRecursive(src, dest);
    }

    // Android
    const androidSrc = path.join(rootDir, 'android');
    const androidDest = path.join(backupDir, 'android');
    if (fs.existsSync(androidSrc)) {
        console.log('Procesando carpeta Android...');
        fs.mkdirSync(androidDest);
        const androidItems = fs.readdirSync(androidSrc);
        for (const item of androidItems) {
            if (item === 'build' || item === '.gradle') continue;
            const src = path.join(androidSrc, item);
            const dest = path.join(androidDest, item);
            
            if (item === 'app') {
                fs.mkdirSync(dest);
                const appItems = fs.readdirSync(src);
                for (const appItem of appItems) {
                    if (appItem === 'build') continue;
                    copyRecursive(path.join(src, appItem), path.join(dest, appItem));
                }
            } else {
                copyRecursive(src, dest);
            }
        }
    }

    console.log('Comprimiendo...');
    execSync(`powershell -Command "Compress-Archive -Path '${backupDir}\\*' -DestinationPath '${zipFile}' -Force"`, { stdio: 'inherit' });
    console.log(`✅ Respaldo creado: ${zipFile}`);

} catch (err) {
    console.error('❌ Error fatal:', err);
} finally {
    if (fs.existsSync(backupDir)) {
        try {
            console.log('Limpiando...');
            fs.rmSync(backupDir, { recursive: true, force: true });
        } catch (e) {
            console.warn('No se pudo eliminar temp:', e.message);
        }
    }
}
