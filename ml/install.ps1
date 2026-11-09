param (
    [Parameter(Mandatory=$false, Position=0, ValueFromRemainingArguments=$true)]
    [string[]]$packages,

    [Alias("u")]
    [switch]$Uninstall,

    [switch]$Dev
)

$venv=Join-Path $PSScriptRoot "venv"
$python=Join-Path $venv "Scripts\python.exe"

# Throw rather than exit, so a dot-sourced run does not close the terminal.
function Invoke-Checked {
    param([string]$file, [string[]]$arguments)

    & $file @arguments

    if ($LASTEXITCODE -ne 0) {
        throw "Command failed: $file $($arguments -join ' ')"
    }
}

if (-not (Test-Path $python)) {
    Write-Host "Creating virtual environment..." -ForegroundColor Cyan
    Invoke-Checked "python" @("-m", "venv", $venv)
}

Invoke-Checked $python @("-m", "pip", "install", "--upgrade", "pip", "--quiet")

if ($packages.Count -gt 0) {
    $action=if ($Uninstall) { "uninstall" } else { "install" }
    $extra=if ($Uninstall) { @("-y") } else { @() }

    foreach ($package in $packages) {
        Write-Host "${action}: $package" -ForegroundColor Yellow
        Invoke-Checked $python (@("-m", "pip", $action, $package, "--quiet")+$extra)
    }
} elseif ($Uninstall) {
    Write-Host "Provide package names to uninstall. Example: .\install.ps1 -u <package-name>" -ForegroundColor Yellow
} else {
    $file=if ($Dev) { "requirements-dev.txt" } else { "requirements.txt" }

    Write-Host "Installing $file..." -ForegroundColor Gray
    Invoke-Checked $python @("-m", "pip", "install", "-r", (Join-Path $PSScriptRoot $file), "--quiet")
}

. (Join-Path $venv "Scripts\Activate.ps1")
Write-Host "Done. If the venv is not active in your terminal, run .\venv\Scripts\Activate.ps1" -ForegroundColor Green
