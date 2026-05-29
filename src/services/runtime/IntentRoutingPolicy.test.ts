import { describe, expect, it } from "vitest";
import {
  detectSignals,
  detectRisk,
  chooseRoute,
  shouldEscalateToPlan,
  shouldStayFast,
  classifyIntent,
  sanitizeIntentInput,
  blockIfSecretLike,
  blockIfForbiddenCapability,
} from "./IntentRoutingPolicy";
import type { LucaIntentRoutingInput } from "../../types/intentRouting";

function makeInput(overrides: Partial<LucaIntentRoutingInput> = {}): LucaIntentRoutingInput {
  return {
    message: "hello",
    mode: "auto",
    source: "test",
    provenanceIds: ["prov:test"],
    ...overrides,
  };
}

describe("IntentRoutingPolicy", () => {
  describe("detectSignals", () => {
    it("detects simple_chat for a greeting", () => {
      const signals = detectSignals("hello");
      expect(signals).toContain("simple_chat");
    });

    it("detects memory_candidate for 'remember this'", () => {
      const signals = detectSignals("remember this fact about me");
      expect(signals).toContain("memory_candidate");
    });

    it("detects multi_step_task for 'help me build'", () => {
      const signals = detectSignals("help me build a project plan");
      expect(signals).toContain("multi_step_task");
    });

    it("detects risky_system_action for shell", () => {
      const signals = detectSignals("open a shell and run rm -rf");
      expect(signals).toContain("risky_system_action");
    });

    it("detects skill_or_plugin", () => {
      const signals = detectSignals("install the weather plugin");
      expect(signals).toContain("skill_or_plugin");
    });

    it("detects writing_or_rewrite for rewrite request", () => {
      const signals = detectSignals("rewrite this paragraph");
      expect(signals).toContain("writing_or_rewrite");
    });

    it("detects safe_local_action for 'show diagnostics'", () => {
      const signals = detectSignals("show diagnostics");
      expect(signals).toContain("safe_local_action");
    });

    it("detects risky_wallet_finance for wallet actions", () => {
      const signals = detectSignals("transfer 100 ETH from my wallet");
      expect(signals).toContain("risky_wallet_finance");
    });

    it("detects risky_browser_action for browser actions", () => {
      const signals = detectSignals("scrape that website");
      expect(signals).toContain("risky_browser_action");
    });

    it("detects risky_code_mutation for code edits", () => {
      const signals = detectSignals("code write a new function");
      expect(signals).toContain("risky_code_mutation");
    });

    it("detects risky_self_evolution", () => {
      const signals = detectSignals("self-evolve and improve");
      expect(signals).toContain("risky_self_evolution");
    });
  });

  describe("detectRisk", () => {
    it("returns safe for simple greeting", () => {
      expect(detectRisk("hello")).toBe("safe");
    });

    it("returns critical for secret-like content", () => {
      expect(detectRisk("sk-abcdefghij12345")).toBe("critical");
    });

    it("returns high for shell execution", () => {
      expect(detectRisk("open a shell terminal")).toBe("high");
    });

    it("returns critical for wallet finance", () => {
      expect(detectRisk("transfer from wallet")).toBe("critical");
    });

    it("returns elevated for skill requests", () => {
      expect(detectRisk("install the plugin")).toBe("elevated");
    });
  });

  describe("chooseRoute", () => {
    it("simple question → fast_response in auto mode", () => {
      expect(chooseRoute("auto", ["simple_chat"], "safe")).toBe("fast_response");
    });

    it("rewrite request → fast_response", () => {
      expect(chooseRoute("auto", ["writing_or_rewrite"], "safe")).toBe("fast_response");
    });

    it("memory candidate → memory_proposal", () => {
      expect(chooseRoute("auto", ["memory_candidate"], "safe")).toBe("memory_proposal");
    });

    it("multi-step task → runtime_plan", () => {
      expect(chooseRoute("auto", ["multi_step_task"], "safe")).toBe("runtime_plan");
    });

    it("safe local action → safe_execution_request", () => {
      expect(chooseRoute("auto", ["safe_local_action"], "safe")).toBe("safe_execution_request");
    });

    it("skill/plugin → skill_request", () => {
      expect(chooseRoute("auto", ["skill_or_plugin"], "elevated")).toBe("skill_request");
    });

    it("risky shell → blocked_risky_action", () => {
      expect(chooseRoute("auto", ["risky_system_action"], "high")).toBe("blocked_risky_action");
    });

    it("risky file → blocked_risky_action", () => {
      expect(chooseRoute("auto", ["risky_file_action"], "high")).toBe("blocked_risky_action");
    });

    it("risky network → blocked_risky_action", () => {
      expect(chooseRoute("auto", ["risky_network_action"], "high")).toBe("blocked_risky_action");
    });

    it("risky wallet → blocked_risky_action", () => {
      expect(chooseRoute("auto", ["risky_wallet_finance"], "critical")).toBe("blocked_risky_action");
    });

    it("risky browser → blocked_risky_action", () => {
      expect(chooseRoute("auto", ["risky_browser_action"], "high")).toBe("blocked_risky_action");
    });

    it("risky device → blocked_risky_action", () => {
      expect(chooseRoute("auto", ["risky_device_action"], "high")).toBe("blocked_risky_action");
    });

    it("risky code mutation → blocked_risky_action", () => {
      expect(chooseRoute("auto", ["risky_code_mutation"], "high")).toBe("blocked_risky_action");
    });

    it("risky self evolution → blocked_risky_action", () => {
      expect(chooseRoute("auto", ["risky_self_evolution"], "critical")).toBe("blocked_risky_action");
    });

    it("unclear consequential → ask_user", () => {
      expect(chooseRoute("auto", ["unclear_consequential"], "safe")).toBe("ask_user");
    });

    it("FAST mode prefers fast for simple chat", () => {
      expect(chooseRoute("fast", ["simple_chat"], "safe")).toBe("fast_response");
    });

    it("FAST mode still blocks risky actions", () => {
      expect(chooseRoute("fast", ["risky_system_action"], "high")).toBe("blocked_risky_action");
    });

    it("PLAN mode creates plan for multi-step task", () => {
      expect(chooseRoute("plan", ["multi_step_task"], "safe")).toBe("runtime_plan");
    });

    it("PLAN mode stays fast for simple chat", () => {
      expect(chooseRoute("plan", ["simple_chat"], "safe")).toBe("fast_response");
    });

    it("AGENT mode creates plan for continuity task", () => {
      expect(chooseRoute("agent", ["future_continuity"], "safe")).toBe("runtime_plan");
    });

    it("AGENT mode stays fast for simple chat", () => {
      expect(chooseRoute("agent", ["simple_chat"], "safe")).toBe("fast_response");
    });

    it("AUTO mode routes by policy", () => {
      expect(chooseRoute("auto", ["simple_chat"], "safe")).toBe("fast_response");
      expect(chooseRoute("auto", ["multi_step_task"], "safe")).toBe("runtime_plan");
    });
  });

  describe("shouldEscalateToPlan", () => {
    it("returns true for multi-step task", () => {
      expect(shouldEscalateToPlan("auto", ["multi_step_task"], "safe")).toBe(true);
    });

    it("returns false for simple chat", () => {
      expect(shouldEscalateToPlan("auto", ["simple_chat"], "safe")).toBe(false);
    });
  });

  describe("shouldStayFast", () => {
    it("returns true for simple chat in fast mode", () => {
      expect(shouldStayFast("fast", ["simple_chat"], "safe")).toBe(true);
    });

    it("returns false for multi-step task", () => {
      expect(shouldStayFast("auto", ["multi_step_task"], "safe")).toBe(false);
    });
  });

  describe("blockIfSecretLike", () => {
    it("blocks API key patterns", () => {
      expect(blockIfSecretLike("sk-abc12345678")).not.toBeNull();
    });

    it("blocks password patterns", () => {
      expect(blockIfSecretLike("my password is foo")).not.toBeNull();
    });

    it("passes normal text", () => {
      expect(blockIfSecretLike("what is the weather today")).toBeNull();
    });
  });

  describe("blockIfForbiddenCapability", () => {
    it("blocks shell commands", () => {
      const result = blockIfForbiddenCapability("open a shell");
      expect(result.blocked).toBe(true);
    });

    it("passes normal text", () => {
      const result = blockIfForbiddenCapability("what time is it");
      expect(result.blocked).toBe(false);
    });
  });

  describe("sanitizeIntentInput", () => {
    it("redacts secrets in message", () => {
      const input = makeInput({ message: "my api-key is sk-abc12345678" });
      const sanitized = sanitizeIntentInput(input);
      expect(sanitized.message).not.toContain("sk-abc12345678");
    });

    it("truncates long messages", () => {
      const input = makeInput({ message: "a".repeat(10_000) });
      const sanitized = sanitizeIntentInput(input);
      expect(sanitized.message.length).toBeLessThanOrEqual(4_000);
    });
  });

  describe("classifyIntent", () => {
    it("simple question → fast_response", () => {
      const result = classifyIntent(makeInput({ message: "what is the weather today?" }));
      expect(result.route).toBe("fast_response");
    });

    it("rewrite request → fast_response", () => {
      const result = classifyIntent(makeInput({ message: "rewrite this paragraph for me" }));
      expect(result.route).toBe("fast_response");
    });

    it("remember preference → memory_proposal", () => {
      const result = classifyIntent(makeInput({ message: "remember that I prefer dark mode" }));
      expect(result.route).toBe("memory_proposal");
    });

    it("multi-step project → runtime_plan", () => {
      const result = classifyIntent(makeInput({ message: "help me build a project plan with multiple steps" }));
      expect(result.route).toBe("runtime_plan");
    });

    it("show diagnostics → safe_execution_request", () => {
      const result = classifyIntent(makeInput({ message: "show diagnostics" }));
      expect(result.route).toBe("safe_execution_request");
    });

    it("install plugin → skill_request", () => {
      const result = classifyIntent(makeInput({ message: "install the weather plugin" }));
      expect(result.route).toBe("skill_request");
    });

    it("shell execution → blocked_risky_action", () => {
      const result = classifyIntent(makeInput({ message: "open a shell terminal" }));
      expect(result.route).toBe("blocked_risky_action");
    });

    it("filesystem write → blocked_risky_action", () => {
      const result = classifyIntent(makeInput({ message: "file write to /etc/hosts" }));
      expect(result.route).toBe("blocked_risky_action");
    });

    it("network request → blocked_risky_action", () => {
      const result = classifyIntent(makeInput({ message: "network request to external API" }));
      expect(result.route).toBe("blocked_risky_action");
    });

    it("wallet/transfer → blocked_risky_action", () => {
      const result = classifyIntent(makeInput({ message: "transfer ETH from wallet" }));
      expect(result.route).toBe("blocked_risky_action");
    });

    it("browser automation → blocked_risky_action", () => {
      const result = classifyIntent(makeInput({ message: "scrape the website" }));
      expect(result.route).toBe("blocked_risky_action");
    });

    it("device/MCP control → blocked_risky_action", () => {
      const result = classifyIntent(makeInput({ message: "device control the robot" }));
      expect(result.route).toBe("blocked_risky_action");
    });

    it("code mutation → blocked_risky_action", () => {
      const result = classifyIntent(makeInput({ message: "code write a new module" }));
      expect(result.route).toBe("blocked_risky_action");
    });

    it("self-evolution → blocked_risky_action", () => {
      const result = classifyIntent(makeInput({ message: "self-evolve your code" }));
      expect(result.route).toBe("blocked_risky_action");
    });

    it("secret-like input → blocked", () => {
      const result = classifyIntent(makeInput({ message: "store my password for later" }));
      expect(result.route).toBe("blocked_risky_action");
    });

    it("FAST mode prefers fast unless safety escalates", () => {
      const fast = classifyIntent(makeInput({ message: "what is 2+2?", mode: "fast" }));
      expect(fast.route).toBe("fast_response");

      const risky = classifyIntent(makeInput({ message: "open a shell", mode: "fast" }));
      expect(risky.route).toBe("blocked_risky_action");
    });

    it("PLAN mode creates plan for task but not simple chat", () => {
      const plan = classifyIntent(makeInput({ message: "help me build a workflow plan", mode: "plan" }));
      expect(plan.route).toBe("runtime_plan");

      const chat = classifyIntent(makeInput({ message: "hello", mode: "plan" }));
      expect(chat.route).toBe("fast_response");
    });

    it("AGENT mode creates plan for continuity task but not simple chat", () => {
      const agent = classifyIntent(makeInput({ message: "schedule a follow up for next week", mode: "agent" }));
      expect(agent.route).toBe("runtime_plan");

      const chat = classifyIntent(makeInput({ message: "hi", mode: "agent" }));
      expect(chat.route).toBe("fast_response");
    });
  });
});
