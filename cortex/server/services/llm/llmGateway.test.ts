/**
 * Tests for the core's LLM routing gateway.
 *
 * These are the other half of RFC-0006 Stage 2's criterion: the core has to be
 * able to complete a provider call, and nothing above the adapter may know which
 * vendor answered. All three vendor SDKs are mocked with recording stubs rather
 * than injecting clients, so the assertions cover what actually reaches the SDK
 * — the resolved endpoint, key and request body — which is the part the old
 * vendor `switch` got to keep implicit.
 *
 * `credentialResolver` is mocked out: it reaches the Secure Vault, and what is
 * under test here is routing, not credential storage.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createCompletion = vi.fn();
const openAIConstructor = vi.fn();

vi.mock("openai", () => ({
  default: class MockOpenAI {
    chat: { completions: { create: typeof createCompletion } };
    constructor(config: unknown) {
      openAIConstructor(config);
      this.chat = { completions: { create: createCompletion } };
    }
  },
}));

const generateContent = vi.fn();
const googleGenAIConstructor = vi.fn();

vi.mock("@google/genai", () => ({
  GoogleGenAI: class MockGoogleGenAI {
    models: { generateContent: typeof generateContent };
    constructor(config: unknown) {
      googleGenAIConstructor(config);
      this.models = { generateContent };
    }
  },
}));

const anthropicCreate = vi.fn();
const anthropicConstructor = vi.fn();

vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages: { create: typeof anthropicCreate };
    constructor(config: unknown) {
      anthropicConstructor(config);
      this.messages = { create: anthropicCreate };
    }
  },
}));

const getApiKey = vi.fn();

vi.mock("./credentialResolver.js", () => ({
  getApiKey: (provider: string) => getApiKey(provider),
  default: { getApiKey: (provider: string) => getApiKey(provider) },
}));

// `chat` is imported under an alias on purpose. Vitest hoists the `vi.mock`
// factories above these imports and rewrites imported bindings *inside* them —
// and the OpenAI factory has a `chat` member (`this.chat.completions`), so a
// binding named `chat` gets rewritten in there too and the file dies with
// "Cannot access '__vi_import_0__' before initialization" before a single test
// collects. The name is the whole cause: aliasing any unrelated export to
// `chat` reproduces it. Renaming the binding is the fix.
import {
  OPENAI_COMPATIBLE_PROVIDERS,
  UnsupportedProviderError,
  canRouteModel,
  chat as gatewayChat,
  completeText,
  createAdapter,
  detectProvider,
  isOpenAICompatible,
  normalizeModelId,
} from "./llmGateway.js";

const textResponse = (content: string) => ({
  choices: [{ message: { content } }],
});

/** No vendor client was built, whichever vendor the id pointed at. */
const expectNoClientConstructed = () => {
  expect(openAIConstructor).not.toHaveBeenCalled();
  expect(googleGenAIConstructor).not.toHaveBeenCalled();
  expect(anthropicConstructor).not.toHaveBeenCalled();
};

beforeEach(() => {
  createCompletion.mockReset();
  openAIConstructor.mockReset();
  generateContent.mockReset();
  googleGenAIConstructor.mockReset();
  anthropicCreate.mockReset();
  anthropicConstructor.mockReset();
  getApiKey.mockReset();
  getApiKey.mockResolvedValue("test-key");
  createCompletion.mockResolvedValue(textResponse("ok"));
  generateContent.mockResolvedValue({ text: "ok" });
  anthropicCreate.mockResolvedValue({ content: [{ type: "text", text: "ok" }] });
});

afterEach(() => {
  delete process.env.CORTEX_URL;
  delete process.env.OLLAMA_URL;
});

