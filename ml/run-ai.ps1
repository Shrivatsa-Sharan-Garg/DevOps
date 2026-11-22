[CmdletBinding()]
param(
    [switch]$Retrain
)

$ErrorActionPreference = "Stop"
$mlRoot = $PSScriptRoot
$venv = Join-Path $mlRoot "venv"
$python = Join-Path $venv "Scripts\python.exe"
$requirements = Join-Path $mlRoot "requirements.txt"
$envFile = Join-Path $mlRoot ".env"
$envExample = Join-Path $mlRoot ".env.example"

function Fail([string]$Message) {
    Write-Host $Message -ForegroundColor Red
    exit 1
}

function Invoke-Python([string[]]$Arguments) {
    & $python @Arguments
    if ($LASTEXITCODE -ne 0) {
        Fail "Command failed: python $($Arguments -join ' ') (exit $LASTEXITCODE)."
    }
}

Set-Location $mlRoot

if (-not (Test-Path $requirements)) { Fail "Missing dependency file: $requirements" }
if (-not (Test-Path $envFile)) {
    Copy-Item -LiteralPath $envExample -Destination $envFile
    Write-Host "Created ml/.env from ml/.env.example."
}

if (-not (Test-Path $python)) {
    $pythonCommand = Get-Command py -ErrorAction SilentlyContinue
    if ($pythonCommand) {
        $created = $false
        foreach ($version in @("-3.13", "-3.12")) {
            & $pythonCommand.Source $version -m venv $venv
            if ($LASTEXITCODE -eq 0) { $created = $true; break }
        }
        if (-not $created) { Fail "Install CPython 3.12 or 3.13, then run .\run-ai.ps1 again." }
    } else {
        $systemPython = Get-Command python -ErrorAction SilentlyContinue
        if (-not $systemPython) { Fail "Python 3.12 or 3.13 is required. Install it and run .\run-ai.ps1 again." }
        & $systemPython.Source -m venv $venv
        if ($LASTEXITCODE -ne 0) { Fail "Could not create the virtual environment at $venv." }
    }
}

$versionText = & $python -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')"
if ($LASTEXITCODE -ne 0 -or $versionText.Trim() -notin @("3.12", "3.13")) {
    Fail "The ml virtual environment must use CPython 3.12 or 3.13; found '$versionText'. Recreate it with a supported Python version."
}

$dependenciesReady = $true
& $python -c "import fastapi, httpx, joblib, numpy, pydantic_settings, pymongo, sklearn, sentence_transformers, simplemma, torch, uvicorn" 2>$null
if ($LASTEXITCODE -ne 0) { $dependenciesReady = $false }
if (-not $dependenciesReady) {
    Write-Host "Installing missing Python dependencies (first setup needs internet access)..." -ForegroundColor Yellow
    & $python -m pip install -r $requirements
    if ($LASTEXITCODE -ne 0) { Fail "Dependency installation failed. Check the Python version and package index access." }
    & $python -c "import fastapi, httpx, joblib, numpy, pydantic_settings, pymongo, sklearn, sentence_transformers, simplemma, torch, uvicorn"
    if ($LASTEXITCODE -ne 0) { Fail "Required packages are still unavailable after installation." }
}

$modelPath = $env:MINILM_MODEL_PATH
if ([string]::IsNullOrWhiteSpace($modelPath)) { $modelPath = $env:MODEL_PATH }
if ([string]::IsNullOrWhiteSpace($modelPath)) {
    foreach ($line in Get-Content -LiteralPath $envFile) {
        if ($line -match '^\s*(MINILM_MODEL_PATH|MODEL_PATH)\s*=\s*(.*)$') {
            $modelPath = $Matches[2].Trim().Trim('"').Trim("'")
        }
    }
}
if ([string]::IsNullOrWhiteSpace($modelPath)) {
    Fail "Set MINILM_MODEL_PATH in ml/.env to the downloaded paraphrase-MiniLM-L6-v2 folder."
}
if (-not (Test-Path -LiteralPath $modelPath -PathType Container)) {
    Fail "MiniLM folder not found: '$modelPath'. Set MINILM_MODEL_PATH in ml/.env to the actual downloaded model directory."
}
$env:MINILM_MODEL_PATH = (Resolve-Path -LiteralPath $modelPath).Path
$env:HF_HUB_OFFLINE = "1"
$env:TRANSFORMERS_OFFLINE = "1"

Write-Host "Verifying local MiniLM weights and batch inference..." -ForegroundColor Cyan
Invoke-Python @("-m", "nlp.verify_local_model")

$artifactCheck = 0
if (-not $Retrain) {
    & $python -m nlp.classifier.train_model --check
    $artifactCheck = $LASTEXITCODE
    if ($artifactCheck -gt 2) { Fail "Could not inspect the ANN artifact (exit $artifactCheck)." }
}
if ($Retrain -or $artifactCheck -eq 2) {
    Write-Host "Training a MiniLM-compatible ANN with grouped validation..." -ForegroundColor Cyan
    Invoke-Python @("-m", "nlp.classifier.train_model", "--no-feedback")
}
Invoke-Python @("-m", "nlp.classifier.train_model", "--check")

$stdoutPath = Join-Path $env:TEMP "devbridge-ai-uvicorn-$PID.out.log"
$stderrPath = Join-Path $env:TEMP "devbridge-ai-uvicorn-$PID.err.log"
$server = Start-Process -FilePath $python -ArgumentList @("-m", "uvicorn", "backend.main:app", "--host", "127.0.0.1", "--port", "8000") -WorkingDirectory $mlRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath
$ready = $false
for ($attempt = 0; $attempt -lt 40; $attempt++) {
    $server.Refresh()
    if ($server.HasExited) { break }
    try {
        $response = Invoke-WebRequest -Uri "http://127.0.0.1:8000/docs" -TimeoutSec 2 -UseBasicParsing
        if ($response.StatusCode -eq 200) { $ready = $true; break }
    } catch { Start-Sleep -Milliseconds 500 }
}
if (-not $ready) {
    if (-not $server.HasExited) { Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue }
    $logPaths = @($stdoutPath,$stderrPath)
    $details = ($logPaths | Where-Object { Test-Path $_ } | ForEach-Object { Get-Content -LiteralPath $_ -Tail 25 }) -join [Environment]::NewLine
    Fail "FastAPI did not become ready. Logs: $stdoutPath and $stderrPath`n$details"
}

Write-Host "DevBridge AI backend is running at http://127.0.0.1:8000/docs (PID $($server.Id))." -ForegroundColor Green
Write-Host "ANN checkpoint: $mlRoot\nlp\classifier\artifact_mlp_model.pkl"
Write-Host "Training report: $mlRoot\nlp\classifier\training_report.json"
