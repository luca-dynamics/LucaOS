#!/bin/bash
# L.U.C.A Cortex Build Service
# This script freezes the Python backend into a standalone native binary for production use.

echo "--- 🧠 CORTEX FREEZE INITIATED ---"

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"
VENV_DIR="$PROJECT_ROOT/cortex/python/venv"

# 1. Activate Environment
if [ ! -d "$VENV_DIR" ]; then
    echo "[BUILD] [ERROR] Dev venv missing at $VENV_DIR. Run setup_vision.sh first."
    exit 1
fi
source "$VENV_DIR/bin/activate"

# 2. Install PyInstaller
echo "[BUILD] Ensuring builder tools (PyInstaller)..."
pip install pyinstaller &> /dev/null

# 3. Freeze Cortex
echo "[BUILD] Compiling Cortex into standalone binary..."
cd "$PROJECT_ROOT/cortex/python"

# We use --collect-all lightrag to ensure all graph templates and prompts are included
pyinstaller --onefile \
    --name cortex \
    --clean \
    --collect-all lightrag \
    --hidden-import sentence_transformers \
    --hidden-import model2vec \
    --hidden-import networkx \
    cortex.py

if [ $? -eq 0 ]; then
    echo "--- ✅ BUILD SUCCESSFUL ---"
    echo "Binary location: $PROJECT_ROOT/cortex/python/dist/cortex"
    echo "Next steps:"
    echo "1. Run 'npm run electron:build'"
else
    echo "--- ❌ BUILD FAILED ---"
    exit 1
fi
