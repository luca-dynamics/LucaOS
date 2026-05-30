// SandboxedBrowserShellService — PR #134: Gated Browser Shell Prototype.
// Manages session records for opening ONE user-approved safe URL inside the
// visible Luca sandbox browser shell.
//
// Hard guarantees — this service NEVER:
//   - reads the DOM or page content
//   - clicks, types, submits, or automates anything
//   - stores cookies, credentials, or session tokens
//   - downloads or uploads files
//   - calls the network directly (it only dispatches a local UI event)
//   - launches an external browser, BrowserWindow, webview, or BrowserView
//
// It validates a URL string via SandboxedBrowserUrlPolicy, records the outcome,
// and (for allowed URLs) emits a local DOM event so the visible shell UI can
// surface the approved URL. All controls remain manual/user-owned.

import { eventBus } from "../eventBus";
import { runtimeInboxService, type RuntimeInboxService, sanitizeRuntimeMetadata } from "./RuntimeInboxService";
import {
  validateSandboxedBrowserUrl,
  redactUrlForAudit,
  classifyUrlRisk,
} from "./SandboxedBrowserUrlPolicy";
import type {
  SandboxedBrowserShellDiagnosticsSummary,
  SandboxedBrowserShellNavigationRecord,
  SandboxedBrowserShellNavigationSource,
  SandboxedBrowserShellOpenEventDetail,
  SandboxedBrowserShellSessionRecord,
  SandboxedBrowserShellStatus,
} from "../../types/sandboxedBrowserShell";
import {
  MAX_SANDBOXED_BROWSER_SHELL_NAVIGATIONS,
  MAX_SANDBOXED_BROWSER_SHELL_SESSIONS,
  SANDBOXED_BROWSER_SHELL_OPEN_EVENT,
} from "../../types/sandboxedBrowserShell";

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface OpenApprovedSafeUrlInput {
  url: string;
  title?: string;
  sourceRequestId?: string;
  provenanceIds?: string[];
  source?: string;
  metadata?: Record<string, unknown>;
}

export interface RecordNavigationAttemptInput {
  shellSessionId: string;
  toUrl: string;
  fromUrl?: string;
  source?: SandboxedBrowserShellNavigationSource;
  metadata?: Record<string, unknown>;
}

export interface SandboxedBrowserShellServiceDependencies {
  storage?: StorageLike;
  inbox: Pick<RuntimeInboxService, "ingestEvent">;
  bus: Pick<typeof eventBus, "emitEvent" | "emit">;
}

const SESSIONS_STORAGE_KEY = "LUCA_SANDBOXED_BROWSER_SHELL_SESSIONS_V1";
const NAVIGATIONS_STORAGE_KEY = "LUCA_SANDBOXED_BROWSER_SHELL_NAVIGATIONS_V1";

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

export class SandboxedBrowserShellService {
  private sessions: SandboxedBrowserShellSessionRecord[];
  private navigations: SandboxedBrowserShellNavigationRecord[];

  constructor(
    private readonly deps: SandboxedBrowserShellServiceDependencies = {
      storage: getStorage(),
      inbox: runtimeInboxService,
      bus: eventBus,
    },
  ) {
    this.sessions = readArray<SandboxedBrowserShellSessionRecord>(this.deps.storage, SESSIONS_STORAGE_KEY);
    this.navigations = readArray<SandboxedBrowserShellNavigationRecord>(this.deps.storage, NAVIGATIONS_STORAGE_KEY);
  }

  /**
   * Create a "proposed" shell session from an approved governed action without
   * yet opening it. Useful when staging a session ahead of Run once.
   */
  createShellRequestFromApprovedAction(input: OpenApprovedSafeUrlInput): SandboxedBrowserShellSessionRecord {
    return this.createSession(input, { open: false, source: input.source ?? "governed-tool-execution" });
  }

  /**
   * Validate and (if allowed) open an approved safe URL inside the visible
   * sandbox browser shell. Allowed URLs emit a local UI event; blocked URLs
   * produce a blocked session record. Never automates or fetches anything.
   */
  openApprovedSafeUrl(input: OpenApprovedSafeUrlInput): SandboxedBrowserShellSessionRecord {
    return this.createSession(input, { open: true, source: input.source ?? "governed-tool-execution" });
  }

