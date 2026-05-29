import { describe, expect, it } from "vitest";
import {
  classifyIntent,
  classifyStep,
  sanitizePlanInput,
  blockIfSecretLike,
  blockIfForbiddenCapability,
  shouldCreateMemoryProposal,
  shouldCreateGovernedActionRequest,
  shouldCreateSkillRequest,
  shouldCreateCheckpoint,
  type StepDraft,
} from "./RuntimePlanPolicy";

describe("RuntimePlanPolicy", () => {
  describe("classifyIntent", () => {
    it("classifies memory-like input as memory_proposal", () => {
      const result = classifyIntent("Remember that my name is Luca");
      expect(result.kind).toBe("memory_proposal");
      expect(result.riskLevel).toBe("low");
    });

    it("classifies safe local panel/notify/read actions as safe_execution_request", () => {
      const result = classifyIntent("Show diagnostics summary");
      expect(result.kind).toBe("safe_execution_request");
      expect(result.riskLevel).toBe("safe");
    });

    it("classifies skill install/run desire as skill_request (state-only)", () => {
      const result = classifyIntent("Enable the weather skill plugin");
      expect(result.kind).toBe("skill_request");
      expect(result.riskLevel).toBe("elevated");
    });

    it("blocks shell execution attempts", () => {
      const result = classifyIntent("Run a shell command to list files");
      expect(result.kind).toBe("blocked_risky_action");
    });

    it("blocks filesystem mutation attempts", () => {
      const result = classifyIntent("File write the config to disk");
      expect(result.kind).toBe("blocked_risky_action");
    });

    it("blocks network automation attempts", () => {
      const result = classifyIntent("Make a network request to the API");
      expect(result.kind).toBe("blocked_risky_action");
    });

    it("blocks wallet/finance/trading attempts", () => {
      const result = classifyIntent("Transfer 1 ETH to my wallet");
      expect(result.kind).toBe("blocked_risky_action");
    });

    it("blocks browser automation attempts", () => {
      const result = classifyIntent("Browser automate the login page");
      expect(result.kind).toBe("blocked_risky_action");
    });

    it("blocks device/desktop control attempts", () => {
      const result = classifyIntent("Device control the robot arm");
      expect(result.kind).toBe("blocked_risky_action");
    });

    it("blocks MCP execution attempts", () => {
      const result = classifyIntent("MCP execute the tool pipeline");
      expect(result.kind).toBe("blocked_risky_action");
    });

    it("blocks code write/edit/push/commit attempts", () => {
      const result = classifyIntent("Code write a new function");
      expect(result.kind).toBe("blocked_risky_action");
    });

    it("blocks self-evolution attempts", () => {
      const result = classifyIntent("Self-evolve and modify own code");
      expect(result.kind).toBe("blocked_risky_action");
    });

    it("blocks secret-like input", () => {
      const result = classifyIntent("Store this token sk-abc123456789");
      expect(result.kind).toBe("blocked_risky_action");
      expect(result.riskLevel).toBe("critical");
    });

    it("falls back to ask_user for unclear actions", () => {
      const result = classifyIntent("Do something interesting with data");
      expect(result.kind).toBe("ask_user");
      expect(result.riskLevel).toBe("low");
    });
  });

  describe("classifyStep", () => {
    it("respects suggestedKind when safe", () => {
      const draft: StepDraft = { title: "Explain the plan", summary: "Describe what happens next", suggestedKind: "explain" };
      const result = classifyStep(draft);
      expect(result.kind).toBe("explain");
    });

    it("overrides suggestedKind if content is forbidden", () => {
      const draft: StepDraft = { title: "Run a shell command", summary: "Execute sudo rm -rf", suggestedKind: "explain" };
      const result = classifyStep(draft);
      expect(result.kind).toBe("blocked_risky_action");
    });

    it("overrides suggestedKind if content has secrets", () => {
      const draft: StepDraft = { title: "Save token", summary: "sk-abcdefgh12345678", suggestedKind: "memory_proposal" };
      const result = classifyStep(draft);
      expect(result.kind).toBe("blocked_risky_action");
      expect(result.riskLevel).toBe("critical");
    });
  });

  describe("sanitizePlanInput", () => {
    it("redacts secret patterns", () => {
      const result = sanitizePlanInput("My key is sk-test123456789 and token=abc123");
      expect(result).toContain("[redacted]");
      expect(result).not.toContain("sk-test123456789");
    });

    it("limits length", () => {
      const long = "a".repeat(10_000);
      expect(sanitizePlanInput(long).length).toBeLessThanOrEqual(4_000);
    });
  });

  describe("blockIfSecretLike", () => {
    it("returns null for safe input", () => {
      expect(blockIfSecretLike("This is a normal sentence")).toBeNull();
    });

    it("returns reason for secret-like input", () => {
      expect(blockIfSecretLike("sk-secretkey12345678")).not.toBeNull();
      expect(blockIfSecretLike("My password is hunter2")).not.toBeNull();
    });
  });

  describe("blockIfForbiddenCapability", () => {
    it("returns blocked for shell commands", () => {
      expect(blockIfForbiddenCapability("Open a shell terminal").blocked).toBe(true);
    });

    it("returns not blocked for safe content", () => {
      expect(blockIfForbiddenCapability("Show me the current plan").blocked).toBe(false);
    });
  });

  describe("shouldCreate helpers", () => {
    it("shouldCreateMemoryProposal for memory-like steps", () => {
      expect(shouldCreateMemoryProposal({ title: "Remember this", summary: "Save this fact about user preferences" })).toBe(true);
    });

    it("shouldCreateGovernedActionRequest for safe action steps", () => {
      expect(shouldCreateGovernedActionRequest({ title: "Show status", summary: "Display runtime diagnostics", suggestedKind: "safe_execution_request" })).toBe(true);
    });

    it("shouldCreateSkillRequest for skill desire steps", () => {
      expect(shouldCreateSkillRequest({ title: "Enable plugin", summary: "Enable the weather skill" })).toBe(true);
    });

    it("shouldCreateCheckpoint for checkpoint steps", () => {
      expect(shouldCreateCheckpoint({ title: "Checkpoint", summary: "Review plan before proceeding", suggestedKind: "planning_checkpoint" })).toBe(true);
    });
  });
});
