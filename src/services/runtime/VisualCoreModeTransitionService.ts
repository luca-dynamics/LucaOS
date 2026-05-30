// VisualCoreModeTransitionService — PR #145: VisualCore Governed Mode
// Transition Guard.
//
// Centralizes and audits VisualCore mode transitions. Every setMode() call
// should pass through this guard so transitions are policy-evaluated and
// recorded.
//
// Hard guarantees:
//   - NEVER changes VisualCore behavior beyond gating/auditing transitions.
//   - NEVER enables capture / screenshot / OCR / vision / file / messaging /
//     wireless / tool execution.
//   - NEVER adds browser automation, click/type/scroll, or DOM reading.
//   - NEVER enables sensitive VisualCore modes.
//   - Sensitive modes are blocked; BROWSER requires governed session context.
//   - Safe display modes proceed immediately.

import { getVisualCoreSurfacePolicy } from "./VisualCoreGovernancePolicy";
import { eventBus } from "../eventBus";
import type {
  VisualCoreModeTransitionDecision,
  VisualCoreModeTransitionDiagnosticsSummary,
  VisualCoreModeTransitionRecord,
  VisualCoreModeTransitionSource,
  VisualCoreModeTransitionStatus,
} from "../../types/visualCoreModeTransitions";
import {
  MAX_VISUAL_CORE_MODE_TRANSITION_RECORDS,
  VISUAL_CORE_KNOWN_MODES,
  VISUAL_CORE_MODE_TRANSITION_EVENT,
} from "../../types/visualCoreModeTransitions";

// ---------------------------------------------------------------------------
// Policy evaluation
// ---------------------------------------------------------------------------

export interface EvaluateModeTransitionInput {
  fromMode: string;
  toMode: string;
  source: VisualCoreModeTransitionSource;
  /** Whether a governed browser shell session is active (for BROWSER mode). */
  hasBrowserSession?: boolean;
}

/**
 * Evaluate whether a mode transition is allowed, blocked, or needs approval.
 * Pure function — no side effects, no record writing.
 */