  private createSession(
    input: OpenApprovedSafeUrlInput,
    options: { open: boolean; source: string },
  ): SandboxedBrowserShellSessionRecord {
    const timestamp = nowIso();
    const validation = validateSandboxedBrowserUrl(input.url ?? "");
    const auditUrl = validation.auditUrl || redactUrlForAudit(input.url ?? "");

    let status: SandboxedBrowserShellStatus;
    if (!validation.allowed) {
      status = "blocked";
    } else if (!options.open) {
      status = "proposed";
    } else {
      status = "open_requested";
    }

    const record: SandboxedBrowserShellSessionRecord = {
      shellSessionId: `sandboxed-browser-shell:${timestamp}:${Math.random().toString(36).slice(2, 8)}`,
      sourceRequestId: input.sourceRequestId,
      title: (input.title ?? "Open approved safe URL").slice(0, 160),
      normalizedUrl: validation.normalizedUrl ?? "",
      auditUrl,
      status,
      riskLevel: validation.riskLevel,
      blockedBy: validation.blockedBy.length > 0 ? [...validation.blockedBy] : undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
      provenanceIds: [...(input.provenanceIds ?? [])],
      metadata: sanitizeRuntimeMetadata({
        ...input.metadata,
        source: options.source,
        userSafeReason: validation.userSafeReason,
        automationEnabled: false,
        domReadEnabled: false,
        credentialsEnabled: false,
        downloadUploadEnabled: false,
        walletPaymentEnabled: false,
      }),
    };

    this.upsertSession(record);
    this.emitSessionEvent(record);
    this.createInboxEvent(record);

    // Only allowed + open-intent sessions surface the visible shell. Blocked
    // sessions never dispatch the open event, so no URL is ever surfaced.
    if (validation.allowed && options.open) {
      this.dispatchOpenEvent(record, options.source);
    }

    return record;
  }

  listShellSessions(): SandboxedBrowserShellSessionRecord[] {
    return [...this.sessions];
  }

  getShellSession(shellSessionId: string): SandboxedBrowserShellSessionRecord | undefined {
    return this.sessions.find((session) => session.shellSessionId === shellSessionId);
  }

  /**
   * Mark a session as visibly open (called by the shell UI when it mounts the
   * approved URL). Only transitions from a pre-open state.
   */
  markShellOpened(shellSessionId: string, adapter?: string): SandboxedBrowserShellSessionRecord | undefined {
    const existing = this.getShellSession(shellSessionId);
    if (!existing) return undefined;
    if (existing.status !== "open_requested" && existing.status !== "proposed") return existing;
    const update: Partial<SandboxedBrowserShellSessionRecord> = { status: "open" };
    if (adapter) {
      // Record which adapter surfaced the session (luca_browser_webview |
      // iframe_fallback). This is metadata only; capability flags stay false.
      update.metadata = sanitizeRuntimeMetadata({ ...existing.metadata, adapter });
    }
    return this.updateSession(shellSessionId, update, "sandboxed_browser_shell_opened");
  }

  // -----------------------------------------------------------------------
  // PR #136 — navigation governance + session lifecycle
  // -----------------------------------------------------------------------

  /**
   * Validate and record a single governed navigation attempt. The URL string is
   * checked through SandboxedBrowserUrlPolicy; only redacted audit URLs are
   * stored. Allowed navigations move the session to `navigating`; blocked
   * navigations move it to `navigation_blocked` and emit an audit event.
   *
   * Never fetches the URL, inspects the DOM, or touches cookies/session data.
   */
  recordNavigationAttempt(input: RecordNavigationAttemptInput): SandboxedBrowserShellNavigationRecord {
    const validation = validateSandboxedBrowserUrl(input.toUrl ?? "");
    const toAuditUrl = validation.auditUrl || redactUrlForAudit(input.toUrl ?? "");
    const fromAuditUrl = input.fromUrl ? redactUrlForAudit(input.fromUrl) : undefined;
    const source = input.source ?? "luca_browser_webview";

    if (!validation.allowed) {
      return this.pushBlockedNavigation({
        shellSessionId: input.shellSessionId,
        toAuditUrl,
        fromAuditUrl,
        riskLevel: validation.riskLevel,
        blockedBy: validation.blockedBy.length > 0 ? [...validation.blockedBy] : ["blocked_url"],
        userSafeReason: validation.userSafeReason,
        source,
        metadata: input.metadata,
      });
    }

    const record = this.buildNavigationRecord({
      shellSessionId: input.shellSessionId,
      toAuditUrl,
      fromAuditUrl,
      // Long-lived nav records keep redacted audit URLs only — never the raw
      // normalized URL, which can still carry query/hash params.
      normalizedUrl: toAuditUrl,
      status: "allowed",
      riskLevel: validation.riskLevel,
      userSafeReason: validation.userSafeReason,
      source,
      metadata: input.metadata,
    });
    this.upsertNavigation(record);
    // Allowed navigation: reflect a transient navigating state if the session is
    // currently open-ish. Never reactivate a closed/revoked/paused session.
    const existing = this.getShellSession(input.shellSessionId);
    if (existing && (existing.status === "open" || existing.status === "open_requested" || existing.status === "navigation_blocked" || existing.status === "navigating")) {
      this.updateSession(input.shellSessionId, { status: "navigating" }, "sandboxed_browser_shell_navigating");
    }
    return record;
  }

