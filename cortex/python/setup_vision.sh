#!/bin/bash
echo "[BOOT] [PROGRESS:5] Initializing Universal Setup Service..."

# 1. Platform Detection
OS_TYPE="$(uname)"
echo "[BOOT] Detected OS: $OS_TYPE"

# 2. Path Resolution
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"
# Standardized Production Venv (~/.luca/python/venv)
VENV_DIR="$HOME/.luca/python/venv"

echo "[BOOT] Target Environment: $VENV_DIR"

# 3. Verify Python 3.11
echo "[BOOT] [PROGRESS:10] Verifying Python 3.11..."
if ! command -v python3.11 &> /dev/null; then
    if command -v brew &> /dev/null; then
        echo "[BOOT] [WARN] Python 3.11 missing. Attempting Homebrew injection..."
        brew install python@3.11
    else
        echo "[BOOT] [ERROR] Python 3.11 not found and Homebrew unavailable."
        exit 1
    fi
fi

# 4. Create Virtual Environment
if [ ! -d "$VENV_DIR" ]; then
    echo "[BOOT] [PROGRESS:20] Provisioning new Virtual Environment..."
    mkdir -p "$HOME/.luca/python"
    python3.11 -m venv "$VENV_DIR"
    if [ $? -ne 0 ]; then
        echo "[BOOT] [ERROR] Venv creation failed."
        exit 1
    fi
fi

# 5. Upgrade pip
echo "[BOOT] [PROGRESS:30] Optimizing package manager (pip)..."
"$VENV_DIR/bin/pip" install --upgrade pip &> /dev/null

# 6. Install Dependencies
if [ "$1" == "--full" ]; then
    echo "[BOOT] [PROGRESS:40] Installing High-Fidelity AI Dependencies (Full Reqs)..."
    echo "[BOOT] This may take a few minutes depending on your connection."
    "$VENV_DIR/bin/pip" install -r "$SCRIPT_DIR/requirements.full.txt"
else
    echo "[BOOT] [PROGRESS:40] Installing Lightweight Cloud Dependencies..."
    "$VENV_DIR/bin/pip" install -r "$SCRIPT_DIR/requirements.txt"
fi

if [ $? -ne 0 ]; then
    echo "[BOOT] [ERROR] Dependency installation failed. Check network connectivity."
    exit 1
fi

echo "[BOOT] [PROGRESS:90] Finalizing environment alignment..."
echo "[BOOT] [SUCCESS] Provisioning Complete. Handing over to Luca Mainframe."
exit 0
