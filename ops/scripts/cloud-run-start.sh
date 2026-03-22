#!/bin/bash
set -e

echo "[BOOT] Booting LUCA Cloud Environment..."

# 1. Google Cloud Storage FUSE Mount (Optional but Highly Recommended)
# Cloud Run sets the $BUCKET environment variable if the user configured one
if [ -n "$BUCKET" ]; then
    echo "[FUSE] Mounting GCS Bucket '$BUCKET' to /root/.luca/data for persistent memory..."
    # Create the mount point
    mkdir -p /root/.luca/data
    # Mount the bucket using gcsfuse
    # We use implicit credentials provided by the Cloud Run service account
    gcsfuse --implicit-dirs $BUCKET /root/.luca/data
    echo "[FUSE] Mount complete. Memories will be persistent."
else
    echo "[WARNING] No \$BUCKET environment variable provided."
    echo "[WARNING] Running with ephemeral storage. Memories will be LOST on restart."
fi

# 2. Configure Ports for Dual-Service Setup
# Cloud Run expects the application to listen on $PORT (usually 8080)
# We will make Node.js listen on $PORT and Python listen on 8000 internally.
export SERVER_PORT="${PORT:-8080}"
export CORTEX_PORT=8000
export CORTEX_URL="http://127.0.0.1:8000"

echo "[BOOT] Starting Python Cortex on internal port $CORTEX_PORT..."
# Start the Python Cortex in the background
# Make sure the virtual environment is active
source /opt/venv/bin/activate
# Correct path for the specialized LUCA Python Brain
if [ -f "cortex/python/cortex.py" ]; then
    echo "[BOOT] Starting specialized LUCA Brain (cortex.py)..."
    python3 cortex/python/cortex.py &
elif [ -f "core.py" ]; then
    python3 core.py &
elif [ -f "server/main.py" ]; then
    uvicorn server.main:app --host 127.0.0.1 --port $CORTEX_PORT &
else
    # Fallback if I can't find the exact python entrypoint right now
    echo "[WARNING] Python entrypoint unclear, attempting to run module..."
    python3 -m agent.main --port $CORTEX_PORT &
fi
CORTEX_PID=$!
cd /opt/luca

echo "[BOOT] Waiting for Cortex to initialize..."
sleep 5 # Give Python a few seconds to boot up models

echo "[BOOT] Starting Node.js API Gateway on public port $SERVER_PORT..."
# Start Node.js in the foreground. This process will keep the container alive.
# It receives external traffic and routes /api/memory etc. to itself,
# and /vision or vector requests back to Cortex on 8000.
npm run server

# If Node exits, the container stops.
