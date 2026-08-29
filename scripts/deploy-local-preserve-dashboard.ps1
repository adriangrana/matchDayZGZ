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