describe("detectProvider", () => {
  it.each([
    ["gemini-1.5-flash", "gemini"],
    ["google/gemma-pro", "gemini"],
    ["claude-3-5-sonnet-20240620", "anthropic"],
    ["anthropic.claude-v2", "anthropic"],
    ["grok-beta", "xai"],
    ["xai-fast", "xai"],
    ["deepseek-chat", "deepseek"],
    ["ollama:llama3", "ollama"],
    ["some-ollama-build", "ollama"],
    ["mistral-large-latest", "openai-compat"],
    ["groq-llama-70b", "openai-compat"],
    ["gpt-4o", "openai"],
    ["openai-o4", "openai"],
    ["o1-preview", "openai"],
    ["o3-mini", "openai"],
  ])("routes %s to %s", (modelId, expected) => {
    expect(detectProvider(modelId)).toBe(expected);
  });

  it.each([
    "gemma-2b",
    "phi-3-mini",
    "llama-3.2-1b",
    "smollm2-1.7b",
    "qwen-2.5-7b",
    "deepseek-r1-distill-7b",
  ])("routes the local model %s to cortex", (modelId) => {
    expect(detectProvider(modelId)).toBe("cortex");
  });

  it("routes a local/ prefix to cortex regardless of the model behind it", () => {
    expect(detectProvider("local/whatever-new")).toBe("cortex");
  });

  // The prefix has to beat every branch below it, because OpenRouter model ids
  // are *made of* the vendor they forward to. Each pair below is the same id with
  // and without the prefix: without it the substring ladder claims the id for a
  // vendor whose key the user may not even have, and the call goes straight to
  // that vendor. Two rows are worse than that. 'gemma-2b' is a LOCAL_MODELS
  // entry, so that cloud id would have been posted to the Cortex runtime on
  // localhost:8000; and the llama id matches nothing at all, so it lands on
  // detectProvider's `return 'gemini'` fallback and is answered by a different
  // vendor entirely.
  it.each([
    ["openrouter/anthropic/claude-3.5-sonnet", "anthropic"],
    ["openrouter/google/gemini-2.0-flash", "gemini"],
    ["openrouter/openai/gpt-4o", "openai"],
    ["openrouter/x-ai/grok-2", "xai"],
    ["openrouter/deepseek/deepseek-chat", "deepseek"],
    ["openrouter/mistralai/mistral-large", "openai-compat"],
    ["openrouter/google/gemma-2b-it", "cortex"],
    ["openrouter/meta-llama/llama-3.3-70b-instruct", "gemini"],
  ])(
    "routes %s to openrouter, where without the prefix it would go to %s",
    (prefixed, providerWithout) => {
      expect(detectProvider(prefixed)).toBe("openrouter");
      expect(detectProvider(prefixed.replace("openrouter/", ""))).toBe(
        providerWithout,
      );
    },
  );

  it("claims the prefix only at the start of an id, not anywhere in it", () => {
    // A vendor could ship a model whose own name contains the word; the prefix
    // is a routing instruction, and an instruction in the middle of an id is not
    // one. This falls through to the ladder like any other unprefixed id.
    expect(detectProvider("some-openrouter/thing")).not.toBe("openrouter");
  });

  it("falls back to gemini for an unrecognised or absent id", () => {
    expect(detectProvider("something-unfamiliar")).toBe("gemini");
    expect(detectProvider()).toBe("gemini");
  });
});

describe("normalizeModelId", () => {
  it("strips the routing prefixes a vendor should not see", () => {
    expect(normalizeModelId("ollama:llama3")).toBe("llama3");
    expect(normalizeModelId("local/gemma-2b")).toBe("gemma-2b");
    expect(normalizeModelId("gpt-4o")).toBe("gpt-4o");
    expect(normalizeModelId()).toBe("");
  });

  it("strips only the openrouter/ prefix and keeps the vendor path behind it", () => {
    // The remainder is the id OpenRouter itself expects as `model`, inner slash
    // and all. Stripping more, or globally, would send it a model it has never
    // heard of.
    expect(normalizeModelId("openrouter/anthropic/claude-3.5-sonnet")).toBe(
      "anthropic/claude-3.5-sonnet",
    );
    expect(normalizeModelId("openrouter/google/gemma-2b-it")).toBe(
      "google/gemma-2b-it",
    );
    expect(normalizeModelId("openrouter/openrouter/auto")).toBe(
      "openrouter/auto",
    );
  });

  it("leaves the prefix alone anywhere but the start", () => {
    expect(normalizeModelId("vendor/openrouter/x")).toBe("vendor/openrouter/x");
  });

  it("is case-sensitive, like the prefixes beside it", () => {
    // Documented, not endorsed: detectProvider lowercases the id and this does
    // not, so 'OpenRouter/x' routes to openrouter but reaches the vendor with the
    // prefix still attached. That asymmetry is pre-existing — 'Ollama:llama3'
    // behaves the same way — and model ids are lowercase everywhere in this repo.
    // Fixing it means changing how the existing prefixes behave, which does not
    // belong in the commit that adds one.
    expect(normalizeModelId("OpenRouter/x")).toBe("OpenRouter/x");
    expect(normalizeModelId("Ollama:llama3")).toBe("Ollama:llama3");
  });
});

