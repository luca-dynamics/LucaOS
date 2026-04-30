# Luca AI OS - Windows Provisioning Script
Write-Host "[BOOT] [PROGRESS:5] Initializing Universal Setup Service..."

# 1. Platform Check
Write-Host "[BOOT] Detected OS: Windows"

# 2. Path Resolution
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$PROJECT_ROOT = Split-Path -Parent (Split-Path -Parent $SCRIPT_DIR)
# Standardized Production Venv (~/.luca/python/venv)
$VENV_DIR = Join-Path $HOME ".luca\python\venv"

Write-Host "[BOOT] Target Environment: $VENV_DIR"

# 3. Verify Python 3.11
Write-Host "[BOOT] [PROGRESS:10] Verifying Python 3.11..."
$python = Get-Command python3.11 -ErrorAction SilentlyContinue
if (!$python) {
    Write-Host "[BOOT] [WARN] Python 3.11 not found in PATH. Checking common locations..."
    # Common Windows Install Paths
    $searchPaths = @(
        "$env:LOCALAPPDATA\Programs\Python\Python311\python.exe",
        "$env:ProgramFiles\Python311\python.exe",
        "C:\Python311\python.exe"
    )
    foreach ($path in $searchPaths) {
        if (Test-Path $path) {
            $pythonExe = $path
            break
        }
    }
} else {
    $pythonExe = $python.Source
}

if (!$pythonExe) {
    Write-Host "[BOOT] [ERROR] Python 3.11 is required but not installed."
    Write-Host "[BOOT] Please install Python 3.11 from python.org and ensure it's in your PATH."
    exit 1
}

# 4. Create Virtual Environment
if (!(Test-Path $VENV_DIR)) {
    Write-Host "[BOOT] [PROGRESS:20] Provisioning new Virtual Environment..."
    New-Item -ItemType Directory -Path (Join-Path $HOME ".luca\python") -Force | Out-Null
    & $pythonExe -m venv $VENV_DIR
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[BOOT] [ERROR] Venv creation failed."
        exit 1
    }
}

$PIP_EXE = Join-Path $VENV_DIR "Scripts\pip.exe"

# 5. Upgrade pip
Write-Host "[BOOT] [PROGRESS:30] Optimizing package manager (pip)..."
& $PIP_EXE install --upgrade pip --quiet

# 6. Install Dependencies
$REQ_FILE = Join-Path $SCRIPT_DIR "requirements.txt"
if ($args[0] -eq "--full") {
    Write-Host "[BOOT] [PROGRESS:40] Installing High-Fidelity AI Dependencies (Full Reqs)..."
    Write-Host "[BOOT] This may take a few minutes depending on your connection."
    $REQ_FILE = Join-Path $SCRIPT_DIR "requirements.full.txt"
} else {
    Write-Host "[BOOT] [PROGRESS:40] Installing Lightweight Cloud Dependencies..."
}

& $PIP_EXE install -r $REQ_FILE
if ($LASTEXITCODE -ne 0) {
    Write-Host "[BOOT] [ERROR] Dependency installation failed. Check network connectivity."
    exit 1
}

Write-Host "[BOOT] [PROGRESS:90] Finalizing environment alignment..."
Write-Host "[BOOT] [SUCCESS] Provisioning Complete. Handing over to Luca Mainframe."
exit 0
