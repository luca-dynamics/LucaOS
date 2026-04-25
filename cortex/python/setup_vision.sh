#!/bin/bash
echo "[BOOT] [PROGRESS:5] Initializing Universal Setup Service..."

# 1. Platform Detection
OS_TYPE="$(uname)"
echo "[BOOT] Detected OS: $OS_TYPE"

# 2. Path Resolution
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"
# Standardized Venv (Project Local)
VENV_DIR="$SCRIPT_DIR/venv"

echo "[BOOT] Target Environment: $VENV_DIR"

# 3. Verify Python 3.10+ (Preferred 3.11/3.12 Stable)
echo "[BOOT] [PROGRESS:10] Verifying Python 3.10+..."
if command -v python3.11 &> /dev/null; then
    echo "[BOOT] Found Python 3.11 (Recommended Stable)"
    export PYTHON_CMD="python3.11"
elif command -v python3.12 &> /dev/null; then
    echo "[BOOT] Found Python 3.12 (Stable)"
    export PYTHON_CMD="python3.12"
elif [ -f "/Library/Frameworks/Python.framework/Versions/3.13/bin/python3" ]; then
    echo "[BOOT] [WARN] Found Python 3.13 (Experimental/May be unstable)"
    export PYTHON_CMD="/Library/Frameworks/Python.framework/Versions/3.13/bin/python3"
elif command -v python3.10 &> /dev/null; then
    export PYTHON_CMD="python3.10"
else
    if command -v brew &> /dev/null; then
        echo "[BOOT] [WARN] Python 3.10+ missing. Attempting Homebrew injection..."
        brew install python@3.11
        export PYTHON_CMD="python3.11"
    else
        echo "[BOOT] [ERROR] Python 3.10+ not found and Homebrew unavailable."
        exit 1
    fi
fi

# 4. Create Virtual Environment
if [ -d "$VENV_DIR" ]; then
    VENV_PYTHON_VER=$("$VENV_DIR/bin/python" --version 2>/dev/null | awk '{print $2}')
    TARGET_VER=$("$PYTHON_CMD" --version | awk '{print $2}')
    
    if [[ "$VENV_PYTHON_VER" != "${TARGET_VER}"* ]]; then
        echo "[BOOT] [WARN] Venv version mismatch (Existing: $VENV_PYTHON_VER, Target: $TARGET_VER). Purging..."
        rm -rf "$VENV_DIR"
    fi
fi

if [ ! -d "$VENV_DIR" ]; then
    echo "[BOOT] [PROGRESS:20] Provisioning new Virtual Environment for Python $TARGET_VER..."
    mkdir -p "$(dirname "$VENV_DIR")"
    "$PYTHON_CMD" -m venv "$VENV_DIR"
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
    echo "[BOOT] [PROGRESS:40] Stage 1: Core System Utilities..."
    "$VENV_DIR/bin/pip" install python-multipart fastapi uvicorn networkx "numpy<2" flask-cors google-genai google-generativeai python-dotenv pyautogui websockets requests nest_asyncio
    
    echo "[BOOT] [PROGRESS:50] Stage 2: Neural Foundation (Torch & Transformers)..."
    "$VENV_DIR/bin/pip" install torch transformers accelerate bitsandbytes huggingface_hub
    
    echo "[BOOT] [PROGRESS:70] Stage 3: Local Perception (Whisper & TTS)..."
    "$VENV_DIR/bin/pip" install "faster-whisper>=1.1.0" piper-tts soundfile
    
    echo "[BOOT] [PROGRESS:85] Stage 4: Experimental Cortex (Kokoro & Moshi)..."
    "$VENV_DIR/bin/pip" install kokoro moshi
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
