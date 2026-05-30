// LucaBrowserActionExecutionService — PR #139: LucaBrowser Final Safe Lifecycle
// Execution. Executes ONLY confirmed safe lifecycle/control actions from the
// PR #138 action queue: back / forward / refresh / pause / resume / close /
// revoke.
//
// Hard guarantees — this service NEVER:
//   - executes click / type / scroll or any page-level automation
//   - submits forms, logs in, or handles credentials/cookies/session
//   - reads the DOM, page content, or executes JavaScript
//   - takes screenshots, runs OCR, or calls vision
//   - downloads/uploads, or touches wallet/payment
//   - calls any webview / BrowserView / iframe method directly
//
// Session lifecycle (pause/resume/close/revoke) is delegated to
// SandboxedBrowserShellService. Nav-control (back/forward/refresh) is dispatched
// as a local safe-control DOM event that the mounted governed LucaBrowser
// listens for — this service never touches the webview itself.

import { eventBus } from "../eventBus";
import {
  sandboxedBrowserShellService,
  type SandboxedBrowserShellService,
} from "./SandboxedBrowserShellService";
import {
  lucaBrowserActionQueueService,
  type LucaBrowserActionQueueService,
} from "./LucaBrowserActionQueueService";
import { isLucaBrowserSafeLifecycleExecutionKind } from "./LucaBrowserActionPolicy";
import {
  LUCA_BROWSER_ACTION_EXECUTION_EVENT,
  LUCA_BROWSER_BLOCKED_ACTION_KINDS,
  LUCA_BROWSER_SAFE_CONTROL_EVENT,
  LUCA_BROWSER_SAFE_CONTROL_NAV_KINDS,
  MAX_LUCA_BROWSER_ACTION_EXECUTION_RESULTS,
  type LucaBrowserActionExecutionDiagnosticsSummary,
  type LucaBrowserActionExecutionResult,
  type LucaBrowserActionExecutionStatus,
  type LucaBrowserActionKind,
  type LucaBrowserSafeControlEventDetail,
} from "../../types/lucaBrowserActions";

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface LucaBrowserActionExecutionServiceDependencies {
  storage?: StorageLike;
  bus: Pick<typeof eventBus, "emitEvent" | "emit">;
  queueService: Pick<LucaBrowserActionQueueService, "getActionRequest">;
  shellService: Pick<
    SandboxedBrowserShellService,
    | "getShellSession"
    | "getObservationSnapshot"
    | "pauseShellSession"
    | "resumeShellSession"
    | "closeShellSession"
    | "revokeShellSession"
  >;
  /** Dispatches a safe-control nav event to the mounted governed LucaBrowser. */
  dispatchSafeControl?: (detail: LucaBrowserSafeControlEventDetail) => void;
}

const EXECUTION_STORAGE_KEY = "LUCA_BROWSER_ACTION_EXECUTION_RESULTS_V1";

const INACTIVE_SESSION_STATUSES = new Set(["closed", "revoked"]);

function nowIso(): string {
  return new Date().toISOString();
}

function getStorage(): StorageLike | undefined {
  if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  if (typeof localStorage !== "undefined") return localStorage;
  return undefined;
}