  /**
   * Explicitly record a blocked navigation for a session (e.g. when the shell
   * surface detects a disallowed attempt). Redacts the attempted URL.
   */
  markNavigationBlocked(
    shellSessionId: string,
    reason: string,
    attemptedUrl?: string,
  ): SandboxedBrowserShellNavigationRecord {
    const toAuditUrl = attemptedUrl ? redactUrlForAudit(attemptedUrl) : "(blocked navigation)";
    const riskLevel = attemptedUrl ? classifyUrlRisk(attemptedUrl) : "high";
    return this.pushBlockedNavigation({
      shellSessionId,
      toAuditUrl,
      riskLevel,
      blockedBy: ["blocked_url"],
      userSafeReason: reason,
      source: "system",
    });
  }

  listNavigationRecords(shellSessionId?: string): SandboxedBrowserShellNavigationRecord[] {
    if (!shellSessionId) return [...this.navigations];
    return this.navigations.filter((nav) => nav.shellSessionId === shellSessionId);
  }

  getNavigationRecordsForSession(shellSessionId: string): SandboxedBrowserShellNavigationRecord[] {
    return this.listNavigationRecords(shellSessionId);
  }

  /**
   * Mark a session as actively navigating (called on did-start-loading). Only
   * transitions from an already-open/navigating-ish state; never resurrects a
   * paused, closed, or revoked session.
   */
  markShellNavigating(shellSessionId: string): SandboxedBrowserShellSessionRecord | undefined {
    const existing = this.getShellSession(shellSessionId);
    if (!existing) return undefined;
    if (existing.status !== "open" && existing.status !== "open_requested" && existing.status !== "navigation_blocked") {
      return existing;
    }
    return this.updateSession(shellSessionId, { status: "navigating" }, "sandboxed_browser_shell_navigating");
  }

  /**
   * Settle a session back to `open` once loading stops (did-stop-loading). Only
   * transitions out of the transient `navigating` state; leaves paused/blocked
   * states untouched.
   */
  markShellSettled(shellSessionId: string): SandboxedBrowserShellSessionRecord | undefined {
    const existing = this.getShellSession(shellSessionId);
    if (!existing) return undefined;
    if (existing.status !== "navigating") return existing;
    return this.updateSession(shellSessionId, { status: "open" }, "sandboxed_browser_shell_open");
  }

  pauseShellSession(shellSessionId: string, reason = "Paused by user."): SandboxedBrowserShellSessionRecord | undefined {
    const existing = this.getShellSession(shellSessionId);
    if (!existing) return undefined;
    if (existing.status === "closed" || existing.status === "revoked") return existing;
    return this.updateSession(
      shellSessionId,
      { status: "paused", metadata: sanitizeRuntimeMetadata({ ...existing.metadata, pauseReason: reason }) },
      "sandboxed_browser_shell_paused",
    );
  }

  resumeShellSession(shellSessionId: string): SandboxedBrowserShellSessionRecord | undefined {
    const existing = this.getShellSession(shellSessionId);
    if (!existing) return undefined;
    if (existing.status !== "paused") return existing;
    return this.updateSession(shellSessionId, { status: "open" }, "sandboxed_browser_shell_resumed");
  }

  /**
   * Mark a session as adapter_unavailable when the runtime cannot mount a shell.
   */
  markAdapterUnavailable(shellSessionId: string): SandboxedBrowserShellSessionRecord | undefined {
    const existing = this.getShellSession(shellSessionId);
    if (!existing) return undefined;
    return this.updateSession(shellSessionId, { status: "adapter_unavailable" }, "sandboxed_browser_shell_adapter_unavailable");
  }

  closeShellSession(shellSessionId: string): SandboxedBrowserShellSessionRecord | undefined {
    const existing = this.getShellSession(shellSessionId);
    if (!existing) return undefined;
    return this.updateSession(
      shellSessionId,
      { status: "closed", closedAt: nowIso() },
      "sandboxed_browser_shell_closed",
    );
  }

