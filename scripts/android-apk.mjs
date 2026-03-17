import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const args = process.argv.slice(2);
const noBump = args.includes("--no-bump");
const skipPush = args.includes("--no-push");
const setIndex = args.indexOf("--set");
const setVersion = setIndex >= 0 ? args[setIndex + 1] : null;

const readText = (filePath) => fs.readFileSync(filePath, "utf8");
const writeText = (filePath, contents) => fs.writeFileSync(filePath, contents, "utf8");
const readJson = (filePath) => JSON.parse(readText(filePath));
const writeJson = (filePath, data) => writeText(filePath, JSON.stringify(data, null, 2) + "\n");

const ensureSemver = (value) => {
  if (typeof value !== "string" || !/^\d+\.\d+\.\d+$/.test(value)) {
    throw new Error(`Version invalida: ${String(value)}`);
  }
  return value;
};

const bumpPatch = (value) => {
  const [major, minor, patch] = ensureSemver(value).split(".").map((part) => Number(part));
  return `${major}.${minor}.${patch + 1}`;
};

const replaceOrThrow = (source, pattern, replacement) => {
  const output = source.replace(pattern, replacement);
  if (output === source) {
    throw new Error("No se pudo aplicar un reemplazo esperado.");
  }
  return output;
};

const buildCommandEnv = () => {
  const env = { ...process.env };
  const gradleUserHome = path.join(rootDir, ".gradle-user-home");
  fs.mkdirSync(gradleUserHome, { recursive: true });
  env.GRADLE_USER_HOME = gradleUserHome;

  if (!env.JAVA_HOME) {
    const candidate = "C:\\Program Files\\Android\\Android Studio\\jbr";
    if (fs.existsSync(candidate)) {
      env.JAVA_HOME = candidate;
      const pathKey = Object.keys(env).find((key) => key.toLowerCase() === "path") || "Path";
      env[pathKey] = `${candidate}\\bin;${env[pathKey] || ""}`;
      console.log(`Setting JAVA_HOME to ${candidate}`);
    }
  }

  return env;
};

