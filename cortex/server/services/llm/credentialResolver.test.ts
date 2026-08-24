/**
 * Tests for the core's credential resolver.
 *
 * This file had no coverage at all before RFC-0006 Stage 2 Change 4, and it is
 * the file that decides whether a key the user typed is ever found.
 * `llmGateway.test.ts` mocks it out wholesale — deliberately, so routing tests
 * stay routing tests — which means nothing exercised the vault-then-env order,
 * the value shapes the vault can hand back, or the key names it looks under.
 *
 * The Secure Vault is mocked. What is under test is the *lookup*: which key is
 * asked for, in what order the two sources are consulted, and what happens when
 * the vault is broken. Change 4 makes that lookup load-bearing for the first
 * time — before it, only the environment branch had ever returned a value.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const retrieve = vi.fn<(key: string) => Promise<unknown>>();

vi.mock("../secureVault.js", () => ({
  default: { retrieve: (key: string) => retrieve(key) },
  secureVault: { retrieve: (key: string) => retrieve(key) },
}));

import { getApiKey } from "./credentialResolver.js";

/** Every provider env var the resolver knows, cleared between tests. */
const ENV_VARS = [
  "GEMINI_API_KEY",
  "GOOGLE_API_KEY",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "XAI_API_KEY",
  "GROK_API_KEY",
  "DEEPSEEK_API_KEY",
  "OPENROUTER_API_KEY",
];

beforeEach(() => {
  retrieve.mockReset();
  retrieve.mockResolvedValue(null);
  for (const name of ENV_VARS) delete process.env[name];
});

describe("the vault key a provider looks under", () => {
  it.each([
    ["gemini", "setting:brain:geminiApiKey"],
    ["openai", "setting:brain:openaiApiKey"],
    ["anthropic", "setting:brain:anthropicApiKey"],
    ["xai", "setting:brain:xaiApiKey"],
    ["deepseek", "setting:brain:deepseekApiKey"],
  ])("derives %s's key as %s", async (provider, expected) => {
    await getApiKey(provider);
    expect(retrieve).toHaveBeenCalledWith(expected);
  });

  it("spells OpenRouter's key with the capital R the Settings field uses", async () => {
    // The derived name would be 'setting:brain:openrouterApiKey', and the key the
    // renderer actually writes is 'setting:brain:openRouterApiKey' — the field is
    // `brain.openRouterApiKey`. One character, and the difference between finding
    // the user's key and telling them they never entered one.
    await getApiKey("openrouter");

    expect(retrieve).toHaveBeenCalledWith("setting:brain:openRouterApiKey");
    expect(retrieve).not.toHaveBeenCalledWith("setting:brain:openrouterApiKey");
  });
});

describe("the vault comes first", () => {
  it("returns a vault value in preference to the environment", async () => {
    process.env.OPENAI_API_KEY = "from-env";
    retrieve.mockResolvedValue({ password: "from-vault" });

    await expect(getApiKey("openai")).resolves.toBe("from-vault");
  });

  it("falls back to the environment when the vault holds nothing", async () => {
    process.env.OPENROUTER_API_KEY = "from-env";

    await expect(getApiKey("openrouter")).resolves.toBe("from-env");
    expect(retrieve).toHaveBeenCalledWith("setting:brain:openRouterApiKey");
  });

  it("reads the first env name that is set, in the order declared", async () => {
    // Gemini accepts two names. GOOGLE_API_KEY is the one a Workspace setup is
    // likely to already have, so both must work — and GEMINI_API_KEY wins when
    // both are present, rather than the answer depending on object iteration.
    process.env.GOOGLE_API_KEY = "google";
    await expect(getApiKey("gemini")).resolves.toBe("google");

    process.env.GEMINI_API_KEY = "gemini";
    await expect(getApiKey("gemini")).resolves.toBe("gemini");
  });

  it("accepts XAI_API_KEY or GROK_API_KEY for the same provider", async () => {
    process.env.GROK_API_KEY = "grok";
    await expect(getApiKey("xai")).resolves.toBe("grok");
  });
});

describe("the value shapes a vault entry can hold", () => {
  it.each([
    ["a bare string", "plain-key"],
    ["the credentials-route shape", { username: "openaiApiKey", password: "plain-key" }],
    ["an apiKey field", { apiKey: "plain-key" }],
    ["a value field", { value: "plain-key" }],
  ])("unwraps %s", async (_label, stored) => {
    retrieve.mockResolvedValue(stored);
    await expect(getApiKey("openai")).resolves.toBe("plain-key");
  });

  it("prefers password over the other fields when more than one is present", async () => {
    // `password` is what the credentials route writes, so it is the authoritative
    // field; the others are older shapes kept readable.
    retrieve.mockResolvedValue({
      password: "written-by-the-route",
      apiKey: "older",
      value: "older-still",
    });

    await expect(getApiKey("openai")).resolves.toBe("written-by-the-route");
  });

  it("treats the [SECURED] sentinel as absent, not as a key", async () => {
    // The renderer writes that sentinel into localStorage to stand in for a value
    // it moved to the vault. If it ever reaches the vault itself, using it would
    // send the literal string "[SECURED]" to a vendor as an API key.
    retrieve.mockResolvedValue({ password: "[SECURED]" });
    await expect(getApiKey("openai")).resolves.toBeNull();

    retrieve.mockResolvedValue("[SECURED]");
    await expect(getApiKey("openai")).resolves.toBeNull();
  });

  it("falls through to the environment for a sentinel or an empty vault value", async () => {
    process.env.OPENAI_API_KEY = "from-env";

    retrieve.mockResolvedValue({ password: "[SECURED]" });
    await expect(getApiKey("openai")).resolves.toBe("from-env");

    retrieve.mockResolvedValue({ password: "" });
    await expect(getApiKey("openai")).resolves.toBe("from-env");

    retrieve.mockResolvedValue({});
    await expect(getApiKey("openai")).resolves.toBe("from-env");
  });
});

describe("failing closed", () => {
  it("returns null when neither source has a key", async () => {
    await expect(getApiKey("openrouter")).resolves.toBeNull();
  });

  it("returns null for a provider it has never heard of", async () => {
    // Callers fail closed on null. Answering with some other provider's key here
    // would send a credential to a vendor the user never chose.
    process.env.OPENAI_API_KEY = "from-env";

    await expect(getApiKey("bedrock")).resolves.toBeNull();
    await expect(getApiKey("")).resolves.toBeNull();
    await expect(getApiKey(undefined)).resolves.toBeNull();
  });

  it("survives a vault that throws and still reads the environment", async () => {
    // A locked file, a bad master key, a directory that will not open: none of
    // those should make an env-configured key unreachable. The vault is the
    // preferred source, not a required one.
    retrieve.mockRejectedValue(new Error("vault unreadable"));
    process.env.OPENROUTER_API_KEY = "from-env";

    await expect(getApiKey("openrouter")).resolves.toBe("from-env");
  });

  it("returns null rather than propagating when the vault throws and the env is empty", async () => {
    retrieve.mockRejectedValue(new Error("vault unreadable"));

    await expect(getApiKey("openrouter")).resolves.toBeNull();
  });
});
