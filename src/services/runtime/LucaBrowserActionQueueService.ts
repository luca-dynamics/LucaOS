// LucaBrowserActionQueueService — PR #138: LucaBrowser Action Readiness Bundle.
// Owns the queue of *proposed* governed browser actions awaiting human review.
//
// Hard guarantees — this service NEVER:
//   - executes a browser action (click/type/scroll/submit/etc.)
//   - calls any webview / BrowserView / iframe method
//   - reads the DOM, page content, or executes JavaScript
//   - stores credentials, tokens, cookies, or DOM selectors
//
// It evaluates a proposed action via LucaBrowserActionPolicy, records the
// outcome (waiting_user_confirmation or blocked), and lets a human confirm it
// for *future* execution. Confirmation never triggers execution.

import { eventBus } from "../eventBus";
import {
  runtimeInboxService,
  type RuntimeInboxService,
  sanitizeRuntimeMetadata,
} from "./RuntimeInboxService";
import {
  sandboxedBrowserShellService,
  type SandboxedBrowserShellService,
} from "./SandboxedBrowserShellService";
import {
  evaluateLucaBrowserActionRequest,
  sanitizeBrowserActionInput,
} from "./LucaBrowserActionPolicy";
import {
  LUCA_BROWSER_ACTION_EVENT,
  LUCA_BROWSER_BLOCKED_ACTION_KINDS,
  MAX_LUCA_BROWSER_ACTION_REQUESTS,
  type LucaBrowserActionDiagnosticsSummary,
  type LucaBrowserActionKind,
  type LucaBrowserActionRequest,
} from "../../types/lucaBrowserActions";

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface CreateLucaBrowserActionInput {
  shellSessionId: string;
  kind: LucaBrowserActionKind;
  title?: string;
  summary?: string;
  /** User-facing description of the target — never a DOM selector. */
  targetDescriptor?: string;
  /** Raw typed text candidate; sanitized + screened before storage. */
  typedText?: string;
  /** Optional free-form intent context, screened for credential/payment. */
  context?: string;
  provenanceIds?: string[];
  metadata?: Record<string, unknown>;
}

export interface LucaBrowserActionQueueServiceDependencies {
  storage?: StorageLike;
  inbox: Pick<RuntimeInboxService, "ingestEvent">;
  bus: Pick<typeof eventBus, "emitEvent" | "emit">;
  shellService: Pick<
    SandboxedBrowserShellService,
    "getShellSession" | "getObservationSnapshot"
  >;
}

const ACTIONS_STORAGE_KEY = "LUCA_BROWSER_ACTION_REQUESTS_V1";

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

const DEFAULT_TITLES: Record<LucaBrowserActionKind, string> = {
  propose_click: "Proposed click",
  propose_type: "Proposed type",
  propose_scroll: "Proposed scroll",
  propose_back: "Proposed back",
  propose_forward: "Proposed forward",
  propose_refresh: "Proposed refresh",
  propose_close: "Proposed close",
  propose_pause: "Proposed pause",
  propose_resume: "Proposed resume",
  propose_revoke: "Proposed revoke",
  submit_form: "Blocked: submit form",
  login: "Blocked: login",
  enter_password: "Blocked: enter password",
  enter_credential: "Blocked: enter credential",
  payment: "Blocked: payment",
  checkout: "Blocked: checkout",
  wallet_connect: "Blocked: wallet connect",
  wallet_transaction: "Blocked: wallet transaction",
  download: "Blocked: download",
  upload: "Blocked: upload",
  file_attach: "Blocked: file attach",
  read_dom: "Blocked: read DOM",
  scrape: "Blocked: scrape",
  screenshot: "Blocked: screenshot",
  ocr: "Blocked: OCR",
  execute_script: "Blocked: execute script",
};

export class LucaBrowserActionQueueService {
  private actions: LucaBrowserActionRequest[];

  constructor(
    private readonly deps: LucaBrowserActionQueueServiceDependencies = {
      storage: getStorage(),
      inbox: runtimeInboxService,
      bus: eventBus,
      shellService: sandboxedBrowserShellService,
    },
  ) {
    this.actions = readArray<LucaBrowserActionRequest>(this.deps.storage, ACTIONS_STORAGE_KEY);
  }

  /**
   * Create a proposed action request. Evaluates policy; sets status to
   * `blocked` for forbidden/credential/payment intents, otherwise
   * `waiting_user_confirmation`. Never executes anything.
   */
  createActionRequest(input: CreateLucaBrowserActionInput): LucaBrowserActionRequest | undefined {
    const session = this.deps.shellService.getShellSession(input.shellSessionId);
    if (!session) return undefined;

    const typedTextPreview = sanitizeBrowserActionInput(input.typedText);
    const decision = evaluateLucaBrowserActionRequest({
      kind: input.kind,
      targetDescriptor: input.targetDescriptor,
      typedText: input.typedText,
      context: input.context,
    });

    const sessionInactive = INACTIVE_SESSION_STATUSES.has(session.status);
    const observation = this.deps.shellService.getObservationSnapshot(input.shellSessionId);

    const blockedBy = [...decision.blockedBy];
    if (sessionInactive) blockedBy.push("inactive_governed_session");

    const isBlocked =
      blockedBy.length > 0 ||
      !decision.allowedForFutureHumanConfirmedExecution ||
      LUCA_BROWSER_BLOCKED_ACTION_KINDS.includes(input.kind);

    const timestamp = nowIso();
    const request: LucaBrowserActionRequest = {
      actionRequestId: `luca-browser-action:${timestamp}:${Math.random().toString(36).slice(2, 8)}`,
      shellSessionId: input.shellSessionId,
      observationId: observation?.observationId,
      kind: input.kind,
      title: input.title?.trim() || DEFAULT_TITLES[input.kind],
      summary: input.summary?.trim() || decision.userSafeReason,
      targetDescriptor: input.targetDescriptor?.trim() || undefined,
      typedTextPreview: input.kind === "propose_type" ? typedTextPreview : undefined,
      status: isBlocked ? "blocked" : "waiting_user_confirmation",
      riskLevel: decision.riskLevel,
      policyDecision: { ...decision, blockedBy },
      provenanceIds: input.provenanceIds ?? [session.shellSessionId],
      createdAt: timestamp,
      updatedAt: timestamp,
      blockedBy: blockedBy.length > 0 ? blockedBy : undefined,
      metadata: input.metadata ? sanitizeRuntimeMetadata({ ...input.metadata }) : undefined,
    };

    this.upsert(request);
    this.audit(request);
    return request;
  }

