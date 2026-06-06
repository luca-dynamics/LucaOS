import { describe, expect, it } from "vitest";

const previewSources = import.meta.glob("./*.tsx", {
  eager: true,
  import: "default",
  query: "?raw",
}) as Record<string, string>;

const forbiddenPatterns: Array<[string, RegExp]> = [
  [
    "Node filesystem",
    /(?:from|require\()\s*["'](?:node:)?fs(?:\/promises)?["']/,
  ],
  ["child process", /(?:from|require\()\s*["'](?:node:)?child_process["']/],
  ["socket client", /socket\.io-client/],
  ["network fetch", /\bfetch\s*\(/],
  ["local storage", /\blocalStorage\b/],
  ["session storage", /\bsessionStorage\b/],
  ["provider runtime", /services\/(?:provider|runtime)|ProviderRuntime/],
  ["model router", /ModelRouterService|setPreferredModel|updateModelRoute/],
  ["LucaLink runtime", /lucaLinkService|services\/lucaLink|\blucaLink\./],
  ["Electron IPC", /ipcRenderer|window\.luca|electronAPI/],
];

describe("Personal Intelligence preview source safety", () => {
  it("keeps every preview component presentational and side-effect free", () => {
    expect(Object.keys(previewSources).length).toBeGreaterThanOrEqual(10);
    for (const [file, source] of Object.entries(previewSources)) {
      for (const [boundary, pattern] of forbiddenPatterns) {
        expect(source, `${file} must not use ${boundary}`).not.toMatch(pattern);
      }
    }
  });
});
