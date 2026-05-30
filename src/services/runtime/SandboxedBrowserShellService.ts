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
} from "./SandboxedBrowserUrlPolicy";
import type {
  SandboxedBrowserShellDiagnosticsSummary,
  SandboxedBrowserShellOpenEventDetail,
  SandboxedBrowserShellSessionRecord,
  SandboxedBrowserShellStatus,
} from "../../types/sandboxedBrowserShell";
import {
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

export interface SandboxedBrowserShellServiceDependencies {
  storage?: StorageLike;
  inbox: Pick<RuntimeInboxService, "ingestEvent">;
  bus: Pick<typeof eventBus, "emitEvent" | "emit">;
}

const SESSIONS_STORAGE_KEY = "LUCA_SANDBOXED_BROWSER_SHELL_SESSIONS_V1";

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

  constructor(
    private readonly deps: SandboxedBrowserShellServiceDependencies = {
      storage: getStorage(),
      inbox: runtimeInboxService,
      bus: eventBus,
    },
  ) {
    this.sessions = readArray<SandboxedBrowserShellSessionRecord>(this.deps.storage, SESSIONS_STORAGE_KEY);
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
  markShellOpened(shellSessionId: string): SandboxedBrowserShellSessionRecord | undefined {
    const existing = this.getShellSession(shellSessionId);
    if (!existing) return undefined;
    if (existing.status !== "open_requested" && existing.status !== "proposed") return existing;
    return this.updateSession(shellSessionId, { status: "open" }, "sandboxed_browser_shell_opened");
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
    return {
      totalSessions: this.sessions.length,
      proposedSessions: count("proposed"),
      openRequestedSessions: count("open_requested"),
      openSessions: count("open"),
      blockedSessions: count("blocked"),
      closedSessions: count("closed"),
      revokedSessions: count("revoked"),
      adapterUnavailableSessions: count("adapter_unavailable"),
      launchMode: "approved_safe_url_only",
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
