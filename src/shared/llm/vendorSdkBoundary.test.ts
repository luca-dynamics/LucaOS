/**
 * Invariant 4 boundary guard.
 *
 * "No code outside the provider layer may depend on a specific model vendor's
 * SDK or wire format." Two rules make that true for the OpenAI-compatible path,
 * and both are the kind of thing a later refactor undoes by accident:
 *
 *  1. `src/shared/llm/` describes the wire format and imports no vendor SDK, so
 *     it stays importable from the renderer, the core, and a web build alike.
 *  2. In the core, exactly one file constructs a vendor client. Before RFC-0006
 *     Stage 2 that file was `tradingDebateService.js` — a *feature* service — which
 *     is precisely the breach this stage closes.
 *
 * The directories are read from disk rather than listed here, so a new file in
 * either one is covered the moment it lands. Paths go through
 * `process.getBuiltinModule('node:fs')`: `vite.config.ts` aliases `fs` to a
 * browser polyfill whose `readFileSync` returns `''`, which would make every
 * `not.toContain` below pass while proving nothing.
 */

const { readFileSync, readdirSync } = process.getBuiltinModule("node:fs");

import { describe, expect, it } from "vitest";

const toPath = (relative: string) =>
  new URL(relative, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

const SHARED_DIR = toPath("./");
const CORE_LLM_DIR = toPath("../../../cortex/server/services/llm/");

const VENDOR_SDK_PATTERNS = [
  /from\s+["']openai["']/,
  /from\s+["']@anthropic-ai\/sdk["']/,
  /from\s+["']@google\/genai["']/,
  /from\s+["']@google\/generative-ai["']/,
];

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
    expect(files.length).toBeGreaterThanOrEqual(3);
    expect(files.map((f) => f.name)).toContain("openaiWire.js");
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

describe("the core routes every OpenAI-compatible call through one adapter", () => {
  const files = readSources(CORE_LLM_DIR);

  it("reads real sources (guards against a vacuous assertion)", () => {
    expect(files.map((f) => f.name)).toEqual(
      expect.arrayContaining([
        "credentialResolver.js",
        "llmGateway.js",
        "openaiCompatibleAdapter.js",
      ]),
    );
  });

  it("constructs an OpenAI client in openaiCompatibleAdapter.js and nowhere else", () => {
    const importers = files
      .filter((file) => /from\s+["']openai["']/.test(file.source))
      .map((file) => file.name);

    expect(importers).toEqual(["openaiCompatibleAdapter.js"]);
  });

  it("keeps the gateway itself vendor-agnostic", () => {
    const gateway = files.find((file) => file.name === "llmGateway.js");

    for (const pattern of VENDOR_SDK_PATTERNS) {
      expect(pattern.test(gateway!.source)).toBe(false);
    }
  });
});

describe("tradingDebateService no longer speaks the OpenAI wire", () => {
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
    expect(source).not.toMatch(/from\s+["']openai["']/);
  });

  it("resolves credentials through the shared resolver, not the vault directly", () => {
    expect(source).toContain("./llm/credentialResolver.js");
    expect(source).not.toContain("secureVault");
  });
});
