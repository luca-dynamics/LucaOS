/**
 * 👁 Vision Manager — routes a screenshot + instruction to a vision-capable model.
 *
 * This file knows *which model* serves each kind of looking, and nothing else
 * about any vendor: no endpoint, no API key, no request or response shape. Those
 * live behind `llmGateway.chat`, which resolves the credential (Secure Vault
 * first, then environment) and picks the adapter from the model id.
 *
 * Before RFC-0006 Stage 2 Change 3 this file hand-rolled Gemini's REST wire with
 * `fetch`, which meant vision could not reach any other model however the brain
 * was configured, sent the API key in a URL query string, never checked
 * `resp.ok`, and read `process.env` at module load so a vaulted key never
 * applied. Routing the call fixed all four. See Invariant 4.
 */

import { CORTEX_URL } from "../config/constants.js";
import { chat } from "./llm/llmGateway.js";

/**
 * ui-tars is Luca's own local vision service — a Python process exposing
 * `/analyze` — not a model vendor speaking a model wire. It is reached directly
 * rather than through the gateway, and that is deliberate: there is no provider
 * to abstract. Do not "fix" this into a provider branch.
 */
export const UI_TARS_MODEL_ID = "ui-tars";

const DEFAULT_UI_TARS_ENDPOINT = "http://localhost:3000";

/**
 * The model that serves each intent, overridable per deployment. Defaults are
 * the values vision used before it was routed, so behavior is unchanged until
 * someone chooses otherwise — and now Claude or GPT-4o are a config change
 * rather than a code change.
 */
const VISION_MODEL_ENV = {
  planning: "LUCA_VISION_PLANNING_MODEL",
  insight: "LUCA_VISION_INSIGHT_MODEL",
  action: "LUCA_VISION_ACTION_MODEL",
  actionFallback: "LUCA_VISION_ACTION_FALLBACK_MODEL",
};

const VISION_MODEL_DEFAULTS = {
  planning: "gemini-2.0-flash-thinking-exp",
  insight: "gemini-2.0-flash",
  action: UI_TARS_MODEL_ID,
  actionFallback: "gemini-2.0-flash",
};

function resolveVisionModel(slot, env) {
  const configured = env[VISION_MODEL_ENV[slot]];
  return configured && configured.trim().length > 0
    ? configured.trim()
    : VISION_MODEL_DEFAULTS[slot];
}

/**
 * Vision has always declared its screenshots as PNG. The shared wire infers the
 * media type from a data URL and defaults bare base64 to JPEG, so a bare
 * screenshot is labelled here rather than silently mislabelled downstream.
 *
 * A non-string is passed through untouched: the vendor rejects it loudly, which
 * beats sending an empty image.
 *
 * Exported because the `/api/vision/analyze` route calls the local service
 * itself and needs the same labelling for its own fallback.
 */
export function toVisionImagePayload(screenshot) {
  if (typeof screenshot !== "string") return screenshot;
  return screenshot.startsWith("data:")
    ? screenshot
    : `data:image/png;base64,${screenshot}`;
}

export class VisionManager {
  constructor(config, env = process.env) {
    this.config = config || this.getDefaultConfig(env);
  }

  getDefaultConfig(env = process.env) {
    return {
      planning: { model: resolveVisionModel("planning", env) },
      insight: { model: resolveVisionModel("insight", env) },
      action: {
        model: resolveVisionModel("action", env),
        endpoint: CORTEX_URL || DEFAULT_UI_TARS_ENDPOINT,
        fallback: { model: resolveVisionModel("actionFallback", env) },
      },
    };
  }

  detectIntent(instruction) {
    const lower = instruction.toLowerCase();
    if (
      ["fill", "form", "multi-step", "process"].some((p) => lower.includes(p))
    )
      return "planning";
    if (
      ["extract", "get", "find", "count", "summarize"].some((p) =>
        lower.includes(p),
      )
    )
      return "insight";
    return "action";
  }

  async analyze(screenshot, instruction, explicitIntent) {
    const intent = explicitIntent || this.detectIntent(instruction);
    const config = this.config[intent];

    try {
      return await this.executeWithModel(
        config,
        screenshot,
        instruction,
        intent,
      );
    } catch (error) {
      if (config.fallback)
        return await this.executeWithModel(
          config.fallback,
          screenshot,
          instruction,
          intent,
        );
      throw error;
    }
  }

  async executeWithModel(config, screenshot, instruction, intent) {
    const prompt = this.buildPrompt(instruction, intent);

    if (config.model === UI_TARS_MODEL_ID) {
      const endpoint = config.endpoint || DEFAULT_UI_TARS_ENDPOINT;
      const resp = await fetch(`${endpoint}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ screenshot, instruction }),
      });
      // An HTTP error status must throw, or `analyze` reads it as "the model saw
      // nothing" and the fallback below never fires.
      if (!resp.ok) {
        throw new Error(
          `[VisionManager] ui-tars at ${endpoint} returned ${resp.status} ${resp.statusText}`,
        );
      }
      const data = await resp.json();
      return {
        prediction: data.prediction,
        model: UI_TARS_MODEL_ID,
        intent: "action",
      };
    }

    const response = await chat({
      modelId: config.model,
      messages: [{ role: "user", content: prompt }],
      images: [toVisionImagePayload(screenshot)],
    });

    return {
      prediction: response.text ?? "",
      model: config.model,
      intent,
    };
  }

  /**
   * The model that backs an intent when Luca's local vision service cannot
   * answer. The `/api/vision/analyze` route calls ui-tars itself, so it reads
   * its fallback model from here rather than hardcoding a second one.
   */
  fallbackModelFor(intent) {
    const entry = this.config[intent];
    return entry?.fallback?.model ?? entry?.model;
  }

  buildPrompt(instruction, intent) {
    if (intent === "insight")
      return `Extract info from screenshot: ${instruction}. Return JSON.`;
    if (intent === "planning") return `Plan steps for: ${instruction}.`;
    return instruction;
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }
}

export const visionManager = new VisionManager();
export default visionManager;
