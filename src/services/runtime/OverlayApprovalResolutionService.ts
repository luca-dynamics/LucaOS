import { eventBus } from "../eventBus";
import {
  MAX_OVERLAY_APPROVAL_RESOLUTIONS,
  OVERLAY_APPROVAL_RESOLUTION_EVENT,
  type OverlayApprovalResolutionDecision,
  type OverlayApprovalResolutionDiagnosticsSummary,
  type OverlayApprovalResolutionRecord,
  type OverlayApprovalResolutionSafetyFlags,
  type OverlayApprovalResolutionSource,
  type OverlayApprovalResolutionStatus,
} from "../../types/overlayApprovalResolution";

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface PendingOverlayApprovalRequest {
  resolve: (approved: boolean) => void;
}

export interface ResolveOverlayApprovalInput {
  source: OverlayApprovalResolutionSource;
  decision?: OverlayApprovalResolutionDecision | string | null;
  approvalRequest?: PendingOverlayApprovalRequest | null;
  clearApprovalRequest?: () => void;
}

export interface OverlayApprovalResolutionServiceDependencies {
  storage?: StorageLike;
  bus?: Pick<typeof eventBus, "emitEvent" | "emit">;
}

const STORAGE_KEY = "LUCA_OVERLAY_APPROVAL_RESOLUTIONS_V1";

const SAFETY_FLAGS: OverlayApprovalResolutionSafetyFlags = {
  governanceApplied: true,
  approvalResolutionOnly: true,
  executionChanged: false,
  toolExecutionEnabled: false,
  captureEnabled: false,
  automationEnabled: false,
  externalActionEnabled: false,
  fileAccessEnabled: false,
  messagingEnabled: false,
  wirelessControlEnabled: false,
  walletPaymentEnabled: false,
  sensitiveSurfaceEnabled: false,
};

function nowIso(): string {
  return new Date().toISOString();
}

function newId(): string {
  return `overlay-approval-resolution:${nowIso()}:${Math.random().toString(36).slice(2, 8)}`;
}

function defaultStorage(): StorageLike | undefined {
  if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  if (typeof localStorage !== "undefined") return localStorage;
  return undefined;
}

function readArray(store: StorageLike | undefined): OverlayApprovalResolutionRecord[] {
  try {
    const raw = store?.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeDecision(
  decision: ResolveOverlayApprovalInput["decision"],
): OverlayApprovalResolutionDecision | undefined {
  if (decision === "approve" || decision === "deny") return decision;
  return undefined;
}

function reasonFor(
  source: OverlayApprovalResolutionSource,
  decision: OverlayApprovalResolutionDecision | "unknown",
  status: OverlayApprovalResolutionStatus,
): string {
  if (status === "resolved") {
    return `${source} ${decision} resolved an existing pending approval through governed approval resolution.`;
  }
  if (status === "blocked_no_pending_request") {
    return `${source} ${decision} did not resolve because no approval request was pending.`;
  }
  if (status === "blocked_unrecognized_decision") {
    return `${source} input was not recognized as approve or deny; no approval was resolved.`;
  }
  return `${source} ${decision} approval-resolution attempt recorded.`;
}

export class OverlayApprovalResolutionService {
  private records: OverlayApprovalResolutionRecord[];
  private readonly storage?: StorageLike;
  private readonly bus: Pick<typeof eventBus, "emitEvent" | "emit">;

  constructor(deps: OverlayApprovalResolutionServiceDependencies = {}) {
    this.storage = deps.storage ?? defaultStorage();
    this.bus = deps.bus ?? eventBus;
    this.records = readArray(this.storage);
  }

  resolveApproval(input: ResolveOverlayApprovalInput): OverlayApprovalResolutionRecord {
    const decision = normalizeDecision(input.decision);
    if (!decision) {
      return this.#record(input.source, "unknown", "blocked_unrecognized_decision", [
        "unrecognized_approval_decision",
      ]);
    }
    if (!input.approvalRequest) {
      return this.#record(input.source, decision, "blocked_no_pending_request", [
        "no_pending_approval_request",
      ]);
    }

    this.#record(input.source, decision, "recorded");
    input.approvalRequest.resolve(decision === "approve");
    input.clearApprovalRequest?.();
    return this.#record(input.source, decision, "resolved");
  }

  listRecords(): OverlayApprovalResolutionRecord[] {
    return [...this.records];
  }

  getDiagnosticsSummary(): OverlayApprovalResolutionDiagnosticsSummary {
    const count = (status: OverlayApprovalResolutionStatus) =>
      this.records.filter((record) => record.status === status).length;
    return {
      ...SAFETY_FLAGS,
      totalRecords: this.records.length,
      recordedAttempts: count("recorded"),
      resolvedAttempts: count("resolved"),
      blockedNoPendingRequestAttempts: count("blocked_no_pending_request"),
      blockedUnrecognizedDecisionAttempts: count("blocked_unrecognized_decision"),
      voiceHudAttempts: this.records.filter((record) => record.source === "voice_hud").length,
      securityGateAttempts: this.records.filter((record) => record.source === "security_gate").length,
      lastResolutionAt: this.records[0]?.timestamp ?? null,
    };
  }

  #record(
    source: OverlayApprovalResolutionSource,
    decision: OverlayApprovalResolutionDecision | "unknown",
    status: OverlayApprovalResolutionStatus,
    blockedBy?: string[],
  ): OverlayApprovalResolutionRecord {
    const record: OverlayApprovalResolutionRecord = {
      ...SAFETY_FLAGS,
      approvalResolutionId: newId(),
      source,
      decision,
      status,
      timestamp: nowIso(),
      userSafeReason: reasonFor(source, decision, status),
      blockedBy,
    };

    this.records = [record, ...this.records].slice(0, MAX_OVERLAY_APPROVAL_RESOLUTIONS);
    this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.records));
    this.bus.emit(OVERLAY_APPROVAL_RESOLUTION_EVENT, record);
    this.bus.emitEvent({
      type: OVERLAY_APPROVAL_RESOLUTION_EVENT,
      message: `Overlay approval resolution ${status}: ${source}`,
      priority: blockedBy ? "HIGH" : "LOW",
      context: {
        approvalResolutionId: record.approvalResolutionId,
        source,
        decision,
        status,
        blockedBy: blockedBy ?? [],
        governanceApplied: true,
        approvalResolutionOnly: true,
        executionChanged: false,
        toolExecutionEnabled: false,
      },
    });
    return record;
  }
}

export const overlayApprovalResolutionService = new OverlayApprovalResolutionService();
