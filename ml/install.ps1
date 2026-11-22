param (
    [Parameter(Mandatory=$false, Position=0, ValueFromRemainingArguments=$true)]
    [string[]]$packages,

    [Alias("u")]
    [switch]$Uninstall,

    [switch]$Test
)

$PytestVersion="9.2.0"
$venv=Join-Path $PSScriptRoot "venv"
$python=Join-Path $venv "Scripts\python.exe"
$activate=Join-Path $venv "Scripts\Activate.ps1"
$reqPath=Join-Path $PSScriptRoot "requirements.txt"
$dotSourced=$MyInvocation.InvocationName -eq "."

function Stop-Install {
    param([string]$message)

    Write-Host $message -ForegroundColor Red

    if ($dotSourced) {
        throw $message
    }

    exit 1
}

function Invoke-Checked {
    param([string]$file, [string[]]$arguments)

    & $file @arguments

    if ($LASTEXITCODE -ne 0) {
        Stop-Install "Failed: $file $($arguments -join ' ')"
    }
}

function Test-UsablePython {
    param([string]$exePath, [string[]]$prefixArgs = @())

    if ([string]::IsNullOrWhiteSpace($exePath) -or (-not (Test-Path $exePath))) {
        return $null
    }

    try {
        $versionText = & $exePath @prefixArgs -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}')" 2>$null
        if ($LASTEXITCODE -eq 0 -and $versionText) {
            return [PSCustomObject]@{
                Exe        = $exePath
                PrefixArgs = $prefixArgs
                Version    = [version]($versionText.Trim().Split()[0])
                RawVersion = $versionText.Trim()
            }
        }
    } catch {
        # Ignore non-working candidate
    }

    return $null
}

function Find-LatestUsablePython {
    $candidates = @()

    $explicitPaths = @(
        "C:\Program Files\Python313\python.exe",
        "C:\Program Files\Python312\python.exe",
        (Join-Path $env:LOCALAPPDATA "Programs\Python\Python313\python.exe"),
        (Join-Path $env:LOCALAPPDATA "Programs\Python\Python312\python.exe")
    )

    foreach ($p in $explicitPaths) {
        $info = Test-UsablePython -exePath $p
        if ($info) { $candidates += $info }
    }

    $pyCmd = Get-Command py -ErrorAction SilentlyContinue
    if ($pyCmd) {
        foreach ($ver in @("-3.13", "-3.12", "-3")) {
            $info = Test-UsablePython -exePath $pyCmd.Source -prefixArgs @($ver)
            if ($info) { $candidates += $info }
        }
    }

    $pythonCmd = Get-Command python -ErrorAction SilentlyContinue
    if ($pythonCmd) {
        $info = Test-UsablePython -exePath $pythonCmd.Source
        if ($info) { $candidates += $info }
    }

    $candidates = @($candidates | Where-Object { $_.Version -ge [version]"3.12" -and $_.Version -lt [version]"3.14" })
    if ($candidates.Count -eq 0) {
        return $null
    }

    return ($candidates | Sort-Object Version -Descending | Select-Object -First 1)
}

function New-CleanVenv {
    param($pyInfo, [string]$targetVenv)

    if (Test-Path $targetVenv) {
        Stop-Install "The existing virtual environment at $targetVenv is not usable. It was left untouched; move or remove it manually, then retry."
    }

    Write-Host "Creating virtual environment using Python $($pyInfo.RawVersion) in $targetVenv" -ForegroundColor Cyan
    $venvArgs = @()
    if ($pyInfo.PrefixArgs.Count -gt 0) {
        $venvArgs += $pyInfo.PrefixArgs
    }
    $venvArgs += @("-m", "venv", $targetVenv)

    Invoke-Checked $pyInfo.Exe $venvArgs
}

$selectedPython = Find-LatestUsablePython
if (-not $selectedPython) {
    Stop-Install "No usable Python 3.12 or 3.13 interpreter was found on this device."
}

if (Test-Path $python) {
    Write-Host "Using existing virtual environment in $venv" -ForegroundColor Gray
    & $python -c "import sys; sys.exit(0)" 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Existing virtual environment is broken or points to a missing Python binary." -ForegroundColor Yellow
        New-CleanVenv -pyInfo $selectedPython -targetVenv $venv
    }
} else {
    New-CleanVenv -pyInfo $selectedPython -targetVenv $venv
}

& $python -m pip install --upgrade pip --quiet
if ($LASTEXITCODE -ne 0) {
    Write-Host "pip check failed in existing venv; recreating with Python $($selectedPython.RawVersion)..." -ForegroundColor Yellow
    New-CleanVenv -pyInfo $selectedPython -targetVenv $venv
    Invoke-Checked $python @("-m", "pip", "install", "--upgrade", "pip", "--quiet")
}

if ($packages.Count -gt 0) {
    $action=if ($Uninstall) { "uninstall" } else { "install" }
    $extra=if ($Uninstall) { @("-y") } else { @() }

    foreach ($package in $packages) {
        Write-Host "${action}: $package" -ForegroundColor Yellow
        Invoke-Checked $python (@("-m", "pip", $action, $package, "--quiet") + $extra)
    }

    Write-Host "Package installed. Add intentional runtime dependencies to requirements.txt so fresh setups receive them." -ForegroundColor Green

} elseif ($Uninstall) {
    Stop-Install "Provide package names to uninstall. Example: .\install.ps1 -u <package-name>"
} else {
    if (-not (Test-Path $reqPath)) { Stop-Install "requirements.txt not found at $reqPath." }
    Write-Host "Installing dependencies from requirements.txt" -ForegroundColor Gray
    Invoke-Checked $python @("-m", "pip", "install", "-r", $reqPath, "--quiet")

    if ($Test) {
        Write-Host "Installing pytest $PytestVersion" -ForegroundColor Gray
        Invoke-Checked $python @("-m", "pip", "install", "pytest==$PytestVersion", "--quiet")
    }
}

if ($dotSourced) {
    . $activate
    Write-Host "Done. The virtual environment is active in this terminal." -ForegroundColor Green
} else {
    Write-Host "Done. Activate the virtual environment with:" -ForegroundColor Green
    Write-Host "    & `"$activate`""
}