describe("isOpenAICompatible", () => {
  it("covers exactly the seven providers that share the OpenAI wire", () => {
    expect([...OPENAI_COMPATIBLE_PROVIDERS]).toEqual([
      "openai",
      "xai",
      "deepseek",
      "openrouter",
      "cortex",
      "ollama",
      "openai-compat",
    ]);
    // Gemini and Anthropic route too, but through their own wire — not by being
    // quietly declared OpenAI-compatible.
    expect(isOpenAICompatible("gemini")).toBe(false);
    expect(isOpenAICompatible("anthropic")).toBe(false);
  });
});

describe("createAdapter — endpoint and credential resolution", () => {
  it("sends OpenAI to the SDK default endpoint", async () => {
    const adapter = await createAdapter("gpt-4o");

    expect(getApiKey).toHaveBeenCalledWith("openai");
    expect(adapter.modelName).toBe("gpt-4o");
    expect(openAIConstructor).toHaveBeenCalledWith({ apiKey: "test-key" });
  });

  it("passes an OpenAI model id through verbatim", async () => {
    expect((await createAdapter("openai-o4")).modelName).toBe("openai-o4");
    expect((await createAdapter("o3-mini")).modelName).toBe("o3-mini");
  });

  it("sends Grok to the x.ai endpoint under the xai key", async () => {
    const adapter = await createAdapter("grok-beta");

    expect(getApiKey).toHaveBeenCalledWith("xai");
    expect(adapter.baseURL).toBe("https://api.x.ai/v1");
    expect(openAIConstructor).toHaveBeenCalledWith({
      apiKey: "test-key",
      baseURL: "https://api.x.ai/v1",
    });
  });

  it("sends DeepSeek to its endpoint under the deepseek key", async () => {
    const adapter = await createAdapter("deepseek-chat");

    expect(getApiKey).toHaveBeenCalledWith("deepseek");
    expect(adapter.baseURL).toBe("https://api.deepseek.com/v1");
  });

  it("sends a local Cortex model to the Cortex endpoint with the local key", async () => {
    const adapter = await createAdapter("local/gemma-2b");

    expect(getApiKey).not.toHaveBeenCalled();
    expect(adapter.modelName).toBe("gemma-2b");
    expect(openAIConstructor).toHaveBeenCalledWith({
      apiKey: "luca-local",
      baseURL: "http://localhost:8000/v1",
    });
  });

  it("honours CORTEX_URL and OLLAMA_URL from the environment", async () => {
    process.env.CORTEX_URL = "http://127.0.0.1:9000/v1";
    process.env.OLLAMA_URL = "http://gpu-box:11434/v1";

    expect((await createAdapter("local/gemma-2b")).baseURL).toBe(
      "http://127.0.0.1:9000/v1",
    );
    expect((await createAdapter("ollama:llama3")).baseURL).toBe(
      "http://gpu-box:11434/v1",
    );
  });

  it("strips the ollama: prefix before the model id reaches the vendor", async () => {
    const adapter = await createAdapter("ollama:llama3");

    expect(adapter.modelName).toBe("llama3");
    expect(openAIConstructor).toHaveBeenCalledWith({
      apiKey: "ollama",
      baseURL: "http://localhost:11434/v1",
    });
  });

  it("resolves an openai-compatible vendor by the alias in its model id", async () => {
    const adapter = await createAdapter("mistral-large-latest");

    expect(getApiKey).toHaveBeenCalledWith("mistral");
    expect(adapter.baseURL).toBe("https://api.mistral.ai/v1");
  });

  it("sends OpenRouter to its endpoint under the openrouter key", async () => {
    const adapter = await createAdapter("openrouter/anthropic/claude-3.5-sonnet");

    expect(getApiKey).toHaveBeenCalledWith("openrouter");
    // The prefix is a routing instruction for us; the vendor path behind it is
    // the model OpenRouter is being asked for.
    expect(adapter.modelName).toBe("anthropic/claude-3.5-sonnet");
    expect(openAIConstructor).toHaveBeenCalledWith({
      apiKey: "test-key",
      baseURL: "https://openrouter.ai/api/v1",
    });
    // One key, one wire, any vendor behind it — and never the vendor's own SDK.
    expect(anthropicConstructor).not.toHaveBeenCalled();
    expect(googleGenAIConstructor).not.toHaveBeenCalled();
  });

  it("reaches every vendor through the one OpenRouter client", async () => {
    for (const modelId of [
      "openrouter/google/gemini-2.0-flash",
      "openrouter/openai/gpt-4o",
      "openrouter/google/gemma-2b-it",
      "openrouter/meta-llama/llama-3.3-70b-instruct",
    ]) {
      const adapter = await createAdapter(modelId);
      expect(adapter.modelName).toBe(modelId.replace("openrouter/", ""));
    }

    // Not Google's SDK, not localhost:8000 — the two places these ids went before.
    expect(googleGenAIConstructor).not.toHaveBeenCalled();
    expect(
      openAIConstructor.mock.calls.map(([config]) => (config as { baseURL: string }).baseURL),
    ).toEqual(Array(4).fill("https://openrouter.ai/api/v1"));
  });

  it("does not send an OpenRouter id to the alias heuristic", async () => {
    // 'mistralai' inside the id would resolve to mistral's own endpoint under
    // whatever key the alias found. The prefix has to win before that runs.
    getApiKey.mockImplementation(async (provider: string) =>
      provider === "openrouter" ? "or-key" : "wrong-key",
    );

    const adapter = await createAdapter("openrouter/mistralai/mistral-large");

    expect(getApiKey).toHaveBeenCalledWith("openrouter");
    expect(getApiKey).not.toHaveBeenCalledWith("mistral");
    expect(adapter.modelName).toBe("mistralai/mistral-large");
    expect(openAIConstructor).toHaveBeenCalledWith({
      apiKey: "or-key",
      baseURL: "https://openrouter.ai/api/v1",
    });
  });

  it.each(["groq-llama-70b", "mistral-large-latest"])(
    "refuses %s rather than paying for it with the OpenAI key",
    async (modelId) => {
      // This is the assertion that used to run the other way round: the gateway
      // read `getApiKey(alias) || getApiKey('openai')`, so a user whose only key
      // was OPENAI_API_KEY had that secret posted to api.groq.com under a Groq
      // baseURL. The vendor changes; the credential does not follow it.
      getApiKey.mockImplementation(async (provider: string) =>
        provider === "openai" ? "openai-key" : null,
      );

      const alias = modelId.startsWith("groq") ? "groq" : "mistral";
      await expect(createAdapter(modelId)).rejects.toThrow(
        `API key for ${alias} not found in settings`,
      );

      expect(getApiKey).toHaveBeenCalledWith(alias);
      // Not asked for, let alone sent: the fallback is gone, not merely unused.
      expect(getApiKey).not.toHaveBeenCalledWith("openai");
      expectNoClientConstructed();
      expect(createCompletion).not.toHaveBeenCalled();
    },
  );

  it("still resolves an alias that does have its own key", async () => {
    // The other half of failing closed: refusing when there is no key must not
    // become refusing when there is one.
    getApiKey.mockImplementation(async (provider: string) =>
      provider === "groq" ? "groq-key" : null,
    );

    await createAdapter("groq-llama-70b");

    expect(openAIConstructor).toHaveBeenCalledWith({
      apiKey: "groq-key",
      baseURL: "https://api.groq.com/openai/v1",
    });
  });
});

