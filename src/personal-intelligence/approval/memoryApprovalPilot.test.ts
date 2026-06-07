import { describe, expect, it, vi } from "vitest";
import type { MemoryNode } from "../../types";
import type { MemoryServiceAdapterDependency } from "../adapters";
import {
  SAFE_MEMORY_APPROVAL_AUDIT_FIXTURES,
  SAFE_MEMORY_APPROVAL_POLICY_FIXTURE,
  SAFE_MEMORY_APPROVAL_PROPOSAL_FIXTURE,
  SAFE_MEMORY_APPROVAL_ROLLBACK_FIXTURES,
  createDefaultMemoryApprovalPilotState,
  runGovernedMemoryApprovalDryRun,
  runGovernedMemoryApprovalLiveWrite,
} from "./index";

function node(): MemoryNode {
  return {
    id: "memory-node:project-update-preference",
    key: "PI:preference:Project update preference",
    value:
      "Prefers concise project updates with explicit decisions and next steps.",
    category: "USER_STATE",
    timestamp: Date.parse("2026-06-07T12:00:00.000Z"),
    confidence: 0.99,
  };
}

function dependency() {
  const saveMemory = vi.fn(async () => node());
  return {
    saveMemory,
    service: { saveMemory } satisfies MemoryServiceAdapterDependency,
  };
}

function baseInput(service: MemoryServiceAdapterDependency) {
  return {
    proposal: SAFE_MEMORY_APPROVAL_PROPOSAL_FIXTURE,
    policy: SAFE_MEMORY_APPROVAL_POLICY_FIXTURE,
    auditRecords: SAFE_MEMORY_APPROVAL_AUDIT_FIXTURES,
    rollbackPlans: SAFE_MEMORY_APPROVAL_ROLLBACK_FIXTURES,
    memoryService: service,
    now: () => new Date("2026-06-07T12:00:00.000Z"),
  };
}

async function successfulDryRun(service: MemoryServiceAdapterDependency) {
  return runGovernedMemoryApprovalDryRun(baseInput(service));
}

function enabledState() {
  return {
    ...createDefaultMemoryApprovalPilotState(),
    pilotEnabled: true,
    liveWriteEnabled: true,
    approvalConfirmed: true,
    confirmationPhrase: "REMEMBER APPROVED MEMORY",
    blockers: [],
  };
}

describe("governed memory approval pilot", () => {
  it("runs a side-effect-free governed dry-run with converted preview values", async () => {
    const { saveMemory, service } = dependency();
    const result = await successfulDryRun(service);

    expect(result).toMatchObject({
      status: "dry_run",
      performed: false,
      sideEffectsPerformed: false,
      memoryKey: "PI:preference:Project update preference",
      memoryCategory: "USER_STATE",
      memoryValue:
        "Prefers concise project updates with explicit decisions and next steps.",
    });
    expect(saveMemory).not.toHaveBeenCalled();
  });

  it.each([
    ["pilot disabled", { pilotEnabled: false }, "pilot is disabled"],
    ["live write disabled", { liveWriteEnabled: false }, "toggle is disabled"],
    ["approval unconfirmed", { approvalConfirmed: false }, "not been confirmed"],
    ["confirmation missing", { confirmationPhrase: "" }, "phrase was not accepted"],
  ])("blocks live write when %s", async (_label, override, message) => {
    const { saveMemory, service } = dependency();
    const dryRun = await successfulDryRun(service);
    const result = await runGovernedMemoryApprovalLiveWrite({
      ...baseInput(service),
      pilotState: { ...enabledState(), ...override },
      lastDryRunResult: dryRun,
    });

    expect(result.status).toBe("blocked");
    expect(result.blockers.join(" ")).toContain(message);
    expect(saveMemory).not.toHaveBeenCalled();
  });

  it("requires a successful prior dry-run", async () => {
    const { saveMemory, service } = dependency();
    const result = await runGovernedMemoryApprovalLiveWrite({
      ...baseInput(service),
      pilotState: enabledState(),
    });

    expect(result.status).toBe("blocked");
    expect(result.blockers.join(" ")).toContain("dry-run");
    expect(saveMemory).not.toHaveBeenCalled();
  });

  it("still lets governed adapter gates block missing audit and rollback evidence", async () => {
    const { saveMemory, service } = dependency();
    const dryRun = await successfulDryRun(service);
    const result = await runGovernedMemoryApprovalLiveWrite({
      ...baseInput(service),
      auditRecords: [],
      rollbackPlans: [],
      pilotState: enabledState(),
      lastDryRunResult: dryRun,
    });

    expect(result.status).toBe("blocked");
    expect(result.blockers.join(" ")).toContain("validation audit");
    expect(result.blockers.join(" ")).toContain("rollback plan");
    expect(saveMemory).not.toHaveBeenCalled();
  });

  it("persists only through the governed adapter after every pilot gate passes", async () => {
    const { saveMemory, service } = dependency();
    const dryRun = await successfulDryRun(service);
    const result = await runGovernedMemoryApprovalLiveWrite({
      ...baseInput(service),
      pilotState: enabledState(),
      lastDryRunResult: dryRun,
    });

    expect(result).toMatchObject({
      status: "persisted",
      performed: true,
      sideEffectsPerformed: true,
      memoryNodeId: "memory-node:project-update-preference",
    });
    expect(saveMemory).toHaveBeenCalledTimes(1);
  });
});
