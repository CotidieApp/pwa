$ErrorActionPreference = "Stop"

$rootDir = Split-Path -Parent $PSScriptRoot
$androidDir = Join-Path $rootDir "android"
$localPropertiesPath = Join-Path $androidDir "local.properties"
$installPowerShellCommandsScript = Join-Path $PSScriptRoot "install-powershell-commands.ps1"

function Test-Command {
  param([Parameter(Mandatory = $true)][string]$Name)

  return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Install-WithWinget {
  param(
    [Parameter(Mandatory = $true)][string]$Id,
    [Parameter(Mandatory = $true)][string]$Label
  )

  if (-not (Test-Command "winget")) {
    throw "winget no esta disponible. Instala App Installer desde Microsoft Store o instala manualmente: $Label"
  }

  Write-Host ""
  Write-Host "==> Instalando o verificando $Label ($Id)"
  & winget install --id $Id --exact --source winget --accept-package-agreements --accept-source-agreements --silent
}

function Find-FirstExistingPath {
  param([Parameter(Mandatory = $true)][string[]]$Candidates)

  foreach ($candidate in $Candidates) {
    if ([string]::IsNullOrWhiteSpace($candidate)) {
      continue
    }

    if (Test-Path $candidate) {
      return $candidate
    }
  }

  return $null
}

function Find-JavaHome {
  $candidates = @(
    $env:JAVA_HOME,
    (Join-Path $env:ProgramFiles "Android\Android Studio\jbr"),
    (Join-Path ${env:ProgramFiles(x86)} "Android\Android Studio\jbr"),
    (Join-Path $env:LOCALAPPDATA "Programs\Android Studio\jbr")
  ) | Where-Object { $_ }

  return Find-FirstExistingPath -Candidates $candidates
}

function Find-AndroidSdkRoot {
  $candidates = @(
    $env:ANDROID_SDK_ROOT,
    $env:ANDROID_HOME,
    (Join-Path $env:LOCALAPPDATA "Android\Sdk"),
    (Join-Path $env:USERPROFILE "AppData\Local\Android\Sdk")
  ) | Where-Object { $_ }

  return Find-FirstExistingPath -Candidates $candidates
}

function Set-UserEnvironmentVariable {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$Value
  )

  $current = [Environment]::GetEnvironmentVariable($Name, "User")
  if ($current -ne $Value) {
    [Environment]::SetEnvironmentVariable($Name, $Value, "User")
    Write-Host "Variable de usuario actualizada: $Name=$Value"
  }

  Set-Item -Path "Env:$Name" -Value $Value
}

function Write-AndroidLocalProperties {
  param([Parameter(Mandatory = $true)][string]$SdkRoot)

  $escaped = $SdkRoot.Replace("\", "\\")
  Set-Content -Path $localPropertiesPath -Value "sdk.dir=$escaped" -Encoding ASCII
  Write-Host "Archivo generado: $localPropertiesPath"
}

Write-Host "Preparando entorno Windows para Cotidie en $rootDir"

Install-WithWinget -Id "OpenJS.NodeJS.LTS" -Label "Node.js LTS"
Install-WithWinget -Id "Git.Git" -Label "Git"
Install-WithWinget -Id "Google.AndroidStudio" -Label "Android Studio"
Install-WithWinget -Id "Microsoft.VisualStudioCode" -Label "Visual Studio Code"

$javaHome = Find-JavaHome
if ($javaHome) {
  Set-UserEnvironmentVariable -Name "JAVA_HOME" -Value $javaHome
} else {
  Write-Warning "No se detecto JAVA_HOME ni el JBR de Android Studio. Reinicia sesion o abre Android Studio una vez y vuelve a ejecutar este script."
}

$androidSdkRoot = Find-AndroidSdkRoot
if ($androidSdkRoot) {
  Set-UserEnvironmentVariable -Name "ANDROID_SDK_ROOT" -Value $androidSdkRoot
  Set-UserEnvironmentVariable -Name "ANDROID_HOME" -Value $androidSdkRoot
  Write-AndroidLocalProperties -SdkRoot $androidSdkRoot
} else {
  Write-Warning "No se detecto Android SDK. Abre Android Studio y completa la instalacion del SDK, luego vuelve a ejecutar este script para regenerar android/local.properties."
}

if (Test-Path $installPowerShellCommandsScript) {
  & $installPowerShellCommandsScript
} else {
  Write-Warning "No se encontro $installPowerShellCommandsScript para instalar los comandos de PowerShell."
}

Write-Host ""
Write-Host "Siguientes pasos sugeridos:"
Write-Host "1. Cierra y abre de nuevo la terminal para refrescar PATH."
Write-Host "2. Ejecuta: npm install"
Write-Host "3. Ejecuta: npx cap sync android"
Write-Host "4. Si compilaras Android, abre Android Studio al menos una vez para instalar SDK Platform y Build Tools."
Write-Host "5. Comandos de PowerShell: crear respaldo, crear imagenes"