describe("createAdapter — Gemini", () => {
  it("routes a Gemini id to the Gemini adapter under the gemini key", async () => {
    const adapter = await createAdapter("gemini-1.5-flash");

    expect(getApiKey).toHaveBeenCalledWith("gemini");
    expect(adapter.modelName).toBe("gemini-1.5-flash");
    expect(googleGenAIConstructor).toHaveBeenCalledWith({ apiKey: "test-key" });
    expect(openAIConstructor).not.toHaveBeenCalled();
  });

  it("defaults a blank model id to Luca's own brain", async () => {
    // `detectProvider` sends anything it does not recognise — including nothing
    // at all — to gemini, so this is the path an unset model setting takes.
    expect((await createAdapter()).modelName).toBe("gemini-3-flash-preview");
    expect((await createAdapter("")).modelName).toBe("gemini-3-flash-preview");
  });

  it("routes an unrecognised id to Gemini rather than refusing it", async () => {
    const adapter = await createAdapter("something-unfamiliar");

    expect(adapter.modelName).toBe("something-unfamiliar");
    expect(googleGenAIConstructor).toHaveBeenCalledWith({ apiKey: "test-key" });
  });

  it("sends the prompt as contents and sets no output limit", async () => {
    // Deliberate asymmetry, preserved from the pre-Stage-2 call: Gemini got no
    // max-output-tokens. Honouring the gateway's 512 default here would newly
    // truncate answers on the default brain.
    generateContent.mockResolvedValue({ text: "Bullish, with caveats." });

    await expect(
      completeText({ modelId: "gemini-1.5-flash", prompt: "Your read?" }),
    ).resolves.toBe("Bullish, with caveats.");

    expect(generateContent).toHaveBeenCalledWith({
      model: "gemini-1.5-flash",
      contents: "Your read?",
    });
  });

  it("returns an empty string when Gemini sends no text", async () => {
    generateContent.mockResolvedValue({});

    await expect(
      completeText({ modelId: "gemini-1.5-flash", prompt: "hi" }),
    ).resolves.toBe("");
  });

  it("refuses with no key, and constructs no client", async () => {
    getApiKey.mockResolvedValue(null);

    await expect(createAdapter("gemini-1.5-flash")).rejects.toThrow(
      "Gemini API key not found in settings or environment",
    );
    expectNoClientConstructed();
    expect(generateContent).not.toHaveBeenCalled();
  });
});

