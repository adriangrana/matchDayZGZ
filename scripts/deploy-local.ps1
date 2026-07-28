$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$RepositoryRoot = [System.IO.Path]::GetFullPath(
  (Join-Path $PSScriptRoot "..")
)
$DeployDirectory = [System.IO.Path]::GetFullPath(
  "C:\www\matchday-zgz"
)
$StagingDirectory = [System.IO.Path]::GetFullPath(
  "C:\www\matchday-zgz.__staging"
)
$PreviousDirectory = [System.IO.Path]::GetFullPath(
  "C:\www\matchday-zgz.__previous"
)
$StandaloneDirectory = Join-Path $RepositoryRoot "dist\standalone"
$ProcessName = "matchday-zgz"
$ApplicationUrl = "http://127.0.0.1:3100/"
$RunaraWorkingDirectory = "C:\www"

function Assert-SafeDeploymentPath {
  param(
    [Parameter(Mandatory)]
    [string] $Path
  )

  $resolved = [System.IO.Path]::GetFullPath($Path)
  $allowed = @(
    "C:\www\matchday-zgz",
    "C:\www\matchday-zgz.__staging",
    "C:\www\matchday-zgz.__previous"
  )

  if ($resolved -notin $allowed) {
    throw "Ruta de despliegue no permitida: $resolved"
  }

  if ([System.IO.Path]::GetDirectoryName($resolved) -ne "C:\www") {
    throw "El despliegue debe permanecer dentro de C:\www."
  }
}

function Invoke-CheckedCommand {
  param(
    [Parameter(Mandatory)]
    [string] $Executable,

    [Parameter(ValueFromRemainingArguments)]
    [string[]] $Arguments
  )

  & $Executable @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Falló el comando: $Executable $($Arguments -join ' ')"
  }
}

function Move-DeploymentDirectory {
  param(
    [Parameter(Mandatory)]
    [string] $Source,

    [Parameter(Mandatory)]
    [string] $Destination
  )

  Assert-SafeDeploymentPath -Path $Source
  Assert-SafeDeploymentPath -Path $Destination

  for ($attempt = 1; $attempt -le 12; $attempt++) {
    try {
      Move-Item -LiteralPath $Source -Destination $Destination
      return
    }
    catch [System.IO.IOException] {
      if ($attempt -eq 12) {
        throw
      }
      Start-Sleep -Milliseconds 500
    }
  }
}

function Start-RunaraDashboard {
  Push-Location $RunaraWorkingDirectory
  try {
    Invoke-CheckedCommand runara dashboard start
  }
  finally {
    Pop-Location
  }
}

Assert-SafeDeploymentPath -Path $DeployDirectory
Assert-SafeDeploymentPath -Path $StagingDirectory
Assert-SafeDeploymentPath -Path $PreviousDirectory

Push-Location $RepositoryRoot
try {
  Invoke-CheckedCommand npm run build
}
finally {
  Pop-Location
}

if (-not (Test-Path -LiteralPath $StandaloneDirectory)) {
  throw "Vinext no generó dist\standalone."
}

foreach ($temporaryPath in @($StagingDirectory, $PreviousDirectory)) {
  if (Test-Path -LiteralPath $temporaryPath) {
    Assert-SafeDeploymentPath -Path $temporaryPath
    Remove-Item -LiteralPath $temporaryPath -Recurse -Force
  }
}

New-Item -ItemType Directory -Path $StagingDirectory | Out-Null
Get-ChildItem -LiteralPath $StandaloneDirectory -Force |
  Copy-Item -Destination $StagingDirectory -Recurse -Force

$sourceCache = Join-Path $RepositoryRoot ".cache"
$deployedCache = Join-Path $DeployDirectory ".cache"
if (Test-Path -LiteralPath $sourceCache) {
  Copy-Item -LiteralPath $sourceCache `
    -Destination (Join-Path $StagingDirectory ".cache") `
    -Recurse `
    -Force
}
if (Test-Path -LiteralPath $deployedCache) {
  Copy-Item -LiteralPath $deployedCache `
    -Destination (Join-Path $StagingDirectory ".cache") `
    -Recurse `
    -Force
}

