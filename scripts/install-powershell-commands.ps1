$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$homeDir = $env:USERPROFILE
$documentsDir = [Environment]::GetFolderPath("MyDocuments")

function Ensure-CurrentUserExecutionPolicy {
  $currentUserPolicy = Get-ExecutionPolicy -Scope CurrentUser
  if ($currentUserPolicy -in @("RemoteSigned", "Unrestricted", "Bypass")) {
    return
  }

  Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force
  Write-Host "ExecutionPolicy de CurrentUser ajustada a RemoteSigned para permitir perfiles y comandos de Cotidie."
}

$escapedProjectRoot = $projectRoot.Replace("'", "''")

$managedBlock = @"
# >>> Cotidie Commands >>>
function global:crear {
  [CmdletBinding()]
  param(
    [Parameter(Position = 0)]
    [string]`$Objetivo,

    [Parameter(Position = 1, ValueFromRemainingArguments = `$true)]
    [string[]]`$Argumentos
  )

  `$projectRoot = '$escapedProjectRoot'
  if (-not (Test-Path `$projectRoot)) {
    throw "No se encontró la carpeta del proyecto en `$projectRoot."
  }

  `$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
  if (-not `$nodeCommand) {
    throw "No se encontró 'node' en PATH. Instala Node.js o abre una terminal nueva."
  }

  `$normalizedTarget = if ([string]::IsNullOrWhiteSpace(`$Objetivo)) { "" } else { `$Objetivo.Trim().ToLowerInvariant() }

  switch (`$normalizedTarget) {
    "respaldo" {
      `$scriptPath = Join-Path `$projectRoot "scripts\create-backup.mjs"
      `$mappedArgs = @()

      if (`$Argumentos.Count -gt 0) {
        `$normalizedMode = if ([string]::IsNullOrWhiteSpace(`$Argumentos[0])) { "" } else { `$Argumentos[0].Trim().ToLowerInvariant() }
        switch (`$normalizedMode) {
          "documents" { `$mappedArgs += "--documents" }
          "documentos" { `$mappedArgs += "--documents" }
          "drive" { `$mappedArgs += "--drive" }
          "disco" { `$mappedArgs += "--disk" }
          "disk" { `$mappedArgs += "--disk" }
          "actual" { `$mappedArgs += "--disk" }
          "" { }
          default { throw "Modo no reconocido para respaldo. Usa: crear respaldo [drive|documentos|disco]" }
        }
      } else {
        `$mappedArgs += "--prompt"
      }

      & `$nodeCommand.Source `$scriptPath @mappedArgs
      if (`$LASTEXITCODE -ne 0) {
        return
      }
      return
    }
    "imagenes" {
      if (`$Argumentos.Count -gt 0) {
        throw "Uso: crear imágenes"
      }
      `$scriptPath = Join-Path `$projectRoot "scripts\create-images-archive.mjs"
      & `$nodeCommand.Source `$scriptPath
      if (`$LASTEXITCODE -ne 0) {
        return
      }
      return
    }
    "imágenes" {
      if (`$Argumentos.Count -gt 0) {
        throw "Uso: crear imágenes"
      }
      `$scriptPath = Join-Path `$projectRoot "scripts\create-images-archive.mjs"
      & `$nodeCommand.Source `$scriptPath
      if (`$LASTEXITCODE -ne 0) {
        return
      }
      return
    }
    default {
      throw "Uso: crear respaldo [drive|documentos|disco] | crear imágenes"
    }
  }
}
# <<< Cotidie Commands <<<
"@

$markerStart = "# >>> Cotidie Commands >>>"
$markerEnd = "# <<< Cotidie Commands <<<"
$markerPattern = "(?s)$([regex]::Escape($markerStart)).*?$([regex]::Escape($markerEnd))\r?\n?"

function Get-ProfileCandidates {
  $candidates = @(
    $PROFILE,
    $PROFILE.CurrentUserCurrentHost,
    $PROFILE.CurrentUserAllHosts
  )

  if (-not [string]::IsNullOrWhiteSpace($documentsDir)) {
    $candidates += @(
      (Join-Path $documentsDir "WindowsPowerShell\Microsoft.PowerShell_profile.ps1"),
      (Join-Path $documentsDir "WindowsPowerShell\profile.ps1"),
      (Join-Path $documentsDir "PowerShell\Microsoft.PowerShell_profile.ps1"),
      (Join-Path $documentsDir "PowerShell\profile.ps1")
    )
  }

  if (-not [string]::IsNullOrWhiteSpace($homeDir)) {
    foreach ($folderName in @("Documents", "Documentos")) {
      $candidateRoot = Join-Path $homeDir $folderName
      $candidates += @(
        (Join-Path $candidateRoot "WindowsPowerShell\Microsoft.PowerShell_profile.ps1"),
        (Join-Path $candidateRoot "WindowsPowerShell\profile.ps1"),
        (Join-Path $candidateRoot "PowerShell\Microsoft.PowerShell_profile.ps1"),
        (Join-Path $candidateRoot "PowerShell\profile.ps1")
      )
    }
  }

  return $candidates |
    Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
    Select-Object -Unique
}

function Update-ProfileFile {
  param([Parameter(Mandatory = $true)][string]$Path)

  $profileDir = Split-Path -Parent $Path
  if (-not (Test-Path $profileDir)) {
    New-Item -ItemType Directory -Path $profileDir -Force | Out-Null
  }

  $existingProfile = if (Test-Path $Path) {
    Get-Content -Path $Path -Raw
  } else {
    ""
  }

  $updatedProfile = if ([regex]::IsMatch($existingProfile, $markerPattern)) {
    [regex]::Replace($existingProfile, $markerPattern, $managedBlock + [Environment]::NewLine)
  } elseif ([string]::IsNullOrWhiteSpace($existingProfile)) {
    $managedBlock + [Environment]::NewLine
  } else {
    $existingProfile.TrimEnd() + [Environment]::NewLine + [Environment]::NewLine + $managedBlock + [Environment]::NewLine
  }

  Set-Content -Path $Path -Value $updatedProfile -Encoding UTF8
  Write-Host "Perfil actualizado: $Path"
}

Ensure-CurrentUserExecutionPolicy
Get-ProfileCandidates | ForEach-Object { Update-ProfileFile -Path $_ }

Write-Host "Comandos disponibles: crear respaldo, crear imágenes"