describe("createAdapter — Anthropic", () => {
  it("routes a Claude id to the Anthropic adapter under the anthropic key", async () => {
    const adapter = await createAdapter("claude-3-5-sonnet-20240620");

    expect(getApiKey).toHaveBeenCalledWith("anthropic");
    expect(adapter.modelName).toBe("claude-3-5-sonnet-20240620");
    expect(anthropicConstructor).toHaveBeenCalledWith({ apiKey: "test-key" });
    expect(openAIConstructor).not.toHaveBeenCalled();
  });

  it("sends a plain-string user message and the default token budget", async () => {
    anthropicCreate.mockResolvedValue({
      content: [{ type: "text", text: "Bearish." }],
    });

    await expect(
      completeText({ modelId: "claude-3-5-sonnet-20240620", prompt: "Read?" }),
    ).resolves.toBe("Bearish.");

    expect(anthropicCreate).toHaveBeenCalledWith({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 512,
      messages: [{ role: "user", content: "Read?" }],
    });
  });

  it("passes an explicit token budget through", async () => {
    await completeText({
      modelId: "claude-3-5-sonnet-20240620",
      prompt: "hi",
      maxTokens: 64,
    });

    expect(anthropicCreate).toHaveBeenCalledWith(
      expect.objectContaining({ max_tokens: 64 }),
    );
  });

  it("returns an empty string when Anthropic sends no content block", async () => {
    anthropicCreate.mockResolvedValue({ content: [] });

    await expect(
      completeText({ modelId: "claude-3-5-sonnet-20240620", prompt: "hi" }),
    ).resolves.toBe("");
  });

  it("refuses with no key, and constructs no client", async () => {
    getApiKey.mockResolvedValue(null);

    await expect(createAdapter("claude-3-5-sonnet-20240620")).rejects.toThrow(
      "Anthropic API key not found in settings",
    );
    expectNoClientConstructed();
    expect(anthropicCreate).not.toHaveBeenCalled();
  });
});