$localEnvironment = Join-Path $RepositoryRoot ".env.local"
if (Test-Path -LiteralPath $localEnvironment) {
  Copy-Item -LiteralPath $localEnvironment `
    -Destination (Join-Path $StagingDirectory ".env.local") `
    -Force
}

@"
@echo off
set "PORT=3100"
set "HOST=127.0.0.1"
node --env-file-if-exists=.env.local server.js
"@ | Set-Content `
  -LiteralPath (Join-Path $StagingDirectory "run.cmd") `
  -Encoding ascii

& runara info $ProcessName *> $null
$processExists = $LASTEXITCODE -eq 0
$dashboardStatus = (& runara dashboard status 2>&1 | Out-String)
$dashboardWasRunning = $dashboardStatus -match "Dashboard server running"

if ($processExists) {
  Invoke-CheckedCommand runara stop $ProcessName
  Start-Sleep -Milliseconds 750
}
if ($dashboardWasRunning) {
  Invoke-CheckedCommand runara dashboard stop
  Start-Sleep -Milliseconds 750
}

$deploymentSwapped = $false
try {
  if (Test-Path -LiteralPath $DeployDirectory) {
    Move-DeploymentDirectory `
      -Source $DeployDirectory `
      -Destination $PreviousDirectory
  }

  Move-DeploymentDirectory `
    -Source $StagingDirectory `
    -Destination $DeployDirectory
  $deploymentSwapped = $true

  if ($processExists) {
    Invoke-CheckedCommand runara set $ProcessName `
      --command "run.cmd" `
      --cwd $DeployDirectory `
      --autorestart `
      --autostart
    Invoke-CheckedCommand runara start $ProcessName
  }
  else {
    Invoke-CheckedCommand runara run "run.cmd" `
      --name $ProcessName `
      --cwd $DeployDirectory `
      --max-restarts 10 `
      --restart-delay 2000 `
      --min-uptime 3000
  }

  $healthy = $false
  for ($attempt = 1; $attempt -le 15; $attempt++) {
    Start-Sleep -Seconds 1
    try {
      $response = Invoke-WebRequest `
        -Uri $ApplicationUrl `
        -UseBasicParsing `
        -TimeoutSec 5
      if ($response.StatusCode -eq 200) {
        $healthy = $true
        break
      }
    }
    catch {
      if ($attempt -eq 15) {
        throw
      }
    }
  }

  if (-not $healthy) {
    throw "La aplicación no respondió correctamente en $ApplicationUrl"
  }

  if (Test-Path -LiteralPath $PreviousDirectory) {
    Assert-SafeDeploymentPath -Path $PreviousDirectory
    Remove-Item -LiteralPath $PreviousDirectory -Recurse -Force
  }

  if ($dashboardWasRunning) {
    Start-RunaraDashboard
  }

  Write-Host ""
  Write-Host "Despliegue local completado."
  Write-Host "Carpeta: $DeployDirectory"
  Write-Host "Proceso: $ProcessName"
  Write-Host "URL: $ApplicationUrl"
}
catch {
  if ($processExists) {
    & runara stop $ProcessName *> $null
  }

  if ($deploymentSwapped -and (Test-Path -LiteralPath $DeployDirectory)) {
    Assert-SafeDeploymentPath -Path $DeployDirectory
    Remove-Item -LiteralPath $DeployDirectory -Recurse -Force
  }

  if (Test-Path -LiteralPath $PreviousDirectory) {
    Move-DeploymentDirectory `
      -Source $PreviousDirectory `
      -Destination $DeployDirectory
    if ($processExists) {
      & runara set $ProcessName `
        --command "run.cmd" `
        --cwd $DeployDirectory `
        --autorestart `
        --autostart *> $null
      & runara start $ProcessName *> $null
    }
  }

  if ($dashboardWasRunning) {
    Start-RunaraDashboard
  }

  throw
}
