import { defineConfig, loadEnv } from "vite";
import { defineConfig as defineVitestConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Only load Vite-public variables. Server/provider secrets must never be read
  // into the browser build config or exposed via import.meta.env.
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const isVercelRelease =
    env.VITE_LUCA_RUNTIME_TARGET === "vercel" || process.env.VERCEL === "1";

  const publicProcessEnv = {
    NODE_ENV: mode === "production" ? "production" : "development",
    VITE_LUCA_RELEASE_TARGET: env.VITE_LUCA_RELEASE_TARGET || "",
    VITE_LUCA_RUNTIME_TARGET: env.VITE_LUCA_RUNTIME_TARGET || "",
    VITE_LUCA_API_URL: env.VITE_LUCA_API_URL || "",
    VITE_CLOUD_API_URL: env.VITE_CLOUD_API_URL || "",
    VITE_CLOUD_CORTEX_URL: env.VITE_CLOUD_CORTEX_URL || "",
    VITE_ENABLE_DESKTOP_RUNTIME: env.VITE_ENABLE_DESKTOP_RUNTIME || "",
    VITE_ENABLE_LOCAL_MODEL_SCAN: env.VITE_ENABLE_LOCAL_MODEL_SCAN || "",
    VITE_ENABLE_LOCAL_OLLAMA: env.VITE_ENABLE_LOCAL_OLLAMA || "",
    VITE_ENABLE_FILESYSTEM_MEMORY: env.VITE_ENABLE_FILESYSTEM_MEMORY || "",
    VITE_ENABLE_LUCALINK_NATIVE_CONTROL:
      env.VITE_ENABLE_LUCALINK_NATIVE_CONTROL || "",
    VITE_DEV_MODE: env.VITE_DEV_MODE || "",
  };

  return defineVitestConfig({
    optimizeDeps: {
      include: ["buffer", "debug", "ajv", "ajv-formats"],
      exclude: [
        "@modelcontextprotocol/sdk",
        "whatsapp-web.js",
        "robotjs",
        "playwright",
        "better-sqlite3",
        "electron",
        "express",
        "ccxt",
        "node-cron",
        "mqtt",
        "socket.io",
        "socket.io-client",
        "cheerio",
        "chokidar",
        "cross-spawn",
      ],
    },
    plugins: [
      react({
        jsxRuntime: "automatic",
      }),
    ],
    base: isVercelRelease ? "/" : "./",
    server: {
      port: Number(process.env.VITE_DEV_PORT || 3000),
      strictPort: true,
      host: "127.0.0.1",
      proxy: {
        "/api/agent": "http://127.0.0.1:8000", // Agent/AI → Cortex
        "/chat": "http://127.0.0.1:8000", // Chat/LLM → Cortex
        "/api": "http://127.0.0.1:3002", // General API → Node.js
      },
    },
    resolve: {
      alias: {
        "onnxruntime-web/wasm": path.resolve(
          __dirname,
          "node_modules/onnxruntime-web/dist/ort.wasm.min.mjs",
        ),
        "onnxruntime-web": path.resolve(
          __dirname,
          "node_modules/onnxruntime-web/dist/ort.min.mjs",
        ),
        eventsource: path.resolve(
          __dirname,
          "src/mocks/browser_eventsource.ts",
        ),
        three: "three",
        child_process: path.resolve(__dirname, "src/mocks/child_process.js"),
        "cross-spawn": path.resolve(__dirname, "src/mocks/child_process.js"),
        util: path.resolve(__dirname, "src/mocks/node_polyfills.js"),
        "node:util": path.resolve(__dirname, "src/mocks/node_polyfills.js"),
        fs: path.resolve(__dirname, "src/mocks/node_polyfills.js"),
        "node:fs": path.resolve(__dirname, "src/mocks/node_polyfills.js"),
        path: path.resolve(__dirname, "src/mocks/node_polyfills.js"),
        "node:path": path.resolve(__dirname, "src/mocks/node_polyfills.js"),
        crypto: path.resolve(__dirname, "src/mocks/node_polyfills.js"),
        "node:crypto": path.resolve(__dirname, "src/mocks/node_polyfills.js"),
        events: path.resolve(__dirname, "src/mocks/node_polyfills.js"),
        "node:events": path.resolve(__dirname, "src/mocks/node_polyfills.js"),
        module: path.resolve(__dirname, "src/mocks/node_polyfills.js"),
        "node:module": path.resolve(__dirname, "src/mocks/node_polyfills.js"),
        stream: path.resolve(__dirname, "src/mocks/node_polyfills.js"),
        "node:stream": path.resolve(__dirname, "src/mocks/node_polyfills.js"),
        timers: path.resolve(__dirname, "src/mocks/node_polyfills.js"),
        "node:timers": path.resolve(__dirname, "src/mocks/node_polyfills.js"),
        "node:process": path.resolve(__dirname, "src/mocks/node_polyfills.js"),
        os: path.resolve(__dirname, "src/mocks/node_polyfills.js"),
        "node:os": path.resolve(__dirname, "src/mocks/node_polyfills.js"),
        url: path.resolve(__dirname, "src/mocks/node_polyfills.js"),
        "node:url": path.resolve(__dirname, "src/mocks/node_polyfills.js"),
        "better-sqlite3": path.resolve(
          __dirname,
          "src/mocks/browser_better_sqlite3.ts",
        ),
      },
    },
    define: {
      // Safely shim globals and process for browser compatibility. This allowlist
      // intentionally excludes provider/API secrets such as OPENAI_API_KEY,
      // ANTHROPIC_API_KEY, GEMINI_API_KEY, API_KEY, and VITE_* secret variants.
      global: "window",
      "process.platform": JSON.stringify(process.platform),
      "process.env": publicProcessEnv,
      "process.env.NODE_ENV": JSON.stringify(publicProcessEnv.NODE_ENV),
      "process.env.VITE_LUCA_RELEASE_TARGET": JSON.stringify(
        publicProcessEnv.VITE_LUCA_RELEASE_TARGET,
      ),
      "process.env.VITE_LUCA_RUNTIME_TARGET": JSON.stringify(
        publicProcessEnv.VITE_LUCA_RUNTIME_TARGET,
      ),
      "process.env.VITE_LUCA_API_URL": JSON.stringify(
        publicProcessEnv.VITE_LUCA_API_URL,
      ),
      "process.env.VITE_CLOUD_API_URL": JSON.stringify(
        publicProcessEnv.VITE_CLOUD_API_URL,
      ),
      "process.env.VITE_CLOUD_CORTEX_URL": JSON.stringify(
        publicProcessEnv.VITE_CLOUD_CORTEX_URL,
      ),
      __LUCA_DEV_MODE__: JSON.stringify(
        mode === "development" || env.VITE_DEV_MODE === "true",
      ),
    },
    // Expose only allowlisted public client variables to import.meta.env.
    // Exact-name prefixes are used so VITE_* provider secret names are not
    // made available to browser code.
    envPrefix: [
      "VITE_LUCA_RELEASE_TARGET",
      "VITE_LUCA_RUNTIME_TARGET",
      "VITE_LUCA_APP_MODE",
      "VITE_LUCA_API_URL",
      "VITE_CLOUD_API_URL",
      "VITE_CLOUD_CORTEX_URL",
      "VITE_ENABLE_DESKTOP_RUNTIME",
      "VITE_ENABLE_LOCAL_MODEL_SCAN",
      "VITE_ENABLE_LOCAL_OLLAMA",
      "VITE_ENABLE_FILESYSTEM_MEMORY",
      "VITE_ENABLE_LUCALINK_NATIVE_CONTROL",
      "VITE_DEV_MODE",
      "VITE_WS_PORT",
      "VITE_CORTEX_URL",
      "VITE_AUTH_DOMAIN",
      "VITE_FRONTEND_PORT",
      "VITE_RELAY_SERVER_URL",
      "VITE_CORTEX_SERVER_URL",
      "VITE_OLLAMA_SERVER_URL",
    ],
    build: {
      target: "esnext",
      minify: false,
      rollupOptions: {
        external: [
          // Exclude server-only tools from mobile/browser builds
          /src\/services\/integrations\/ingestor/,
          "@modelcontextprotocol/sdk",
          "whatsapp-web.js",
          "robotjs",
          "playwright",
          "electron",
          "express",
          "ccxt",
        ],
      },
    },
    test: {
      setupFiles: ["./src/test/setup.ts"],
    },
  });
});