const formatCommand = (command, commandArgs) =>
  [command, ...commandArgs]
    .map((part) => (/[\s"]/u.test(part) ? `"${part.replaceAll('"', '\\"')}"` : part))
    .join(" ");

const runCommand = (command, commandArgs, cwd) => {
  console.log(`\n> ${formatCommand(command, commandArgs)}`);

  const result = spawnSync(command, commandArgs, {
    cwd,
    stdio: "inherit",
    env: buildCommandEnv(),
    shell: false,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`Fallo: ${formatCommand(command, commandArgs)}`);
  }
};

const resolveGitCommand = () =>
  fs.existsSync("C:\\Program Files\\Git\\cmd\\git.exe")
    ? "C:\\Program Files\\Git\\cmd\\git.exe"
    : "git";

const runNodeScript = (scriptPath, scriptArgs, cwd) => {
  runCommand(process.execPath, [scriptPath, ...scriptArgs], cwd);
};

const runBatchCommand = (commandLine, cwd) => {
  const shell = process.env.ComSpec || "cmd.exe";
  console.log(`\n> ${commandLine}`);

  const result = spawnSync(shell, ["/d", "/s", "/c", commandLine], {
    cwd,
    stdio: "inherit",
    env: buildCommandEnv(),
    shell: false,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`Fallo: ${commandLine}`);
  }
};

const resolveNpmCliPath = () => {
  const bundled = path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");
  if (fs.existsSync(bundled)) {
    return bundled;
  }
  throw new Error("No se encontro npm-cli.js junto a la instalacion actual de Node.");
};

const resolveCapacitorCliPath = () => {
  const bundled = path.join(rootDir, "node_modules", "@capacitor", "cli", "bin", "capacitor");
  if (fs.existsSync(bundled)) {
    return bundled;
  }
  throw new Error("No se encontro la CLI local de Capacitor en node_modules.");
};

const resolveDriveApkDir = () =>
  process.env.COTIDIE_APK_DRIVE_DIR || "H:\\Mi Unidad\\Cotidie\\APK Installer";

const ensureGitIndexUnlocked = () => {
  const lockPath = path.join(rootDir, ".git", "index.lock");
  if (!fs.existsSync(lockPath)) {
    return;
  }

  const stats = fs.statSync(lockPath);
  const stampedAt = new Date(stats.mtimeMs).toLocaleString("es-CL");
  throw new Error(
    `Git esta bloqueado por ${lockPath} (ultima modificacion: ${stampedAt}). ` +
      "Cierra cualquier proceso git/editor pendiente, elimina ese archivo si quedo stale y vuelve a ejecutar el comando."
  );
};

const copyApkToDrive = (apkPath, version) => {
  const driveDir = resolveDriveApkDir();
  fs.mkdirSync(driveDir, { recursive: true });
  fs.accessSync(driveDir, fs.constants.W_OK);

  const driveApkPath = path.join(driveDir, `cotidie-installer-v${version}.apk`);
  fs.copyFileSync(apkPath, driveApkPath);
  console.log(`APK copiado a Drive en: ${driveApkPath}`);
  return driveApkPath;
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

if (!skipPush) {
  ensureGitIndexUnlocked();
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
    const previous = readText(versionTsPath);
    const updated = replaceOrThrow(
      previous,
      /export const appVersion\s*=\s*["'][^"']+["'];/,
      `export const appVersion = "${nextVersion}";`
    );
    writeText(versionTsPath, updated);
  }

  if (fs.existsSync(androidGradlePath)) {
    const previous = readText(androidGradlePath);
    const codeMatch = previous.match(/versionCode\s+(\d+)/);
    const currentCode = codeMatch ? Number(codeMatch[1]) : 1;
    const nextCode = Number.isFinite(currentCode) ? currentCode + 1 : 1;

    let updated = replaceOrThrow(previous, /versionName\s+["'][^"']+["']/, `versionName "${nextVersion}"`);
    updated = replaceOrThrow(updated, /versionCode\s+\d+/, `versionCode ${nextCode}`);
    writeText(androidGradlePath, updated);
  }
}

runNodeScript(resolveNpmCliPath(), ["run", "build"], rootDir);
runNodeScript(resolveCapacitorCliPath(), ["sync", "android"], rootDir);

if (process.platform === "win32") {
  runBatchCommand("gradlew.bat assembleDebug", path.join(rootDir, "android"));
} else {
  runCommand("./gradlew", ["assembleDebug"], path.join(rootDir, "android"));
}

const apkDir = path.join(rootDir, "android", "app", "build", "outputs", "apk", "debug");
const srcApk = path.join(apkDir, "app-debug.apk");
if (!fs.existsSync(srcApk)) {
  throw new Error("No se encontro app-debug.apk.");
}

try {
  const files = fs.readdirSync(rootDir);
  for (const file of files) {
    if (file.startsWith("cotidie-installer-v") && file.endsWith(".apk")) {
      fs.unlinkSync(path.join(rootDir, file));
      console.log(`Eliminado APK anterior: ${file}`);
    }
  }
} catch (error) {
  console.warn("Advertencia al limpiar APKs antiguos:", error.message);
}

const dstApk = path.join(rootDir, `cotidie-installer-v${nextVersion}.apk`);
fs.copyFileSync(srcApk, dstApk);
console.log(`APK generado exitosamente en: ${dstApk}`);
copyApkToDrive(dstApk, nextVersion);

if (skipPush) {
  console.log("\nAviso: se omitio el git push.");
  console.log("La APK local queda actualizada, pero la PWA/Vercel no se actualizara hasta subir los cambios a origin/main.");
}

if (!skipPush) {
  console.log("\n--- Iniciando sincronizacion automatica con Vercel (Git) ---");
  try {
    const gitCommand = resolveGitCommand();

    runCommand(gitCommand, ["add", "-A", "--", "."], rootDir);

    try {
      const commitResult = spawnSync(gitCommand, ["commit", "-m", `Auto-deploy: Build v${nextVersion}`], {
        cwd: rootDir,
        stdio: "inherit",
        env: buildCommandEnv(),
        shell: false,
      });

      if (commitResult.error) {
        throw commitResult.error;
      }

      if (commitResult.status !== 0) {
        console.log("Git commit no realizo cambios (probablemente nothing to commit).");
      }
    } catch (error) {
      console.warn("Advertencia en git commit:", error.message);
    }

    console.log("Subiendo cambios a GitHub...");
    runCommand(gitCommand, ["push"], rootDir);
    console.log("Exito: el codigo se ha subido y Vercel deberia estar actualizando la PWA.");
  } catch (error) {
    console.error("No se pudo completar la sincronizacion automatica con Git.");
    console.error(`Error: ${error.message}`);
    console.error("Por favor, ejecuta 'git push' manualmente si deseas actualizar la web.");
  }
}
