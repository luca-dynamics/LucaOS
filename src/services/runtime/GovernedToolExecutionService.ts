import { eventBus, type VisionEvent } from "../eventBus";
import { provenanceGateService, type ProvenanceGateService } from "../provenance/ProvenanceGateService";
import { approvalRequestCenterService, type ApprovalRequestCenterService } from "../provenance/ApprovalRequestCenterService";
import { runtimeInboxService, type RuntimeInboxService, sanitizeRuntimeMetadata } from "./RuntimeInboxService";
import { governedActionRequestService, type GovernedActionRequestService } from "./GovernedActionRequestService";
import { evaluate, mapCapability, sanitizePreview } from "./GovernedToolExecutionPolicy";
import type { GovernedActionRequest } from "../../types/governedActionRequest";
import type { ActionInstanceIdentity } from "../../types/provenance";
import { GOVERNED_EXECUTION_ALLOWED_PANELS } from "../../types/governedToolExecution";
import type {
  GovernedExecutionCapability,
  GovernedExecutionAllowedPanel,
  GovernedToolExecutionRequest,
  GovernedToolExecutionResult,
  GovernedToolExecutionDiagnosticsSummary,
} from "../../types/governedToolExecution";
import { isSafeLocalPanelTarget, getTargetPanelTab } from "./SafeLocalPanelTargets";
// Lazily-used singletons. Imported statically (not via require) so esbuild can
// handle the async module graph these pull in — db.js uses top-level await, and
// require() cannot import an async graph. The circular dependency with
// RuntimeDiagnosticsService is safe: both sides only dereference each other's
// singleton inside methods, never at module-evaluation time.
import { runtimeDiagnosticsService } from "./RuntimeDiagnosticsService";
import { memoryGovernanceService } from "../memory/MemoryGovernanceService";
import { agentSessionContinuityService } from "./AgentSessionContinuityService";

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface DiagnosticsProvider {
  getAudience(): string;
}

interface MemoryGovernanceProvider {
  getDiagnosticsSummary(): { totalRecords: number; quarantinedRecords: number; pendingReviewRecords: number };
}

interface SessionProvider {
  getDiagnosticsSummary(): { totalSessions: number; activeSessions: number; resumableSessions: number };
}

// PR #134: minimal surface of the sandbox browser shell service the execution
// bridge is allowed to call. Deliberately limited to opening one safe URL —
// no click/type/read/submit/download/upload methods are exposed here.
interface BrowserShellProvider {
  openApprovedSafeUrl(input: {
    url: string;
    title?: string;
    sourceRequestId?: string;
    provenanceIds?: string[];
    source?: string;
    metadata?: Record<string, unknown>;
  }): { shellSessionId: string; status: string; auditUrl: string; normalizedUrl: string; blockedBy?: string[] };
}

export interface GovernedToolExecutionDependencies {
  storage?: StorageLike;
  requests: Pick<GovernedActionRequestService, "listRequests" | "getRequest" | "markApprovedWaitingExecution" | "markExecutedElsewhere" | "markBlocked">;
  approvals: Pick<ApprovalRequestCenterService, "listRequests" | "getRequest" | "hasApprovedOnce">;
  provenance: Pick<ProvenanceGateService, "canActionRun" | "checkWhetherActionCanRun" | "listRecords">;
  inbox: Pick<RuntimeInboxService, "ingestEvent" | "getUnreadCount" | "getDiagnosticsSummary">;
  bus: Pick<typeof eventBus, "emitEvent" | "emit">;
  diagnostics?: DiagnosticsProvider;
  memoryGovernance?: MemoryGovernanceProvider;
  sessions?: SessionProvider;
  browserShell?: BrowserShellProvider;
}

const STORAGE_KEY = "LUCA_GOVERNED_TOOL_EXECUTIONS_V1";
const MAX_EXECUTIONS = 300;

function nowIso(): string {
  return new Date().toISOString();
}

