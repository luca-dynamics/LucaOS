// SandboxedBrowserService — PR #133: Sandboxed Browser Prototype, research/design only.
// Stores permission-model records for a hypothetical future sandboxed browser.
// It never launches a browser, creates a webview/BrowserWindow, automates,
// reads the DOM, scrapes, clicks, types, submits, logs in, downloads/uploads,
// calls the network, or handles credentials/cookies/session data.

import { eventBus } from "../eventBus";
import { runtimeInboxService, type RuntimeInboxService, sanitizeRuntimeMetadata } from "./RuntimeInboxService";
import {
  evaluateSandboxedBrowserRequest,
  sanitizeSandboxedBrowserInput,
} from "./SandboxedBrowserPolicy";
import type {
  SandboxedBrowserDiagnosticsSummary,
  SandboxedBrowserRequestRecord,
  SandboxedBrowserRequestStatus,
  SandboxedBrowserSessionRecord,
  SandboxedBrowserSessionStatus,
} from "../../types/sandboxedBrowser";

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface CreateSandboxedBrowserRequestInput {
  title: string;
  summary: string;
  source: string;
  sourceId?: string;
  targetDescriptor?: string;
  provenanceIds?: string[];
  metadata?: Record<string, unknown>;
}

export interface SandboxedBrowserServiceDependencies {
  storage?: StorageLike;
  inbox: Pick<RuntimeInboxService, "ingestEvent">;
  bus: Pick<typeof eventBus, "emitEvent" | "emit">;
}

const REQUESTS_STORAGE_KEY = "LUCA_SANDBOXED_BROWSER_REQUESTS_V1";
const SESSIONS_STORAGE_KEY = "LUCA_SANDBOXED_BROWSER_SESSIONS_V1";
const MAX_REQUESTS = 200;
const MAX_SESSIONS = 100;

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

export class SandboxedBrowserService {
  private requests: SandboxedBrowserRequestRecord[];
  private sessions: SandboxedBrowserSessionRecord[];

  constructor(
    private readonly deps: SandboxedBrowserServiceDependencies = {
      storage: getStorage(),
      inbox: runtimeInboxService,
      bus: eventBus,
    },
  ) {
    this.requests = readArray<SandboxedBrowserRequestRecord>(this.deps.storage, REQUESTS_STORAGE_KEY);
    this.sessions = readArray<SandboxedBrowserSessionRecord>(this.deps.storage, SESSIONS_STORAGE_KEY);
  }

  createBrowserRequest(input: CreateSandboxedBrowserRequestInput): SandboxedBrowserRequestRecord {
    const timestamp = nowIso();
    const rawInput = {
      message: `${input.title}. ${input.summary}`,
      source: input.source,
      sourceId: input.sourceId,
      targetDescriptor: input.targetDescriptor,
      metadata: input.metadata,
    };
    // Evaluate against raw input so secret-like content is detected before scrubbing.
    const policyDecision = evaluateSandboxedBrowserRequest(rawInput);
    const sanitized = sanitizeSandboxedBrowserInput(rawInput);
    const status: SandboxedBrowserRequestStatus = policyDecision.blockedBy.length > 0
      ? "blocked"
      : policyDecision.allowedForDryRun
        ? "dry_run_only"
        : "waiting_user";
    const record: SandboxedBrowserRequestRecord = {
      browserRequestId: `sandboxed-browser-request:${timestamp}:${Math.random().toString(36).slice(2, 8)}`,
      title: sanitized.message.split(".")[0].slice(0, 160) || "Sandboxed browser request",
      summary: sanitized.message.slice(0, 1_000),
      source: sanitized.source,
      sourceId: sanitized.sourceId,
      surface: policyDecision.surface,
      capability: policyDecision.capability,
      targetDescriptor: sanitized.targetDescriptor,
      status,
      riskLevel: policyDecision.riskLevel,
      navigationRisk: policyDecision.navigationRisk,
      credentialBoundary: policyDecision.credentialBoundary,
      policyDecision,
      provenanceIds: [...(input.provenanceIds ?? [])],
      createdAt: timestamp,
      updatedAt: timestamp,
      blockedBy: policyDecision.blockedBy.length > 0 ? [...policyDecision.blockedBy] : undefined,
      metadata: sanitizeRuntimeMetadata(sanitized.metadata),
    };

    this.upsertRequest(record);
    this.emitRequest(record);
    this.createInboxEvent(record);
    return record;
  }

