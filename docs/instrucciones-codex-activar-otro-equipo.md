# Instrucciones Para Codex: Activar Cotidie En Otro Equipo

Usa esta guía cuando el usuario haya restaurado este repo o un ZIP de respaldo en otro equipo Windows y pida dejar el proyecto funcionando igual que aquí, pero sin instalar cosas innecesarias.

## Objetivo

- Dejar el proyecto listo para desarrollar y compilar.
- Corregir solo rutas locales y diferencias de entorno.
- Instalar solo lo que falte de verdad.

## Criterio General

- No asumas que las rutas de este equipo sirven en el otro.
- No confíes en `android/local.properties` restaurado desde backup sin revisarlo.
- No copies caches ni builds de otro equipo aunque existan en el ZIP.
- Evita instalar software extra: para trabajar y compilar, normalmente basta con `Node.js LTS`, `Git` y `Android Studio`.
- `Visual Studio Code` es opcional: instálalo solo si el usuario lo quiere o si hace falta un editor gráfico.

## Qué Mantener Y Qué Regenerar

Mantener si vino en el respaldo:

- Código fuente completo (`src`, `android`, `scripts`, `public`, etc.).
- `.env`, si existe.
- `android/app/my-release-key.keystore`, si existe.

Regenerar o verificar en el equipo nuevo:

- `android/local.properties`
- Variables `JAVA_HOME`, `ANDROID_SDK_ROOT` y `ANDROID_HOME`
- `node_modules`
- Sincronización de Capacitor (`npx cap sync android`)
- Perfil de PowerShell para reinstalar el comando `crear respaldo`, si el usuario quiere usarlo

## Hechos Del Repo Que Importan

- `scripts/setup-windows-dev.ps1` detecta o instala `Node.js LTS`, `Git`, `Android Studio` y `Visual Studio Code`, además de reescribir `android/local.properties`.
- `scripts/install-powershell-commands.ps1` instala en el perfil de PowerShell el comando `crear ...` y deja apuntado el path actual del repo, así que en otro equipo debe ejecutarse de nuevo.
- `android/app/build.gradle` ya referencia `my-release-key.keystore` dentro del repo. Si el archivo está presente, no hay que recrear la firma release.
- `android/app/build.gradle` tolera que no exista `google-services.json`; sin ese archivo la app puede compilar, pero las push notifications de Firebase no quedarán operativas.
- `npm install` ejecuta `postinstall`, así que también aplica los parches locales necesarios a dependencias.

## Flujo Recomendado

### 1. Confirmar que el respaldo quedó bien extraído

Verifica que existan al menos:

- `package.json`
- `src`
- `android`
- `scripts`
- `android/app/build.gradle`

Si también existe `android/app/my-release-key.keystore`, la firma release ya viajó con el proyecto.

### 2. Detectar lo que ya está instalado

Comprueba en terminal:

```powershell
node -v
npm -v
git --version
java -version
```

Además revisa si el SDK Android existe en alguno de estos lugares:

- Variable `ANDROID_SDK_ROOT`
- Variable `ANDROID_HOME`
- `%LOCALAPPDATA%\Android\Sdk`
- instalación de Android Studio con JBR

### 3. Instalar solo lo faltante

Si faltan herramientas base, instala solo estas:

- `Node.js LTS`
- `Git`
- `Android Studio`

`Visual Studio Code` no es obligatorio para activar el proyecto.

Si conviene usar el script del repo porque faltan varias cosas:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-windows-dev.ps1
```

Si no quieres que instale extras como `Visual Studio Code`, haz la instalación manual de lo faltante y sigue con los pasos locales de esta guía.

### 4. Arreglar rutas locales del SDK y Java

Nunca des por buena la ruta restaurada en `android/local.properties`.

Si el script anterior ya detectó el SDK, revisa que el archivo haya quedado con una ruta real del equipo nuevo.

Si necesitas corregirlo manualmente:

```powershell
$sdk = "$env:LOCALAPPDATA\Android\Sdk"
$escaped = $sdk.Replace('\', '\\')
Set-Content -Path .\android\local.properties -Value "sdk.dir=$escaped" -Encoding ASCII
```

Si además faltan variables de entorno:

```powershell
[Environment]::SetEnvironmentVariable("ANDROID_SDK_ROOT", $sdk, "User")
[Environment]::SetEnvironmentVariable("ANDROID_HOME", $sdk, "User")
```

Para `JAVA_HOME`, usa preferentemente el JBR de Android Studio si existe.

### 5. Instalar dependencias del proyecto

Desde la raíz del repo:

```powershell
npm install
```

No restaures `node_modules` desde otro equipo.

### 6. Sincronizar Capacitor Android

```powershell
npx cap sync android
```

### 7. Reinstalar los comandos de PowerShell del proyecto si el usuario los quiere

Haz esto si el usuario quiere volver a usar `crear respaldo` o `crear imágenes` desde cualquier terminal:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-powershell-commands.ps1
```

Esto es importante porque el perfil guarda la ruta actual del repo.

### 8. Validar que el proyecto quedó activo

Primero valida TypeScript y build web:

```powershell
.\node_modules\.bin\tsc.cmd --noEmit
npm.cmd run build
```

Luego valida Android. Si quieres aislar caches del equipo, usa homes locales dentro del repo:

```powershell
$env:ANDROID_USER_HOME = "$PWD\android\.android-user-home"
$env:GRADLE_USER_HOME = "$PWD\android\.gradle-user-home"
Set-Location .\android
.\gradlew.bat :app:processDebugResources :app:compileDebugJavaWithJavac
Set-Location ..
```

### 9. Verificación opcional de uso real

Para levantar la web:

```powershell
npm run dev
```

Para abrir Android:

- Abre la carpeta `android` en Android Studio, o
- usa `npx cap open android` si el entorno ya está listo

## Decisiones Que Codex Debe Tomar Sin Frenarse

- Si `android/local.properties` apunta a `C:\Users\balca\...`, cámbialo sin pedir permiso extra: es una ruta vieja.
- Si falta `node_modules`, ejecuta `npm install`.
- Si falta el SDK Android, instala Android Studio o guía la instalación del SDK; no intentes forzar compilación Android antes de eso.
- Si falta `google-services.json`, no bloquees la activación del proyecto: deja constancia de que solo afectará push notifications.
- Si `.env` existe, consérvalo. Si no existe o tiene claves vacías, no bloquees la activación salvo que el usuario pida específicamente funciones que dependan de esas claves.

## Resultado Esperado

El proyecto debe quedar, como mínimo, en este estado:

- `npm install` ejecutado sin errores fatales
- `npx cap sync android` ejecutado
- `android/local.properties` apuntando al SDK real del equipo nuevo
- `.\node_modules\.bin\tsc.cmd --noEmit` pasando
- `npm run build` pasando
- compilación Android de recursos y Java pasando si el SDK ya está instalado
