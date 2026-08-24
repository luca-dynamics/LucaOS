/**
 * Tests for vision's model routing.
 *
 * Vision is a live tier-1 path (`server.js` mounts `/api/vision`) that had no
 * test coverage at all before RFC-0006 Stage 2 Change 3, while hand-rolling
 * Gemini's REST wire. These tests pin the two things that change fixed: the
 * model is *chosen*, not compiled in, and a failure from Luca's local vision
 * service actually reaches the fallback.
 *
 * That second one is the interesting case. `analyze`'s fallback only ever fired
 * on a thrown error, and the old code never checked `resp.ok` — so a 4xx/5xx
 * from ui-tars produced `{ prediction: undefined }` and the fallback the file
 * was built around had never once run. There is a test for it below.
 *
 * The gateway is mocked because what is under test is which model id vision
 * asks for, not how a credential resolves — that is `llmGateway.test.ts`.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const chatSpy = vi.fn();

vi.mock("./llm/llmGateway.js", () => ({
  chat: (request: unknown) => chatSpy(request),
  default: { chat: (request: unknown) => chatSpy(request) },
}));

// The real constants module resolves the user's Documents directory through
// paths.cjs. Vision needs one value out of it, and a test should not depend on
// the filesystem layout of the machine running it.
vi.mock("../config/constants.js", () => ({
  CORTEX_URL: "http://localhost:8000",
}));

import {
  UI_TARS_MODEL_ID,
  VisionManager,
  toVisionImagePayload,
} from "./visionManager.js";

const SCREENSHOT = "AAABBBCCC";
const PNG_DATA_URL = `data:image/png;base64,${SCREENSHOT}`;

const fetchSpy = vi.fn();

/** A manager whose env supplies exactly the overrides a test cares about. */
const managerWith = (env: Record<string, string> = {}) =>
  new VisionManager(undefined, env);

const okResponse = (body: unknown) => ({
  ok: true,
  status: 200,
  statusText: "OK",
  json: async () => body,
});