function getStorage(): StorageLike | undefined {
  if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  if (typeof localStorage !== "undefined") return localStorage;
  return undefined;
}

function readExecutions(store: StorageLike | undefined): GovernedToolExecutionRequest[] {
  try {
    const raw = store?.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const ALLOWED_PANELS = new Set<GovernedExecutionAllowedPanel>(GOVERNED_EXECUTION_ALLOWED_PANELS);

export class GovernedToolExecutionService {
  private executions: GovernedToolExecutionRequest[];

  constructor(
    private readonly deps: GovernedToolExecutionDependencies = {
      storage: getStorage(),
      requests: governedActionRequestService,
      approvals: approvalRequestCenterService,
      provenance: provenanceGateService,
      inbox: runtimeInboxService,
      bus: eventBus,
    },
  ) {
    this.executions = readExecutions(deps.storage);
  }

  private _diagnosticsCache?: DiagnosticsProvider;
  private _memoryGovernanceCache?: MemoryGovernanceProvider;
  private _sessionsCache?: SessionProvider;

  private getDiagnosticsProvider(): DiagnosticsProvider {
    if (this.deps.diagnostics) return this.deps.diagnostics;
    if (!this._diagnosticsCache) {
      this._diagnosticsCache = runtimeDiagnosticsService;
    }
    return this._diagnosticsCache!;
  }

  private getMemoryGovernanceProvider(): MemoryGovernanceProvider {
    if (this.deps.memoryGovernance) return this.deps.memoryGovernance;
    if (!this._memoryGovernanceCache) {
      this._memoryGovernanceCache = memoryGovernanceService;
    }
    return this._memoryGovernanceCache!;
  }

  private getSessionProvider(): SessionProvider {
    if (this.deps.sessions) return this.deps.sessions;
    if (!this._sessionsCache) {
      this._sessionsCache = agentSessionContinuityService;
    }
    return this._sessionsCache!;
  }

  private _browserShellCache?: BrowserShellProvider;

  private getBrowserShellProvider(): BrowserShellProvider {
    if (this.deps.browserShell) return this.deps.browserShell;
    if (!this._browserShellCache) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      this._browserShellCache = require("./SandboxedBrowserShellService").sandboxedBrowserShellService;
    }
    return this._browserShellCache!;
  }

  listExecutions(): GovernedToolExecutionRequest[] {
    return [...this.executions];
  }

  getExecution(executionId: string): GovernedToolExecutionRequest | undefined {
    return this.executions.find((item) => item.executionId === executionId);
  }

  canExecuteRequest(requestId: string): { allowed: boolean; reason: string; capability: GovernedExecutionCapability | null } {
    const request = this.deps.requests.getRequest(requestId);
    if (!request) return { allowed: false, reason: "Governed action request not found.", capability: null };

    const alreadyExecuted = this.executions.find((item) => item.requestId === requestId && (item.status === "succeeded" || item.status === "executing"));
    if (alreadyExecuted) return { allowed: false, reason: "This request has already been executed.", capability: null };

    const decision = evaluate(request);
    return { allowed: decision.allowed, reason: decision.userSafeReason, capability: decision.capability };
  }

  createExecutionFromRequest(requestId: string): GovernedToolExecutionRequest | null {
    const request = this.deps.requests.getRequest(requestId);
    if (!request) return null;

    const decision = evaluate(request);
    const timestamp = nowIso();
    const execution: GovernedToolExecutionRequest = {
      executionId: `exec:${request.actionDigest.slice(-8)}:${timestamp}`,
      requestId: request.requestId,
      approvalRequestId: request.approvalRequestId,
      actionDigest: request.actionDigest,
      capability: decision.capability ?? "dry_run_confirm",
      title: request.title,
      target: request.target,
      parametersPreview: sanitizePreview(request.parametersPreview),
      provenanceIds: [...request.provenanceIds],
      riskLevel: decision.riskLevel,
      status: decision.allowed ? "approved" : "blocked",
      createdAt: timestamp,
      blockedBy: decision.blockedBy.length > 0 ? decision.blockedBy : undefined,
      userSafeReason: decision.userSafeReason,
      dryRunOnly: !decision.allowed ? true : undefined,
    };

    this.upsert(execution);
    return execution;
  }

  executeApprovedRequest(requestId: string): GovernedToolExecutionResult {
    const request = this.deps.requests.getRequest(requestId);
    if (!request) {
      return this.buildFailedResult(requestId, "Governed action request not found.");
    }

    const alreadyExecuted = this.executions.find((item) => item.requestId === requestId && item.status === "succeeded");
    if (alreadyExecuted) {
      return this.buildFailedResult(requestId, "This request has already been executed once.", alreadyExecuted.executionId);
    }

    const decision = evaluate(request);
    if (!decision.allowed || !decision.capability) {
      const execution = this.createExecutionFromRequest(requestId);
      this.emitBlockedEvent(request, decision.blockedBy, decision.userSafeReason);
      this.createInboxEvent(request, "blocked", decision.userSafeReason);
      this.deps.requests.markBlocked(requestId, decision.userSafeReason);
      return {
        executionId: execution?.executionId ?? `exec:blocked:${nowIso()}`,
        requestId,
        status: "blocked",
        resultSummary: decision.userSafeReason,
        resultPreview: {},
        startedAt: nowIso(),
        completedAt: nowIso(),
        consumedApproval: false,
        blockedBy: decision.blockedBy,
      };
    }

    const provenanceCheck = this.checkProvenance(request);
    if (!provenanceCheck.allowed) {
      const execution = this.createExecutionFromRequest(requestId);
      if (execution) {
        execution.status = "blocked";
        execution.blockedBy = provenanceCheck.blockedBy;
        this.upsert(execution);
      }
      this.emitBlockedEvent(request, provenanceCheck.blockedBy, provenanceCheck.userSafeReason);
      this.createInboxEvent(request, "blocked", provenanceCheck.userSafeReason);
      this.deps.requests.markBlocked(requestId, provenanceCheck.userSafeReason);
      return {
        executionId: execution?.executionId ?? `exec:blocked:${nowIso()}`,
        requestId,
        status: "blocked",
        resultSummary: provenanceCheck.userSafeReason,
        resultPreview: {},
        startedAt: nowIso(),
        completedAt: nowIso(),
        consumedApproval: false,
        blockedBy: provenanceCheck.blockedBy,
      };
    }

    const actionIdentity = this.buildActionIdentity(request);
    const consumeResult = this.deps.provenance.checkWhetherActionCanRun(actionIdentity);

    if (!consumeResult.allowed) {
      const execution = this.createExecutionFromRequest(requestId);
      if (execution) {
        execution.status = "blocked";
        execution.blockedBy = consumeResult.blockedBy;
        this.upsert(execution);
      }
      const reason = consumeResult.userSafeReason || "Approval consumption failed.";
      this.emitBlockedEvent(request, consumeResult.blockedBy, reason);
      this.createInboxEvent(request, "blocked", reason);
      return {
        executionId: execution?.executionId ?? `exec:blocked:${nowIso()}`,
        requestId,
        status: "blocked",
        resultSummary: reason,
        resultPreview: {},
        startedAt: nowIso(),
        completedAt: nowIso(),
        consumedApproval: false,
        blockedBy: consumeResult.blockedBy,
      };
    }

    const startedAt = nowIso();
    const execution = this.createExecutionFromRequest(requestId);
    if (execution) {
      execution.status = "executing";
      execution.startedAt = startedAt;
      this.upsert(execution);
    }

    try {
      const dispatchResult = this.dispatchSafeAction(decision.capability, request);
      const completedAt = nowIso();

      if (execution) {
        execution.status = "succeeded";
        execution.completedAt = completedAt;
        this.upsert(execution);
      }

      this.deps.requests.markExecutedElsewhere(requestId, {
        executionId: execution?.executionId,
        completedAt,
        capability: decision.capability,
      });

      const inboxEvent = this.createInboxEvent(request, "succeeded", dispatchResult.summary);
      this.emitSucceededEvent(request, dispatchResult.summary);

      return {
        executionId: execution?.executionId ?? `exec:${nowIso()}`,
        requestId,
        status: "succeeded",
        resultSummary: dispatchResult.summary,
        resultPreview: sanitizePreview(dispatchResult.preview),
        startedAt,
        completedAt,
        consumedApproval: true,
        traceEventId: execution?.executionId,
        inboxEventId: inboxEvent?.inboxEventId,
      };
    } catch (error) {
      const completedAt = nowIso();
      const errorMessage = error instanceof Error ? error.message : "Unknown execution error";

      if (execution) {
        execution.status = "failed";
        execution.completedAt = completedAt;
        this.upsert(execution);
      }

      this.emitFailedEvent(request, errorMessage);
      this.createInboxEvent(request, "failed", errorMessage);

      return {
        executionId: execution?.executionId ?? `exec:failed:${nowIso()}`,
        requestId,
        status: "failed",
        resultSummary: `Execution failed: ${errorMessage}`,
        resultPreview: {},
        startedAt,
        completedAt,
        consumedApproval: true,
        errorMessage,
      };
    }
  }

  blockExecution(executionId: string, reason: string): GovernedToolExecutionRequest | undefined {
    const execution = this.executions.find((item) => item.executionId === executionId);
    if (!execution) return undefined;
    execution.status = "blocked";
    execution.blockedBy = [reason];
    execution.userSafeReason = reason;
    this.upsert(execution);
    return execution;
  }

  getDiagnosticsSummary(): GovernedToolExecutionDiagnosticsSummary {
    const succeeded = this.executions.filter((item) => item.status === "succeeded");
    const lastSucceeded = succeeded.length > 0 ? succeeded[0].completedAt : undefined;
    return {
      totalExecutions: this.executions.length,
      succeededExecutions: succeeded.length,
      blockedExecutions: this.executions.filter((item) => item.status === "blocked").length,
      failedExecutions: this.executions.filter((item) => item.status === "failed").length,
      queuedExecutions: this.executions.filter((item) => item.status === "queued" || item.status === "approved").length,
      lastExecutionAt: lastSucceeded,
      safeExecutionEnabled: true,
      riskyExecutionEnabled: false,
    };
  }

  clearOldExecutions(maxSize = MAX_EXECUTIONS): void {
    if (this.executions.length > maxSize) {
      this.executions = this.executions.slice(0, maxSize);
      this.persist();
    }
  }

  private dispatchSafeAction(
    capability: GovernedExecutionCapability,
    request: GovernedActionRequest,
  ): { summary: string; preview: Record<string, unknown> } {
    switch (capability) {
      case "notify":
        return this.dispatchNotify(request);
      case "open_panel":
        return this.dispatchOpenPanel(request);
      case "runtime_read":
        return this.dispatchRuntimeRead();
      case "memory_read":
        return this.dispatchMemoryRead();
      case "inbox_read":
        return this.dispatchInboxRead();
      case "session_read":
        return this.dispatchSessionRead();
      case "dry_run_confirm":
        return this.dispatchDryRunConfirm();
      case "open_approved_safe_url":
        return this.dispatchOpenApprovedSafeUrl(request);
      default:
        throw new Error(`Unknown governed execution capability: ${capability as string}`);
    }
  }

  // PR #134: run once for an approved safe URL calls ONLY the shell service.
  // No generic browser launch, automation, click/type/read/submit, or
  // download/upload is ever performed here.
  private dispatchOpenApprovedSafeUrl(request: GovernedActionRequest): { summary: string; preview: Record<string, unknown> } {
    const params = request.parametersPreview ?? {};
    const url = typeof params.safeUrl === "string"
      ? params.safeUrl
      : typeof params.url === "string"
        ? params.url
        : "";
    const shell = this.getBrowserShellProvider();
    const session = shell.openApprovedSafeUrl({
      url,
      title: request.title,
      sourceRequestId: request.requestId,
      provenanceIds: request.provenanceIds,
      source: "governed-tool-execution",
    });

    const summary = session.status === "blocked"
      ? `Safe URL blocked by browser shell policy: ${session.auditUrl}`
      : session.status === "adapter_unavailable"
        ? `Browser shell adapter unavailable for: ${session.auditUrl}`
        : `Sandbox browser shell open requested: ${session.auditUrl}`;

    return {
      summary,
      preview: {
        shellSessionId: session.shellSessionId,
        status: session.status,
        auditUrl: session.auditUrl,
        launchMode: "approved_safe_url_only",
        automationEnabled: false,
        domReadEnabled: false,
        credentialsEnabled: false,
      },
    };
  }

  private dispatchNotify(request: GovernedActionRequest): { summary: string; preview: Record<string, unknown> } {
    this.deps.inbox.ingestEvent({
      source: "system",
      sourceTrustLevel: "local",
      title: `Governed action: ${request.title}`,
      body: request.description,
      eventType: "governed_execution_notification",
      provenance: {
        provenanceId: request.provenanceIds[0] ?? "unknown",
        sourceType: "runtime_snapshot",
        sourceId: request.requestId,
        sourceTrustLevel: "local",
        createdBy: "governed-execution-bridge",
        createdAt: nowIso(),
        digest: request.actionDigest,
        parentProvenanceIds: request.provenanceIds,
        quarantineState: "clear",
        approvalState: "approved_once",
        revocationState: "active",
      },
      requiresApproval: false,
      metadata: sanitizeRuntimeMetadata({ requestId: request.requestId, capability: "notify" }),
    });

    this.deps.bus.emitEvent({
      type: "governed_execution_notification",
      message: `Governed notification: ${request.title}`,
      priority: "LOW",
      context: { timestamp: Date.now(), requestId: request.requestId },
    });

    return {
      summary: `Notification delivered: ${request.title}`,
      preview: { delivered: true, title: request.title },
    };
  }

  private dispatchOpenPanel(request: GovernedActionRequest): { summary: string; preview: Record<string, unknown> } {
    const rawTarget = request.target.toLowerCase().trim();

    // Handle view: targets by mapping to the correct panel tab
    if (rawTarget.startsWith("view:") && isSafeLocalPanelTarget(rawTarget)) {
      const panelTab = getTargetPanelTab(rawTarget);
      if (panelTab && typeof window !== "undefined") {
        if (panelTab === "model-manager") {
          window.dispatchEvent(new CustomEvent("luca:open-settings", { detail: { tab: "model-manager" } }));
        } else {
          window.dispatchEvent(new CustomEvent("luca:open-right-panel", { detail: { panel: panelTab, source: "governed-tool-execution", viewTarget: rawTarget } }));
        }
      }
      return {
        summary: `View opened: ${rawTarget}`,
        preview: { viewTarget: rawTarget, panel: panelTab, dispatched: true },
      };
    }

    // Handle panel: targets
    const target = rawTarget.replace(/^panel:/, "");
    if (!ALLOWED_PANELS.has(target as GovernedExecutionAllowedPanel)) {
      throw new Error(`Panel target "${target}" is not in the governed allowlist.`);
    }

    if (typeof window !== "undefined") {
      const panelEvent = target === "model-manager" ? "luca:open-settings" : "luca:open-right-panel";
      window.dispatchEvent(new CustomEvent(panelEvent, { detail: { panel: target === "model-manager" ? target : target.toUpperCase(), source: "governed-tool-execution" } }));
    }

    return {
      summary: `Panel opened: ${target}`,
      preview: { panel: target, dispatched: true },
    };
  }

  private dispatchRuntimeRead(): { summary: string; preview: Record<string, unknown> } {
    const diagnostics = this.getDiagnosticsProvider();
    const audience = diagnostics.getAudience();
    return {
      summary: `Runtime diagnostics read (audience: ${audience}).`,
      preview: { audience, read: true },
    };
  }

  private dispatchMemoryRead(): { summary: string; preview: Record<string, unknown> } {
    const memGov = this.getMemoryGovernanceProvider();
    const memorySummary = memGov.getDiagnosticsSummary();
    return {
      summary: `Memory governance summary retrieved: ${memorySummary.totalRecords} records, ${memorySummary.quarantinedRecords} quarantined.`,
      preview: sanitizePreview({
        totalRecords: memorySummary.totalRecords,
        quarantinedRecords: memorySummary.quarantinedRecords,
        pendingReview: memorySummary.pendingReviewRecords,
      } as Record<string, unknown>),
    };
  }

  private dispatchInboxRead(): { summary: string; preview: Record<string, unknown> } {
    const inboxSummary = this.deps.inbox.getDiagnosticsSummary();
    return {
      summary: `Inbox summary: ${inboxSummary.unreadEvents} unread of ${inboxSummary.totalEvents} total.`,
      preview: {
        unread: inboxSummary.unreadEvents,
        total: inboxSummary.totalEvents,
        archived: inboxSummary.archivedEvents,
      },
    };
  }

  private dispatchSessionRead(): { summary: string; preview: Record<string, unknown> } {
    const sessionProvider = this.getSessionProvider();
    const sessionSummary = sessionProvider.getDiagnosticsSummary();
    return {
      summary: `Sessions: ${sessionSummary.resumableSessions} resumable of ${sessionSummary.totalSessions} total.`,
      preview: {
        total: sessionSummary.totalSessions,
        resumable: sessionSummary.resumableSessions,
        active: sessionSummary.activeSessions,
      },
    };
  }

  private dispatchDryRunConfirm(): { summary: string; preview: Record<string, unknown> } {
    return {
      summary: "Dry-run confirmed; no external action executed.",
      preview: { dryRun: true, confirmed: true },
    };
  }

  private checkProvenance(request: GovernedActionRequest): { allowed: boolean; blockedBy: string[]; userSafeReason: string } {
    const records = this.deps.provenance.listRecords();
    for (const provId of request.provenanceIds) {
      const record = records.find((item) => item.provenanceId === provId);
      if (!record) {
        return { allowed: false, blockedBy: ["missing_provenance"], userSafeReason: "Provenance record not found." };
      }
      if (record.quarantineState === "quarantined") {
        return { allowed: false, blockedBy: ["quarantined_provenance"], userSafeReason: "Provenance record is quarantined." };
      }
      if (record.revocationState === "revoked") {
        return { allowed: false, blockedBy: ["revoked_provenance"], userSafeReason: "Provenance record has been revoked." };
      }
      if (record.expiresAt && Date.parse(record.expiresAt) <= Date.now()) {
        return { allowed: false, blockedBy: ["expired_provenance"], userSafeReason: "Provenance record has expired." };
      }
    }

    if (request.approvalRequestId) {
      const hasApproval = this.deps.approvals.hasApprovedOnce(request.approvalRequestId);
      if (!hasApproval) {
        return { allowed: false, blockedBy: ["approval_required"], userSafeReason: "Approval has not been granted or has already been consumed." };
      }
    }

    return { allowed: true, blockedBy: [], userSafeReason: "Provenance verified." };
  }

  private buildActionIdentity(request: GovernedActionRequest): ActionInstanceIdentity {
    return {
      actionInstanceId: `governed:${request.kind}:${request.createdAt}`,
      actionType: request.kind,
      target: request.target,
      parameters: request.parametersPreview,
      provenanceChain: [...request.provenanceIds],
      timestampBucket: request.createdAt.slice(0, 16),
    };
  }

  private emitSucceededEvent(request: GovernedActionRequest, summary: string): void {
    const event: VisionEvent = {
      type: "governed_execution_succeeded",
      message: `Governed execution succeeded: ${request.title}`,
      priority: "MEDIUM",
      context: { timestamp: Date.now(), requestId: request.requestId, summary },
    };
    this.deps.bus.emitEvent(event);
    this.deps.bus.emit("governed_execution_succeeded", { requestId: request.requestId, summary });
  }

  private emitBlockedEvent(request: GovernedActionRequest, blockedBy: string[], reason: string): void {
    const event: VisionEvent = {
      type: "governed_execution_blocked",
      message: `Governed execution blocked: ${request.title}`,
      priority: "HIGH",
      context: { timestamp: Date.now(), requestId: request.requestId, blockedBy, reason },
    };
    this.deps.bus.emitEvent(event);
    this.deps.bus.emit("governed_execution_blocked", { requestId: request.requestId, blockedBy, reason });
  }

  private emitFailedEvent(request: GovernedActionRequest, errorMessage: string): void {
    const event: VisionEvent = {
      type: "governed_execution_failed",
      message: `Governed execution failed: ${request.title}`,
      priority: "HIGH",
      context: { timestamp: Date.now(), requestId: request.requestId, errorMessage },
    };
    this.deps.bus.emitEvent(event);
    this.deps.bus.emit("governed_execution_failed", { requestId: request.requestId, errorMessage });
  }

  private createInboxEvent(
    request: GovernedActionRequest,
    outcome: "succeeded" | "blocked" | "failed",
    detail: string,
  ): ReturnType<RuntimeInboxService["ingestEvent"]> | undefined {
    const titleMap = { succeeded: "Action completed", blocked: "Action blocked", failed: "Action failed" };
    return this.deps.inbox.ingestEvent({
      source: "system",
      sourceTrustLevel: "local",
      title: `${titleMap[outcome]}: ${request.title}`,
      body: detail,
      eventType: `governed_execution_${outcome}`,
      provenance: {
        provenanceId: request.provenanceIds[0] ?? "unknown",
        sourceType: "runtime_snapshot",
        sourceId: request.requestId,
        sourceTrustLevel: "local",
        createdBy: "governed-execution-bridge",
        createdAt: nowIso(),
        digest: request.actionDigest,
        parentProvenanceIds: request.provenanceIds,
        quarantineState: "clear",
        approvalState: outcome === "succeeded" ? "approved_once" : "pending",
        revocationState: "active",
      },
      requiresApproval: false,
      metadata: sanitizeRuntimeMetadata({
        requestId: request.requestId,
        outcome,
        capability: mapCapability(request) ?? "unknown",
      }),
    });
  }

  private buildFailedResult(requestId: string, errorMessage: string, executionId?: string): GovernedToolExecutionResult {
    const now = nowIso();
    return {
      executionId: executionId ?? `exec:failed:${now}`,
      requestId,
      status: "failed",
      resultSummary: errorMessage,
      resultPreview: {},
      startedAt: now,
      completedAt: now,
      consumedApproval: false,
      errorMessage,
    };
  }

  private upsert(execution: GovernedToolExecutionRequest): void {
    this.executions = [execution, ...this.executions.filter((item) => item.executionId !== execution.executionId)];
    if (this.executions.length > MAX_EXECUTIONS) {
      this.executions = this.executions.slice(0, MAX_EXECUTIONS);
    }
    this.persist();
  }

  private persist(): void {
    this.deps.storage?.setItem(STORAGE_KEY, JSON.stringify(this.executions));
  }
}

export const governedToolExecutionService = new GovernedToolExecutionService();
