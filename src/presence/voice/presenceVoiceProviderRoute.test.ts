import { describe, expect, it } from "vitest";
import {
  createVoiceProviderFallback,
  createVoiceProviderHealth,
  createVoiceProviderRouteDecision,
  createVoiceProviderRouteEnvelope,
  getSelectedVoiceProvider,
  getVoiceProviderFallbackReason,
  isVoiceProviderAvailable,
  mergeVoiceProviderHealth,
  shouldFallbackVoiceProvider,
} from "./presenceVoiceProviderRoute";

describe("Presence voice provider route helpers", () => {
  it("normalizes provider health payloads without dropping legacy fields", () => {
    const payload = {
      providerId: "cloud-primary",
      providerKind: "cloud" as const,
      providerName: "Cloud Primary",
      model: "voice-large",
      voice: "luca",
      language: "en-US",
      mode: "cloud" as const,
      status: "ready" as const,
      health: "available" as const,
      latencyMs: 42,
      capabilities: ["transcription" as const, "streaming" as const],
      metadata: { region: "us" },
      legacyOnlyField: { preserve: true },
    };

    expect(createVoiceProviderHealth(payload)).toEqual(payload);
  });

  it("tolerates unknown provider kinds and statuses", () => {
    const health = createVoiceProviderHealth({
      providerId: "future-provider",
      providerKind: "orbital-relay",
      status: "warming-crystals",
    });

    expect(health.providerKind).toBe("orbital-relay");
    expect(health.status).toBe("warming-crystals");
    expect(isVoiceProviderAvailable(health)).toBe(false);
  });

  it("extracts selected providers from route decisions", () => {
    expect(getSelectedVoiceProvider(createVoiceProviderRouteDecision({ selectedProvider: "local-primary" }))).toBe("local-primary");
    expect(getSelectedVoiceProvider(createVoiceProviderRouteDecision({ providerId: "legacy-provider" }))).toBe("legacy-provider");
    expect(getSelectedVoiceProvider({ selectedProvider: { providerId: "browser", status: "ready" } })).toEqual({
      providerId: "browser",
      status: "ready",
    });
  });

  it("extracts fallback reasons from direct and nested fallback payloads", () => {
    expect(getVoiceProviderFallbackReason(createVoiceProviderFallback({ fallbackReason: "timeout" }))).toBe("timeout");
    expect(getVoiceProviderFallbackReason(createVoiceProviderRouteDecision({ fallback: { fallbackReason: "network" } }))).toBe("network");
  });

  it("detects fallback decisions without executing fallback", () => {
    expect(shouldFallbackVoiceProvider({ shouldFallback: true })).toBe(true);
    expect(shouldFallbackVoiceProvider({ fallbackReason: "provider-error" })).toBe(true);
    expect(shouldFallbackVoiceProvider({ status: "error" })).toBe(true);
    expect(shouldFallbackVoiceProvider({ status: "ready" })).toBe(false);
  });

  it("preserves attempted providers", () => {
    const decision = createVoiceProviderRouteDecision({
      attemptedProviders: ["cloud-primary", { providerId: "local-backup", providerKind: "local" }],
    });

    expect(decision.attemptedProviders).toEqual([
      "cloud-primary",
      { providerId: "local-backup", providerKind: "local" },
    ]);
  });

  it("preserves unknown legacy fields on envelopes", () => {
    const envelope = createVoiceProviderRouteEnvelope({
      type: "provider-route",
      payload: { providerId: "byok", status: "ready" },
      legacyProviderHint: "do-not-drop",
    });

    expect(envelope).toMatchObject({
      type: "provider-route",
      payload: { providerId: "byok", status: "ready" },
      legacyProviderHint: "do-not-drop",
    });
  });

  it("does not mutate input payloads", () => {
    const payload = {
      providerId: "cloud-primary",
      capabilities: ["transcription"],
      metadata: { region: "us" },
    };
    const normalized = createVoiceProviderHealth(payload);

    normalized.capabilities?.push("vad");
    normalized.metadata = { region: "eu" };

    expect(payload.capabilities).toEqual(["transcription"]);
    expect(payload.metadata).toEqual({ region: "us" });
  });

  it("keeps route payloads JSON-safe", () => {
    const envelope = createVoiceProviderRouteEnvelope({
      type: "provider-fallback",
      fallbackReason: "model-unavailable",
      attemptedProviders: ["cloud-primary", { providerId: "system", status: "available" }],
      selectedProvider: { providerId: "system", providerKind: "system" },
      requestId: "request-1",
      sessionId: "session-1",
      timestamp: 123,
      metadata: { safe: true },
    });

    expect(JSON.parse(JSON.stringify(envelope))).toEqual(envelope);
  });

  it("merges provider health while preserving previous fields unless next overrides them", () => {
    expect(mergeVoiceProviderHealth(
      { providerId: "cloud-primary", providerKind: "cloud", status: "degraded", latencyMs: 120, model: "old" },
      { status: "ready", latencyMs: 55 },
    )).toEqual({
      providerId: "cloud-primary",
      providerKind: "cloud",
      status: "ready",
      latencyMs: 55,
      model: "old",
    });
  });
});
