import { describe, expect, it } from "vitest";
import { DEFAULT_GOVERNED_MEMORY_ADAPTER_CONFIG } from "../adapters";
import {
  SAFE_MEMORY_APPROVAL_AUDIT_FIXTURES,
  SAFE_MEMORY_APPROVAL_POLICY_FIXTURE,
  SAFE_MEMORY_APPROVAL_PROPOSAL_FIXTURE,
  SAFE_MEMORY_APPROVAL_ROLLBACK_FIXTURES,
  createDefaultMemoryApprovalPilotState,
  createMemoryApprovalChecklist,
  evaluateMemoryApprovalPilotReadiness,
} from "./index";

const config = {
  ...DEFAULT_GOVERNED_MEMORY_ADAPTER_CONFIG,
  enabled: true,
  dryRun: true,
};

function input() {
  return {
    proposal: SAFE_MEMORY_APPROVAL_PROPOSAL_FIXTURE,
    policy: SAFE_MEMORY_APPROVAL_POLICY_FIXTURE,
    auditRecords: SAFE_MEMORY_APPROVAL_AUDIT_FIXTURES,
    rollbackPlans: SAFE_MEMORY_APPROVAL_ROLLBACK_FIXTURES,
    adapterConfig: config,
    pilotState: createDefaultMemoryApprovalPilotState(),
  };
}

describe("memory approval checklist", () => {
  it("lists every required governance and pilot gate", () => {
    const checklist = createMemoryApprovalChecklist(input());
    expect(checklist.map((item) => item.id)).toEqual([
      "proposal_exists",
      "proposal_approved",
      "approval_metadata",
      "policy_clear",
      "validation_audit",
      "rollback_plan",
      "dry_run_config",
      "dry_run_completed",
      "live_write_enabled",
      "confirmation_phrase",
      "content_safety",
      "privacy_zone",
      "lucalink_disabled",
    ]);
    expect(checklist.find((item) => item.id === "content_safety")?.status).toBe(
      "passed",
    );
  });

  it("blocks when validation audit or rollback evidence is missing", () => {
    const noAudit = evaluateMemoryApprovalPilotReadiness({
      ...input(),
      auditRecords: [],
    });
    const noRollback = evaluateMemoryApprovalPilotReadiness({
      ...input(),
      rollbackPlans: [],
    });

    expect(noAudit.readyForDryRun).toBe(false);
    expect(noAudit.blockers.join(" ")).toContain("validation audit");
    expect(noRollback.readyForDryRun).toBe(false);
    expect(noRollback.blockers.join(" ")).toContain("rollback plan");
  });

  it("blocks sensitive privacy zones by default", () => {
    const proposal = {
      ...SAFE_MEMORY_APPROVAL_PROPOSAL_FIXTURE,
      privacyZone: "health" as const,
      memoryItem: {
        ...SAFE_MEMORY_APPROVAL_PROPOSAL_FIXTURE.memoryItem,
        privacyZone: "health" as const,
      },
    };
    const checklist = createMemoryApprovalChecklist({ ...input(), proposal });
    expect(checklist.find((item) => item.id === "privacy_zone")?.status).toBe(
      "blocked",
    );
  });
});
