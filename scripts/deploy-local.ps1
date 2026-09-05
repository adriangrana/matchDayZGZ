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
$SyncProcessName = "matchday-zgz-sync"
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

function Test-RunaraProcess {
  param(
    [Parameter(Mandatory)]
    [string] $Name
  )

  $information = (& runara info $Name 2>&1 | Out-String)
  return (
    $information -notmatch "\[ERR\]" -and
    $information -match "(?m)^Name:\s+$([Regex]::Escape($Name))\s*$"
  )
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

$canvasPackageRoot = Join-Path $StagingDirectory "node_modules\@napi-rs"
New-Item -ItemType Directory -Path $canvasPackageRoot -Force | Out-Null
foreach ($canvasPackage in @("canvas", "canvas-win32-x64-msvc")) {
  $sourcePackage = Join-Path `
    $RepositoryRoot `
    "node_modules\@napi-rs\$canvasPackage"
  if (-not (Test-Path -LiteralPath $sourcePackage)) {
    throw "Falta la dependencia de runtime @napi-rs/$canvasPackage."
  }
  Copy-Item -LiteralPath $sourcePackage `
    -Destination (Join-Path $canvasPackageRoot $canvasPackage) `
    -Recurse `
    -Force
}

$pdfWorkerSource = Join-Path `
  $RepositoryRoot `
  "node_modules\pdfjs-dist\legacy\build\pdf.worker.mjs"
$pdfWorkerDestination = Join-Path `
  $StagingDirectory `
  "dist\server\assets\pdf.worker.mjs"
if (-not (Test-Path -LiteralPath $pdfWorkerSource)) {
  throw "Falta el worker de extracción de texto de PDF."
}
Copy-Item -LiteralPath $pdfWorkerSource `
  -Destination $pdfWorkerDestination `
  -Force

$sourceCache = Join-Path $RepositoryRoot ".cache"
$deployedCache = Join-Path $DeployDirectory ".cache"
# Preserve runtime-only entries first, then let the freshly synchronized source
# snapshot win. Reversing this order can restore stale fixtures during deploy.
if (Test-Path -LiteralPath $deployedCache) {
  Copy-Item -LiteralPath $deployedCache `
    -Destination (Join-Path $StagingDirectory ".cache") `
    -Recurse `
    -Force
}
if (Test-Path -LiteralPath $sourceCache) {
  Copy-Item -LiteralPath $sourceCache `
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

$deployedSyncSecret = Join-Path $DeployDirectory ".sync-secret"
$stagedSyncSecret = Join-Path $StagingDirectory ".sync-secret"
if (Test-Path -LiteralPath $deployedSyncSecret) {
  Copy-Item -LiteralPath $deployedSyncSecret `
    -Destination $stagedSyncSecret `
    -Force
}
else {
  $secretBytes = New-Object byte[] 32
  $random = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try {
    $random.GetBytes($secretBytes)
  }
  finally {
    $random.Dispose()
  }
  [System.IO.File]::WriteAllText(
    $stagedSyncSecret,
    [Convert]::ToBase64String($secretBytes)
  )
}

@"
@echo off
set "PORT=3100"
set "HOST=127.0.0.1"
set /p "MATCHDAY_SYNC_SECRET="<".sync-secret"
node --env-file-if-exists=.env.local server.js
"@ | Set-Content `
  -LiteralPath (Join-Path $StagingDirectory "run.cmd") `
  -Encoding ascii

@'
const baseUrl = process.env.MATCHDAY_SYNC_BASE_URL || "http://127.0.0.1:3100";
const secret = process.env.MATCHDAY_SYNC_SECRET;
const newsMinutes = Math.max(5, Number(process.env.NEWS_CACHE_MINUTES || 30));
const sportsHours = Math.max(
  1,
  Number(process.env.SPORTS_SYNC_INTERVAL_HOURS || 6),
);

if (!secret) {
  throw new Error("El secreto interno de sincronización no está disponible");
}

const tasks = [
  {
    name: "news",
    path: "/api/internal/news/sync",
    intervalMs: newsMinutes * 60_000,
  },
  {
    name: "sports",
    path: "/api/internal/sports/sync",
    intervalMs: sportsHours * 3_600_000,
  },
];

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function synchronize(task) {
  const startedAt = Date.now();
  try {
    const response = await fetch(`${baseUrl}${task.path}`, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(60_000),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok !== true) {
      throw new Error(
        typeof payload.error === "string"
          ? payload.error
          : `Respuesta HTTP ${response.status}`,
      );
    }
    console.log(
      `[sync-runner] ${task.name} actualizado en ${Date.now() - startedAt} ms · ${payload.syncedAt}`,
    );
  } catch (error) {
    console.error(
      `[sync-runner] ${task.name}: ${error instanceof Error ? error.message : "error desconocido"}`,
    );
  }
}

async function runTask(task) {
  await synchronize(task);
  while (true) {
    await wait(task.intervalMs);
    await synchronize(task);
  }
}

await Promise.all(tasks.map(runTask));
'@ | Set-Content `
  -LiteralPath (Join-Path $StagingDirectory "sync-runner.mjs") `
  -Encoding utf8

@"
@echo off
set /p "MATCHDAY_SYNC_SECRET="<"C:\www\matchday-zgz\.sync-secret"
node --env-file-if-exists=C:\www\matchday-zgz\.env.local C:\www\matchday-zgz\sync-runner.mjs
"@ | Set-Content `
  -LiteralPath (Join-Path $StagingDirectory "sync.cmd") `
  -Encoding ascii

$processExists = Test-RunaraProcess -Name $ProcessName
$syncProcessExists = Test-RunaraProcess -Name $SyncProcessName
$dashboardStatus = (& runara dashboard status 2>&1 | Out-String)
$dashboardWasRunning = $dashboardStatus -match "Dashboard server running"

$syncWasRunning = $false
if ($syncProcessExists) {
  $syncInfo = (& runara info $SyncProcessName 2>&1 | Out-String)
  $syncWasRunning = $syncInfo -match "Desired: started"
  Invoke-CheckedCommand runara stop $SyncProcessName
  Start-Sleep -Milliseconds 500
}
if ($processExists) {
  Invoke-CheckedCommand runara stop $ProcessName
  Start-Sleep -Milliseconds 750
}
if ($dashboardWasRunning) {
  Invoke-CheckedCommand runara dashboard stop
  Start-Sleep -Milliseconds 750
}

$deploymentSwapped = $false
$syncStarted = $false
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

  if ($syncProcessExists) {
    Invoke-CheckedCommand runara set $SyncProcessName `
      --command "C:\www\matchday-zgz\sync.cmd" `
      --cwd $RunaraWorkingDirectory `
      --autorestart `
      --autostart
    Invoke-CheckedCommand runara start $SyncProcessName
    $syncStarted = $true
  }
  else {
    Invoke-CheckedCommand runara run "C:\www\matchday-zgz\sync.cmd" `
      --name $SyncProcessName `
      --cwd $RunaraWorkingDirectory `
      --max-restarts 10 `
      --restart-delay 5000 `
      --min-uptime 3000 `
      --autostart
    $syncStarted = $true
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
  Write-Host "Sincronizador: $SyncProcessName"
  Write-Host "URL: $ApplicationUrl"
}
catch {
  if ($syncProcessExists -or $syncStarted) {
    & runara stop $SyncProcessName *> $null
  }
  if (-not $syncProcessExists -and $syncStarted) {
    & runara remove $SyncProcessName *> $null
  }
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
    if ($syncProcessExists -and $syncWasRunning) {
      & runara set $SyncProcessName `
        --command "C:\www\matchday-zgz\sync.cmd" `
        --cwd $RunaraWorkingDirectory `
        --autorestart `
        --autostart *> $null
      & runara start $SyncProcessName *> $null
    }
  }

  if ($dashboardWasRunning) {
    Start-RunaraDashboard
  }

  throw
}
