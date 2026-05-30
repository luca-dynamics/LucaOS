// VisualCoreDisplaySessionService — PR #141: VisualCore Governed Display
// Session Records.
//
// Owns the in-memory + persisted set of display-only session records for
// low-risk VisualCore modes (PR #140 `ready_for_display_governance`).
//
// Hard guarantees — this service NEVER:
//   - governs/wraps/gates sensitive VisualCore modes (they are recorded as
//     `blocked` only, never `open`)
//   - changes VisualCore behavior, mode switching, or IPC behavior
//   - opens/closes VisualCore (it only records lifecycle metadata)
//   - executes any external action, captures screen/camera/audio, reads files,
//     or uses OCR/vision
//   - touches messaging / wireless / browser / code / finance sensitive modes
//
// It evaluates a mode via VisualCoreDisplayGovernance, records the lifecycle,
// caps storage at 100 records, and emits an eventBus audit event.

import { eventBus } from "../eventBus";
import {
  getVisualCoreDisplaySessionReason,
  shouldRecordVisualCoreDisplaySession,
} from "./VisualCoreDisplayGovernance";
import {
  getVisualCoreArchitectureAuditSummary,
  getVisualCoreSurfacePolicy,
} from "./VisualCoreGovernancePolicy";
import {
  MAX_VISUAL_CORE_DISPLAY_SESSIONS,
  VISUAL_CORE_DISPLAY_SESSION_EVENT,
  type VisualCoreDisplaySessionDiagnosticsSummary,
  type VisualCoreDisplaySessionRecord,
  type VisualCoreDisplaySessionSource,
  type VisualCoreDisplaySessionStatus,
} from "../../types/visualCoreSessions";
import type { VisualCoreSurfaceMode } from "../../types/visualCoreGovernance";

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface CreateVisualCoreDisplaySessionInput {
  mode: VisualCoreSurfaceMode;
  source: VisualCoreDisplaySessionSource;
  visualSessionId?: string;
  label?: string;
  metadata?: Record<string, unknown>;
}

export interface BlockVisualCoreDisplaySessionInput {
  mode: VisualCoreSurfaceMode;
  source: VisualCoreDisplaySessionSource;
  reason?: string;
  visualSessionId?: string;
  metadata?: Record<string, unknown>;
}

export interface VisualCoreDisplaySessionServiceDependencies {
  storage?: StorageLike;
  bus?: Pick<typeof eventBus, "emitEvent" | "emit">;
}

const STORAGE_KEY = "LUCA_VISUAL_CORE_DISPLAY_SESSIONS_V1";

// Display-only safety posture applied to every record. Never toggled.
const SAFETY_FLAGS = {
  governanceApplied: true,
  displayOnly: true,
  captureEnabled: false,
  automationEnabled: false,
  externalActionEnabled: false,
  credentialSensitive: false,
  walletPaymentEnabled: false,
  fileAccessEnabled: false,
  messagingEnabled: false,
  wirelessControlEnabled: false,
} as const;

function nowIso(): string {
  return new Date().toISOString();
}

function defaultStorage(): StorageLike | undefined {
  if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  if (typeof localStorage !== "undefined") return localStorage;
  return undefined;
}

