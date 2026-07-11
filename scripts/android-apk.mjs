import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const args = process.argv.slice(2);
const noBump = args.includes("--no-bump");
const skipPush = args.includes("--no-push");
const skipDrive = args.includes("--no-drive");
const setIndex = args.indexOf("--set");
const setVersion = setIndex >= 0 ? args[setIndex + 1] : null;

const readText = (filePath) => fs.readFileSync(filePath, "utf8");
const writeText = (filePath, contents) => fs.writeFileSync(filePath, contents, "utf8");
const readJson = (filePath) => JSON.parse(readText(filePath));
const writeJson = (filePath, data) => writeText(filePath, JSON.stringify(data, null, 2) + "\n");
const resolveExistingPath = (...candidates) => candidates.find((candidate) => candidate && fs.existsSync(candidate)) ?? null;

const buildStartedAt = Date.now();

const calculateSha256 = (filePath) => {
  const hash = createHash("sha256");
  const fileDescriptor = fs.openSync(filePath, "r");
  const buffer = Buffer.allocUnsafe(1024 * 1024);

  try {
    let bytesRead = 0;
    while ((bytesRead = fs.readSync(fileDescriptor, buffer, 0, buffer.length, null)) > 0) {
      hash.update(buffer.subarray(0, bytesRead));
    }
  } finally {
    fs.closeSync(fileDescriptor);
  }

  return hash.digest("hex");
};

const copyFileWithStatus = (sourcePath, destinationPath) => {
  const sourceSize = fs.statSync(sourcePath).size;
  const sourceSha256 = calculateSha256(sourcePath);
  let status = "created";

  if (fs.existsSync(destinationPath)) {
    const destinationStats = fs.statSync(destinationPath);
    const isIdentical =
      destinationStats.isFile() &&
      destinationStats.size === sourceSize &&
      calculateSha256(destinationPath) === sourceSha256;

    if (isIdentical) {
      return { status: "unchanged", size: sourceSize, sha256: sourceSha256 };
    }
    status = "updated";
  }

  fs.copyFileSync(sourcePath, destinationPath);
  const copiedStats = fs.statSync(destinationPath);
  const copiedSha256 = calculateSha256(destinationPath);
  if (copiedStats.size !== sourceSize || copiedSha256 !== sourceSha256) {
    throw new Error(`La verificación de la copia falló: ${destinationPath}`);
  }

  return { status, size: sourceSize, sha256: sourceSha256 };
};

const describeCopyStatus = (status) =>
  status === "created" ? "creado" : status === "updated" ? "actualizado" : "ya estaba actualizado";

const formatBytes = (bytes) => `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
const formatDuration = (milliseconds) => {
  const totalSeconds = Math.round(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes} min ${seconds} s` : `${seconds} s`;
};
const logSection = (title) => console.log(`\n=== ${title} ===`);

