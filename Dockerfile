# ==========================================
# LUCA OS FULL BACKEND DOCKERFILE
# ==========================================
# This Dockerfile packages both the Node.js API (Relay/Core)
# and the Python Cortex (Memory/AI) into a single container
# optimized for Google Cloud Run with Cloud Storage FUSE.

FROM ubuntu:22.04

# Prevent interactive prompts during apt-get
ENV DEBIAN_FRONTEND=noninteractive

# ==========================================
# 1. INSTALL SYSTEM DEPENDENCIES & FUSE
# ==========================================
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    lsb-release \
    tini \
    bash \
    jq \
    python3 \
    python3-pip \
    python3-venv \
    ffmpeg \
    libsm6 \
    libxext6 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Google Cloud Storage FUSE (for persistent memory in Cloud Run)
RUN lsb_release -c -s > /tmp/lsb_release && \
    export GCSFUSE_REPO=gcsfuse-`cat /tmp/lsb_release` && \
    echo "deb https://packages.cloud.google.com/apt $GCSFUSE_REPO main" | tee /etc/apt/sources.list.d/gcsfuse.list && \
    curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key add - && \
    apt-get update && \
    apt-get install -y gcsfuse && \
    rm -rf /var/lib/apt/lists/*

# Install Node.js 20.x
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g npm@latest pm2

# ==========================================
# 2. SETUP WORKSPACE & PERMISSIONS
# ==========================================
ENV LUCA_HOME=/opt/luca
WORKDIR $LUCA_HOME

# Create the mount point for Google Cloud Storage FUSE
# This is where all persistent data (~/.luca/data) will live
RUN mkdir -p /root/.luca/data

# ==========================================
# 3. PYTHON CORTEX SETUP
# ==========================================
# Copy requirements first to leverage Docker cache
COPY cortex/agent/requirements.txt ./cortex/agent/

# Set up virtual environment and install dependencies
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r cortex/agent/requirements.txt

# Install Playwright browsers (Required for OSINT/Web Scraping)
RUN python -m playwright install --with-deps chromium

# ==========================================
# 4. NODE CORE SETUP
# ==========================================
COPY package.json package-lock.json* ./
# We only want production dependencies for the Node server to keep the image small
# We also use --omit=optional to skip desktop-only native binaries for Linux
RUN npm ci --omit=dev --omit=optional --legacy-peer-deps

# ==========================================
# 5. COPY SOURCE CODE
# ==========================================
COPY . .

# Build the frontend (so the Express server can serve the mobile/API fallback if needed)
RUN npm run build

# ==========================================
# 6. CLOUD RUN & FUSE ENTRYPOINT
# ==========================================
# Ensure the startup script is executable
COPY ops/scripts/cloud-run-start.sh /usr/local/bin/cloud-run-start.sh
RUN chmod +x /usr/local/bin/cloud-run-start.sh

# Expose the single unified port for Google Cloud Run
# Cloud Run sets the $PORT environment variable automatically (usually 8080)
EXPOSE 8080

# Environment variables to unify the ports behind the proxy
ENV SERVER_PORT=8080
ENV CORTEX_PORT=8000
ENV NODE_ENV=production

# Use tini as the init process to handle signals gracefully
ENTRYPOINT ["/usr/bin/tini", "--"]

# Start the cluster
CMD ["/usr/local/bin/cloud-run-start.sh"]
