import { describe, expect, it } from "vitest";
import type { PersonalIntelligenceSkillPermissionGate } from "../personal-intelligence/skillPermissions";
import { LUCA_LINK_ADAPTER_FILE_INSTALL_PERMISSION_FIXTURE_DECISIONS } from "../services/lucaLink/adapterFileInstallPermissions";
import {
  createOperationItemsFromAdapterFileInstallDecisions,
  createOperationItemsFromApprovalNotifications,
  createOperationItemsFromLearningEvents,
  createOperationItemsFromMissionEvaluations,
  createOperationItemsFromRuntimeTraces,
  createOperationItemsFromSensorSnapshots,
  createOperationItemsFromSkillPermissionGates,
  createOperationItemsFromSkillSandboxPlans,
  createOperationItemsFromTransportPermissionDecisions,
  createOperationItemsFromWebDisplayIntents,
} from "./operationCenterBridge";

const gate: PersonalIntelligenceSkillPermissionGate = {
  gateId: "gate:test",
  skillId: "skill:test",
  manifestId: "manifest:test",
  planId: "plan:test",
  kind: "permission",
  permissionKind: "tool",
  label: "Tool permission",
  reason: "Review is required.",
  status: "pending",
  riskLevel: "high",
  required: true,
  scope: { mode: "review_only", skillId: "skill:test", manifestId: "manifest:test", planId: "plan:test", permissionKind: "tool", executionAuthorized: false },
  executionEnabled: false,
  canExecute: false,
  sideEffectsPerformed: false,
};

const base = { id: "item:test", title: "Safe summary", summary: "Fixture-backed summary.", createdAt: "2026-06-07T12:00:00.000Z" };

describe("operation center bridge", () => {
  it("converts skill permission gates without granting execution", () => {
    const [item] = createOperationItemsFromSkillPermissionGates([gate]);
    expect(item).toMatchObject({ category: "skill_permission_gate", status: "pending", relatedSkillId: "skill:test", readyForExecution: false, sideEffectsPerformed: false });
    expect(item.blockedActions).toContain("skill execution");
  });

  it("converts skill sandbox, runtime trace, learning, and mission summaries", () => {
    expect(createOperationItemsFromSkillSandboxPlans([{ ...base, status: "approval_required", planId: "plan:test" }])[0].status).toBe("approval_required");
    expect(createOperationItemsFromRuntimeTraces([{ ...base, status: "blocked", traceId: "trace:test" }])[0]).toMatchObject({ source: "runtime", status: "blocked" });
    expect(createOperationItemsFromLearningEvents([{ ...base, status: "proposal_ready" }])[0].status).toBe("ready_for_review");
    expect(createOperationItemsFromMissionEvaluations([{ ...base, status: "misaligned" }])[0].status).toBe("approval_required");
  });

  it("converts LucaLink display, notification, sensor, and transport summaries", () => {
    expect(createOperationItemsFromWebDisplayIntents([{ ...base, status: "approval_required" }])[0].category).toBe("web_display");
    expect(createOperationItemsFromApprovalNotifications([{ ...base, status: "action_required" }])[0].status).toBe("pending");
    expect(createOperationItemsFromSensorSnapshots([{ ...base, status: "read_only" }])[0].status).toBe("read_only");
    expect(createOperationItemsFromTransportPermissionDecisions([{ ...base, status: "allowed_preview" }])[0].status).toBe("model_only");
    expect(createOperationItemsFromTransportPermissionDecisions([{ ...base, status: "blocked" }])[0].status).toBe("blocked");
  });

  it("converts the real adapter file/install fixture decisions", () => {
    const items = createOperationItemsFromAdapterFileInstallDecisions(
      LUCA_LINK_ADAPTER_FILE_INSTALL_PERMISSION_FIXTURE_DECISIONS,
    );
    expect(items.map((item) => item.status)).toEqual([
      "ready_for_review",
      "approval_required",
      "blocked",
      "unsupported",
    ]);
    expect(items.every((item) => item.category === "adapter_file_install")).toBe(true);
    expect(items.every((item) => (
      item.executionEnabled === false
      && item.canExecute === false
      && item.readyForExecution === false
      && item.sideEffectsPerformed === false
    ))).toBe(true);
    expect(LUCA_LINK_ADAPTER_FILE_INSTALL_PERMISSION_FIXTURE_DECISIONS.every((decision) => (
      decision.writeEnabled === false
      && decision.installEnabled === false
      && decision.readyForLiveSend === false
      && decision.liveCollectionEnabled === false
    ))).toBe(true);
  });
});
