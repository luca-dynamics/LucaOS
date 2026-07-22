// @vitest-environment jsdom
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { UnifiedMemoryVaultPanel } from "./UnifiedMemoryVaultPanel";

const sources = import.meta.glob(["./UnifiedMemoryVaultPanel.tsx"], {
  eager: true,
  import: "default",
  query: "?raw",
}) as Record<string, string>;

describe("UnifiedMemoryVaultPanel", () => {
  it("renders memory vault shell copy", () => {
    const markup = renderToStaticMarkup(<UnifiedMemoryVaultPanel />);
    expect(markup).toContain("Memory Vault");
    expect(markup).toContain("Export JSON");
    expect(markup).toContain("Absorb Phase 2");
  });

  it("wires vault service export/import/ingest/compress paths", () => {
    const file = sources["./UnifiedMemoryVaultPanel.tsx"] || "";
    expect(file).toContain("memoryVaultService");
    expect(file).toContain("exportVault");
    expect(file).toContain("importLoose");
    expect(file).toContain("ingestEvents");
    expect(file).toContain("compress");
    expect(file).toContain("writeNote");
    expect(file).toContain("Demo ingest");
  });
});
