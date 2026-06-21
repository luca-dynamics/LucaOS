import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createProviderHubTaskRouteDiagnosticsMatrix } from "./providerHubTaskRouteDiagnosticsMatrix";
import { getProviderHubTaskRoutePolicies } from "./providerHubTaskRoutePolicies";
import type { LucaModelTaskType } from "./modelRouterContract";

const TASKS: readonly LucaModelTaskType[] = ["chat", "fast_reply", "long_context", "code", "tool_planning", "private_local", "vision", "memory", "embedding", "voice_stt", "voice_tts"];

function matrix() {
  return createProviderHubTaskRouteDiagnosticsMatrix({
    observedAt: "2026-06-21T12:00:00.000Z",
    runtimeRouteSelectionEnabled: true,
    connectionSnapshots: [
      { providerId: "luca_prime", enabled: true, configuredModelId: "luca-prime" },
      { providerId: "ollama", enabled: true, localRuntimeAvailable: true, configuredModelId: "llama3" },
      { providerId: "openai", enabled: true, hasUserKey: true, configuredModelId: "gpt-safe" },
    ],
  });
}

describe("Provider Hub task route diagnostics matrix", () => {
  it("contains every Provider Hub task policy and required task rows", () => {
    const result = matrix();
    expect(result.rows.map((row) => row.taskType).sort()).toEqual(getProviderHubTaskRoutePolicies().map((policy) => policy.taskType).sort());
    for (const task of TASKS) expect(result.rows.some((row) => row.taskType === task)).toBe(true);
  });

  it("derives row capabilities from the task policy helper", () => {
    const result = matrix();
    for (const policy of getProviderHubTaskRoutePolicies()) {
      const row = result.rows.find((candidate) => candidate.taskType === policy.taskType);
      expect(row?.requiredCapabilities).toEqual(policy.requiredCapabilities);
      expect(row?.defaultPreference).toBe(policy.defaultPreference);
    }
  });

  it("keeps private_local cloud fallback blocked", () => {
    const row = matrix().rows.find((candidate) => candidate.taskType === "private_local");
    expect(row?.allowCloudProviders).toBe(false);
    expect(matrix().privateLocalCloudBlocked).toBe(true);
  });

  it("keeps tool, voice, and side-effect-sensitive surfaces diagnostic only", () => {
    const result = matrix();
    expect(result.rows.find((row) => row.taskType === "tool_planning")?.safetyNotes.join(" ")).toMatch(/MCP\/action execution remains separate/);
    expect(result.rows.find((row) => row.taskType === "voice_stt")?.routeEligibleForRuntime).toBe(false);
    expect(result.rows.find((row) => row.taskType === "voice_tts")?.routeEligibleForRuntime).toBe(false);
    expect(result.sideEffectsPerformed).toBe(false);
    expect(result.providerApiCalled).toBe(false);
  });

  it("does not import provider adapters, connection tests, local runtime starters, or App.tsx", () => {
    const source = readFileSync(new URL("./providerHubTaskRouteDiagnosticsMatrix.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/ProviderFactory|OpenAIAdapter|AnthropicAdapter|GeminiAdapter|testProviderHubConnection|startLocal|ollama serve|App\.tsx/);
  });

  it("safe diagnostics exclude secrets and automatic/runtime side effects", () => {
    const result = matrix();
    expect(result.safeDiagnosticsText).not.toMatch(/api[_-]?key|secret|sk-/i);
    expect(result.safeDiagnosticsText).toContain('"providerApiCalled":false');
    expect(result.safeDiagnosticsText).toContain('"automaticConnectionTest":false');
    expect(result.safeDiagnosticsText).toContain('"localRuntimeStartup":false');
  });
});