function readArray<T>(store: StorageLike | undefined, key: string): T[] {
  try {
    const raw = store?.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function defaultDispatchSafeControl(detail: LucaBrowserSafeControlEventDetail): void {
  if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") return;
  window.dispatchEvent(new CustomEvent(LUCA_BROWSER_SAFE_CONTROL_EVENT, { detail }));
}

const SAFETY_FLAGS = {
  automationEnabled: false,
  domReadEnabled: false,
  pageContentReadEnabled: false,
  screenshotEnabled: false,
  ocrEnabled: false,
  credentialsEnabled: false,
  downloadUploadEnabled: false,
  walletPaymentEnabled: false,
} as const;

export class LucaBrowserActionExecutionService {
  private results: LucaBrowserActionExecutionResult[];

  constructor(
    private readonly deps: LucaBrowserActionExecutionServiceDependencies = {
      storage: getStorage(),
      bus: eventBus,
      queueService: lucaBrowserActionQueueService,
      shellService: sandboxedBrowserShellService,
      dispatchSafeControl: defaultDispatchSafeControl,
    },
  ) {
    this.results = readArray<LucaBrowserActionExecutionResult>(this.deps.storage, EXECUTION_STORAGE_KEY);
  }

  /**
   * Execute a single confirmed safe lifecycle/control action. Returns undefined
   * only when the action request does not exist. All other outcomes are recorded
   * as an execution result (executed / not_executable / unsupported / blocked /
   * failed). NEVER executes click/type/scroll or any page-level automation.
   */
  executeConfirmedSafeLifecycleAction(actionRequestId: string): LucaBrowserActionExecutionResult | undefined {
    const request = this.deps.queueService.getActionRequest(actionRequestId);
    if (!request) return undefined;

    const { kind, shellSessionId } = request;

    // Must be human-confirmed for future execution.
    if (request.status !== "confirmed_for_future_execution") {
      return this.record(actionRequestId, shellSessionId, kind, "not_executable",
        "Action is not confirmed for execution. Confirm it first; execution stays human-gated.");
    }

    // Never execute blocked categories.
    if (LUCA_BROWSER_BLOCKED_ACTION_KINDS.includes(kind)) {
      return this.record(actionRequestId, shellSessionId, kind, "blocked",
        "Blocked category — never executable.", [`blocked_kind:${kind}`]);
    }

    // Only safe lifecycle/control kinds can execute. Click/type/scroll are not.
    if (!isLucaBrowserSafeLifecycleExecutionKind(kind)) {
      return this.record(actionRequestId, shellSessionId, kind, "unsupported",
        "Only safe lifecycle/control actions can execute. Click, type, and scroll stay disabled.",
        [`page_action_execution_disabled:${kind}`]);
    }

    // Require an existing, active governed shell session.
    const session = this.deps.shellService.getShellSession(shellSessionId);
    if (!session) {
      return this.record(actionRequestId, shellSessionId, kind, "failed",
        "No governed browser session found for this action.", ["missing_session"]);
    }
    if (INACTIVE_SESSION_STATUSES.has(session.status)) {
      return this.record(actionRequestId, shellSessionId, kind, "failed",
        "Governed browser session is closed or revoked.", ["inactive_governed_session"]);
    }

    // Require an observation snapshot (safe situational awareness from PR #137).
    const observation = this.deps.shellService.getObservationSnapshot(shellSessionId);
    if (!observation) {
      return this.record(actionRequestId, shellSessionId, kind, "blocked",
        "No observation snapshot for this session. Execution requires safe situational awareness first.",
        ["missing_observation_snapshot"]);
    }

    // Perform the safe lifecycle/control action.
    return this.perform(actionRequestId, shellSessionId, kind);
  }

  getExecutionResult(actionRequestId: string): LucaBrowserActionExecutionResult | undefined {
    return this.results.find((r) => r.actionRequestId === actionRequestId);
  }

  listExecutionResults(shellSessionId?: string): LucaBrowserActionExecutionResult[] {
    if (!shellSessionId) return [...this.results];
    return this.results.filter((r) => r.shellSessionId === shellSessionId);
  }

  getDiagnosticsSummary(): LucaBrowserActionExecutionDiagnosticsSummary {
    const count = (status: LucaBrowserActionExecutionStatus) =>
      this.results.filter((r) => r.status === status).length;
    return {
      totalExecutionResults: this.results.length,
      executedResults: count("executed"),
      blockedResults: count("blocked"),
      failedResults: count("failed"),
      unsupportedResults: count("unsupported"),
      notExecutableResults: count("not_executable"),
      lastExecutionAt: this.results[0]?.executedAt ?? null,
      safeLifecycleExecutionEnabled: true,
      pageActionExecutionEnabled: false,
      humanConfirmationRequired: true,
      ...SAFETY_FLAGS,
    };
  }

  // -----------------------------------------------------------------------
  // Private
  // -----------------------------------------------------------------------

  private perform(
    actionRequestId: string,
    shellSessionId: string,
    kind: LucaBrowserActionKind,
  ): LucaBrowserActionExecutionResult {
    switch (kind) {
      case "propose_pause":
        this.deps.shellService.pauseShellSession(shellSessionId, "Paused via confirmed LucaBrowser action.");
        return this.record(actionRequestId, shellSessionId, kind, "executed", "Paused the governed browser session.");
      case "propose_resume":
        this.deps.shellService.resumeShellSession(shellSessionId);
        return this.record(actionRequestId, shellSessionId, kind, "executed", "Resumed the governed browser session.");
      case "propose_close":
        this.deps.shellService.closeShellSession(shellSessionId);
        return this.record(actionRequestId, shellSessionId, kind, "executed", "Closed the governed browser session.");
      case "propose_revoke":
        this.deps.shellService.revokeShellSession(shellSessionId, "Revoked via confirmed LucaBrowser action.");
        return this.record(actionRequestId, shellSessionId, kind, "executed", "Revoked the governed browser session.");
      case "propose_back":
      case "propose_forward":
      case "propose_refresh": {
        const dispatch = this.deps.dispatchSafeControl ?? defaultDispatchSafeControl;
        dispatch({ actionRequestId, shellSessionId, kind });
        return this.record(actionRequestId, shellSessionId, kind, "executed",
          "Dispatched a safe nav-control request to the governed browser. No DOM read, no automation.");
      }
      default:
        // Unreachable: guarded by isLucaBrowserSafeLifecycleExecutionKind.
        return this.record(actionRequestId, shellSessionId, kind, "unsupported",
          "Unsupported execution kind.", [`page_action_execution_disabled:${kind}`]);
    }
  }

  private record(
    actionRequestId: string,
    shellSessionId: string,
    kind: LucaBrowserActionKind,
    status: LucaBrowserActionExecutionStatus,
    message: string,
    blockedBy?: string[],
  ): LucaBrowserActionExecutionResult {
    const timestamp = nowIso();
    const result: LucaBrowserActionExecutionResult = {
      executionResultId: `luca-browser-exec:${timestamp}:${Math.random().toString(36).slice(2, 8)}`,
      actionRequestId,
      shellSessionId,
      kind,
      status,
      message,
      executedAt: timestamp,
      blockedBy: blockedBy && blockedBy.length > 0 ? blockedBy : undefined,
      ...SAFETY_FLAGS,
    };
    this.upsert(result);
    this.audit(result);
    return result;
  }

  private upsert(result: LucaBrowserActionExecutionResult): void {
    this.results = [
      result,
      ...this.results.filter((r) => r.actionRequestId !== result.actionRequestId),
    ].slice(0, MAX_LUCA_BROWSER_ACTION_EXECUTION_RESULTS);
    this.deps.storage?.setItem(EXECUTION_STORAGE_KEY, JSON.stringify(this.results));
    this.deps.bus.emit(LUCA_BROWSER_ACTION_EXECUTION_EVENT, result);
  }

  private audit(result: LucaBrowserActionExecutionResult): void {
    this.deps.bus.emitEvent({
      type: LUCA_BROWSER_ACTION_EXECUTION_EVENT,
      message: `LucaBrowser action execution ${result.status}: ${result.kind}`,
      priority: result.status === "executed" ? "MEDIUM" : "HIGH",
      context: {
        executionResultId: result.executionResultId,
        actionRequestId: result.actionRequestId,
        shellSessionId: result.shellSessionId,
        kind: result.kind,
        status: result.status,
        blockedBy: result.blockedBy ?? [],
        safeLifecycleExecutionEnabled: true,
        pageActionExecutionEnabled: false,
        automationEnabled: false,
        domReadEnabled: false,
        credentialsEnabled: false,
      },
    });
  }
}

/** Names of nav-control kinds (re-exported for callers that gate UI). */
export { LUCA_BROWSER_SAFE_CONTROL_NAV_KINDS };

export const lucaBrowserActionExecutionService = new LucaBrowserActionExecutionService();
