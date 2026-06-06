import { describe, expect, it, vi } from "vitest";
import type { MemoryNode } from "../../types";
import type { MemoryItem } from "../memory/memoryTypes";
import {
  createMemoryPersistenceProposal,
  markPersistenceProposalApprovedForFutureAdapter,
} from "../persistence/memoryPersistenceProposal";
import { createPersistenceAuditRecord } from "../persistence/persistenceAudit";
import { evaluatePersistencePolicy } from "../persistence/persistencePolicy";
import { createRollbackPlanForProposal } from "../persistence/rollbackPlan";
import { persistApprovedMemoryProposalWithGovernance } from "./governedMemoryAdapter";
import type {
  GovernedMemoryAdapterConfig,
  MemoryServiceAdapterDependency,
} from "./governedMemoryAdapterTypes";
import { DEFAULT_GOVERNED_MEMORY_ADAPTER_CONFIG } from "./governedMemoryAdapterTypes";

const timestamp = "2026-06-06T12:00:00.000Z";
const now = () => new Date(timestamp);
const memoryItem: MemoryItem = {
  id: "memory-adapter-1",
  kind: "project",
  title: "Release checklist",
  content:
    "Use a reviewed release checklist.\nmetadata: internal preview fields",
  source: "adapter-test",
  confidence: 0.95,
  privacyZone: "project",
  tags: ["release"],
  createdAt: timestamp,
  updatedAt: timestamp,
};

function approvedProposal(item: MemoryItem = memoryItem) {
  const proposal = createMemoryPersistenceProposal(item, {
    proposalId: "proposal-adapter-1",
    proposedPath: "memory/release-checklist.json",
    now,
  });
  return markPersistenceProposalApprovedForFutureAdapter(proposal, {
    approvedBy: "user",
    approvedAt: timestamp,
    explicitUserApproval: true,
    approvalNote: "Approved for governed adapter execution.",
  });
}

function enabledConfig(
  overrides: Partial<GovernedMemoryAdapterConfig> = {},
): GovernedMemoryAdapterConfig {
  return {
    ...DEFAULT_GOVERNED_MEMORY_ADAPTER_CONFIG,
    allowedOperations: [
      ...DEFAULT_GOVERNED_MEMORY_ADAPTER_CONFIG.allowedOperations,
    ],
    blockedPrivacyZones: [
      ...DEFAULT_GOVERNED_MEMORY_ADAPTER_CONFIG.blockedPrivacyZones,
    ],
    enabled: true,
    ...overrides,
  };
}

function governedInput(
  config: GovernedMemoryAdapterConfig,
  service: MemoryServiceAdapterDependency,
) {
  const proposal = approvedProposal();
  return {
    proposal,
    config,
    policy: evaluatePersistencePolicy(proposal, { policyId: "adapter-test" }),
    auditRecords: [
      createPersistenceAuditRecord({
        auditId: "audit-validation-1",
        proposalId: proposal.proposalId,
        eventType: "validated",
        actor: "test",
        summary: "Proposal validated.",
        privacyZone: proposal.privacyZone,
        now,
      }),
    ],
    rollbackPlans: [
      createRollbackPlanForProposal(proposal, {
        status: "ready_for_future_adapter" as const,
      }),
    ],
    memoryService: service,
    now,
  };
}

function memoryNode(): MemoryNode {
  return {
    id: "legacy-node-1",
    key: "PI:project:Release checklist",
    value: "Use a reviewed release checklist.",
    category: "SEMANTIC",
    timestamp: Date.parse(timestamp),
    confidence: 0.99,
  };
}

describe("persistApprovedMemoryProposalWithGovernance", () => {
  it("blocks when the adapter feature flag is disabled", async () => {
    const saveMemory = vi.fn();
    const result = await persistApprovedMemoryProposalWithGovernance(
      governedInput(enabledConfig({ enabled: false }), {
        saveMemory,
      } as MemoryServiceAdapterDependency),
    );

    expect(result.status).toBe("blocked");
    expect(result.performed).toBe(false);
    expect(result.sideEffectsPerformed).toBe(false);
    expect(result.blockers).toContain("Governed memory adapter is disabled.");
    expect(saveMemory).not.toHaveBeenCalled();
  });

  it("returns converted dry-run data without calling memoryService", async () => {
    const saveMemory = vi.fn();
    const result = await persistApprovedMemoryProposalWithGovernance(
      governedInput(enabledConfig({ dryRun: true }), {
        saveMemory,
      } as MemoryServiceAdapterDependency),
    );

    expect(result.status).toBe("dry_run");
    expect(result.memoryKey).toBe("PI:project:Release checklist");
    expect(result.memoryValue).toBe("Use a reviewed release checklist.");
    expect(result.memoryCategory).toBe("SEMANTIC");
    expect(result.performed).toBe(false);
    expect(result.sideEffectsPerformed).toBe(false);
    expect(result.auditRecord.sideEffectsPerformed).toBe(false);
    expect(saveMemory).not.toHaveBeenCalled();
  });

  it("calls memoryService only when every gate passes and live mode is explicit", async () => {
    const saveMemory = vi.fn().mockResolvedValue(memoryNode());
    const result = await persistApprovedMemoryProposalWithGovernance(
      governedInput(enabledConfig({ dryRun: false }), { saveMemory }),
    );

    expect(saveMemory).toHaveBeenCalledTimes(1);
    expect(saveMemory).toHaveBeenCalledWith(
      "PI:project:Release checklist",
      "Use a reviewed release checklist.",
      "SEMANTIC",
      false,
      6,
    );
    expect(result.status).toBe("persisted");
    expect(result.memoryNodeId).toBe("legacy-node-1");
    expect(result.performed).toBe(true);
    expect(result.sideEffectsPerformed).toBe(true);
    expect(result.auditRecord.sideEffectsPerformed).toBe(true);
  });

  it("reports failed without claiming side effects when memoryService throws", async () => {
    const saveMemory = vi
      .fn()
      .mockRejectedValue(new Error("backend unavailable"));
    const result = await persistApprovedMemoryProposalWithGovernance(
      governedInput(enabledConfig({ dryRun: false }), { saveMemory }),
    );

    expect(result.status).toBe("failed");
    expect(result.performed).toBe(false);
    expect(result.sideEffectsPerformed).toBe(false);
    expect(result.auditRecord.sideEffectsPerformed).toBe(false);
    expect(result.blockers).toContain(
      "memoryService.saveMemory failed: backend unavailable",
    );
  });

  it("does not expose or trigger a LucaLink synchronization dependency", async () => {
    const saveMemory = vi.fn().mockResolvedValue(memoryNode());
    const dependency = { saveMemory };

    const result = await persistApprovedMemoryProposalWithGovernance(
      governedInput(enabledConfig({ dryRun: true }), dependency),
    );

    expect(Object.keys(dependency)).toEqual(["saveMemory"]);
    expect(result.status).toBe("dry_run");
    expect(saveMemory).not.toHaveBeenCalled();
  });
});
