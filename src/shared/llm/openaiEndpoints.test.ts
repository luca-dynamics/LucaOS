/**
 * Tests for the shared OpenAI-compatible endpoint map.
 *
 * The point of this module is that the endpoints exist in exactly one place.
 * Before RFC-0006 Stage 2 they were written down twice — hardcoded in the
 * core's `callModel` and again in the renderer's `GrokAdapter` /
 * `DeepSeekAdapter` `super()` calls — which is a pair that can drift silently.
 *
 * `env` is a parameter, not an import, so the module stays portable across the
 * renderer and the core (the same reason `createHostSystemSnapshot` takes an
 * `osModule`). These tests pass a plain object and never touch `process.env`.
 */

import { describe, expect, it } from "vitest";

import {
  OPENAI_COMPATIBLE_ALIASES,
  resolveOpenAICompatibleAlias,
  resolveOpenAICompatibleEndpoint,
} from "./openaiEndpoints.js";

describe("resolveOpenAICompatibleEndpoint", () => {
  it("resolves each hosted vendor to its documented endpoint", () => {
    expect(resolveOpenAICompatibleEndpoint("xai")).toBe("https://api.x.ai/v1");
    expect(resolveOpenAICompatibleEndpoint("deepseek")).toBe(
      "https://api.deepseek.com/v1",
    );
    expect(resolveOpenAICompatibleEndpoint("mistral")).toBe(
      "https://api.mistral.ai/v1",
    );
    expect(resolveOpenAICompatibleEndpoint("groq")).toBe(
      "https://api.groq.com/openai/v1",
    );
  });

  it("leaves OpenAI itself undefined, so the SDK uses its own default", () => {
    expect(resolveOpenAICompatibleEndpoint("openai")).toBeUndefined();
  });

  it("returns undefined for a provider it does not know", () => {
    expect(resolveOpenAICompatibleEndpoint("not-a-provider")).toBeUndefined();
  });

  it("falls back to localhost for the local runtimes when the env is silent", () => {
    expect(resolveOpenAICompatibleEndpoint("cortex", { env: {} })).toBe(
      "http://localhost:8000/v1",
    );
    expect(resolveOpenAICompatibleEndpoint("ollama", { env: {} })).toBe(
      "http://localhost:11434/v1",
    );
  });

  it("prefers the injected env for the local runtimes", () => {
    expect(
      resolveOpenAICompatibleEndpoint("cortex", {
        env: { CORTEX_URL: "http://127.0.0.1:9000/v1" },
      }),
    ).toBe("http://127.0.0.1:9000/v1");
    expect(
      resolveOpenAICompatibleEndpoint("ollama", {
        env: { OLLAMA_URL: "http://gpu-box:11434/v1" },
      }),
    ).toBe("http://gpu-box:11434/v1");
  });

  it("ignores a blank env value rather than sending calls to an empty host", () => {
    expect(
      resolveOpenAICompatibleEndpoint("cortex", { env: { CORTEX_URL: "   " } }),
    ).toBe("http://localhost:8000/v1");
  });

  it("lets an explicit override win over both the map and the env", () => {
    expect(
      resolveOpenAICompatibleEndpoint("xai", { override: "https://proxy/v1" }),
    ).toBe("https://proxy/v1");
    expect(
      resolveOpenAICompatibleEndpoint("cortex", {
        env: { CORTEX_URL: "http://ignored/v1" },
        override: "https://proxy/v1",
      }),
    ).toBe("https://proxy/v1");
  });

  it("treats a blank override as absent", () => {
    expect(resolveOpenAICompatibleEndpoint("xai", { override: "  " })).toBe(
      "https://api.x.ai/v1",
    );
  });
});

describe("resolveOpenAICompatibleAlias", () => {
  it("finds the vendor named inside a model id", () => {
    expect(resolveOpenAICompatibleAlias("mistral-large-latest")).toBe("mistral");
    expect(resolveOpenAICompatibleAlias("llama-3.1-70b-groq")).toBe("groq");
  });

  it("defaults to deepseek, matching the pre-Stage-2 behaviour", () => {
    expect(resolveOpenAICompatibleAlias("something-unfamiliar")).toBe("deepseek");
    expect(resolveOpenAICompatibleAlias()).toBe("deepseek");
  });

  it("resolves every declared alias to itself", () => {
    for (const alias of OPENAI_COMPATIBLE_ALIASES) {
      expect(resolveOpenAICompatibleAlias(`model-${alias}-v1`)).toBe(alias);
    }
  });
});
