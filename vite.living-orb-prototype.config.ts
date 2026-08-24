import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const root = path.dirname(fileURLToPath(import.meta.url));

// PROTOTYPE ONLY: bypass the production Vite graph for a fast visual check.
export default defineConfig({
  root,
  plugins: [react()],
  resolve: {
    alias: {
      "@luca/orb-design": path.resolve(
        root,
        "packages/luca-orb-design/src/index.ts",
      ),
    },
  },
  server: {
    host: "127.0.0.1",
    port: 4179,
    strictPort: true,
  },
  build: {
    outDir: path.resolve(root, "public/prototypes"),
    emptyOutDir: false,
    rollupOptions: {
      input: path.resolve(root, "src/prototypes/LivingOrbPrototype.tsx"),
      output: {
        entryFileNames: "living-orb-preview.js",
        chunkFileNames: "living-orb-[name].js",
        assetFileNames: ({ name }) => name?.endsWith(".css")
          ? "living-orb-preview.css"
          : "living-orb-[name][extname]",
      },
    },
  },
});
