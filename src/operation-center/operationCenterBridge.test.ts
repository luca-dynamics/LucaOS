import { describe, expect, it } from "vitest";
import { personalIntelligenceSkillDryRunFixtures } from "../personal-intelligence/skillDryRun";
import type { PersonalIntelligenceSkillPermissionGate } from "../personal-intelligence/skillPermissions";
import { LUCA_LINK_ADAPTER_FILE_INSTALL_PERMISSION_FIXTURE_DECISIONS } from "../services/lucaLink/adapterFileInstallPermissions";
import { LUCA_LINK_DRY_RUN_HANDOFF_FIXTURES } from "../services/lucaLink/dryRunHandoff";
import { LUCA_LINK_RUNTIME_AUTHORITY_FIXTURES } from "../services/lucaLink/runtimeAuthority";
import {
  createOperationItemsFromAdapterFileInstallDecisions,
  createOperationItemsFromApprovalNotifications,
  createOperationItemsFromLearningEvents,
  createOperationItemsFromLucaLinkDryRunHandoffSimulations,
  createOperationItemsFromLucaLinkRuntimeAuthorityRecords,
  createOperationItemsFromMissionEvaluations,
  createOperationItemsFromRuntimeTraces,
  createOperationItemsFromSensorSnapshots,
  createOperationItemsFromSkillPermissionGates,
  createOperationItemsFromSkillDryRunSimulations,
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


  it("converts skill dry-run simulations into non-executable Operation Center evidence", () => {
    const items = createOperationItemsFromSkillDryRunSimulations(personalIntelligenceSkillDryRunFixtures);
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((item) => item.category === "skill_dry_run" && !item.canExecute && !item.sideEffectsPerformed)).toBe(true);
    expect(items[0].blockedActions).toEqual(expect.arrayContaining(["skill execution", "tool invocation", "model call", "memory write", "LucaLink handoff"]));
  });

  it("converts LucaLink display, notification, sensor, and transport summaries", () => {
    expect(createOperationItemsFromWebDisplayIntents([{ ...base, status: "approval_required" }])[0].category).toBe("web_display");
    expect(createOperationItemsFromApprovalNotifications([{ ...base, status: "action_required" }])[0].status).toBe("pending");
    expect(createOperationItemsFromSensorSnapshots([{ ...base, status: "read_only" }])[0].status).toBe("read_only");
    expect(createOperationItemsFromTransportPermissionDecisions([{ ...base, status: "allowed_preview" }])[0].status).toBe("model_only");
    expect(createOperationItemsFromTransportPermissionDecisions([{ ...base, status: "blocked" }])[0].status).toBe("blocked");
  });

  it("converts LucaLink dry-run simulations without granting runtime authority", () => {
    const items = createOperationItemsFromLucaLinkDryRunHandoffSimulations(LUCA_LINK_DRY_RUN_HANDOFF_FIXTURES);
    expect(items).toHaveLength(LUCA_LINK_DRY_RUN_HANDOFF_FIXTURES.length);
    expect(items.every((item) => item.category === "lucalink_dry_run" && item.executionEnabled === false && item.sideEffectsPerformed === false)).toBe(true);
    expect(items.flatMap((item) => item.blockedActions)).toEqual(expect.arrayContaining([
      "live handoff", "transport send", "adapter execution", "display open/cast", "sensor collection", "file write", "install",
    ]));
  });

  it("converts LucaLink runtime authority records into boundary-only Operation Center evidence", () => {
    const items = createOperationItemsFromLucaLinkRuntimeAuthorityRecords(LUCA_LINK_RUNTIME_AUTHORITY_FIXTURES);
    expect(items).toHaveLength(LUCA_LINK_RUNTIME_AUTHORITY_FIXTURES.length);
    expect(items.every((item) => item.category === "lucalink_runtime_authority" && !item.canExecute && !item.sideEffectsPerformed)).toBe(true);
    expect(items.map((item) => item.status)).toEqual(expect.arrayContaining([
      "blocked", "ready_for_review", "model_only", "approval_required", "unsupported",
    ]));
    expect(items.flatMap((item) => item.blockedActions)).toEqual(expect.arrayContaining([
      "live handoff", "transport send", "adapter execution", "display open/cast",
      "sensor collection", "file write", "install", "runtime authority grant",
    ]));
  });

  it("converts real adapter file/install fixture decisions without granting runtime authority", () => {
    const items = createOperationItemsFromAdapterFileInstallDecisions(
      LUCA_LINK_ADAPTER_FILE_INSTALL_PERMISSION_FIXTURE_DECISIONS,
    );
    const statuses = items.map((item) => item.status);

    expect(items).toHaveLength(LUCA_LINK_ADAPTER_FILE_INSTALL_PERMISSION_FIXTURE_DECISIONS.length);
    expect(statuses).toEqual(expect.arrayContaining([
      "ready_for_review",
      "approval_required",
      "blocked",
      "unsupported",
    ]));
    expect(items.every((item) =>
      item.category === "adapter_file_install"
      && item.sideEffectsPerformed === false
      && item.executionEnabled === false
      && item.canExecute === false
      && item.readyForExecution === false
    )).toBe(true);
    expect(items.some((item) => item.status === "disabled")).toBe(false);
    expect(items.some((item) =>
      `${item.title} ${item.summary} ${item.warnings.join(" ")}`.includes("Adapter file/install model not available yet")
    )).toBe(false);
  });
});