function readArray(store: StorageLike | undefined): VisualCoreDisplaySessionRecord[] {
  try {
    const raw = store?.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function newId(): string {
  return `visual-display:${nowIso()}:${Math.random().toString(36).slice(2, 8)}`;
}

export class VisualCoreDisplaySessionService {
  private sessions: VisualCoreDisplaySessionRecord[];
  private readonly storage?: StorageLike;
  private readonly bus: Pick<typeof eventBus, "emitEvent" | "emit">;

  constructor(deps: VisualCoreDisplaySessionServiceDependencies = {}) {
    this.storage = deps.storage ?? defaultStorage();
    this.bus = deps.bus ?? eventBus;
    this.sessions = readArray(this.storage);
  }

  /**
   * Create a display session record for a mode. Low-risk display modes open as
   * `open_requested`; any non-ready/sensitive mode is recorded as `blocked`
   * (never opened). Never changes VisualCore or executes anything.
   */
  createDisplaySession(
    input: CreateVisualCoreDisplaySessionInput,
  ): VisualCoreDisplaySessionRecord {
    const policy = getVisualCoreSurfacePolicy(input.mode);
    const eligible = shouldRecordVisualCoreDisplaySession(input.mode);
    const timestamp = nowIso();

    const blockedBy = eligible
      ? undefined
      : [`not_ready_for_display_governance:${policy?.readiness ?? "unknown"}`];

    const record: VisualCoreDisplaySessionRecord = {
      ...SAFETY_FLAGS,
      visualSessionId: input.visualSessionId?.trim() || newId(),
      mode: input.mode,
      status: eligible ? "open_requested" : "blocked",
      label: input.label?.trim() || policy?.label || input.mode,
      riskLevel: policy?.riskLevel ?? "high",
      readiness: policy?.readiness ?? "needs_manual_review",
      source: input.source,
      openedAt: timestamp,
      updatedAt: timestamp,
      blockedBy,
      userSafeReason: getVisualCoreDisplaySessionReason(input.mode),
      metadata: input.metadata ? { ...input.metadata } : undefined,
    };

    this.upsert(record);
    this.audit(record);
    return record;
  }

  /**
   * Record an explicit blocked display session for a non-eligible/sensitive
   * mode. Always `blocked`; never opens or governs the mode.
   */
  blockDisplaySession(
    input: BlockVisualCoreDisplaySessionInput,
  ): VisualCoreDisplaySessionRecord {
    const policy = getVisualCoreSurfacePolicy(input.mode);
    const timestamp = nowIso();
    const blockedBy = [
      input.reason?.trim() ||
        `blocked_mode:${policy?.readiness ?? "needs_manual_review"}`,
    ];

    const record: VisualCoreDisplaySessionRecord = {
      ...SAFETY_FLAGS,
      visualSessionId: input.visualSessionId?.trim() || newId(),
      mode: input.mode,
      status: "blocked",
      label: policy?.label || input.mode,
      riskLevel: policy?.riskLevel ?? "high",
      readiness: policy?.readiness ?? "needs_manual_review",
      source: input.source,
      openedAt: timestamp,
      updatedAt: timestamp,
      blockedBy,
      userSafeReason: getVisualCoreDisplaySessionReason(input.mode),
      metadata: input.metadata ? { ...input.metadata } : undefined,
    };

    this.upsert(record);
    this.audit(record);
    return record;
  }

  markDisplaySessionOpen(
    visualSessionId: string,
  ): VisualCoreDisplaySessionRecord | undefined {
    const existing = this.getDisplaySession(visualSessionId);
    if (!existing) return undefined;
    // Blocked records never transition to open.
    if (existing.status === "blocked") return existing;
    return this.transition(visualSessionId, "open");
  }

  pauseDisplaySession(
    visualSessionId: string,
    reason?: string,
  ): VisualCoreDisplaySessionRecord | undefined {
    const existing = this.getDisplaySession(visualSessionId);
    if (!existing || existing.status === "blocked") return existing;
    return this.transition(visualSessionId, "paused", reason);
  }

  resumeDisplaySession(
    visualSessionId: string,
  ): VisualCoreDisplaySessionRecord | undefined {
    const existing = this.getDisplaySession(visualSessionId);
    if (!existing || existing.status === "blocked") return existing;
    return this.transition(visualSessionId, "open");
  }

  closeDisplaySession(
    visualSessionId: string,
  ): VisualCoreDisplaySessionRecord | undefined {
    const existing = this.getDisplaySession(visualSessionId);
    if (!existing || existing.status === "blocked") return existing;
    return this.transition(visualSessionId, "closed", undefined, {
      closedAt: nowIso(),
    });
  }

  revokeDisplaySession(
    visualSessionId: string,
    reason?: string,
  ): VisualCoreDisplaySessionRecord | undefined {
    const existing = this.getDisplaySession(visualSessionId);
    if (!existing) return undefined;
    return this.transition(visualSessionId, "revoked", reason, {
      revokedAt: nowIso(),
    });
  }

  getDisplaySession(
    visualSessionId: string,
  ): VisualCoreDisplaySessionRecord | undefined {
    return this.sessions.find((s) => s.visualSessionId === visualSessionId);
  }

  listDisplaySessions(
    mode?: VisualCoreSurfaceMode,
  ): VisualCoreDisplaySessionRecord[] {
    if (!mode) return [...this.sessions];
    return this.sessions.filter((s) => s.mode === mode);
  }

  getDiagnosticsSummary(): VisualCoreDisplaySessionDiagnosticsSummary {
    const count = (status: VisualCoreDisplaySessionStatus) =>
      this.sessions.filter((s) => s.status === status).length;
    const audit = getVisualCoreArchitectureAuditSummary();
    return {
      totalSessions: this.sessions.length,
      openRequestedSessions: count("open_requested"),
      openSessions: count("open"),
      pausedSessions: count("paused"),
      closedSessions: count("closed"),
      revokedSessions: count("revoked"),
      blockedSessions: count("blocked"),
      lastSessionAt: this.sessions[0]?.updatedAt ?? null,
      readyDisplayModeCount: audit.readyForDisplayGovernanceCount,
      sensitiveModeCount: audit.sensitiveModeCount,
      governanceApplied: true,
      displayOnly: true,
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

  private transition(
    visualSessionId: string,
    status: VisualCoreDisplaySessionStatus,
    reason?: string,
    extra?: Partial<VisualCoreDisplaySessionRecord>,
  ): VisualCoreDisplaySessionRecord | undefined {
    const existing = this.getDisplaySession(visualSessionId);
    if (!existing) return undefined;
    const next: VisualCoreDisplaySessionRecord = {
      ...existing,
      ...extra,
      status,
      updatedAt: nowIso(),
      metadata: reason
        ? { ...existing.metadata, transitionReason: reason }
        : existing.metadata,
    };
    this.upsert(next);
    this.audit(next);
    return next;
  }

  private upsert(record: VisualCoreDisplaySessionRecord): void {
    this.sessions = [
      record,
      ...this.sessions.filter((s) => s.visualSessionId !== record.visualSessionId),
    ].slice(0, MAX_VISUAL_CORE_DISPLAY_SESSIONS);
    this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.sessions));
    this.bus.emit(VISUAL_CORE_DISPLAY_SESSION_EVENT, record);
  }

  private audit(record: VisualCoreDisplaySessionRecord): void {
    this.bus.emitEvent({
      type: VISUAL_CORE_DISPLAY_SESSION_EVENT,
      message: `VisualCore display session ${record.status}: ${record.mode}`,
      priority: record.status === "blocked" ? "HIGH" : "LOW",
      context: {
        visualSessionId: record.visualSessionId,
        mode: record.mode,
        status: record.status,
        riskLevel: record.riskLevel,
        readiness: record.readiness,
        source: record.source,
        blockedBy: record.blockedBy ?? [],
        governanceApplied: true,
        displayOnly: true,
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
export const visualCoreDisplaySessionService = new VisualCoreDisplaySessionService();

// Module-level convenience functions bound to the shared singleton.
export const createDisplaySession = (
  input: CreateVisualCoreDisplaySessionInput,
): VisualCoreDisplaySessionRecord =>
  visualCoreDisplaySessionService.createDisplaySession(input);

export const blockDisplaySession = (
  input: BlockVisualCoreDisplaySessionInput,
): VisualCoreDisplaySessionRecord =>
  visualCoreDisplaySessionService.blockDisplaySession(input);

export const markDisplaySessionOpen = (
  visualSessionId: string,
): VisualCoreDisplaySessionRecord | undefined =>
  visualCoreDisplaySessionService.markDisplaySessionOpen(visualSessionId);

export const pauseDisplaySession = (
  visualSessionId: string,
  reason?: string,
): VisualCoreDisplaySessionRecord | undefined =>
  visualCoreDisplaySessionService.pauseDisplaySession(visualSessionId, reason);

export const resumeDisplaySession = (
  visualSessionId: string,
): VisualCoreDisplaySessionRecord | undefined =>
  visualCoreDisplaySessionService.resumeDisplaySession(visualSessionId);

export const closeDisplaySession = (
  visualSessionId: string,
): VisualCoreDisplaySessionRecord | undefined =>
  visualCoreDisplaySessionService.closeDisplaySession(visualSessionId);

export const revokeDisplaySession = (
  visualSessionId: string,
  reason?: string,
): VisualCoreDisplaySessionRecord | undefined =>
  visualCoreDisplaySessionService.revokeDisplaySession(visualSessionId, reason);

export const getDisplaySession = (
  visualSessionId: string,
): VisualCoreDisplaySessionRecord | undefined =>
  visualCoreDisplaySessionService.getDisplaySession(visualSessionId);

export const listDisplaySessions = (
  mode?: VisualCoreSurfaceMode,
): VisualCoreDisplaySessionRecord[] =>
  visualCoreDisplaySessionService.listDisplaySessions(mode);

export const getDiagnosticsSummary = (): VisualCoreDisplaySessionDiagnosticsSummary =>
  visualCoreDisplaySessionService.getDiagnosticsSummary();