describe("createAdapter — failing closed", () => {
  it.each([
    ["gpt-4o", "OpenAI API key not found in settings"],
    ["grok-beta", "X.AI (Grok) API key not found in settings"],
    ["deepseek-chat", "DeepSeek API key not found in settings"],
    ["mistral-large-latest", "API key for mistral not found in settings"],
    [
      "openrouter/anthropic/claude-3.5-sonnet",
      "OpenRouter API key not found in settings",
    ],
  ])(
    "refuses %s with no key, and constructs no client",
    async (modelId, message) => {
      getApiKey.mockResolvedValue(null);

      await expect(createAdapter(modelId)).rejects.toThrow(message);
      expectNoClientConstructed();
      expect(createCompletion).not.toHaveBeenCalled();
    },
  );

  it("gives each credential path a message of its own", async () => {
    // These strings are the only evidence available that a call was routed
    // correctly when no key is configured — Change 3 proved vision was routed by
    // the difference between Gemini's message and Anthropic's, and nothing else.
    // A shared "API key not found" would have proven nothing then, and would
    // erase this provider's proof now. Distinctness is the assertion.
    getApiKey.mockResolvedValue(null);

    const messages = await Promise.all(
      [
        "gemini-2.0-flash",
        "claude-3-5-sonnet-20240620",
        "gpt-4o",
        "grok-beta",
        "deepseek-chat",
        "openrouter/anthropic/claude-3.5-sonnet",
      ].map((modelId) =>
        createAdapter(modelId).then(
          () => "resolved",
          (error: Error) => error.message,
        ),
      ),
    );

    expect(new Set(messages).size).toBe(messages.length);
    expect(messages).toContain("OpenRouter API key not found in settings");
  });

  it("keeps a guard for a provider with no adapter behind it", () => {
    // No model id can reach this today: every provider `detectProvider` returns
    // now has an adapter, and its fallback is gemini. That is the point — the
    // guard is what the *next* provider hits if someone adds it to
    // `detectProvider` and forgets the adapter, rather than that id silently
    // being answered by Gemini.
    const error = new UnsupportedProviderError("bedrock", "bedrock.titan");

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("UnsupportedProviderError");
    expect(error.provider).toBe("bedrock");
    expect(error.modelId).toBe("bedrock.titan");
    expect(error.message).toContain(
      "has no adapter in the core provider layer",
    );
  });
});

describe("completeText", () => {
  it("returns the completion text for a routed model", async () => {
    createCompletion.mockResolvedValue(textResponse("Bullish, with caveats."));

    await expect(
      completeText({ modelId: "gpt-4o", prompt: "Your read?" }),
    ).resolves.toBe("Bullish, with caveats.");
  });

  it("sends a plain-string user message and the default token budget", async () => {
    await completeText({ modelId: "gpt-4o", prompt: "Your read?" });

    expect(createCompletion).toHaveBeenCalledWith({
      model: "gpt-4o",
      messages: [{ role: "user", content: "Your read?" }],
      max_tokens: 512,
    });
  });

  it("passes an explicit token budget through", async () => {
    await completeText({ modelId: "gpt-4o", prompt: "hi", maxTokens: 64 });

    expect(createCompletion).toHaveBeenCalledWith(
      expect.objectContaining({ max_tokens: 64 }),
    );
  });

  it("returns an empty string when the vendor sends no content", async () => {
    createCompletion.mockResolvedValue({ choices: [{ message: {} }] });

    await expect(
      completeText({ modelId: "gpt-4o", prompt: "hi" }),
    ).resolves.toBe("");
  });
});

