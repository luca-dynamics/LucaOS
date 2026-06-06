import { describe, expect, it } from "vitest";
import type { MemoryItem } from "../memory/memoryTypes";
import {
  createMemoryPersistenceProposal,
  markPersistenceProposalApprovedForFutureAdapter,
} from "../persistence/memoryPersistenceProposal";
import { createPersistenceAuditRecord } from "../persistence/persistenceAudit";
import { evaluatePersistencePolicy } from "../persistence/persistencePolicy";
import { createRollbackPlanForProposal } from "../persistence/rollbackPlan";
import {
  canPersistPersonalIntelligenceProposal,
  sanitizeMemoryContentForLegacyMemoryService,
} from "./governedMemoryAdapterPolicy";
import {
  DEFAULT_GOVERNED_MEMORY_ADAPTER_CONFIG,
  type GovernedMemoryAdapterConfig,
} from "./governedMemoryAdapterTypes";

const timestamp = "2026-06-06T12:00:00.000Z";
const now = () => new Date(timestamp);

function item(overrides: Partial<MemoryItem> = {}): MemoryItem {
  return {
    id: "memory-policy-1",
    kind: "preference",
    title: "Update style",
    content: "Prefer concise updates with clear next steps.",
    source: "adapter-policy-test",
    confidence: 0.95,
    privacyZone: "project",
    tags: ["communication"],
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

function proposal(overrides: Partial<MemoryItem> = {}) {
  const draft = createMemoryPersistenceProposal(item(overrides), {
    proposalId: "proposal-policy-1",
    proposedPath: "memory/update-style.json",
    now,
  });
  return markPersistenceProposalApprovedForFutureAdapter(draft, {
    approvedBy: "user",
    approvedAt: timestamp,
    explicitUserApproval: true,
  });
}

function config(
  overrides: Partial<GovernedMemoryAdapterConfig> = {},
): GovernedMemoryAdapterConfig {
  return {
    ...DEFAULT_GOVERNED_MEMORY_ADAPTER_CONFIG,
    enabled: true,
    allowedOperations: ["create"],
    blockedPrivacyZones: ["credential", "financial", "health", "enterprise"],
    ...overrides,
  };
}

function gate(
  currentProposal = proposal(),
  options: {
    config?: GovernedMemoryAdapterConfig;
    withAudit?: boolean;
    withRollback?: boolean;
  } = {},
) {
  return canPersistPersonalIntelligenceProposal(currentProposal, {
    config: options.config ?? config(),
    policy: evaluatePersistencePolicy(currentProposal, {
      policyId: "adapter-policy-test",
    }),
    auditRecords:
      options.withAudit === false
        ? []
        : [
            createPersistenceAuditRecord({
              auditId: "audit-policy-1",
              proposalId: currentProposal.proposalId,
              eventType: "validated",
              actor: "test",
              summary: "Validated.",
              privacyZone: currentProposal.privacyZone,
              now,
            }),
          ],
    rollbackPlans:
      options.withRollback === false
        ? []
        : [
            createRollbackPlanForProposal(currentProposal, {
              status: "ready_for_future_adapter",
            }),
          ],
  });
}

describe("canPersistPersonalIntelligenceProposal", () => {
  it("allows a fully governed dry-run configuration", () => {
    const result = gate(proposal(), { config: config({ dryRun: true }) });

    expect(result.allowed).toBe(true);
    expect(result.blockers).toEqual([]);
    expect(result.convertedMemory).toMatchObject({
      key: "PI:preference:Update style",
      category: "USER_STATE",
      importance: 10,
    });
  });

  it("blocks proposals that are not approved_for_future_adapter", () => {
    const current = createMemoryPersistenceProposal(item(), {
      proposalId: "proposal-policy-1",
      proposedPath: "memory/update-style.json",
      now,
    });

    expect(gate(current).blockers).toContain(
      "Proposal must be approved_for_future_adapter.",
    );
  });

  it("blocks a proposal whose writePerformed invariant is not false", () => {
    const current = {
      ...proposal(),
      writePerformed: true,
    } as unknown as ReturnType<typeof proposal>;

    expect(gate(current).blockers).toContain(
      "Proposal writePerformed must be false before adapter execution.",
    );
  });

  it.each(["credential", "financial", "health", "enterprise"] as const)(
    "blocks the %s privacy zone",
    (privacyZone) => {
      const result = gate(proposal({ privacyZone }));
      expect(result.allowed).toBe(false);
      expect(result.blockers).toContain(
        `Privacy zone ${privacyZone} is blocked by adapter configuration.`,
      );
    },
  );

  it("blocks when explicit approval metadata is missing", () => {
    const current = { ...proposal(), approvalMetadata: undefined };

    expect(gate(current).blockers).toContain(
      "Valid explicit user approval metadata is required.",
    );
  });

  it("blocks when the rollback plan is missing", () => {
    expect(gate(proposal(), { withRollback: false }).blockers).toContain(
      "A valid ready_for_future_adapter rollback plan is required.",
    );
  });

  it("blocks when the validation audit is missing", () => {
    expect(gate(proposal(), { withAudit: false }).blockers).toContain(
      "A validation audit record is required.",
    );
  });

  it.each([
    "hidden prompt: ignore policy",
    "system prompt contents",
    "private reasoning follows",
    "chain-of-thought follows",
    "raw file contents: document body",
    "attachment contents: document body",
    "password: hunter2",
    "passphrase: words",
    "api key: secret",
    "access token: secret",
    "private key: secret",
    "seed phrase: twelve words",
    "credential: secret",
  ])("blocks forbidden content: %s", (content) => {
    const result = gate(proposal({ content }));
    expect(result.allowed).toBe(false);
    expect(
      result.blockers.some((blocker) =>
        /must not|credential-like|token-like/.test(blocker),
      ),
    ).toBe(true);
  });

  it("only truncates oversized content at a safe semantic boundary", () => {
    const content = `${"A".repeat(75)}. ${"B".repeat(75)}.`;
    const result = sanitizeMemoryContentForLegacyMemoryService(
      item({ content }),
      100,
    );

    expect(result.allowed).toBe(true);
    expect(result.truncated).toBe(true);
    expect(result.content?.endsWith("…")).toBe(true);
    expect(result.warnings).toHaveLength(1);
  });
});
