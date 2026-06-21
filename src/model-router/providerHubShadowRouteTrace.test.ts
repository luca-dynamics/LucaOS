import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createProviderHubShadowRouteTrace } from "./providerHubShadowRouteTrace";

const snapshots = [{ providerId: "luca_prime" as const, enabled: true }];

const base = {
  currentProviderId: "luca-prime",
  currentRouteMode: "luca-prime",
  taskType: "chat" as const,
  requiredCapabilities: ["text_generation" as const],
  routePreference: "balanced" as const,
  connectionSnapshots: snapshots,
  allowFallbacks: true,
  allowPaidProviders: true,
  allowLocalProviders: true,
  allowCloudProviders: true,
  trigger: "runtime_route_status" as const,
  observedAt: "2026-06-20T00:00:00.000Z",
};

describe("Provider Hub shadow route trace", () => {
  it("creates a matching current/planned route shadow trace", () => {
    const trace = createProviderHubShadowRouteTrace(base);
    expect(trace.providerHubSelectedProviderId).toBe("luca_prime");
    expect(trace.matchesCurrentRoute).toBe(true);
    expect(trace.sideEffectsPerformed).toBe(false);
    expect(trace.runtimeRoutingChanged).toBe(false);
    expect(trace.providerApiCalled).toBe(false);
  });

  it("creates mismatch reason when current route differs", () => {
    const trace = createProviderHubShadowRouteTrace({ ...base, currentProviderId: "openai" });
    expect(trace.matchesCurrentRoute).toBe(false);
    expect(trace.mismatchReason).toContain("Current runtime would use openai");
  });

  it("handles missing current route safely", () => {
    const trace = createProviderHubShadowRouteTrace({ ...base, currentProviderId: undefined, currentModelId: undefined });
    expect(trace.matchesCurrentRoute).toBe(false);
    expect(trace.mismatchReason).toContain("Current runtime route unavailable");
  });

  it("includes candidate, fallback, and blocked counts", () => {
    const trace = createProviderHubShadowRouteTrace(base);
    expect(trace.candidateCount).toBeGreaterThan(0);
    expect(trace.fallbackCandidateCount).toBeGreaterThanOrEqual(0);
    expect(trace.blockedCandidateCount).toBeGreaterThanOrEqual(0);
  });

  it("diagnostics exclude secret-like values", () => {
    const trace = createProviderHubShadowRouteTrace({ ...base, currentModelId: "token-super-secret-value" });
    expect(trace.safeDiagnosticsText).not.toContain("super-secret-value");
    expect(trace.safeDiagnosticsText).toContain("token=redacted");
  });

  it("does not import execution, adapter, network, storage, environment, save, or connection-test APIs", () => {
    const source = readFileSync("src/model-router/providerHubShadowRouteTrace.ts", "utf8");
    expect(source).not.toMatch(/ProviderFactory/);
    expect(source).not.toMatch(/adapter/i);
    expect(source).not.toMatch(/\bfetch\b|WebSocket|XMLHttpRequest/);
    expect(source).not.toMatch(/localStorage|process\.env|import\.meta\.env/);
    expect(source).not.toMatch(/settingsService\.saveSettings/);
    expect(source).not.toMatch(/testProviderHubConnection\(/);
  });
});