describe("adapter.chat — the turn-shaped call Stage 3 will use", () => {
  it("maps history and tools through the shared wire and normalizes the reply", async () => {
    createCompletion.mockResolvedValue({
      choices: [
        {
          message: {
            content: "",
            tool_calls: [
              {
                id: "call_1",
                function: { name: "read_file", arguments: '{"path":"a.txt"}' },
              },
            ],
          },
        },
      ],
    });

    const adapter = await createAdapter("gpt-4o");
    const result = await adapter.chat({
      messages: [{ role: "user", content: "read a.txt" }],
      systemInstruction: "You are Luca.",
      tools: [{ name: "read_file", parameters: { type: "object" } }],
    });

    const request = createCompletion.mock.calls[0][0];
    expect(request.messages[0]).toEqual({
      role: "system",
      content: "You are Luca.",
    });
    expect(request.tool_choice).toBe("auto");
    expect(request.tools[0].function.name).toBe("read_file");

    expect(result).toEqual({
      text: "",
      toolCalls: [{ id: "call_1", name: "read_file", args: { path: "a.txt" } }],
    });
  });

  it("omits the tool fields entirely when no tools are offered", async () => {
    const adapter = await createAdapter("gpt-4o");
    await adapter.chat({ messages: [{ role: "user", content: "hi" }] });

    const request = createCompletion.mock.calls[0][0];
    expect(request.tools).toBeUndefined();
    expect(request.tool_choice).toBeUndefined();
  });
});

describe("gateway.chat — one routed call, three vendor wires", () => {
  const PNG = "data:image/png;base64,AAAB";

  it("routes an OpenAI id and sends the image as a data URL", async () => {
    await gatewayChat({
      modelId: "gpt-4o",
      messages: [{ role: "user", content: "what is on screen?" }],
      images: [PNG],
    });

    const request = createCompletion.mock.calls[0][0];
    expect(request.model).toBe("gpt-4o");
    expect(request.messages[0].content).toEqual([
      { type: "text", text: "what is on screen?" },
      { type: "image_url", image_url: { url: PNG } },
    ]);
    expect(googleGenAIConstructor).not.toHaveBeenCalled();
    expect(anthropicConstructor).not.toHaveBeenCalled();
  });

  it("routes a Gemini id and sends the image as inlineData", async () => {
    generateContent.mockResolvedValue({ text: "a login form" });

    await expect(
      gatewayChat({
        modelId: "gemini-2.0-flash",
        messages: [{ role: "user", content: "what is on screen?" }],
        images: [PNG],
      }),
    ).resolves.toEqual({
      text: "a login form",
      thought: undefined,
      thought_signature: undefined,
      toolCalls: undefined,
    });

    const request = generateContent.mock.calls[0][0];
    expect(request.model).toBe("gemini-2.0-flash");
    // Text first, then the image — Gemini's order. Anthropic's wire puts the
    // image first (the shape its docs ask for). The two disagree on purpose;
    // asserting each vendor's own order is the point of testing all three.
    expect(request.contents[0].parts).toEqual([
      { text: "what is on screen?" },
      { inlineData: { data: "AAAB", mimeType: "image/png" } },
    ]);
    // No output limit unless the caller sets one — the Gemini asymmetry.
    expect(request.config).toBeUndefined();
    expect(openAIConstructor).not.toHaveBeenCalled();
  });

  it("routes a Claude id and sends the image as a base64 source block", async () => {
    anthropicCreate.mockResolvedValue({
      content: [{ type: "text", text: "a login form" }],
    });

    await expect(
      gatewayChat({
        modelId: "claude-3-5-sonnet-20240620",
        messages: [{ role: "user", content: "what is on screen?" }],
        images: [PNG],
      }),
    ).resolves.toEqual({
      text: "a login form",
      thought: undefined,
      thought_signature: undefined,
      toolCalls: undefined,
    });

    const request = anthropicCreate.mock.calls[0][0];
    expect(request.model).toBe("claude-3-5-sonnet-20240620");
    expect(request.max_tokens).toBe(512);
    expect(request.messages[0].content).toEqual([
      {
        type: "image",
        source: { type: "base64", media_type: "image/png", data: "AAAB" },
      },
      { type: "text", text: "what is on screen?" },
    ]);
  });

  it("routes an OpenRouter id over the OpenAI wire, image and all", async () => {
    // A fourth route, not a fourth wire: the vendor behind the prefix is Google,
    // and the request still leaves as chat-completions with an image_url part.
    // This is the shape a real screenshot travels in.
    createCompletion.mockResolvedValue(textResponse("a login form"));

    await expect(
      gatewayChat({
        modelId: "openrouter/google/gemini-2.0-flash",
        messages: [{ role: "user", content: "what is on screen?" }],
        images: [PNG],
      }),
    ).resolves.toEqual({ text: "a login form", toolCalls: undefined });

    const request = createCompletion.mock.calls[0][0];
    expect(request.model).toBe("google/gemini-2.0-flash");
    expect(request.messages[0].content).toEqual([
      { type: "text", text: "what is on screen?" },
      { type: "image_url", image_url: { url: PNG } },
    ]);
    // Google's own SDK is not involved, even though the model is Google's.
    expect(googleGenAIConstructor).not.toHaveBeenCalled();
    expect(anthropicConstructor).not.toHaveBeenCalled();
  });

  it("passes an explicit token budget through to Gemini's config", async () => {
    await gatewayChat({
      modelId: "gemini-2.0-flash",
      messages: [{ role: "user", content: "hi" }],
      maxTokens: 128,
    });

    expect(generateContent.mock.calls[0][0].config).toEqual({
      maxOutputTokens: 128,
    });
  });

  it("fails closed with the legacy message when no credential resolves", async () => {
    getApiKey.mockResolvedValue(null);

    await expect(
      gatewayChat({
        modelId: "gemini-2.0-flash",
        messages: [{ role: "user", content: "hi" }],
      }),
    ).rejects.toThrow("Gemini API key not found in settings or environment");

    expectNoClientConstructed();
    expect(generateContent).not.toHaveBeenCalled();
  });
});