  listBrowserRequests(): SandboxedBrowserRequestRecord[] {
    return [...this.requests];
  }

  getBrowserRequest(browserRequestId: string): SandboxedBrowserRequestRecord | undefined {
    return this.requests.find((request) => request.browserRequestId === browserRequestId);
  }

  archiveBrowserRequest(browserRequestId: string): SandboxedBrowserRequestRecord | undefined {
    return this.updateRequest(browserRequestId, { status: "archived" });
  }

  revokeBrowserRequest(browserRequestId: string, reason = "Revoked by user."): SandboxedBrowserRequestRecord | undefined {
    const existing = this.getBrowserRequest(browserRequestId);
    if (!existing) return undefined;
    return this.updateRequest(browserRequestId, {
      status: "blocked",
      blockedBy: [...(existing.blockedBy ?? []), "revoked_by_user"],
      metadata: sanitizeRuntimeMetadata({ ...existing.metadata, revokeReason: reason }),
    });
  }

  blockBrowserRequest(browserRequestId: string, reason = "Blocked by sandboxed browser policy."): SandboxedBrowserRequestRecord | undefined {
    const existing = this.getBrowserRequest(browserRequestId);
    const blockedBy = existing?.blockedBy && existing.blockedBy.length > 0 ? existing.blockedBy : [reason];
    return this.updateRequest(browserRequestId, { status: "blocked", blockedBy });
  }

  createDryRunSessionFromRequest(browserRequestId: string): SandboxedBrowserSessionRecord | undefined {
    const request = this.getBrowserRequest(browserRequestId);
    if (!request) return undefined;
    if (request.status !== "dry_run_only" && request.status !== "waiting_user") return undefined;

    const timestamp = nowIso();
    const status: SandboxedBrowserSessionStatus = request.status === "dry_run_only" ? "dry_run_only" : "waiting_user";
    const session: SandboxedBrowserSessionRecord = {
      browserSessionId: `sandboxed-browser-session:${timestamp}:${Math.random().toString(36).slice(2, 8)}`,
      requestId: request.browserRequestId,
      title: `Dry-run browser permission session: ${request.title}`.slice(0, 160),
      summary: "Dry-run browser permission session only. No browser is launched, automated, read, or controlled.",
      surface: request.surface,
      capability: request.capability,
      targetDescriptor: request.targetDescriptor,
      status,
      riskLevel: request.riskLevel,
      navigationRisk: request.navigationRisk,
      credentialBoundary: request.credentialBoundary,
      policyDecision: request.policyDecision,
      provenanceIds: [...request.provenanceIds],
      createdAt: timestamp,
      updatedAt: timestamp,
      metadata: sanitizeRuntimeMetadata(request.metadata),
    };

    this.upsertSession(session);
    this.emitSession(session, "sandboxed_browser_session_created");
    return session;
  }

  listBrowserSessions(): SandboxedBrowserSessionRecord[] {
    return [...this.sessions];
  }

  getBrowserSession(browserSessionId: string): SandboxedBrowserSessionRecord | undefined {
    return this.sessions.find((session) => session.browserSessionId === browserSessionId);
  }

  revokeBrowserSession(browserSessionId: string, reason = "Revoked by user."): SandboxedBrowserSessionRecord | undefined {
    const existing = this.getBrowserSession(browserSessionId);
    if (!existing) return undefined;
    const next = this.updateSession(browserSessionId, {
      status: "revoked",
      revokedAt: nowIso(),
      metadata: sanitizeRuntimeMetadata({ ...existing.metadata, revokeReason: reason }),
    });
    if (next) this.emitSession(next, "sandboxed_browser_session_revoked");
    return next;
  }

  archiveBrowserSession(browserSessionId: string): SandboxedBrowserSessionRecord | undefined {
    return this.updateSession(browserSessionId, { status: "archived" });
  }

  getDiagnosticsSummary(): SandboxedBrowserDiagnosticsSummary {
    const last = this.requests[0];
    return {
      totalRequests: this.requests.length,
      dryRunRequests: this.requests.filter((request) => request.status === "dry_run_only").length,
      blockedRequests: this.requests.filter((request) => request.status === "blocked").length,
      waitingUserRequests: this.requests.filter((request) => request.status === "waiting_user").length,
      totalSessions: this.sessions.length,
      dryRunSessions: this.sessions.filter((session) => session.status === "dry_run_only").length,
      revokedSessions: this.sessions.filter((session) => session.status === "revoked").length,
      launchEnabled: false,
      automationEnabled: false,
      domReadEnabled: false,
      networkRequestEnabled: false,
      dryRunOnly: true,
      lastRequestAt: last?.updatedAt,
    };
  }