  listActionRequests(shellSessionId?: string): LucaBrowserActionRequest[] {
    if (!shellSessionId) return [...this.actions];
    return this.actions.filter((a) => a.shellSessionId === shellSessionId);
  }

  getActionRequest(actionRequestId: string): LucaBrowserActionRequest | undefined {
    return this.actions.find((a) => a.actionRequestId === actionRequestId);
  }

  /**
   * Mark a waiting request as confirmed for FUTURE execution. This records human
   * intent — it does NOT execute the action (execution stays disabled).
   */
  confirmActionRequestForFutureExecution(actionRequestId: string): LucaBrowserActionRequest | undefined {
    const existing = this.getActionRequest(actionRequestId);
    if (!existing) return undefined;
    if (existing.status !== "waiting_user_confirmation") return existing;
    if (!existing.policyDecision.allowedForFutureHumanConfirmedExecution) return existing;
    const next: LucaBrowserActionRequest = {
      ...existing,
      status: "confirmed_for_future_execution",
      confirmedAt: nowIso(),
      updatedAt: nowIso(),
    };
    this.upsert(next);
    this.audit(next);
    return next;
  }

  revokeActionRequest(actionRequestId: string, reason?: string): LucaBrowserActionRequest | undefined {
    return this.transition(actionRequestId, "revoked", reason, { revokedAt: nowIso() });
  }

  archiveActionRequest(actionRequestId: string): LucaBrowserActionRequest | undefined {
    return this.transition(actionRequestId, "archived");
  }

  blockActionRequest(actionRequestId: string, reason?: string): LucaBrowserActionRequest | undefined {
    return this.transition(actionRequestId, "blocked", reason);
  }

  getDiagnosticsSummary(): LucaBrowserActionDiagnosticsSummary {
    const count = (status: LucaBrowserActionRequest["status"]) =>
      this.actions.filter((a) => a.status === status).length;
    return {
      totalActionRequests: this.actions.length,
      proposedRequests: count("proposed"),
      waitingConfirmationRequests: count("waiting_user_confirmation"),
      confirmedForFutureExecutionRequests: count("confirmed_for_future_execution"),
      blockedRequests: count("blocked"),
      revokedRequests: count("revoked"),
      archivedRequests: count("archived"),
      lastActionAt: this.actions[0]?.updatedAt ?? null,
      executionEnabled: false,
      humanConfirmationRequired: true,
      automationEnabled: false,
      domReadEnabled: false,
      pageContentReadEnabled: false,
      screenshotEnabled: false,
      ocrEnabled: false,
      credentialsEnabled: false,
      downloadUploadEnabled: false,
      walletPaymentEnabled: false,
    };
  }

  // -----------------------------------------------------------------------
  // Private
  // -----------------------------------------------------------------------

  private transition(
    actionRequestId: string,
    status: LucaBrowserActionRequest["status"],
    reason?: string,
    extra?: Partial<LucaBrowserActionRequest>,
  ): LucaBrowserActionRequest | undefined {
    const existing = this.getActionRequest(actionRequestId);
    if (!existing) return undefined;
    const next: LucaBrowserActionRequest = {
      ...existing,
      ...extra,
      status,
      updatedAt: nowIso(),
      metadata: reason
        ? sanitizeRuntimeMetadata({ ...existing.metadata, transitionReason: reason })
        : existing.metadata,
    };
    this.upsert(next);
    this.audit(next);
    return next;
  }

  private upsert(request: LucaBrowserActionRequest): void {
    this.actions = [
      request,
      ...this.actions.filter((a) => a.actionRequestId !== request.actionRequestId),
    ].slice(0, MAX_LUCA_BROWSER_ACTION_REQUESTS);
    this.deps.storage?.setItem(ACTIONS_STORAGE_KEY, JSON.stringify(this.actions));
    this.deps.bus.emit(LUCA_BROWSER_ACTION_EVENT, request);
  }

  private audit(request: LucaBrowserActionRequest): void {
    this.deps.bus.emitEvent({
      type: LUCA_BROWSER_ACTION_EVENT,
      message: `LucaBrowser action ${request.status}: ${request.kind}`,
      priority: request.status === "blocked" ? "HIGH" : "MEDIUM",
      context: {
        actionRequestId: request.actionRequestId,
        shellSessionId: request.shellSessionId,
        kind: request.kind,
        status: request.status,
        riskLevel: request.riskLevel,
        blockedBy: request.blockedBy ?? [],
        executionEnabled: false,
        automationEnabled: false,
        domReadEnabled: false,
        credentialsEnabled: false,
      },
    });
  }
}

export const lucaBrowserActionQueueService = new LucaBrowserActionQueueService();
