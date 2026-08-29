$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

# Preserve the Runara dashboard during deployments. The core deployment script
# still manages the application and sync processes normally; only dashboard
# status/start/stop calls are intercepted so the dashboard remains untouched.
#
# Resolve the Windows command shim explicitly. `Get-Command runara` may return
# both `runara.cmd` and the extensionless shim, which turns `.Source` into an
# array and makes PowerShell try to execute both paths as a single command.
$RunaraCommand = Get-Command runara.cmd -CommandType Application -ErrorAction Stop |
  Select-Object -First 1
$RunaraExecutable = $RunaraCommand.Source
if (-not $RunaraExecutable) {
  throw "No se pudo localizar el ejecutable de Runara."
}

function runara {
  param(
    [Parameter(ValueFromRemainingArguments)]
    [string[]] $Arguments
  )

  if (
    $Arguments.Count -ge 2 -and
    $Arguments[0] -eq "dashboard"
  ) {
    if ($Arguments[1] -eq "status") {
      # The core script only uses this output to decide whether it should stop
      # and later restart the dashboard. Reporting it as unmanaged keeps the
      # dashboard running without changing any application-process behavior.
      Write-Output "Dashboard preserved during deployment"
      $global:LASTEXITCODE = 0
      return
    }

    if ($Arguments[1] -eq "stop" -or $Arguments[1] -eq "start") {
      $global:LASTEXITCODE = 0
      return
    }
  }

  & $RunaraExecutable @Arguments
  $exitCode = $LASTEXITCODE
  $global:LASTEXITCODE = $exitCode
}

. (Join-Path $PSScriptRoot "deploy-local.ps1")

# The core deploy creates the sync runner with a conservative six-hour sports
# cadence. Replace only that runner after a successful deployment so results can
# refresh quickly around kick-off while remaining low-volume outside match windows.
$AdaptiveSyncRunner = "C:\www\matchday-zgz\sync-runner.mjs"
@'
const baseUrl = process.env.MATCHDAY_SYNC_BASE_URL || "http://127.0.0.1:3100";
const secret = process.env.MATCHDAY_SYNC_SECRET;
const newsMinutes = Math.max(5, Number(process.env.NEWS_CACHE_MINUTES || 30));

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
    intervalMs: 5 * 60_000,
  },
];

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function nextInterval(task, payload) {
  if (
    task.name === "sports" &&
    Number.isFinite(Number(payload?.nextSportsSyncSeconds))
  ) {
    const seconds = Math.max(
      60,
      Math.min(6 * 60 * 60, Number(payload.nextSportsSyncSeconds)),
    );
    return seconds * 1_000;
  }
  return task.intervalMs;
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
    const nextText =
      task.name === "sports" && Number.isFinite(Number(payload.nextSportsSyncSeconds))
        ? ` · próxima en ${payload.nextSportsSyncSeconds}s`
        : "";
    console.log(
      `[sync-runner] ${task.name} actualizado en ${Date.now() - startedAt} ms · ${payload.syncedAt}${nextText}`,
    );
    return payload;
  } catch (error) {
    console.error(
      `[sync-runner] ${task.name}: ${error instanceof Error ? error.message : "error desconocido"}`,
    );
    return undefined;
  }
}

async function runTask(task) {
  while (true) {
    const payload = await synchronize(task);
    await wait(nextInterval(task, payload));
  }
}

await Promise.all(tasks.map(runTask));
'@ | Set-Content -LiteralPath $AdaptiveSyncRunner -Encoding utf8

if (Test-RunaraProcess -Name "matchday-zgz-sync") {
  Invoke-CheckedCommand runara stop "matchday-zgz-sync"
  Start-Sleep -Milliseconds 350
  Invoke-CheckedCommand runara start "matchday-zgz-sync"
}
