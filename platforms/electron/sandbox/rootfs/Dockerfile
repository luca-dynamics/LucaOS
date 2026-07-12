FROM node:22-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates git python3 util-linux \
    && useradd --create-home --uid 1000 --shell /usr/sbin/nologin luca \
    && mkdir -p /workspace \
    && chown luca:luca /workspace \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace
USER luca