  revokeShellSession(shellSessionId: string, reason = "Revoked by user."): SandboxedBrowserShellSessionRecord | undefined {
    const existing = this.getShellSession(shellSessionId);
    if (!existing) return undefined;
    return this.updateSession(
      shellSessionId,
      {
        status: "revoked",
        revokedAt: nowIso(),
        metadata: sanitizeRuntimeMetadata({ ...existing.metadata, revokeReason: reason }),
      },
      "sandboxed_browser_shell_revoked",
    );
  }

  getDiagnosticsSummary(): SandboxedBrowserShellDiagnosticsSummary {
    const count = (status: SandboxedBrowserShellStatus): number =>
      this.sessions.filter((session) => session.status === status).length;
    const last = this.sessions[0];
    const allowedNavigations = this.navigations.filter((nav) => nav.status === "allowed").length;
    const blockedNavigations = this.navigations.filter((nav) => nav.status === "blocked").length;
    return {
      totalSessions: this.sessions.length,
      proposedSessions: count("proposed"),
      openRequestedSessions: count("open_requested"),
      openSessions: count("open"),
      navigatingSessions: count("navigating"),
      navigationBlockedSessions: count("navigation_blocked"),
      pausedSessions: count("paused"),
      blockedSessions: count("blocked"),
      closedSessions: count("closed"),
      revokedSessions: count("revoked"),
      adapterUnavailableSessions: count("adapter_unavailable"),
      navigationEvents: this.navigations.length,
      allowedNavigations,
      blockedNavigations,
      lastNavigationAt: this.navigations[0]?.createdAt ?? null,
      launchMode: "approved_safe_url_only",
      navigationGovernanceEnabled: true,
      automationEnabled: false,
      domReadEnabled: false,
      credentialsEnabled: false,
      downloadUploadEnabled: false,
      walletPaymentEnabled: false,
      lastSessionAt: last?.createdAt ?? null,
    };
  }

  // -----------------------------------------------------------------------
  // Private
  // -----------------------------------------------------------------------

  private updateSession(
    shellSessionId: string,
    update: Partial<SandboxedBrowserShellSessionRecord>,
    eventType: string,
  ): SandboxedBrowserShellSessionRecord | undefined {
    const existing = this.getShellSession(shellSessionId);
    if (!existing) return undefined;
    const next: SandboxedBrowserShellSessionRecord = {
      ...existing,
      ...update,
      shellSessionId,
      createdAt: existing.createdAt,
      updatedAt: nowIso(),
    };
    this.upsertSession(next);
    this.emitSessionEvent(next, eventType);
    return next;
  }

