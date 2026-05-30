// VisualCoreRemoteCommandService — PR #142: VisualCore Remote Command
// Governance.
//
// Owns the in-memory + persisted set of remote-command governance/audit
// records. It evaluates each command via VisualCoreRemoteCommandPolicy, stores
// the record (capped at 150), and emits an eventBus audit event.
//
// Hard guarantees — this service NEVER:
//   - opens/closes VisualCore or switches its mode
//   - navigates, fetches, or opens a browser
//   - moves BROWSER mode onto governed LucaBrowser
//   - executes any external action
//   - captures screen / camera / audio, reads files, or uses OCR/vision
//   - touches messaging / wireless / device execution
//
// There is intentionally NO execute / navigate / capture / file / messaging /
// wireless method on this service.

import { eventBus } from "../eventBus";
import {
  evaluateVisualCoreRemoteCommand,
  type VisualCoreRemoteCommandInput,
} from "./VisualCoreRemoteCommandPolicy";
import {
  MAX_VISUAL_CORE_REMOTE_COMMAND_RECORDS,
  VISUAL_CORE_REMOTE_COMMAND_EVENT,
  type VisualCoreRemoteCommandDiagnosticsSummary,
  type VisualCoreRemoteCommandKind,
  type VisualCoreRemoteCommandRecord,
  type VisualCoreRemoteCommandSource,
  type VisualCoreRemoteCommandStatus,
} from "../../types/visualCoreRemoteCommands";

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface RecordRemoteCommandInput extends VisualCoreRemoteCommandInput {
  source?: VisualCoreRemoteCommandSource;
  commandRecordId?: string;
  metadata?: Record<string, unknown>;
}

export interface BlockRemoteCommandInput extends RecordRemoteCommandInput {
  reason?: string;
}

export interface VisualCoreRemoteCommandServiceDependencies {
  storage?: StorageLike;
  bus?: Pick<typeof eventBus, "emitEvent" | "emit">;
}

const STORAGE_KEY = "LUCA_VISUAL_CORE_REMOTE_COMMANDS_V1";

// Remote-command audit posture applied to every record.
const SAFETY_FLAGS = {
  governanceApplied: true as const,
  recordOnly: true as const,
  executionChanged: false as const,
  captureEnabled: false as const,
  automationEnabled: false as const,
  externalActionEnabled: false as const,
  credentialSensitive: false as const,
  fileAccessEnabled: false as const,
  messagingEnabled: false as const,
  wirelessControlEnabled: false as const,
  walletPaymentEnabled: false as const,
};

function nowIso(): string {
  return new Date().toISOString();
}

function defaultStorage(): StorageLike | undefined {
  if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  if (typeof localStorage !== "undefined") return localStorage;
  return undefined;
}

