// @vitest-environment node
import { readFileSync } from "node:fs";
import { transformSync } from "esbuild";
import { describe, expect, it } from "vitest";

/**
 * Behavioural tests cannot catch this class of bug: Vitest provides `require`,
 * while the Vite/Electron renderer bundle does not (nodeIntegration: false).
 * A module that reaches for `require` therefore passes every unit test and
 * fails only in the shipped app — which is how the Memory Vault came to read
 * an always-empty archive while still persisting over it, destroying memories.
 *
 * This asserts the property that actually matters: what ships must not use
 * `require`. Node builtins stay reachable through static/dynamic ESM imports.
 */
const MODULES_THAT_RUN_IN_THE_RENDERER = [
  "./MemoryVaultService.ts",
  "./memoryVaultProductBridge.ts",
  "./memoryVaultIngest.ts",
  "./memoryVaultCompress.ts",
  "./memoryVaultImportFormats.ts",
  "./MemoryTierMapping.ts",
  "./MemoryAdapters.ts",
];

describe("memory vault bundle safety", () => {
  it.each(MODULES_THAT_RUN_IN_THE_RENDERER)(
    "%s emits no bare require()",
    (relativePath) => {
      const source = readFileSync(
        new URL(relativePath, import.meta.url),
        "utf8",
      );
      const { code } = transformSync(source, { loader: "ts", format: "esm" });
      expect(code).not.toMatch(/\brequire\s*\(/);
    },
  );
});
