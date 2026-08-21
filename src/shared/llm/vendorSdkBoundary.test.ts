/**
 * Invariant 4 boundary guard.
 *
 * "No code outside the provider layer may depend on a specific model vendor's
 * SDK or wire format." Three rules make that true, and all three are the kind of
 * thing a later refactor undoes by accident:
 *
 *  1. `src/shared/llm/` describes the wire formats and imports no vendor SDK, so
 *     it stays importable from the renderer, the core, and a web build alike.
 *  2. In the core, each vendor SDK is constructed in exactly one adapter. Before
 *     RFC-0006 Stage 2 they were constructed in `tradingDebateService.js` — a
 *     *feature* service — which is precisely the breach this stage closes.
 *  3. No file in the core names a vendor's model endpoint. This rule exists
 *     because rules 1 and 2 are about *imports*, and Change 3 found a live
 *     tier-1 path — `visionManager.js` and `vision.routes.js` — that hand-rolled
 *     Gemini's REST wire with `fetch` and therefore imported nothing at all. It
 *     survived two changes of boundary work by being invisible to an
 *     import-only check. An SDK is one way to depend on a vendor; knowing its
 *     URL is the other.
 *
 * The directories are read from disk rather than listed here, so a new file is
 * covered the moment it lands. Paths go through
 * `process.getBuiltinModule('node:fs')`: `vite.config.ts` aliases `fs` to a
 * browser polyfill whose `readFileSync` returns `''`, which would make every
 * `not.toContain` below pass while proving nothing.
 *
 * Every pattern matches both quote styles. A single-quote-only search missed a
 * real double-quoted import while this stage was being scoped, and a boundary
 * test that a quote character can fool is not a boundary test.
 *
 * Scope, stated plainly: rule 3 covers `cortex/` — the core, which RFC-0006 is
 * moving the turn loop into. The renderer has its own outstanding surface
 * (`src/services/llmService.ts` hand-rolls the OpenAI and Anthropic wires,
 * `src/services/visionManager.ts` names Gemini's endpoint, and the provider-hub
 * registry and config tables legitimately catalogue endpoints). Extending rule 3
 * across `src/` means deciding which of those is config and which is a breach —
 * its own change, not a silent omission here.
 *
 * Two further limits, so a green run is not read as more than it is. The walker
 * reads `.js` only, which leaves two blind spots. `cortex/python/cortex.py:906`
 * branches on vendor in Python — Anthropic, OpenAI, xAI, Ollama, each with its
 * own credential lookup — and hardcodes x.ai's endpoint: a second provider layer
 * in another language, and a real Invariant 4 surface this guard cannot reach.
 * And `.ts` is skipped, which is why `llmGateway.test.ts` may name the endpoints
 * it asserts the adapters resolve.
 */

const { readFileSync, readdirSync } = process.getBuiltinModule("node:fs");

import { describe, expect, it } from "vitest";

import { OPENAI_COMPATIBLE_ENDPOINTS } from "./openaiEndpoints.js";

const toPath = (relative: string) =>
  new URL(relative, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

const SHARED_DIR = toPath("./");
const CORE_DIR = toPath("../../../cortex/");
const CORE_LLM_DIR = toPath("../../../cortex/server/services/llm/");

/**
 * Every host a model call could go to. The first-party three are spelled out;
 * the OpenAI-compatible family is derived from the endpoint table the provider
 * layer already keeps, so adding a provider there extends this guard for free.
 */
const MODEL_VENDOR_HOSTS = [
  "generativelanguage.googleapis.com",
  "api.anthropic.com",
  "api.openai.com",
  ...Object.values(OPENAI_COMPATIBLE_ENDPOINTS).map((url) => new URL(url).host),
];

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

type DirEntry = { name: string; isDirectory(): boolean };

const SKIPPED_DIRS = new Set([
  "node_modules",
  "__pycache__",
  ".venv",
  "dist",
  "build",
]);

/** Every `.js` file under a directory, named relative to it. */
const walkJsSources = (
  dir: string,
  prefix = "",
): { name: string; source: string }[] => {
  const found: { name: string; source: string }[] = [];

  for (const entry of readdirSync(dir, { withFileTypes: true }) as DirEntry[]) {
    if (entry.isDirectory()) {
      if (SKIPPED_DIRS.has(entry.name)) continue;
      found.push(
        ...walkJsSources(`${dir}${entry.name}/`, `${prefix}${entry.name}/`),
      );
      continue;
    }
    if (!entry.name.endsWith(".js")) continue;
    found.push({
      name: `${prefix}${entry.name}`,
      source: readFileSync(dir + entry.name, "utf8") as string,
    });
  }

  return found;
};

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

describe("the whole core, not just its provider layer", () => {
  const files = walkJsSources(CORE_DIR);

  it("reads real sources (guards against a vacuous assertion)", () => {
    expect(files.length).toBeGreaterThan(50);
    expect(files.map((f) => f.name)).toEqual(
      expect.arrayContaining([
        "server/services/visionManager.js",
        "server/api/routes/vision.routes.js",
        "server/services/llm/llmGateway.js",
      ]),
    );
    for (const file of files) {
      expect(file.source.length).toBeGreaterThan(0);
    }
  });

  it("imports a vendor SDK only inside the provider layer", () => {
    const importers = Object.fromEntries(
      VENDOR_SDKS.map((sdk) => [
        sdk.specifier,
        files
          .filter((file) => sdk.pattern.test(file.source))
          .map((file) => file.name)
          .sort(),
      ]),
    );

    // `cortex/agent/lifeLoop.js` used to appear here against @google/genai. It
    // was deleted in Change 3: never imported anywhere in the repo's history,
    // and a stale duplicate of the live goal services.
    expect(importers).toEqual({
      openai: ["server/services/llm/openaiCompatibleAdapter.js"],
      "@anthropic-ai/sdk": ["server/services/llm/anthropicAdapter.js"],
      "@google/genai": ["server/services/llm/geminiAdapter.js"],
      // The renderer's Gemini SDK has no business in the core at all.
      "@google/generative-ai": [],
    });
  });

  it("names no model vendor's endpoint anywhere", () => {
    const offenders = files.flatMap((file) =>
      MODEL_VENDOR_HOSTS.filter((host) => file.source.includes(host)).map(
        (host) => `${file.name} → ${host}`,
      ),
    );

    // A vendor URL in the core means someone is speaking a vendor's wire by
    // hand. Route the call through llmGateway instead; the adapter owns the
    // endpoint, and then any provider can serve the feature.
    expect(offenders).toEqual([]);
  });
});

describe("Google Workspace is not a model vendor", () => {
  const source = readFileSync(
    toPath("../../../cortex/server/services/googleService.js"),
    "utf8",
  ) as string;

  it("reads real source (guards against a vacuous assertion)", () => {
    expect(source).toContain("googleapis.com/auth/");
  });

  it("names Workspace OAuth scopes and no model endpoint", () => {
    // `www.googleapis.com/auth/*` authorizes Gmail, Drive and Calendar. It
    // shares a parent domain with Gemini and nothing else — the model host is
    // generativelanguage.googleapis.com. Stating the distinction here is the
    // point: a guard that matched "googleapis.com" loosely would flag this file
    // forever, and a permanently red test gets deleted rather than fixed.
    expect(source).toContain("https://www.googleapis.com/auth/gmail.readonly");

    for (const host of MODEL_VENDOR_HOSTS) {
      expect(
        source.includes(host),
        `googleService.js must not name the model host ${host}`,
      ).toBe(false);
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
