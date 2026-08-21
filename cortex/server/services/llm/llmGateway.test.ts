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

import {
  OPENAI_COMPATIBLE_PROVIDERS,
  UnsupportedProviderError,
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
});

describe("isOpenAICompatible", () => {
  it("covers exactly the six providers that share the OpenAI wire", () => {
    expect([...OPENAI_COMPATIBLE_PROVIDERS]).toEqual([
      "openai",
      "xai",
      "deepseek",
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

  it("falls back to the OpenAI key when the alias has none of its own", async () => {
    getApiKey.mockImplementation(async (provider: string) =>
      provider === "openai" ? "openai-key" : null,
    );

    await createAdapter("groq-llama-70b");

    expect(getApiKey).toHaveBeenCalledWith("groq");
    expect(getApiKey).toHaveBeenCalledWith("openai");
    expect(openAIConstructor).toHaveBeenCalledWith({
      apiKey: "openai-key",
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
  ])(
    "refuses %s with no key, and constructs no client",
    async (modelId, message) => {
      getApiKey.mockResolvedValue(null);

      await expect(createAdapter(modelId)).rejects.toThrow(message);
      expectNoClientConstructed();
      expect(createCompletion).not.toHaveBeenCalled();
    },
  );

  it("keeps a guard for a provider with no adapter behind it", () => {
    // No model id can reach this today: every provider `detectProvider` returns
    // now has an adapter, and its fallback is gemini. That is the point — the
    // guard is what a *seventh* provider hits if someone adds it to
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
