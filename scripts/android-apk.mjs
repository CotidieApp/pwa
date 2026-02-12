import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// El script está en /scripts, así que subimos un nivel para ir a la raíz del proyecto
const rootDir = path.resolve(__dirname, "..");

const args = process.argv.slice(2);
const noBump = args.includes("--no-bump");
const setIndex = args.indexOf("--set");
const setVersion = setIndex >= 0 ? args[setIndex + 1] : null;

const readText = (p) => fs.readFileSync(p, "utf8");
const writeText = (p, s) => fs.writeFileSync(p, s, "utf8");

const readJson = (p) => JSON.parse(readText(p));
const writeJson = (p, data) => writeText(p, JSON.stringify(data, null, 2) + "\n");

const ensureSemver = (v) => {
  if (typeof v !== "string" || !/^\d+\.\d+\.\d+$/.test(v)) {
    throw new Error(`Versión inválida: ${String(v)}`);
  }
  return v;
};

const bumpPatch = (v) => {
  const [maj, min, pat] = ensureSemver(v).split(".").map((x) => Number(x));
  return `${maj}.${min}.${pat + 1}`;
};

const replaceOrThrow = (src, re, next) => {
  const out = src.replace(re, next);
  if (out === src) throw new Error("No se pudo aplicar un reemplazo esperado.");
  return out;
};

const packageJsonPath = path.join(rootDir, "package.json");
const packageLockPath = path.join(rootDir, "package-lock.json");
const versionTsPath = path.join(rootDir, "src", "lib", "version.ts");
const androidGradlePath = path.join(rootDir, "android", "app", "build.gradle");

const pkg = readJson(packageJsonPath);
const current = ensureSemver(pkg.version);

let nextVersion = current;
if (setVersion) {
  nextVersion = ensureSemver(setVersion);
} else if (!noBump) {
  nextVersion = bumpPatch(current);
}

if (nextVersion !== current) {
  pkg.version = nextVersion;
  writeJson(packageJsonPath, pkg);

  if (fs.existsSync(packageLockPath)) {
    const lock = readJson(packageLockPath);
    lock.version = nextVersion;
    if (lock.packages && lock.packages[""]) {
      lock.packages[""].version = nextVersion;
    }
    writeJson(packageLockPath, lock);
  }

  if (fs.existsSync(versionTsPath)) {
    const prev = readText(versionTsPath);
    const updated = replaceOrThrow(
      prev,
      /export const appVersion\s*=\s*["'][^"']+["'];/,
      `export const appVersion = "${nextVersion}";`
    );
    writeText(versionTsPath, updated);
  }

  if (fs.existsSync(androidGradlePath)) {
    const prev = readText(androidGradlePath);
    const codeMatch = prev.match(/versionCode\s+(\d+)/);
    const currentCode = codeMatch ? Number(codeMatch[1]) : 1;
    const nextCode = Number.isFinite(currentCode) ? currentCode + 1 : 1;
    let updated = replaceOrThrow(prev, /versionName\s+["'][^"']+["']/, `versionName "${nextVersion}"`);
    updated = replaceOrThrow(updated, /versionCode\s+\d+/, `versionCode ${nextCode}`);
    writeText(androidGradlePath, updated);
  }
}

const run = (cmd, cwd) => {
  // Attempt to set JAVA_HOME if not set
  const env = { ...process.env };
  if (!env.JAVA_HOME) {
    const candidate = "C:\\Program Files\\Android\\Android Studio\\jbr";
    if (fs.existsSync(candidate)) {
        env.JAVA_HOME = candidate;
        // Find existing Path key (case insensitive)
        const pathKey = Object.keys(env).find(k => k.toLowerCase() === 'path') || 'Path';
        env[pathKey] = `${candidate}\\bin;${env[pathKey] || ''}`;
        console.log(`Setting JAVA_HOME to ${candidate}`);
    }
  }

  const res = spawnSync(cmd, {
    cwd,
    stdio: "inherit",
    shell: true,
    env,
  });
  if (res.status !== 0) {
    throw new Error(`Falló: ${cmd}`);
  }
};

run("npm run build", rootDir);
run("npx cap sync android", rootDir);

const gradleCmd = process.platform === "win32" ? ".\\gradlew.bat assembleDebug" : "./gradlew assembleDebug";
run(gradleCmd, path.join(rootDir, "android"));

const apkDir = path.join(rootDir, "android", "app", "build", "outputs", "apk", "debug");
const srcApk = path.join(apkDir, "app-debug.apk");
if (!fs.existsSync(srcApk)) {
  throw new Error("No se encontró app-debug.apk.");
}

// Limpiar APKs anteriores
try {
  const files = fs.readdirSync(rootDir);
  for (const file of files) {
    if (file.startsWith("cotidie-installer-v") && file.endsWith(".apk")) {
      fs.unlinkSync(path.join(rootDir, file));
      console.log(`Eliminado APK anterior: ${file}`);
    }
  }
} catch (e) {
  console.warn("Advertencia al limpiar APKs antiguos:", e.message);
}

const dstApk = path.join(rootDir, `cotidie-installer-v${nextVersion}.apk`);
fs.copyFileSync(srcApk, dstApk);
console.log(`APK generado exitosamente en: ${dstApk}`);

// --- Auto-Deploy to Vercel (Git Push) ---
const skipPush = args.includes("--no-push");

if (!skipPush) {
  console.log("\n--- Iniciando sincronización automática con Vercel (Git) ---");
  try {
    // Intentar encontrar git en rutas comunes si no está en el PATH
    const gitPath = fs.existsSync("C:\\Program Files\\Git\\cmd\\git.exe") 
        ? "\"C:\\Program Files\\Git\\cmd\\git.exe\"" 
        : "git";

    // 1. Añadir cambios (incluyendo package.json y version bumps)
    run(`${gitPath} add .`, rootDir);

    // 2. Commit (controlando si no hay cambios)
    try {
        // Usamos spawnSync directo para no lanzar error si el exit code es 1 (nada que commitear)
        const commitRes = spawnSync(`${gitPath} commit -m "Auto-deploy: Build v${nextVersion}"`, {
            cwd: rootDir,
            stdio: "inherit",
            shell: true
        });
        if (commitRes.status !== 0) {
            console.log("ℹ️  Git commit no realizó cambios (probablemente 'nothing to commit').");
        }
    } catch (err) {
        console.warn("⚠️ Advertencia en git commit:", err.message);
    }

    // 3. Push
    console.log("⬆️  Subiendo cambios a GitHub...");
    run(`${gitPath} push`, rootDir);
    console.log("✅ ¡Éxito! El código se ha subido y Vercel debería estar actualizando la PWA.");
    
  } catch (e) {
    console.error("❌ No se pudo completar la sincronización automática con Git.");
    console.error(`   Error: ${e.message}`);
    console.error("   Por favor, ejecuta 'git push' manualmente si deseas actualizar la web.");
  }
}