  clearOldRecords(): void {
    this.requests = this.requests.slice(0, MAX_REQUESTS);
    this.sessions = this.sessions.slice(0, MAX_SESSIONS);
    this.deps.storage?.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(this.requests));
    this.deps.storage?.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(this.sessions));
  }

  private updateRequest(browserRequestId: string, update: Partial<SandboxedBrowserRequestRecord>): SandboxedBrowserRequestRecord | undefined {
    const existing = this.getBrowserRequest(browserRequestId);
    if (!existing) return undefined;
    const next = { ...existing, ...update, browserRequestId, createdAt: existing.createdAt, updatedAt: nowIso() };
    this.upsertRequest(next);
    this.emitRequest(next);
    return next;
  }

  private upsertRequest(record: SandboxedBrowserRequestRecord): void {
    this.requests = [record, ...this.requests.filter((request) => request.browserRequestId !== record.browserRequestId)].slice(0, MAX_REQUESTS);
    this.deps.storage?.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(this.requests));
  }

  private updateSession(browserSessionId: string, update: Partial<SandboxedBrowserSessionRecord>): SandboxedBrowserSessionRecord | undefined {
    const existing = this.getBrowserSession(browserSessionId);
    if (!existing) return undefined;
    const next = { ...existing, ...update, browserSessionId, createdAt: existing.createdAt, updatedAt: nowIso() };
    this.upsertSession(next);
    return next;
  }

  private upsertSession(record: SandboxedBrowserSessionRecord): void {
    this.sessions = [record, ...this.sessions.filter((session) => session.browserSessionId !== record.browserSessionId)].slice(0, MAX_SESSIONS);
    this.deps.storage?.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(this.sessions));
  }

  private emitRequest(record: SandboxedBrowserRequestRecord): void {
    const type = record.status === "blocked"
      ? "sandboxed_browser_request_blocked"
      : "sandboxed_browser_request_created";
    this.deps.bus.emitEvent({
      type,
      message: `Sandboxed browser request ${record.status}: ${record.title}`,
      priority: record.status === "blocked" ? "HIGH" : "MEDIUM",
      context: {
        browserRequestId: record.browserRequestId,
        surface: record.surface,
        capability: record.capability,
        riskLevel: record.riskLevel,
        navigationRisk: record.navigationRisk,
        launchEnabled: false,
        automationEnabled: false,
      },
    });
    this.deps.bus.emit(type, record);
  }

  private emitSession(record: SandboxedBrowserSessionRecord, type: string): void {
    this.deps.bus.emitEvent({
      type,
      message: `Sandboxed browser session ${record.status}: ${record.title}`,
      priority: "MEDIUM",
      context: {
        browserSessionId: record.browserSessionId,
        surface: record.surface,
        capability: record.capability,
        riskLevel: record.riskLevel,
        launchEnabled: false,
        automationEnabled: false,
      },
    });
    this.deps.bus.emit(type, record);
  }

  private createInboxEvent(record: SandboxedBrowserRequestRecord): void {
    this.deps.inbox.ingestEvent({
      source: "system",
      sourceTrustLevel: "local",
      title: `Sandboxed browser ${record.status}: ${record.title}`,
      body: record.policyDecision.userSafeReason,
      eventType: "sandboxed_browser_request_created",
      requiresApproval: false,
      metadata: sanitizeRuntimeMetadata({
        browserRequestId: record.browserRequestId,
        surface: record.surface,
        capability: record.capability,
        riskLevel: record.riskLevel,
        navigationRisk: record.navigationRisk,
        status: record.status,
        launchEnabled: false,
        automationEnabled: false,
        domReadEnabled: false,
        networkRequestEnabled: false,
      }),
      provenance: {
        provenanceId: record.browserRequestId,
        sourceType: "runtime_snapshot",
        sourceId: record.browserRequestId,
        sourceTrustLevel: "local",
        createdBy: "sandboxed-browser-service",
        createdAt: record.createdAt,
        digest: record.browserRequestId,
        parentProvenanceIds: record.provenanceIds,
        quarantineState: "clear",
        approvalState: "not_required",
        revocationState: "active",
      },
    });
  }
}

export const sandboxedBrowserService = new SandboxedBrowserService();