export function evaluateModeTransition(
  input: EvaluateModeTransitionInput,
): VisualCoreModeTransitionDecision {
  const { fromMode, toMode, source, hasBrowserSession } = input;

  // Unknown target mode — always blocked.
  if (!VISUAL_CORE_KNOWN_MODES.has(toMode)) {
    return {
      fromMode,
      toMode,
      status: "blocked_unknown",
      source,
      userSafeReason: `Unknown target mode "${toMode}" — transition blocked.`,
      blockedBy: ["unknown_target_mode"],
    };
  }

  // IDLE is always allowed (safe return state).
  if (toMode === "IDLE") {
    return {
      fromMode,
      toMode,
      status: "allowed",
      source,
      userSafeReason: `Transition to IDLE allowed — safe return state.`,
    };
  }

  // Look up target mode governance policy.
  const policy = getVisualCoreSurfacePolicy(toMode as never);

  // BROWSER mode — allowed ONLY when a governed browser shell session exists.
  if (toMode === "BROWSER") {
    if (hasBrowserSession) {
      return {
        fromMode,
        toMode,
        status: "allowed_governed_browser",
        source,
        userSafeReason: `Transition to BROWSER allowed — governed LucaBrowser session active.`,
      };
    }
    return {
      fromMode,
      toMode,
      status: "blocked_browser_no_session",
      source,
      userSafeReason: `Transition to BROWSER blocked — no governed browser session context.`,
      blockedBy: ["browser_no_governed_session"],
    };
  }

  // Sensitive modes — blocked.
  if (policy?.sensitive) {
    return {
      fromMode,
      toMode,
      status: "blocked_sensitive",
      source,
      userSafeReason: `Transition to ${toMode} blocked — sensitive mode requires dedicated governance policy.`,
      blockedBy: [`sensitive_mode:${toMode.toLowerCase()}`],
    };
  }

  // Safe display modes — allowed.
  return {
    fromMode,
    toMode,
    status: "allowed",
    source,
    userSafeReason: `Transition to ${toMode} allowed — safe display mode.`,
  };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface VisualCoreModeTransitionServiceDependencies {
  storage?: StorageLike;
  bus?: Pick<typeof eventBus, "emitEvent" | "emit">;
}

const STORAGE_KEY = "LUCA_VISUAL_CORE_MODE_TRANSITIONS_V1";

function nowIso(): string {
  return new Date().toISOString();
}

function defaultStorage(): StorageLike | undefined {
  if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  if (typeof localStorage !== "undefined") return localStorage;
  return undefined;
}

function readArray(store: StorageLike | undefined): VisualCoreModeTransitionRecord[] {
  try {
    const raw = store?.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function newId(): string {
  return `visual-transition:${nowIso()}:${Math.random().toString(36).slice(2, 8)}`;
}

const SAFETY_FLAGS = {
  governanceApplied: true as const,
  transitionOnly: true as const,
  executionChanged: false as const,
  captureEnabled: false as const,
  automationEnabled: false as const,
  externalActionEnabled: false as const,
  fileAccessEnabled: false as const,
  messagingEnabled: false as const,
  wirelessControlEnabled: false as const,
  walletPaymentEnabled: false as const,
};

export class VisualCoreModeTransitionService {
  private records: VisualCoreModeTransitionRecord[];
  private readonly storage?: StorageLike;
  private readonly bus: Pick<typeof eventBus, "emitEvent" | "emit">;

  constructor(deps: VisualCoreModeTransitionServiceDependencies = {}) {
    this.storage = deps.storage ?? defaultStorage();
    this.bus = deps.bus ?? eventBus;
    this.records = readArray(this.storage);
  }

  /**
   * Evaluate and record a mode transition attempt.
   * Returns the decision — caller should only proceed with the mode switch
   * if `decision.status` starts with `"allowed"`.
   */
  recordTransition(
    input: EvaluateModeTransitionInput,
  ): VisualCoreModeTransitionRecord {
    const decision = evaluateModeTransition(input);
    const timestamp = nowIso();

    const record: VisualCoreModeTransitionRecord = {
      ...SAFETY_FLAGS,
      transitionId: newId(),
      fromMode: decision.fromMode,
      toMode: decision.toMode,
      status: decision.status,
      source: decision.source,
      userSafeReason: decision.userSafeReason,
      blockedBy: decision.blockedBy,
      timestamp,
    };

    this.upsert(record);
    this.audit(record);
    return record;
  }

  getTransitionRecord(
    transitionId: string,
  ): VisualCoreModeTransitionRecord | undefined {
    return this.records.find((r) => r.transitionId === transitionId);
  }

  listTransitionRecords(): VisualCoreModeTransitionRecord[] {
    return [...this.records];
  }

  getDiagnosticsSummary(): VisualCoreModeTransitionDiagnosticsSummary {
    const count = (status: VisualCoreModeTransitionStatus) =>
      this.records.filter((r) => r.status === status).length;
    return {
      totalTransitions: this.records.length,
      allowedTransitions: count("allowed"),
      allowedGovernedBrowserTransitions: count("allowed_governed_browser"),
      blockedSensitiveTransitions: count("blocked_sensitive"),
      blockedUnknownTransitions: count("blocked_unknown"),
      blockedBrowserNoSessionTransitions: count("blocked_browser_no_session"),
      lastTransitionAt: this.records[0]?.timestamp ?? null,
      ...SAFETY_FLAGS,
    };
  }

  // -----------------------------------------------------------------------
  // Private
  // -----------------------------------------------------------------------

  private upsert(record: VisualCoreModeTransitionRecord): void {
    this.records = [
      record,
      ...this.records.filter((r) => r.transitionId !== record.transitionId),
    ].slice(0, MAX_VISUAL_CORE_MODE_TRANSITION_RECORDS);
    this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.records));
    this.bus.emit(VISUAL_CORE_MODE_TRANSITION_EVENT, record);
  }

  private audit(record: VisualCoreModeTransitionRecord): void {
    this.bus.emitEvent({
      type: VISUAL_CORE_MODE_TRANSITION_EVENT,
      message: `VisualCore mode transition ${record.status}: ${record.fromMode} → ${record.toMode}`,
      priority:
        record.status.startsWith("blocked") ? "HIGH" : "LOW",
      context: {
        transitionId: record.transitionId,
        fromMode: record.fromMode,
        toMode: record.toMode,
        status: record.status,
        source: record.source,
        blockedBy: record.blockedBy ?? [],
        ...SAFETY_FLAGS,
      },
    });
  }
}

/** Shared singleton used by the VisualCore UI integration. */
export const visualCoreModeTransitionService = new VisualCoreModeTransitionService();

/** Check if a transition status is allowed (starts with "allowed"). */
export function isTransitionAllowed(status: VisualCoreModeTransitionStatus): boolean {
  return status === "allowed" || status === "allowed_governed_browser";
}
