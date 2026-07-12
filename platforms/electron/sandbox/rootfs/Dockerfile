FROM node:22-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates git python3 util-linux \
    && mkdir -p /opt/luca-sandbox \
    && npm install --prefix /opt/luca-sandbox playwright@1.58.2 \
    && /opt/luca-sandbox/node_modules/.bin/playwright install --with-deps chromium \
    && useradd --create-home --uid 1000 --shell /usr/sbin/nologin luca \
    && mkdir -p /workspace \
    && chown luca:luca /workspace \
    && rm -rf /var/lib/apt/lists/*

COPY luca-browser.cjs /usr/local/bin/luca-browser
RUN chmod 0555 /usr/local/bin/luca-browser

WORKDIR /workspace
USER luca
