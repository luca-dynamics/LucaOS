import { describe, expect, it } from "vitest";
import {
  createExecutionPlan,
  createExecutionStep,
  getDeterministicExecutionSnapshot,
  getExecutionPermissionMode,
} from "./LucaDeterministicExecution";

describe("LucaDeterministicExecution", () => {
  it("represents a low-risk plan without enabling live execution", () => {
    const step = createExecutionStep({ id: "step-voice", kind: "voice_command", summary: "Summarize status" });
    const plan = createExecutionPlan({ id: "plan-low", summary: "Answer operator", steps: [step], actorTier: "normal" });
    const snapshot = getDeterministicExecutionSnapshot({ plan });

    expect(plan.riskLevel).toBe("low");
    expect(plan.permissionMode).toBe("auto_allowed");
    expect(plan.liveExecutionAllowed).toBe(false);
    expect(snapshot.liveExecutionEnabled).toBe(false);
    expect(snapshot.autonomousExecutionEnabled).toBe(false);
    expect(snapshot.persistenceEnabled).toBe(false);
    expect(snapshot.networkCallsEnabled).toBe(false);
  });

  it("requires confirmation for medium-risk computer-use and Origin for high-risk computer-use", () => {
    const mediumStep = createExecutionStep({ kind: "computer_use", summary: "Inspect active window", riskLevel: "medium" });
    const highStep = createExecutionStep({ kind: "computer_use", summary: "Operate browser checkout", riskLevel: "high" });

    expect(mediumStep.permissionMode).toBe("confirm_required");
    expect(getExecutionPermissionMode(highStep, "tactical")).toBe("origin_required");
  });

  it("defaults filesystem, network, and self-evolution actions to blocked or Origin-required", () => {
    const filesystem = createExecutionStep({ kind: "filesystem", summary: "Rewrite config" });
    const network = createExecutionStep({ kind: "network", summary: "Call external API" });
    const selfEvolution = createExecutionStep({ kind: "self_evolution", summary: "Promote candidate" });
    const unknown = createExecutionStep({ kind: "unknown", summary: "Unknown mutation" });

    expect(["blocked", "origin_required"]).toContain(filesystem.permissionMode);
    expect(["blocked", "origin_required"]).toContain(network.permissionMode);
    expect(["blocked", "origin_required"]).toContain(selfEvolution.permissionMode);
    expect(unknown.permissionMode).toBe("blocked");
  });
});
