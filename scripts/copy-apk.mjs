import fs from 'fs';
import path from 'path';

// 1. Leer el package.json para obtener la versión actual dinámicamente
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = packageJson.version;

// 2. Definir el nombre del archivo tal como queda en la raíz (ej: cotidie-installer-v4.4.31.apk)
// Cambia 'cotidie' por el nombre exacto que use tu script actual en la raíz
const APK_NAME = `cotidie-installer-v${version}.apk`; 

// 3. Rutas de origen (raíz) y destino (Google Drive)
const SOURCE_APK = path.join(process.cwd(), APK_NAME);
const DESTINATION_DIR = 'G:\\Mi unidad\\Cotidie\\APK Installer';
const DESTINATION_APK = path.join(DESTINATION_DIR, APK_NAME);

async function copyToDrive() {
  try {
    // Verificar que el APK ya exista en la raíz
    if (!fs.existsSync(SOURCE_APK)) {
      console.error(`❌ No se encontró el APK en la raíz: ${APK_NAME}`);
      console.error(`Asegúrate de que 'android-apk.mjs' lo esté dejando ahí con ese nombre exacto.`);
      process.exit(1);
    }

    // Asegurar que la carpeta de destino en Drive exista
    if (!fs.existsSync(DESTINATION_DIR)) {
      fs.mkdirSync(DESTINATION_DIR, { recursive: true });
    }

    // Copiar a Google Drive (si ya existe el mismo nombre, lo reemplaza)
    fs.copyFileSync(SOURCE_APK, DESTINATION_APK);
    
    console.log(`\n✨ APK detectado en raíz: ${APK_NAME}`);
    console.log(`🚀 Copiado correctamente a Drive: ${DESTINATION_APK}`);
    console.log(`♻️ Archivo idéntico reemplazado en el destino.`);
  } catch (error) {
    console.error('❌ Error al copiar a Google Drive:', error.message);
    process.exit(1);
  }
}

copyToDrive();