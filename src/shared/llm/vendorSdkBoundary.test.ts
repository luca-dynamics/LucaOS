/**
 * Invariant 4 boundary guard.
 *
 * "No code outside the provider layer may depend on a specific model vendor's
 * SDK or wire format." Two rules make that true, and both are the kind of thing
 * a later refactor undoes by accident:
 *
 *  1. `src/shared/llm/` describes the wire formats and imports no vendor SDK, so
 *     it stays importable from the renderer, the core, and a web build alike.
 *  2. In the core, each vendor SDK is constructed in exactly one adapter. Before
 *     RFC-0006 Stage 2 they were constructed in `tradingDebateService.js` — a
 *     *feature* service — which is precisely the breach this stage closes.
 *
 * The directories are read from disk rather than listed here, so a new file in
 * either one is covered the moment it lands. Paths go through
 * `process.getBuiltinModule('node:fs')`: `vite.config.ts` aliases `fs` to a
 * browser polyfill whose `readFileSync` returns `''`, which would make every
 * `not.toContain` below pass while proving nothing.
 *
 * Every pattern matches both quote styles. A single-quote-only search missed a
 * real double-quoted import while this stage was being scoped, and a boundary
 * test that a quote character can fool is not a boundary test.
 */

const { readFileSync, readdirSync } = process.getBuiltinModule("node:fs");

import { describe, expect, it } from "vitest";

const toPath = (relative: string) =>
  new URL(relative, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

const SHARED_DIR = toPath("./");
const CORE_LLM_DIR = toPath("../../../cortex/server/services/llm/");

const VENDOR_SDKS = [
  { specifier: "openai", pattern: /from\s+["']openai["']/ },
  { specifier: "@anthropic-ai/sdk", pattern: /from\s+["']@anthropic-ai\/sdk["']/ },
  { specifier: "@google/genai", pattern: /from\s+["']@google\/genai["']/ },
  {
    specifier: "@google/generative-ai",
    pattern: /from\s+["']@google\/generative-ai["']/,
  },
];

const VENDOR_SDK_PATTERNS = VENDOR_SDKS.map((sdk) => sdk.pattern);

const readSources = (dir: string) =>
  readdirSync(dir)
    .filter((name: string) => name.endsWith(".js"))
    .map((name: string) => ({
      name,
      source: readFileSync(dir + name, "utf8") as string,
    }));

describe("src/shared/llm is free of vendor SDKs", () => {
  const files = readSources(SHARED_DIR);

  it("reads real sources (guards against a vacuous assertion)", () => {
    expect(files.map((f) => f.name)).toEqual(
      expect.arrayContaining([
        "openaiWire.js",
        "anthropicWire.js",
        "geminiWire.js",
      ]),
    );
    for (const file of files) {
      expect(file.source.length).toBeGreaterThan(0);
    }
  });

  it("imports no model vendor's SDK", () => {
    for (const file of files) {
      for (const pattern of VENDOR_SDK_PATTERNS) {
        expect(
          pattern.test(file.source),
          `${file.name} must not import a vendor SDK`,
        ).toBe(false);
      }
    }
  });

  it("reads no ambient environment, so it stays portable across processes", () => {
    for (const file of files) {
      expect(file.source).not.toContain("process.env");
      expect(file.source).not.toContain("import.meta.env");
    }
  });
});

describe("the core constructs each vendor client in exactly one adapter", () => {
  const files = readSources(CORE_LLM_DIR);

  it("reads real sources (guards against a vacuous assertion)", () => {
    expect(files.map((f) => f.name)).toEqual(
      expect.arrayContaining([
        "anthropicAdapter.js",
        "credentialResolver.js",
        "geminiAdapter.js",
        "llmGateway.js",
        "openaiCompatibleAdapter.js",
      ]),
    );
  });

  it("maps every vendor SDK to a single importer", () => {
    const importers = Object.fromEntries(
      VENDOR_SDKS.map((sdk) => [
        sdk.specifier,
        files
          .filter((file) => sdk.pattern.test(file.source))
          .map((file) => file.name),
      ]),
    );

    expect(importers).toEqual({
      openai: ["openaiCompatibleAdapter.js"],
      "@anthropic-ai/sdk": ["anthropicAdapter.js"],
      "@google/genai": ["geminiAdapter.js"],
      // The renderer's Gemini SDK has no business in the core at all.
      "@google/generative-ai": [],
    });
  });

  it("keeps the gateway itself vendor-agnostic", () => {
    const gateway = files.find((file) => file.name === "llmGateway.js");

    for (const pattern of VENDOR_SDK_PATTERNS) {
      expect(pattern.test(gateway!.source)).toBe(false);
    }
  });
});

describe("tradingDebateService no longer speaks any vendor's wire", () => {
  const source = readFileSync(
    toPath("../../../cortex/server/services/tradingDebateService.js"),
    "utf8",
  ) as string;

  it("reads real source (guards against a vacuous assertion)", () => {
    expect(source).toContain("class DebateManager");
  });

  it("asks the gateway for a completion instead of constructing a client", () => {
    expect(source).toContain("llmGateway.completeText");
    expect(source).not.toContain("new OpenAI(");
    expect(source).not.toContain("new Anthropic(");
    expect(source).not.toContain("new GoogleGenAI(");
  });

  it("imports no vendor SDK", () => {
    for (const pattern of VENDOR_SDK_PATTERNS) {
      expect(pattern.test(source)).toBe(false);
    }
  });

  it("does not branch on vendor or resolve credentials itself", () => {
    expect(source).not.toContain("detectProvider");
    expect(source).not.toContain("credentialResolver");
    expect(source).not.toContain("secureVault");
  });
});