const ensureSemver = (value) => {
  if (typeof value !== "string" || !/^\d+\.\d+\.\d+$/.test(value)) {
    throw new Error(`Versión inválida: ${String(value)}`);
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

let commandEnvCache = null;
const buildCommandEnv = () => {
  if (commandEnvCache) return commandEnvCache;
  const env = { ...process.env };
  const gradleUserHome = path.join(rootDir, ".gradle-user-home");
  fs.mkdirSync(gradleUserHome, { recursive: true });
  env.GRADLE_USER_HOME = gradleUserHome;

  if (!env.JAVA_HOME) {
    const candidate = resolveExistingPath(
      process.env.JAVA_HOME,
      "C:\\Program Files\\Android\\Android Studio\\jbr",
      "C:\\Program Files (x86)\\Android\\Android Studio\\jbr",
      path.join(process.env.LOCALAPPDATA || "", "Programs", "Android Studio", "jbr")
    );
    if (candidate) {
      env.JAVA_HOME = candidate;
      const pathKey = Object.keys(env).find((key) => key.toLowerCase() === "path") || "Path";
      env[pathKey] = `${candidate}\\bin;${env[pathKey] || ""}`;
    }
  }

  // Force licensed SDK path to avoid "License not accepted" in Temp folders
  const sdkPath = "C:\\Users\\balca\\AppData\\Local\\Android\\Sdk";
  if (fs.existsSync(sdkPath)) {
    env.ANDROID_HOME = sdkPath;
    env.ANDROID_SDK_ROOT = sdkPath;
  }

  commandEnvCache = env;
  console.log(`Entorno Java: ${env.JAVA_HOME || "no definido"}`);
  console.log(`Android SDK: ${env.ANDROID_HOME || env.ANDROID_SDK_ROOT || "no definido"}`);
  return commandEnvCache;
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
  resolveExistingPath(
    process.env.GIT_EXE,
    "C:\\Program Files\\Git\\cmd\\git.exe",
    "C:\\Program Files (x86)\\Git\\cmd\\git.exe"
  ) || "git";

const runNodeScript = (scriptPath, scriptArgs, cwd) => {
  runCommand(process.execPath, [scriptPath, ...scriptArgs], cwd);
};

const androidExcludedWebAssets = [
  "epub/Nuevo Testamento.epub",
];

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const prepareAndroidWebAssets = () => {
  const webDir = path.join(rootDir, "out");
  for (const relativeAssetPath of androidExcludedWebAssets) {
    const assetPath = path.join(webDir, ...relativeAssetPath.split("/"));
    if (fs.existsSync(assetPath)) {
      fs.rmSync(assetPath, { force: true });
      console.log(`Asset excluido del APK Android: ${relativeAssetPath}`);
    }
  }

  const serviceWorkerPath = path.join(webDir, "sw.js");
  if (!fs.existsSync(serviceWorkerPath)) return;

  let source = readText(serviceWorkerPath);
  const previous = source;
  for (const relativeAssetPath of androidExcludedWebAssets) {
    const assetUrl = `/${relativeAssetPath}`;
    source = source.replace(
      new RegExp(`\\{url:"${escapeRegExp(assetUrl)}",revision:"[^"]+"\\},?`, "g"),
      ""
    );
  }

  if (source !== previous) {
    writeText(serviceWorkerPath, source);
    console.log("Service worker Android ajustado sin assets excluidos.");
  }
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
  throw new Error("No se encontró npm-cli.js junto a la instalación actual de Node.");
};

const resolveCapacitorCliPath = () => {
  const bundled = path.join(rootDir, "node_modules", "@capacitor", "cli", "bin", "capacitor");
  if (fs.existsSync(bundled)) {
    return bundled;
  }
  throw new Error("No se encontró la CLI local de Capacitor en node_modules.");
};

const getWindowsDriveRoots = () => {
  const roots = [];
  for (let i = 67; i <= 90; i++) {
    const root = `${String.fromCharCode(i)}:\\`;
    if (fs.existsSync(root)) {
      roots.push(root);
    }
  }
  return roots;
};

const resolveDriveApkDir = () => {
  const explicit = process.env.COTIDIE_APK_DRIVE_DIR;
  if (explicit) {
    return {
      dir: explicit,
      source: "env",
      isDrivePath: true,
    };
  }

  const homeDir = process.env.USERPROFILE || process.env.HOME || "";
  const knownFolderCandidates = [
    path.join(homeDir, "My Drive", "Cotidie", "APK Installer"),
    path.join(homeDir, "Mi unidad", "Cotidie", "APK Installer"),
    path.join(homeDir, "Google Drive", "My Drive", "Cotidie", "APK Installer"),
    path.join(homeDir, "Google Drive", "Mi unidad", "Cotidie", "APK Installer"),
  ];

  for (const candidate of knownFolderCandidates) {
    if (candidate && fs.existsSync(candidate)) {
      return {
        dir: candidate,
        source: "google-drive-known-folder",
        isDrivePath: true,
      };
    }
  }

  for (const root of getWindowsDriveRoots()) {
    const driveCandidates = [
      path.join(root, "My Drive", "Cotidie", "APK Installer"),
      path.join(root, "Mi unidad", "Cotidie", "APK Installer"),
    ];
    for (const candidate of driveCandidates) {
      if (fs.existsSync(candidate)) {
        return {
          dir: candidate,
          source: "google-drive-mounted-volume",
          isDrivePath: true,
        };
      }
    }
  }

  return {
    dir: path.join(rootDir, "output", "apk-archive"),
    source: "local-fallback",
    isDrivePath: false,
  };
};

const ensureGitIndexUnlocked = () => {
  const lockPath = path.join(rootDir, ".git", "index.lock");
  if (!fs.existsSync(lockPath)) {
    return;
  }

  const stats = fs.statSync(lockPath);
  const stampedAt = new Date(stats.mtimeMs).toLocaleString("es-CL");
  throw new Error(
    `Git está bloqueado por ${lockPath} (última modificación: ${stampedAt}). ` +
      "Cierra cualquier proceso git/editor pendiente, elimina ese archivo si quedó stale y vuelve a ejecutar el comando."
  );
};

const copyApkToDrive = (apkPath, version) => {
  const destination = resolveDriveApkDir();
  const driveDir = destination.dir;
  fs.mkdirSync(driveDir, { recursive: true });
  fs.accessSync(driveDir, fs.constants.W_OK);

  const driveApkPath = path.join(driveDir, `cotidie-installer-v${version}.apk`);
  const copyResult = copyFileWithStatus(apkPath, driveApkPath);
  const destinationLabel = destination.isDrivePath ? "Copia de Google Drive" : "Copia secundaria local";
  console.log(`${destinationLabel}: ${describeCopyStatus(copyResult.status)}.`);
  console.log(`Ruta: ${driveApkPath}`);

  if (!destination.isDrivePath) {
    console.warn(
      "No se detectó Google Drive. Define COTIDIE_APK_DRIVE_DIR para habilitar esa copia automática."
    );
  }

  return { path: driveApkPath, destination, copyResult };
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

console.log("\nCotidie - Generador de APK Android");
console.log(`Versión actual: v${current}`);
console.log(`Versión objetivo: v${nextVersion}`);
console.log(`Publicación Git: ${skipPush ? "omitida por --no-push" : "habilitada"}`);
console.log(`Copia secundaria: ${skipDrive ? "omitida por --no-drive" : "habilitada"}`);

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

logSection("[1/4] Compilación web");
runNodeScript(resolveNpmCliPath(), ["run", "build"], rootDir);
prepareAndroidWebAssets();

logSection("[2/4] Sincronización con Android");
runNodeScript(resolveCapacitorCliPath(), ["sync", "android"], rootDir);

logSection("[3/4] Ensamblado release");
if (process.platform === "win32") {
  runBatchCommand("gradlew.bat assembleRelease", path.join(rootDir, "android"));
} else {
  runCommand("./gradlew", ["assembleRelease"], path.join(rootDir, "android"));
}

const apkDir = path.join(rootDir, "android", "app", "build", "outputs", "apk", "release");
const srcApk = path.join(apkDir, "app-release.apk");
if (!fs.existsSync(srcApk)) {
  throw new Error("No se encontró app-release.apk.");
}

logSection("[4/4] Publicación del APK");
const outputFileName = `cotidie-installer-v${nextVersion}.apk`;
const dstApk = path.join(rootDir, outputFileName);
const removedApks = [];

try {
  const files = fs.readdirSync(rootDir);
  for (const file of files) {
    const isInstallerApk = file.startsWith("cotidie-installer-v") && file.endsWith(".apk");
    if (isInstallerApk && file !== outputFileName) {
      fs.unlinkSync(path.join(rootDir, file));
      removedApks.push(file);
    }
  }
} catch (error) {
  console.warn(`No se pudieron limpiar todos los APK anteriores: ${error.message}`);
}

console.log(
  removedApks.length > 0
    ? `APKs anteriores eliminados (${removedApks.length}): ${removedApks.join(", ")}`
    : "APKs anteriores: no había archivos que limpiar."
);

const localCopyResult = copyFileWithStatus(srcApk, dstApk);
console.log(`APK local: ${describeCopyStatus(localCopyResult.status)}.`);
console.log(`Ruta: ${dstApk}`);
const secondaryCopy = skipDrive ? null : copyApkToDrive(dstApk, nextVersion);
if (skipDrive) {
  console.log("Copia secundaria omitida por --no-drive.");
}

let gitStatus = skipPush ? "omitida por --no-push" : "pendiente";
if (skipPush) {
  console.log("Publicación Git omitida; el APK se generó normalmente.");
}

if (!skipPush) {
  logSection("Publicación Git");
  try {
    const gitCommand = resolveGitCommand();
    runCommand(gitCommand, ["add", "-A", "--", "."], rootDir);

    const stagedResult = spawnSync(gitCommand, ["diff", "--cached", "--quiet"], {
      cwd: rootDir,
      stdio: "ignore",
      env: buildCommandEnv(),
      shell: false,
    });
    if (stagedResult.error) {
      throw stagedResult.error;
    }

    let commitCreated = false;
    if (stagedResult.status === 1) {
      runCommand(gitCommand, ["commit", "-m", `Auto-deploy: Build v${nextVersion}`], rootDir);
      commitCreated = true;
    } else if (stagedResult.status === 0) {
      console.log("Commit: no había cambios nuevos para registrar.");
    } else {
      throw new Error(`No se pudo comprobar el índice de Git (código ${stagedResult.status}).`);
    }

    console.log("Ejecutando git push...");
    runCommand(gitCommand, ["push"], rootDir);
    gitStatus = commitCreated ? "commit creado y push completado" : "sin commit nuevo; push verificado";
    console.log(`Publicación Git: ${gitStatus}.`);
  } catch (error) {
    gitStatus = `fallida: ${error.message}`;
    console.error(`Publicación Git fallida: ${error.message}`);
    console.error("El APK ya está disponible; Git puede sincronizarse manualmente después.");
  }
}

logSection("Resumen");
console.log(`Versión: v${nextVersion}`);
console.log(`Tamaño: ${formatBytes(localCopyResult.size)}`);
console.log(`SHA-256: ${localCopyResult.sha256}`);
console.log(`APK local: ${dstApk}`);
console.log(
  secondaryCopy ? `Copia secundaria: ${secondaryCopy.path} (${describeCopyStatus(secondaryCopy.copyResult.status)})` : "Copia secundaria: omitida"
);
console.log(`Git: ${gitStatus}`);
console.log(`Duración total: ${formatDuration(Date.now() - buildStartedAt)}`);