  private upsertSession(record: SandboxedBrowserShellSessionRecord): void {
    this.sessions = [
      record,
      ...this.sessions.filter((session) => session.shellSessionId !== record.shellSessionId),
    ].slice(0, MAX_SANDBOXED_BROWSER_SHELL_SESSIONS);
    this.deps.storage?.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(this.sessions));
  }

  private buildNavigationRecord(input: {
    shellSessionId: string;
    toAuditUrl: string;
    fromAuditUrl?: string;
    normalizedUrl?: string;
    status: SandboxedBrowserShellNavigationRecord["status"];
    riskLevel: SandboxedBrowserShellNavigationRecord["riskLevel"];
    blockedBy?: string[];
    userSafeReason: string;
    source: SandboxedBrowserShellNavigationSource;
    metadata?: Record<string, unknown>;
  }): SandboxedBrowserShellNavigationRecord {
    const timestamp = nowIso();
    return {
      navigationId: `sandboxed-browser-nav:${timestamp}:${Math.random().toString(36).slice(2, 8)}`,
      shellSessionId: input.shellSessionId,
      fromAuditUrl: input.fromAuditUrl,
      toAuditUrl: input.toAuditUrl,
      normalizedUrl: input.normalizedUrl,
      status: input.status,
      riskLevel: input.riskLevel,
      blockedBy: input.blockedBy && input.blockedBy.length > 0 ? [...input.blockedBy] : undefined,
      userSafeReason: input.userSafeReason,
      createdAt: timestamp,
      source: input.source,
      metadata: input.metadata
        ? sanitizeRuntimeMetadata({ ...input.metadata, automationEnabled: false, domReadEnabled: false })
        : { automationEnabled: false, domReadEnabled: false },
    };
  }

  private pushBlockedNavigation(input: {
    shellSessionId: string;
    toAuditUrl: string;
    fromAuditUrl?: string;
    riskLevel: SandboxedBrowserShellNavigationRecord["riskLevel"];
    blockedBy: string[];
    userSafeReason: string;
    source: SandboxedBrowserShellNavigationSource;
    metadata?: Record<string, unknown>;
  }): SandboxedBrowserShellNavigationRecord {
    const record = this.buildNavigationRecord({ ...input, status: "blocked" });
    this.upsertNavigation(record);
    // A blocked governed navigation freezes the session so it stops accepting
    // further audited navigation until the user resumes/closes/revokes.
    const existing = this.getShellSession(input.shellSessionId);
    if (existing && existing.status !== "closed" && existing.status !== "revoked" && existing.status !== "paused") {
      this.updateSession(input.shellSessionId, { status: "navigation_blocked" }, "sandboxed_browser_shell_navigation_blocked");
    }
    this.deps.bus.emitEvent({
      type: "sandboxed_browser_shell_navigation_blocked",
      message: `Browser navigation blocked: ${record.toAuditUrl}`,
      priority: "HIGH",
      context: {
        shellSessionId: record.shellSessionId,
        toAuditUrl: record.toAuditUrl,
        riskLevel: record.riskLevel,
        blockedBy: record.blockedBy ?? [],
        automationEnabled: false,
        domReadEnabled: false,
        credentialsEnabled: false,
      },
    });
    return record;
  }

  private upsertNavigation(record: SandboxedBrowserShellNavigationRecord): void {
    this.navigations = [record, ...this.navigations].slice(0, MAX_SANDBOXED_BROWSER_SHELL_NAVIGATIONS);
    this.deps.storage?.setItem(NAVIGATIONS_STORAGE_KEY, JSON.stringify(this.navigations));
    this.deps.bus.emit("sandboxed_browser_shell_navigation", record);
  }

  private emitSessionEvent(record: SandboxedBrowserShellSessionRecord, eventType?: string): void {
    const type = eventType ?? (record.status === "blocked"
      ? "sandboxed_browser_shell_blocked"
      : "sandboxed_browser_shell_session");
    this.deps.bus.emitEvent({
      type,
      message: `Browser shell ${record.status}: ${record.auditUrl || record.title}`,
      priority: record.status === "blocked" ? "HIGH" : "MEDIUM",
      context: {
        shellSessionId: record.shellSessionId,
        status: record.status,
        auditUrl: record.auditUrl,
        riskLevel: record.riskLevel,
        launchMode: "approved_safe_url_only",
        automationEnabled: false,
        domReadEnabled: false,
        credentialsEnabled: false,
      },
    });
    this.deps.bus.emit(type, record);
  }

  private dispatchOpenEvent(record: SandboxedBrowserShellSessionRecord, source: string): void {
    if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") return;
    const detail: SandboxedBrowserShellOpenEventDetail = {
      shellSessionId: record.shellSessionId,
      url: record.normalizedUrl,
      auditUrl: record.auditUrl,
      source,
    };
    try {
      window.dispatchEvent(new CustomEvent(SANDBOXED_BROWSER_SHELL_OPEN_EVENT, { detail }));
    } catch {
      /* dispatching the local UI event is best-effort; never throws into execution */
    }
  }

  private createInboxEvent(record: SandboxedBrowserShellSessionRecord): void {
    this.deps.inbox.ingestEvent({
      source: "system",
      sourceTrustLevel: "local",
      title: `Browser shell ${record.status}: ${record.title}`,
      body: `Safe-URL browser shell session ${record.status}. Audit URL: ${record.auditUrl || "(none)"}. Luca cannot automate the page, read the DOM, handle credentials, or download/upload.`,
      eventType: record.status === "blocked"
        ? "sandboxed_browser_shell_blocked"
        : "sandboxed_browser_shell_open_requested",
      requiresApproval: false,
      metadata: sanitizeRuntimeMetadata({
        shellSessionId: record.shellSessionId,
        sourceRequestId: record.sourceRequestId,
        auditUrl: record.auditUrl,
        status: record.status,
        riskLevel: record.riskLevel,
        launchMode: "approved_safe_url_only",
        automationEnabled: false,
        domReadEnabled: false,
        credentialsEnabled: false,
        downloadUploadEnabled: false,
        walletPaymentEnabled: false,
      }),
      provenance: {
        provenanceId: record.shellSessionId,
        sourceType: "runtime_snapshot",
        sourceId: record.shellSessionId,
        sourceTrustLevel: "local",
        createdBy: "sandboxed-browser-shell-service",
        createdAt: record.createdAt,
        digest: record.shellSessionId,
        parentProvenanceIds: record.provenanceIds,
        quarantineState: "clear",
        approvalState: "not_required",
        revocationState: "active",
      },
    });
  }
}

export const sandboxedBrowserShellService = new SandboxedBrowserShellService();
