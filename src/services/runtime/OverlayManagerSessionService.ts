// OverlayManagerSessionService — PR #149: OverlayManager Governed Overlay
// Session Records.
//
// Owns the in-memory + persisted set of record-only session records for the
// low-risk display-only overlay surfaces PR #148 classified. Mirrors the safe
// VisualCore display session record pattern from PR #141
// (VisualCoreDisplaySessionService).
//
// Hard guarantees — this service NEVER:
//   - governs/wraps/gates sensitive overlay surfaces (VoiceHud, SecurityGate,
//     capture surfaces, OriginOverlayPanels, Android native overlay, etc.) —
//     they are recorded as `blocked` only, never `open`
//   - changes OverlayManager behavior, show/hide logic, z-index, focus, or
//     pointer-events behavior
//   - adds/removes overlays, or opens/closes an overlay (it only records
//     lifecycle metadata)
//   - executes any external action, automation, click/type/scroll, DOM reading,
//     screenshot/OCR/vision, file access, messaging, wireless/device control,
//     tool execution, or wallet/payment
//
// It evaluates a surface via OverlayManagerGovernancePolicy, records the
// lifecycle, caps storage at 100 records, and emits an eventBus audit event.

import { eventBus } from "../eventBus";
import {
  getOverlayManagerArchitectureAuditSummary,
  getOverlaySurfacePolicy,
} from "./OverlayManagerGovernancePolicy";
import {
  MAX_OVERLAY_SESSIONS,
  OVERLAY_SESSION_EVENT,
  type OverlaySessionDiagnosticsSummary,
  type OverlaySessionRecord,
  type OverlaySessionSource,
  type OverlaySessionStatus,
} from "../../types/overlayManagerSessions";
import type { OverlaySurfaceId } from "../../types/overlayManagerGovernance";

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface CreateOverlaySessionInput {
  overlaySurfaceId: OverlaySurfaceId;
  source: OverlaySessionSource;
  overlaySessionId?: string;
  label?: string;
  metadata?: Record<string, unknown>;
}

export interface OverlayManagerSessionServiceDependencies {
  storage?: StorageLike;
  bus?: Pick<typeof eventBus, "emitEvent" | "emit">;
}

const STORAGE_KEY = "LUCA_OVERLAY_MANAGER_SESSIONS_V1";

// Record-only safety posture applied to every record. Never toggled.
const SAFETY_FLAGS = {
  governanceApplied: true,
  recordOnly: true,
  executionChanged: false,
  captureEnabled: false,
  automationEnabled: false,
  externalActionEnabled: false,
  fileAccessEnabled: false,
  messagingEnabled: false,
  wirelessControlEnabled: false,
  walletPaymentEnabled: false,
  sensitiveSurfaceEnabled: false,
} as const;

function nowIso(): string {
  return new Date().toISOString();
}

function defaultStorage(): StorageLike | undefined {
  if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  if (typeof localStorage !== "undefined") return localStorage;
  return undefined;
}

