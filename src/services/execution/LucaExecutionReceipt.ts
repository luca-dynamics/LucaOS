import type { LucaUserTier } from "../../types/lucaUserTier";
import type { LucaExecutionRiskLevel } from "./LucaDeterministicExecution";
import type { LucaExecutionVerificationSummary } from "./LucaExecutionVerificationGate";

export type LucaExecutionReceiptStatus = "draft" | "verified" | "failed" | "rolled_back" | "blocked";

export type LucaExecutionReceiptSource =
  | "voice"
  | "chat"
  | "tool"
  | "computer_use"
  | "skill"
  | "memory"
  | "self_evolution"
  | "system"
  | "unknown";

export interface LucaExecutionEvidenceRef {
  id: string;
  kind: "log" | "screenshot" | "transcript" | "diff" | "test_result" | "receipt" | "manual_note" | "unknown";
  summary: string;
  uri?: string;
  hash?: string;
  metadata?: Record<string, unknown>;
  runtimeBehaviorChanged: false;
}

export interface LucaExecutionReceipt {
  id: string;
  intentId?: string;
  planId?: string;
  stepIds?: string[];
  status: LucaExecutionReceiptStatus;
  source: LucaExecutionReceiptSource;
  summary: string;
  evidenceRefs?: LucaExecutionEvidenceRef[];
  verificationSummary?: LucaExecutionVerificationSummary;
  riskLevel?: LucaExecutionRiskLevel;
  actorTier?: LucaUserTier;
  createdAt: string;
  metadata?: Record<string, unknown>;
  runtimeBehaviorChanged: false;
}

export interface LucaExecutionReceiptSummary {
  total: number;
  verified: number;
  failed: number;
  rolledBack: number;
  blocked: number;
  draft: number;
  evidenceRefs: number;
  runtimeBehaviorChanged: false;
  persistenceEnabled: false;
}

export interface LucaExecutionReceiptSnapshot {
  receipts: LucaExecutionReceipt[];
  summary: LucaExecutionReceiptSummary;
  runtimeBehaviorChanged: false;
  persistenceEnabled: false;
  liveExecutionEnabled: false;
  networkCallsEnabled: false;
  evidenceOnly: true;
}

function makeContractId(prefix: string, value?: string): string {
  return value && value.trim().length > 0 ? value : `${prefix}:contract-only`;
}

export function createExecutionEvidenceRef(
  input: Partial<LucaExecutionEvidenceRef> & { summary: string },
): LucaExecutionEvidenceRef {
  return {
    id: makeContractId("evidence", input.id),
    kind: input.kind ?? "unknown",
    summary: input.summary,
    uri: input.uri,
    hash: input.hash,
    metadata: input.metadata,
    runtimeBehaviorChanged: false,
  };
}

export function createExecutionReceipt(input: Partial<LucaExecutionReceipt> & { summary: string }): LucaExecutionReceipt {
  return {
    id: makeContractId("receipt", input.id),
    intentId: input.intentId,
    planId: input.planId,
    stepIds: input.stepIds ? [...input.stepIds] : undefined,
    status: input.status ?? "draft",
    source: input.source ?? "unknown",
    summary: input.summary,
    evidenceRefs: input.evidenceRefs ? [...input.evidenceRefs] : undefined,
    verificationSummary: input.verificationSummary,
    riskLevel: input.riskLevel,
    actorTier: input.actorTier,
    createdAt: input.createdAt ?? "contract-only",
    metadata: input.metadata,
    runtimeBehaviorChanged: false,
  };
}

export function summarizeExecutionReceipts(receipts: LucaExecutionReceipt[]): LucaExecutionReceiptSummary {
  return {
    total: receipts.length,
    verified: receipts.filter((receipt) => receipt.status === "verified").length,
    failed: receipts.filter((receipt) => receipt.status === "failed").length,
    rolledBack: receipts.filter((receipt) => receipt.status === "rolled_back").length,
    blocked: receipts.filter((receipt) => receipt.status === "blocked").length,
    draft: receipts.filter((receipt) => receipt.status === "draft").length,
    evidenceRefs: receipts.reduce((total, receipt) => total + (receipt.evidenceRefs?.length ?? 0), 0),
    runtimeBehaviorChanged: false,
    persistenceEnabled: false,
  };
}

export function getExecutionReceiptSnapshot(input?: { receipts?: LucaExecutionReceipt[] }): LucaExecutionReceiptSnapshot {
  const receipts = input?.receipts ?? [];

  return {
    receipts,
    summary: summarizeExecutionReceipts(receipts),
    runtimeBehaviorChanged: false,
    persistenceEnabled: false,
    liveExecutionEnabled: false,
    networkCallsEnabled: false,
    evidenceOnly: true,
  };
}