beforeEach(() => {
  chatSpy.mockReset();
  chatSpy.mockResolvedValue({ text: "a login form" });
  fetchSpy.mockReset();
  fetchSpy.mockResolvedValue(okResponse({ prediction: "click(120, 340)" }));
  vi.stubGlobal("fetch", fetchSpy);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("model selection — vision is routed, not pinned to a vendor", () => {
  it("takes each intent's model from the environment", () => {
    // This is the whole point of the change: pointing Luca's eyes at Claude or
    // GPT-4o is a deployment setting, not a code edit.
    const manager = managerWith({
      LUCA_VISION_PLANNING_MODEL: "gpt-4o",
      LUCA_VISION_INSIGHT_MODEL: "claude-3-5-sonnet-20240620",
      LUCA_VISION_ACTION_FALLBACK_MODEL: "claude-3-5-sonnet-20240620",
    });

    expect(manager.config.planning.model).toBe("gpt-4o");
    expect(manager.config.insight.model).toBe("claude-3-5-sonnet-20240620");
    expect(manager.config.action.fallback.model).toBe(
      "claude-3-5-sonnet-20240620",
    );
  });

  it("defaults to the models vision used before it was routed", () => {
    // Unchanged behavior until someone chooses otherwise.
    const config = managerWith().config;

    expect(config.planning.model).toBe("gemini-2.0-flash-thinking-exp");
    expect(config.insight.model).toBe("gemini-2.0-flash");
    expect(config.action.model).toBe(UI_TARS_MODEL_ID);
    expect(config.action.fallback.model).toBe("gemini-2.0-flash");
  });

  it("ignores a blank override rather than sending an empty model id", () => {
    expect(managerWith({ LUCA_VISION_INSIGHT_MODEL: "   " }).config.insight.model).toBe(
      "gemini-2.0-flash",
    );
  });

  it("carries no endpoint or credential for a routed model", () => {
    // The adapter owns both. A `baseUrl` or `apiKey` reappearing on a config
    // entry is the breach this change closed coming back.
    const config = managerWith().config;

    for (const entry of [config.planning, config.insight, config.action]) {
      expect(entry).not.toHaveProperty("baseUrl");
      expect(entry).not.toHaveProperty("apiKey");
      expect(entry).not.toHaveProperty("provider");
    }
    // ui-tars keeps an endpoint: it is Luca's own local service, not a vendor.
    expect(config.action.endpoint).toBe("http://localhost:8000");
  });
});

describe("analyze — the call that reaches a provider", () => {
  it("asks the gateway for the configured model, and for nothing else", async () => {
    const manager = managerWith({
      LUCA_VISION_INSIGHT_MODEL: "claude-3-5-sonnet-20240620",
    });

    const result = await manager.analyze(SCREENSHOT, "extract the total");

    const request = chatSpy.mock.calls[0][0];
    // Exactly these three keys: no endpoint, no key, no vendor request shape.
    expect(Object.keys(request).sort()).toEqual([
      "images",
      "messages",
      "modelId",
    ]);
    expect(request.modelId).toBe("claude-3-5-sonnet-20240620");
    expect(request.messages).toEqual([
      {
        role: "user",
        content: "Extract info from screenshot: extract the total. Return JSON.",
      },
    ]);
    expect(result).toEqual({
      prediction: "a login form",
      model: "claude-3-5-sonnet-20240620",
      intent: "insight",
    });
    // No hand-rolled HTTP anywhere on this path.
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("labels a bare screenshot as PNG and leaves a data URL alone", async () => {
    const manager = managerWith();

    await manager.analyze(SCREENSHOT, "extract the total");
    expect(chatSpy.mock.calls[0][0].images).toEqual([PNG_DATA_URL]);

    await manager.analyze(PNG_DATA_URL, "extract the total");
    expect(chatSpy.mock.calls[1][0].images).toEqual([PNG_DATA_URL]);
  });

  it("honours an explicit intent over the detected one", async () => {
    await managerWith().analyze(SCREENSHOT, "extract the total", "planning");

    expect(chatSpy.mock.calls[0][0].modelId).toBe(
      "gemini-2.0-flash-thinking-exp",
    );
    expect(chatSpy.mock.calls[0][0].messages[0].content).toBe(
      "Plan steps for: extract the total.",
    );
  });

  it("returns an empty prediction, not undefined, when the model sends no text", async () => {
    chatSpy.mockResolvedValue({});

    await expect(
      managerWith().analyze(SCREENSHOT, "extract the total"),
    ).resolves.toEqual({
      prediction: "",
      model: "gemini-2.0-flash",
      intent: "insight",
    });
  });

  it("propagates the failure when the intent has no fallback", async () => {
    // 'insight' routes straight to a model; there is nothing to fall back to,
    // so the caller must hear about it rather than get an empty prediction.
    chatSpy.mockRejectedValue(new Error("Gemini API key not found"));

    await expect(
      managerWith().analyze(SCREENSHOT, "extract the total"),
    ).rejects.toThrow("Gemini API key not found");
  });
});

describe("the ui-tars fallback, which an HTTP error never used to trigger", () => {
  it("reaches Luca's local vision service directly, not through the gateway", async () => {
    const result = await managerWith().analyze(SCREENSHOT, "click the button");

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("http://localhost:8000/analyze");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({
      screenshot: SCREENSHOT,
      instruction: "click the button",
    });
    expect(chatSpy).not.toHaveBeenCalled();
    expect(result).toEqual({
      prediction: "click(120, 340)",
      model: UI_TARS_MODEL_ID,
      intent: "action",
    });
  });

  it("falls back to the configured model when the local service is unreachable", async () => {
    fetchSpy.mockRejectedValue(new Error("ECONNREFUSED"));

    const result = await managerWith().analyze(SCREENSHOT, "click the button");

    expect(chatSpy).toHaveBeenCalledTimes(1);
    expect(chatSpy.mock.calls[0][0].modelId).toBe("gemini-2.0-flash");
    expect(result.model).toBe("gemini-2.0-flash");
  });

  it("falls back when the local service answers with an HTTP error status", async () => {
    // The regression this change fixes. `resp.ok` went unchecked, so a 503 read
    // as a successful answer of `{ prediction: undefined }` and the fallback
    // below never ran — the designed behavior had never once worked.
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
      json: async () => ({}),
    });

    const result = await managerWith().analyze(SCREENSHOT, "click the button");

    expect(chatSpy).toHaveBeenCalledTimes(1);
    expect(chatSpy.mock.calls[0][0].modelId).toBe("gemini-2.0-flash");
    expect(result).toEqual({
      prediction: "a login form",
      model: "gemini-2.0-flash",
      intent: "action",
    });
  });

  it("sends the fallback the same screenshot, PNG-labelled", async () => {
    fetchSpy.mockRejectedValue(new Error("ECONNREFUSED"));

    await managerWith().analyze(SCREENSHOT, "click the button");

    expect(chatSpy.mock.calls[0][0].images).toEqual([PNG_DATA_URL]);
  });

  it("names the fallback model for a surface that calls ui-tars itself", () => {
    // `/api/vision/analyze` reaches ui-tars directly, so it reads its fallback
    // from here rather than hardcoding a second model.
    const manager = managerWith({
      LUCA_VISION_ACTION_FALLBACK_MODEL: "gpt-4o",
    });

    expect(manager.fallbackModelFor("action")).toBe("gpt-4o");
    // No fallback entry: the intent's own model is the answer.
    expect(manager.fallbackModelFor("insight")).toBe("gemini-2.0-flash");
  });
});

describe("intent detection and prompts are unchanged by the routing", () => {
  const manager = managerWith();

  it.each([
    ["fill in the checkout form", "planning"],
    ["walk through this multi-step process", "planning"],
    ["extract the invoice total", "insight"],
    ["count the open tabs", "insight"],
    ["summarize this page", "insight"],
    ["click the blue button", "action"],
  ])("routes %j to the %s intent", (instruction, expected) => {
    expect(manager.detectIntent(instruction)).toBe(expected);
  });

  it.each([
    [
      "insight",
      "read the total",
      "Extract info from screenshot: read the total. Return JSON.",
    ],
    ["planning", "book a flight", "Plan steps for: book a flight."],
    ["action", "click the button", "click the button"],
  ])("builds the %s prompt", (intent, instruction, expected) => {
    expect(manager.buildPrompt(instruction, intent)).toBe(expected);
  });
});

describe("toVisionImagePayload", () => {
  it("labels bare base64 as PNG, which is what vision has always sent", () => {
    expect(toVisionImagePayload(SCREENSHOT)).toBe(PNG_DATA_URL);
  });

  it("leaves an existing data URL's media type alone", () => {
    const jpeg = "data:image/jpeg;base64,AAAB";
    expect(toVisionImagePayload(jpeg)).toBe(jpeg);
  });

  it("passes a non-string through, so the vendor rejects it loudly", () => {
    // Better a clear vendor error than an empty image sent as if it were fine.
    expect(toVisionImagePayload(undefined)).toBeUndefined();
    expect(toVisionImagePayload(null)).toBeNull();
  });
});
