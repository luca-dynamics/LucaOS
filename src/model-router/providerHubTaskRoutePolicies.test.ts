import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { LucaModelTaskType } from "./modelRouterContract";
import { createProviderHubRouteRequestFromPolicy, createProviderHubTaskRoutePolicyDiagnostics, getProviderHubTaskRoutePolicy, resolveProviderHubTaskRoutePolicy } from "./providerHubTaskRoutePolicies";

const TASKS: LucaModelTaskType[] = ["chat", "fast_reply", "long_context", "code", "tool_planning", "private_local", "vision", "memory", "embedding", "voice_stt", "voice_tts"];

describe("Provider Hub task route policies", () => {
  it("defines every supported task policy with expected capabilities", () => {
    const expected = new Map<LucaModelTaskType, readonly string[]>([
      ["chat", ["text_generation"]], ["fast_reply", ["text_generation"]], ["long_context", ["long_context"]], ["code", ["code_generation"]], ["tool_planning", ["tool_calling"]], ["private_local", ["text_generation", "local_only"]], ["vision", ["vision"]], ["memory", ["embedding"]], ["embedding", ["embedding"]], ["voice_stt", ["speech_to_text"]], ["voice_tts", ["text_to_speech"]],
    ]);
    for (const task of TASKS) expect(getProviderHubTaskRoutePolicy(task).requiredCapabilities).toEqual(expected.get(task));
  });

  it("keeps private_local fallbacks from crossing to cloud", () => {
    const policy = resolveProviderHubTaskRoutePolicy({ taskType: "private_local", allowCloudProvidersOverride: true });
    expect(policy.allowFallbacks).toBe(true);
    expect(policy.allowCloudProviders).toBe(false);
    expect(createProviderHubRouteRequestFromPolicy(policy, { allowCloudProviders: true }).allowCloudProviders).toBe(false);
  });

  it("documents tool planning separation and voice policy non-execution", () => {
    expect(getProviderHubTaskRoutePolicy("tool_planning").safetyNotes.join(" ")).toMatch(/MCP\/action execution remains separate/);
    expect(getProviderHubTaskRoutePolicy("voice_stt").safetyNotes.join(" ")).toMatch(/does not wire Provider Hub voice execution/);
    expect(getProviderHubTaskRoutePolicy("voice_tts").safetyNotes.join(" ")).toMatch(/does not wire Provider Hub voice execution/);
  });

  it("diagnostics are safe and non-executable", () => {
    const diagnostics = createProviderHubTaskRoutePolicyDiagnostics(resolveProviderHubTaskRoutePolicy({ taskType: "chat" }));
    expect(diagnostics).toContain('"sideEffectsPerformed":false');
    expect(diagnostics).toContain('"providerApiCalled":false');
    expect(diagnostics).not.toMatch(/sk-|apiKey|secret|token/i);
  });

  it("does not import providers or side-effectful runtimes", () => {
    const source = readFileSync("src/model-router/providerHubTaskRoutePolicies.ts", "utf8");
    // Provider/adapter names are checked against import statements only: the
    // invariant is "does not import them", and the identifiers legitimately
    // appear in prose (e.g. a safetyNotes string mentioning the ProviderFactory
    // guard). Matching the whole source flagged that documentation as a
    // violation.
    const importLines = source
      .split("\n")
      .filter((line) => /^\s*import\b/.test(line))
      .join("\n");
    expect(importLines).not.toMatch(/ProviderFactory|GeminiAdapter|OpenAIAdapter|AnthropicAdapter|LocalLLMAdapter/);
    // Side-effectful calls would be code, not prose, so these stay against the
    // full source.
    expect(source).not.toMatch(/fetch\(|WebSocket|testProviderHubConnection|startLocal|ollama serve|App\.tsx/);
  });
});
