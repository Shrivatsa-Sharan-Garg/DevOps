param (
    [Parameter(Mandatory=$false, Position=0, ValueFromRemainingArguments=$true)]
    [string[]]$packages,

    [Alias("u")]
    [switch]$Uninstall
)

# Ensure Virtual Environment exists
if (-not (Test-Path -Path "venv")) {
    Write-Host "venv not found. Creating virtual environment..." -ForegroundColor Cyan
    python -m venv venv
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to create venv." -ForegroundColor Red
        exit 1
    }
}

# Activate venv for the session
. .\venv\Scripts\Activate.ps1

python -m pip install --upgrade pip --quiet

if ($packages.Count -gt 0) {
    if ($Uninstall) {
        foreach ($pkg in $packages) {
            Write-Host "Removing: $pkg..." -ForegroundColor Red
            pip uninstall $pkg -y --quiet
        }
    } else {
        foreach ($pkg in $packages) {
            Write-Host "Installing: $pkg..." -ForegroundColor Yellow
            pip install $pkg --quiet
        }
    }
} else {
    if ($Uninstall) {
        Write-Host "Provide package names to uninstall. Example: .\install.ps1 -u <package-name>" -ForegroundColor Yellow
        exit 1
    }

    # One lightweight environment. AI runs at hosted providers, so no model packages are installed.
    Write-Host "Syncing backend requirements..." -ForegroundColor Gray
    pip install -r backend\requirements-dev.txt --quiet
}

Write-Host "Environment Synchronized and venv activated!" -ForegroundColor Green