function readArray(store: StorageLike | undefined): VisualCoreRemoteCommandRecord[] {
  try {
    const raw = store?.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function newId(): string {
  return `visual-remote:${nowIso()}:${Math.random().toString(36).slice(2, 8)}`;
}

export class VisualCoreRemoteCommandService {
  private records: VisualCoreRemoteCommandRecord[];
  private readonly storage?: StorageLike;
  private readonly bus: Pick<typeof eventBus, "emitEvent" | "emit">;

  constructor(deps: VisualCoreRemoteCommandServiceDependencies = {}) {
    this.storage = deps.storage ?? defaultStorage();
    this.bus = deps.bus ?? eventBus;
    this.records = readArray(this.storage);
  }

  /**
   * Evaluate and record a remote command. The policy decides the status
   * (allowed_record_only / needs_approval / blocked / ignored). This only
   * writes an audit record — it never drives VisualCore or executes anything.
   */
  recordRemoteCommand(
    input: RecordRemoteCommandInput,
  ): VisualCoreRemoteCommandRecord {
    const decision = evaluateVisualCoreRemoteCommand(input);
    const timestamp = nowIso();

    const record: VisualCoreRemoteCommandRecord = {
      ...SAFETY_FLAGS,
      // PR #143 — browserGoverned is true for BROWSER_NAVIGATE now that the
      // governed LucaBrowser adapter is connected.
      browserGoverned: decision.kind === "BROWSER_NAVIGATE",
      commandRecordId: input.commandRecordId?.trim() || newId(),
      kind: decision.kind,
      status: decision.status,
      riskLevel: decision.riskLevel,
      source: input.source ?? "unknown",
      targetMode: decision.targetMode,
      targetAuditUrl: decision.targetAuditUrl,
      blockedBy: decision.blockedBy,
      userSafeReason: decision.userSafeReason,
      receivedAt: timestamp,
      updatedAt: timestamp,
      metadata: input.metadata ? { ...input.metadata } : undefined,
    };

    this.upsert(record);
    this.audit(record);
    return record;
  }

  /**
   * Record an explicitly blocked remote command, regardless of policy outcome.
   * Always `blocked`; never executes or drives VisualCore.
   */
  blockRemoteCommand(
    input: BlockRemoteCommandInput,
  ): VisualCoreRemoteCommandRecord {
    const decision = evaluateVisualCoreRemoteCommand(input);
    const timestamp = nowIso();
    const blockedBy = [
      input.reason?.trim() || decision.blockedBy?.[0] || `blocked_command:${decision.kind}`,
    ];

    const record: VisualCoreRemoteCommandRecord = {
      ...SAFETY_FLAGS,
      browserGoverned: decision.kind === "BROWSER_NAVIGATE",
      commandRecordId: input.commandRecordId?.trim() || newId(),
      kind: decision.kind,
      status: "blocked",
      riskLevel: decision.riskLevel,
      source: input.source ?? "unknown",
      targetMode: decision.targetMode,
      targetAuditUrl: decision.targetAuditUrl,
      blockedBy,
      userSafeReason: decision.userSafeReason,
      receivedAt: timestamp,
      updatedAt: timestamp,
      metadata: input.metadata ? { ...input.metadata } : undefined,
    };

    this.upsert(record);
    this.audit(record);
    return record;
  }

  getRemoteCommandRecord(
    commandRecordId: string,
  ): VisualCoreRemoteCommandRecord | undefined {
    return this.records.find((r) => r.commandRecordId === commandRecordId);
  }

  listRemoteCommandRecords(
    kind?: VisualCoreRemoteCommandKind,
  ): VisualCoreRemoteCommandRecord[] {
    if (!kind) return [...this.records];
    return this.records.filter((r) => r.kind === kind);
  }

  getDiagnosticsSummary(): VisualCoreRemoteCommandDiagnosticsSummary {
    const count = (status: VisualCoreRemoteCommandStatus) =>
      this.records.filter((r) => r.status === status).length;
    const governedCount = this.records.filter((r) => r.browserGoverned).length;
    return {
      totalCommands: this.records.length,
      receivedCommands: count("received"),
      allowedRecordOnlyCommands: count("allowed_record_only"),
      blockedCommands: count("blocked"),
      needsApprovalCommands: count("needs_approval"),
      ignoredCommands: count("ignored"),
      browserNavigateCommands: this.records.filter((r) => r.kind === "BROWSER_NAVIGATE").length,
      lastCommandAt: this.records[0]?.updatedAt ?? null,
      governanceApplied: true,
      recordOnly: true,
      executionChanged: false,
      browserGovernanceAvailable: true,
      browserGovernedCommandSeen: governedCount > 0,
      browserGovernedCommandCount: governedCount,
      captureEnabled: false,
      automationEnabled: false,
      externalActionEnabled: false,
      fileAccessEnabled: false,
      messagingEnabled: false,
      wirelessControlEnabled: false,
      walletPaymentEnabled: false,
    };
  }

  // -----------------------------------------------------------------------
  // Private
  // -----------------------------------------------------------------------

  private upsert(record: VisualCoreRemoteCommandRecord): void {
    this.records = [
      record,
      ...this.records.filter((r) => r.commandRecordId !== record.commandRecordId),
    ].slice(0, MAX_VISUAL_CORE_REMOTE_COMMAND_RECORDS);
    this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.records));
    this.bus.emit(VISUAL_CORE_REMOTE_COMMAND_EVENT, record);
  }

  private audit(record: VisualCoreRemoteCommandRecord): void {
    this.bus.emitEvent({
      type: VISUAL_CORE_REMOTE_COMMAND_EVENT,
      message: `VisualCore remote command ${record.status}: ${record.kind}`,
      priority:
        record.status === "blocked" || record.status === "needs_approval"
          ? "HIGH"
          : "LOW",
      context: {
        commandRecordId: record.commandRecordId,
        kind: record.kind,
        status: record.status,
        riskLevel: record.riskLevel,
        source: record.source,
        targetMode: record.targetMode,
        targetAuditUrl: record.targetAuditUrl,
        blockedBy: record.blockedBy ?? [],
        governanceApplied: true,
        recordOnly: true,
        executionChanged: false,
        browserGovernanceAvailable: true,
        browserGovernedCommandSeen: record.browserGoverned,
        captureEnabled: false,
        automationEnabled: false,
        externalActionEnabled: false,
        fileAccessEnabled: false,
        messagingEnabled: false,
        wirelessControlEnabled: false,
      },
    });
  }
}

/** Shared singleton used by the VisualCore UI integration. */
export const visualCoreRemoteCommandService = new VisualCoreRemoteCommandService();

// Module-level convenience functions bound to the shared singleton.
export const recordRemoteCommand = (
  input: RecordRemoteCommandInput,
): VisualCoreRemoteCommandRecord =>
  visualCoreRemoteCommandService.recordRemoteCommand(input);

export const blockRemoteCommand = (
  input: BlockRemoteCommandInput,
): VisualCoreRemoteCommandRecord =>
  visualCoreRemoteCommandService.blockRemoteCommand(input);

export const getRemoteCommandRecord = (
  commandRecordId: string,
): VisualCoreRemoteCommandRecord | undefined =>
  visualCoreRemoteCommandService.getRemoteCommandRecord(commandRecordId);

export const listRemoteCommandRecords = (
  kind?: VisualCoreRemoteCommandKind,
): VisualCoreRemoteCommandRecord[] =>
  visualCoreRemoteCommandService.listRemoteCommandRecords(kind);

export const getRemoteCommandDiagnosticsSummary = (): VisualCoreRemoteCommandDiagnosticsSummary =>
  visualCoreRemoteCommandService.getDiagnosticsSummary();
