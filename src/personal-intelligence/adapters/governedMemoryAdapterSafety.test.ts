import { describe, expect, it } from "vitest";

const adapterSources = import.meta.glob("./*.ts", {
  eager: true,
  import: "default",
  query: "?raw",
}) as Record<string, string>;

const settingsSources = import.meta.glob("../../components/settings/**/*.tsx", {
  eager: true,
  import: "default",
  query: "?raw",
}) as Record<string, string>;

function productionSources(sources: Record<string, string>) {
  return Object.entries(sources).filter(([file]) => !file.includes(".test."));
}

describe("governed memory adapter source safety", () => {
  it("keeps legacy memoryService access at the governed execution boundary or injected", () => {
    const productionAdapterSources = productionSources(adapterSources);
    const saveCallFiles = productionAdapterSources
      .filter(([, source]) => /memoryService\.saveMemory\s*\(/.test(source))
      .map(([file]) => file.split("/").pop());
    const memoryServiceImportFiles = productionAdapterSources
      .filter(([, source]) => /services\/memoryService/.test(source))
      .map(([file]) => file.split("/").pop());

    expect(saveCallFiles).toEqual(["governedMemoryAdapter.ts"]);
    expect(memoryServiceImportFiles).toEqual([]);
  });

  it("does not import LucaLink or perform storage, network, filesystem, database, or IPC operations", () => {
    for (const [, source] of productionSources(adapterSources)) {
      expect(source).not.toMatch(
        /from\s+["'][^"']*lucaLink|import\([^)]*lucaLink/i,
      );
      expect(source).not.toMatch(/\blocalStorage\b/);
      expect(source).not.toMatch(/\bfetch\s*\(/);
      expect(source).not.toMatch(/from\s+["'](?:node:)?fs["']/);
      expect(source).not.toMatch(/\b(?:indexedDB|sqlite|database)\b/i);
      expect(source).not.toMatch(/\b(?:ipcRenderer|ipcMain|electron)\b/);
    }
  });

  it("does not let Settings components call memoryService.saveMemory", () => {
    for (const [, source] of productionSources(settingsSources)) {
      expect(source).not.toMatch(/memoryService\.saveMemory\s*\(/);
    }
  });
});
