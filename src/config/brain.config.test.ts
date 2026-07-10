import { describe, expect, it } from "vitest";
import {
  ANTHROPIC_CLAUDE_MODEL_IDS,
  ANTHROPIC_CLAUDE_MODELS,
  ANTHROPIC_MODEL_PRESETS,
  BRAIN_CONFIG,
  DEEPSEEK_MODEL_IDS,
  DEEPSEEK_MODELS,
  DEEPSEEK_MODEL_PRESETS,
  GEMINI_MODEL_IDS,
  GEMINI_MODELS,
  GEMINI_MODEL_PRESETS,
  OPENAI_GPT_5_6_MODEL_IDS,
  OPENAI_GPT_5_6_MODELS,
  OPENAI_MODEL_PRESETS,
  XAI_GROK_MODEL_IDS,
  XAI_GROK_MODELS,
  XAI_MODEL_PRESETS,
} from "./brain.config";

describe("OpenAI GPT-5.6 model catalog", () => {
  it("registers the three official API model IDs", () => {
    expect(OPENAI_GPT_5_6_MODEL_IDS).toEqual([
      "gpt-5.6-sol",
      "gpt-5.6-terra",
      "gpt-5.6-luna",
    ]);
    expect(OPENAI_GPT_5_6_MODELS.map((model) => model.tier)).toEqual([
      "performance",
      "balanced",
      "fast",
    ]);
    expect(BRAIN_CONFIG.providers.openai.models).toMatchObject({
      "gpt-5.6-sol": "gpt-5.6-sol",
      "gpt-5.6-terra": "gpt-5.6-terra",
      "gpt-5.6-luna": "gpt-5.6-luna",
    });
  });

  it("maps OpenAI presets to the appropriate capability tier", () => {
    expect(OPENAI_MODEL_PRESETS).toEqual({
      performance: "gpt-5.6-sol",
      balanced: "gpt-5.6-terra",
      fast: "gpt-5.6-luna",
    });
  });
});

describe("Anthropic Claude model catalog", () => {
  it("registers the current public Claude API model IDs", () => {
    expect(ANTHROPIC_CLAUDE_MODEL_IDS).toEqual([
      "claude-fable-5",
      "claude-opus-4-8",
      "claude-sonnet-5",
      "claude-haiku-4-5-20251001",
    ]);
    expect(ANTHROPIC_CLAUDE_MODELS.map((model) => model.tier)).toEqual([
      "performance",
      "advanced",
      "balanced",
      "fast",
    ]);
    expect(BRAIN_CONFIG.providers.anthropic.models).toMatchObject({
      "fable-5": "claude-fable-5",
      "opus-4.8": "claude-opus-4-8",
      "sonnet-5": "claude-sonnet-5",
      "haiku-4.5": "claude-haiku-4-5-20251001",
    });
  });

  it("maps Anthropic presets to the appropriate capability tier", () => {
    expect(ANTHROPIC_MODEL_PRESETS).toEqual({
      performance: "claude-fable-5",
      balanced: "claude-sonnet-5",
      fast: "claude-haiku-4-5-20251001",
    });
  });
});

describe("frontier cloud model catalogs", () => {
  it("registers current Gemini, xAI, and DeepSeek API IDs", () => {
    expect(GEMINI_MODEL_IDS).toContain("gemini-3.5-flash");
    expect(GEMINI_MODEL_IDS).toContain("gemini-3.1-pro-preview");
    expect(GEMINI_MODELS.map((model) => model.tier)).toEqual([
      "balanced",
      "performance",
      "fast",
      "balanced",
    ]);
    expect(XAI_GROK_MODEL_IDS).toEqual(["grok-4.5"]);
    expect(DEEPSEEK_MODEL_IDS).toEqual([
      "deepseek-v4-pro",
      "deepseek-v4-flash",
    ]);
    expect(BRAIN_CONFIG.providers.xai.models["grok-4.5"]).toBe("grok-4.5");
    expect(BRAIN_CONFIG.providers.deepseek.models["v4-pro"]).toBe("deepseek-v4-pro");
  });

  it("maps frontier provider presets to current model IDs", () => {
    expect(GEMINI_MODEL_PRESETS.performance).toBe("gemini-3.1-pro-preview");
    expect(XAI_MODEL_PRESETS.balanced).toBe("grok-4.5");
    expect(DEEPSEEK_MODEL_PRESETS.performance).toBe("deepseek-v4-pro");
  });
});
