import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), "");

  return {
    optimizeDeps: {
      include: ["debug", "ajv", "ajv-formats"],
      exclude: [
        "@modelcontextprotocol/sdk",
        "eventsource",
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
    base: "./",
    server: {
      port: 3000,
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
          "src/mocks/node_polyfills.js",
        ),
      },
    },
    define: {
      // Safely shim globals and process for browser compatibility
      global: "window",
      "process.platform": JSON.stringify(process.platform),
      "process.env": {
        GEMINI_API_KEY: env.GEMINI_API_KEY || env.VITE_API_KEY || env.API_KEY || "",
        VITE_API_KEY: env.VITE_API_KEY || env.GEMINI_API_KEY || env.API_KEY || "",
        API_KEY: env.API_KEY || env.GEMINI_API_KEY || env.VITE_API_KEY || "",
        OPENAI_API_KEY: env.VITE_OPENAI_API_KEY || env.OPENAI_API_KEY || "",
        ANTHROPIC_API_KEY: env.VITE_ANTHROPIC_API_KEY || env.ANTHROPIC_API_KEY || "",
        VITE_OPENAI_API_KEY: env.VITE_OPENAI_API_KEY || env.OPENAI_API_KEY || "",
        VITE_ANTHROPIC_API_KEY: env.VITE_ANTHROPIC_API_KEY || env.ANTHROPIC_API_KEY || "",
      },
      // Flattened keys for libraries that use direct injection
      __LUCA_DEV_MODE__: JSON.stringify(mode === "development" || env.VITE_DEV_MODE === "true"),
      "process.env.GEMINI_API_KEY": JSON.stringify(
        env.GEMINI_API_KEY || env.VITE_API_KEY || env.API_KEY || "",
      ),
      "process.env.VITE_API_KEY": JSON.stringify(
        env.VITE_API_KEY || env.GEMINI_API_KEY || env.API_KEY || "",
      ),
      "process.env.API_KEY": JSON.stringify(
        env.API_KEY || env.GEMINI_API_KEY || env.VITE_API_KEY || "",
      ),
      "process.env.OPENAI_API_KEY": JSON.stringify(
        env.VITE_OPENAI_API_KEY || env.OPENAI_API_KEY || "",
      ),
      "process.env.ANTHROPIC_API_KEY": JSON.stringify(
        env.VITE_ANTHROPIC_API_KEY || env.ANTHROPIC_API_KEY || "",
      ),
      "process.env.VITE_OPENAI_API_KEY": JSON.stringify(
        env.VITE_OPENAI_API_KEY || env.OPENAI_API_KEY || "",
      ),
      "process.env.VITE_ANTHROPIC_API_KEY": JSON.stringify(
        env.VITE_ANTHROPIC_API_KEY || env.ANTHROPIC_API_KEY || "",
      ),
    },
    // Expose environment variables to import.meta.env (Vite's native way)
    envPrefix: ["VITE_", "API_", "GEMINI_"],
    build: {
      target: "esnext",
      minify: false,
      rollupOptions: {
        external: [
          // Exclude server-only tools from mobile/browser builds
          /src\/services\/integrations\/ingestor/,
          "@modelcontextprotocol/sdk",
          "eventsource",
          "whatsapp-web.js",
          "robotjs",
          "playwright",
          "better-sqlite3",
          "electron",
          "express",
          "ccxt",
        ],
      },
    },
  };
});