function readArray(store: StorageLike | undefined): OverlaySessionRecord[] {
  try {
    const raw = store?.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function newId(): string {
  return `overlay-session:${nowIso()}:${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * A surface is eligible for a record-only overlay session only when PR #148
 * classified it as a low-risk display-only surface that is neither sensitive,
 * needs-governance, nor blocked-until-policy. This excludes `live_content`
 * (elevated + needs-governance) and every sensitive surface.
 */
export function isOverlaySurfaceSessionEligible(id: OverlaySurfaceId): boolean {
  const policy = getOverlaySurfacePolicy(id);
  if (!policy) return false;
  return (
    policy.riskLevel === "low" &&
    policy.postures.includes("display-only") &&
    !policy.sensitive &&
    !policy.postures.includes("needs-governance") &&
    !policy.postures.includes("blocked-until-policy")
  );
}

/** Audit-safe, user-facing reason describing why a record exists / is blocked. */
export function getOverlaySessionReason(id: OverlaySurfaceId): string {
  const policy = getOverlaySurfacePolicy(id);
  if (!policy) {
    return "Unknown overlay surface — recorded as blocked; not governed.";
  }
  if (isOverlaySurfaceSessionEligible(id)) {
    return `${policy.label} is a low-risk display-only overlay — recorded for audit only. No behavior changed.`;
  }
  return `${policy.label} is not a low-risk display-only overlay — recorded as blocked. This PR does not govern sensitive surfaces.`;
}

export class OverlayManagerSessionService {
  private sessions: OverlaySessionRecord[];
  private readonly storage?: StorageLike;
  private readonly bus: Pick<typeof eventBus, "emitEvent" | "emit">;

  constructor(deps: OverlayManagerSessionServiceDependencies = {}) {
    this.storage = deps.storage ?? defaultStorage();
    this.bus = deps.bus ?? eventBus;
    this.sessions = readArray(this.storage);
  }

  /**
   * Create an overlay session record for a surface. Eligible low-risk
   * display-only surfaces open as `open_requested`; any ineligible/sensitive
   * surface is recorded as `blocked` (never opened). Never changes OverlayManager
   * or executes anything.
   */
  createOverlaySession(input: CreateOverlaySessionInput): OverlaySessionRecord {
    const policy = getOverlaySurfacePolicy(input.overlaySurfaceId);
    const eligible = isOverlaySurfaceSessionEligible(input.overlaySurfaceId);
    const timestamp = nowIso();

    const blockedBy = eligible
      ? undefined
      : [
          policy
            ? `not_display_only_eligible:${policy.riskLevel}`
            : "unknown_overlay_surface",
        ];

    const record: OverlaySessionRecord = {
      ...SAFETY_FLAGS,
      overlaySessionId: input.overlaySessionId?.trim() || newId(),
      overlaySurfaceId: input.overlaySurfaceId,
      status: eligible ? "open_requested" : "blocked",
      source: input.source,
      label: input.label?.trim() || policy?.label || input.overlaySurfaceId,
      riskLevel: policy?.riskLevel ?? "critical",
      postures: policy ? [...policy.postures] : [],
      openedAt: timestamp,
      updatedAt: timestamp,
      blockedBy,
      userSafeReason: getOverlaySessionReason(input.overlaySurfaceId),
      metadata: input.metadata ? { ...input.metadata } : undefined,
    };

    this.upsert(record);
    this.audit(record);
    return record;
  }

  /** Transition an eligible record to `open`. Blocked records never open. */
  markOverlaySessionOpen(
    overlaySessionId: string,
  ): OverlaySessionRecord | undefined {
    const existing = this.getOverlaySession(overlaySessionId);
    if (!existing) return undefined;
    if (existing.status === "blocked") return existing;
    return this.transition(overlaySessionId, "open");
  }

  /** Transition an eligible record to `closed`. Blocked records never close. */
  markOverlaySessionClosed(
    overlaySessionId: string,
  ): OverlaySessionRecord | undefined {
    const existing = this.getOverlaySession(overlaySessionId);
    if (!existing) return undefined;
    if (existing.status === "blocked") return existing;
    return this.transition(overlaySessionId, "closed", { closedAt: nowIso() });
  }

  getOverlaySession(
    overlaySessionId: string,
  ): OverlaySessionRecord | undefined {
    return this.sessions.find((s) => s.overlaySessionId === overlaySessionId);
  }

  listOverlaySessions(
    overlaySurfaceId?: OverlaySurfaceId,
  ): OverlaySessionRecord[] {
    if (!overlaySurfaceId) return [...this.sessions];
    return this.sessions.filter((s) => s.overlaySurfaceId === overlaySurfaceId);
  }

  getDiagnosticsSummary(): OverlaySessionDiagnosticsSummary {
    const count = (status: OverlaySessionStatus) =>
      this.sessions.filter((s) => s.status === status).length;
    const audit = getOverlayManagerArchitectureAuditSummary();
    return {
      ...SAFETY_FLAGS,
      totalSessions: this.sessions.length,
      openRequestedSessions: count("open_requested"),
      openSessions: count("open"),
      closedSessions: count("closed"),
      blockedSessions: count("blocked"),
      lastSessionAt: this.sessions[0]?.updatedAt ?? null,
      eligibleSurfaceCount: audit.displayOnlySurfaces.filter((id) =>
        isOverlaySurfaceSessionEligible(id),
      ).length,
      sensitiveSurfaceCount: audit.sensitiveSurfaceCount,
    };
  }

  // -----------------------------------------------------------------------
  // Private
  // -----------------------------------------------------------------------

  private transition(
    overlaySessionId: string,
    status: OverlaySessionStatus,
    extra?: Partial<OverlaySessionRecord>,
  ): OverlaySessionRecord | undefined {
    const existing = this.getOverlaySession(overlaySessionId);
    if (!existing) return undefined;
    const next: OverlaySessionRecord = {
      ...existing,
      ...extra,
      status,
      updatedAt: nowIso(),
    };
    this.upsert(next);
    this.audit(next);
    return next;
  }

  private upsert(record: OverlaySessionRecord): void {
    this.sessions = [
      record,
      ...this.sessions.filter(
        (s) => s.overlaySessionId !== record.overlaySessionId,
      ),
    ].slice(0, MAX_OVERLAY_SESSIONS);
    this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.sessions));
    this.bus.emit(OVERLAY_SESSION_EVENT, record);
  }

  private audit(record: OverlaySessionRecord): void {
    this.bus.emitEvent({
      type: OVERLAY_SESSION_EVENT,
      message: `Overlay session ${record.status}: ${record.overlaySurfaceId}`,
      priority: record.status === "blocked" ? "HIGH" : "LOW",
      context: {
        overlaySessionId: record.overlaySessionId,
        overlaySurfaceId: record.overlaySurfaceId,
        status: record.status,
        riskLevel: record.riskLevel,
        source: record.source,
        blockedBy: record.blockedBy ?? [],
        governanceApplied: true,
        recordOnly: true,
        executionChanged: false,
        captureEnabled: false,
        automationEnabled: false,
        externalActionEnabled: false,
        fileAccessEnabled: false,
        messagingEnabled: false,
        wirelessControlEnabled: false,
        walletPaymentEnabled: false,
        sensitiveSurfaceEnabled: false,
      },
    });
  }
}

/** Shared singleton used by the ControlPanel diagnostics integration. */
export const overlayManagerSessionService = new OverlayManagerSessionService();

// Module-level convenience functions bound to the shared singleton.
export const createOverlaySession = (
  input: CreateOverlaySessionInput,
): OverlaySessionRecord =>
  overlayManagerSessionService.createOverlaySession(input);

export const markOverlaySessionOpen = (
  overlaySessionId: string,
): OverlaySessionRecord | undefined =>
  overlayManagerSessionService.markOverlaySessionOpen(overlaySessionId);

export const markOverlaySessionClosed = (
  overlaySessionId: string,
): OverlaySessionRecord | undefined =>
  overlayManagerSessionService.markOverlaySessionClosed(overlaySessionId);

export const listOverlaySessions = (
  overlaySurfaceId?: OverlaySurfaceId,
): OverlaySessionRecord[] =>
  overlayManagerSessionService.listOverlaySessions(overlaySurfaceId);

export const getOverlaySessionDiagnosticsSummary = (): OverlaySessionDiagnosticsSummary =>
  overlayManagerSessionService.getDiagnosticsSummary();
