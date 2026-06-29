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

# 3. Verify Python
Write-Host "[BOOT] [PROGRESS:10] Verifying Python 3.11+..."
$pythonCandidates = @(
    (Join-Path $VENV_DIR "Scripts\python.exe"),
    "$env:LOCALAPPDATA\Programs\Python\Python311\python.exe",
    "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe",
    "$env:ProgramFiles\Python311\python.exe",
    "$env:ProgramFiles\Python312\python.exe",
    "C:\Python311\python.exe",
    "C:\Python312\python.exe"
)

$pythonCommands = @("python3.11", "python3", "python")
foreach ($command in $pythonCommands) {
    $python = Get-Command $command -ErrorAction SilentlyContinue
    if ($python) {
        $pythonCandidates += $python.Source
    }
}

foreach ($candidate in $pythonCandidates) {
    if (!$candidate) {
        continue
    }
    if (([System.IO.Path]::IsPathRooted($candidate)) -and !(Test-Path $candidate)) {
        continue
    }

    $candidateVersionOutput = & $candidate -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')"
    if ($LASTEXITCODE -ne 0) {
        continue
    }

    $candidateVersion = [version]$candidateVersionOutput.Trim()
    if ($candidateVersion -ge [version]"3.11") {
        $pythonExe = $candidate
        $pythonVersion = $candidateVersion
        break
    }
}

if (!$pythonExe) {
    Write-Host "[BOOT] [ERROR] Python 3.11+ is required but not installed."
    Write-Host "[BOOT] Please install Python 3.11 or newer from python.org and ensure it's in your PATH."
    exit 1
}
Write-Host "[BOOT] Found Python $pythonVersion"

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
$setupMode = "boot"
$REQ_FILE = Join-Path $SCRIPT_DIR "requirements.boot.txt"
if ($args[0] -eq "--full") {
    $setupMode = "full"
    Write-Host "[BOOT] [PROGRESS:40] Installing High-Fidelity AI Dependencies (Full Reqs)..."
    Write-Host "[BOOT] This may take a few minutes depending on your connection."
    $REQ_FILE = Join-Path $SCRIPT_DIR "requirements.full.txt"
} elseif ($args[0] -eq "--pack") {
    $packName = $args[1]
    if (!$packName -or $packName -notmatch "^[a-z0-9-]+$") {
        Write-Host "[BOOT] [ERROR] Capability pack name is required."
        exit 1
    }
    $setupMode = "pack-$packName"
    $REQ_FILE = Join-Path $SCRIPT_DIR "requirements.pack.$packName.txt"
    if (!(Test-Path $REQ_FILE)) {
        Write-Host "[BOOT] [ERROR] Unknown capability pack: $packName"
        exit 1
    }
    Write-Host "[BOOT] [PROGRESS:40] Installing capability pack: $packName"
} else {
    Write-Host "[BOOT] [PROGRESS:40] Installing lightweight boot dependencies..."
}

& $PIP_EXE install -r $REQ_FILE
if ($LASTEXITCODE -ne 0) {
    Write-Host "[BOOT] [ERROR] Dependency installation failed. Check network connectivity."
    exit 1
}

Write-Host "[BOOT] [PROGRESS:90] Finalizing environment alignment..."
$MARKER_FILE = Join-Path $VENV_DIR ".luca-$setupMode-ready"
Set-Content -Path $MARKER_FILE -Value (Get-Date -Format o)
Write-Host "[BOOT] [SUCCESS] Provisioning Complete. Handing over to Luca Mainframe."
exit 0