describe("canRouteModel — named unavailability before the attempt", () => {
  it("is true when a credential resolves for the model's provider", async () => {
    await expect(canRouteModel("gemini-2.0-flash")).resolves.toBe(true);
    await expect(canRouteModel("claude-3-5-sonnet-20240620")).resolves.toBe(
      true,
    );
    await expect(canRouteModel("gpt-4o")).resolves.toBe(true);
    await expect(
      canRouteModel("openrouter/anthropic/claude-3.5-sonnet"),
    ).resolves.toBe(true);
  });

  it("answers for an OpenRouter id by the openrouter key alone", async () => {
    // The vendor named in the id is irrelevant to reachability: one key reaches
    // all of them, and an Anthropic key reaches none of them through this route.
    // A surface asking "can I run this" must not be told yes because a *different*
    // vendor's key happens to be configured.
    getApiKey.mockImplementation(async (provider: string) =>
      provider === "anthropic" ? "anthropic-key" : null,
    );

    await expect(
      canRouteModel("openrouter/anthropic/claude-3.5-sonnet"),
    ).resolves.toBe(false);
    await expect(canRouteModel("claude-3-5-sonnet-20240620")).resolves.toBe(
      true,
    );
  });

  it("is false when no credential resolves, without throwing", async () => {
    getApiKey.mockResolvedValue(null);

    await expect(canRouteModel("gemini-2.0-flash")).resolves.toBe(false);
    await expect(canRouteModel("gpt-4o")).resolves.toBe(false);
  });

  it("is true for a local provider, which needs no credential at all", async () => {
    getApiKey.mockResolvedValue(null);

    await expect(canRouteModel("local/gemma-2b")).resolves.toBe(true);
    await expect(canRouteModel("ollama:llama3")).resolves.toBe(true);
    expect(getApiKey).not.toHaveBeenCalled();
  });
});
