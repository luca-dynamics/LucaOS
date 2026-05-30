// ScreenObservationService — PR #131: Screen Observation Permission Model, dry-run only.
// Stores permission-model records for hypothetical future screen observation.
// It never captures a screen, never calls a vision model, never opens an OS
// permission prompt, and never stores image/OCR/DOM/file/credential data.

import { eventBus } from "../eventBus";
import { runtimeInboxService, type RuntimeInboxService, sanitizeRuntimeMetadata } from "./RuntimeInboxService";
import {
  evaluateScreenObservationRequest,
  sanitizeScreenObservationInput,
} from "./ScreenObservationPolicy";
import type {
  ScreenObservationConsentState,
  ScreenObservationDiagnosticsSummary,
  ScreenObservationRequestRecord,
  ScreenObservationRequestStatus,
  ScreenObservationSessionRecord,
  ScreenObservationSessionStatus,
} from "../../types/screenObservation";

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface CreateScreenObservationRequestInput {
  title: string;
  summary: string;
  source: string;
  sourceId?: string;
  targetDescriptor?: string;
  provenanceIds?: string[];
  metadata?: Record<string, unknown>;
}

export interface ScreenObservationServiceDependencies {
  storage?: StorageLike;
  inbox: Pick<RuntimeInboxService, "ingestEvent">;
  bus: Pick<typeof eventBus, "emitEvent" | "emit">;
}

const REQUESTS_STORAGE_KEY = "LUCA_SCREEN_OBSERVATION_REQUESTS_V1";
const SESSIONS_STORAGE_KEY = "LUCA_SCREEN_OBSERVATION_SESSIONS_V1";
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

function consentStateForRequest(status: ScreenObservationRequestStatus): ScreenObservationConsentState {
  switch (status) {
    case "dry_run_only": return "granted_dry_run_only";
    case "consent_required": return "required";
    case "blocked": return "required";
    case "revoked": return "revoked";
    case "archived": return "not_requested";
    case "proposed": return "not_requested";
  }
}

export class ScreenObservationService {
  private requests: ScreenObservationRequestRecord[];
  private sessions: ScreenObservationSessionRecord[];

  constructor(
    private readonly deps: ScreenObservationServiceDependencies = {
      storage: getStorage(),
      inbox: runtimeInboxService,
      bus: eventBus,
    },
  ) {
    this.requests = readArray<ScreenObservationRequestRecord>(this.deps.storage, REQUESTS_STORAGE_KEY);
    this.sessions = readArray<ScreenObservationSessionRecord>(this.deps.storage, SESSIONS_STORAGE_KEY);
  }

  createObservationRequest(input: CreateScreenObservationRequestInput): ScreenObservationRequestRecord {
    const timestamp = nowIso();
    const rawInput = {
      message: `${input.title}. ${input.summary}`,
      source: input.source,
      sourceId: input.sourceId,
      targetDescriptor: input.targetDescriptor,
      metadata: input.metadata,
    };
    // Evaluate against raw input so secret-like content is detected before scrubbing.
    const policyDecision = evaluateScreenObservationRequest(rawInput);
    const sanitized = sanitizeScreenObservationInput(rawInput);
    const status: ScreenObservationRequestStatus = policyDecision.blockedBy.length > 0
      ? "blocked"
      : policyDecision.allowedForDryRun
        ? "dry_run_only"
        : "consent_required";
    const record: ScreenObservationRequestRecord = {
      observationRequestId: `screen-observation-request:${timestamp}:${Math.random().toString(36).slice(2, 8)}`,
      title: sanitized.message.split(".")[0].slice(0, 160) || "Screen observation request",
      summary: sanitized.message.slice(0, 1_000),
      source: sanitized.source,
      sourceId: sanitized.sourceId,
      surface: policyDecision.surface,
      capability: policyDecision.capability,
      targetDescriptor: sanitized.targetDescriptor,
      status,
      riskLevel: policyDecision.riskLevel,
      consentState: consentStateForRequest(status),
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

  listObservationRequests(): ScreenObservationRequestRecord[] {
    return [...this.requests];
  }

  getObservationRequest(observationRequestId: string): ScreenObservationRequestRecord | undefined {
    return this.requests.find((request) => request.observationRequestId === observationRequestId);
  }

  archiveObservationRequest(observationRequestId: string): ScreenObservationRequestRecord | undefined {
    return this.updateRequest(observationRequestId, { status: "archived", consentState: "not_requested" });
  }

  revokeObservationRequest(observationRequestId: string, reason = "Revoked by user."): ScreenObservationRequestRecord | undefined {
    const existing = this.getObservationRequest(observationRequestId);
    if (!existing) return undefined;
    return this.updateRequest(observationRequestId, {
      status: "revoked",
      consentState: "revoked",
      metadata: sanitizeRuntimeMetadata({ ...existing.metadata, revokeReason: reason }),
    });
  }

  blockObservationRequest(observationRequestId: string, reason = "Blocked by screen observation policy."): ScreenObservationRequestRecord | undefined {
    const existing = this.getObservationRequest(observationRequestId);
    const blockedBy = existing?.blockedBy && existing.blockedBy.length > 0 ? existing.blockedBy : [reason];
    return this.updateRequest(observationRequestId, { status: "blocked", consentState: "required", blockedBy });
  }

  createDryRunSessionFromRequest(observationRequestId: string): ScreenObservationSessionRecord | undefined {
    const request = this.getObservationRequest(observationRequestId);
    if (!request) return undefined;
    if (request.status !== "dry_run_only" && request.status !== "consent_required") return undefined;

    const timestamp = nowIso();
    const status: ScreenObservationSessionStatus = request.status === "dry_run_only" ? "dry_run_only" : "waiting_consent";
    const consentState: ScreenObservationConsentState = request.status === "dry_run_only" ? "granted_dry_run_only" : "required";
    const session: ScreenObservationSessionRecord = {
      observationSessionId: `screen-observation-session:${timestamp}:${Math.random().toString(36).slice(2, 8)}`,
      requestId: request.observationRequestId,
      title: `Dry-run permission session: ${request.title}`.slice(0, 160),
      summary: "Dry-run permission session only. No screen is captured, viewed, stored, OCR'd, or analyzed.",
      surface: request.surface,
      capability: request.capability,
      targetDescriptor: request.targetDescriptor,
      status,
      consentState,
      riskLevel: request.riskLevel,
      policyDecision: request.policyDecision,
      provenanceIds: [...request.provenanceIds],
      createdAt: timestamp,
      updatedAt: timestamp,
      metadata: sanitizeRuntimeMetadata(request.metadata),
    };

    this.upsertSession(session);
    this.emitSession(session, "screen_observation_session_created");
    return session;
  }

  listObservationSessions(): ScreenObservationSessionRecord[] {
    return [...this.sessions];
  }

  getObservationSession(observationSessionId: string): ScreenObservationSessionRecord | undefined {
    return this.sessions.find((session) => session.observationSessionId === observationSessionId);
  }

  revokeObservationSession(observationSessionId: string, reason = "Revoked by user."): ScreenObservationSessionRecord | undefined {
    const existing = this.getObservationSession(observationSessionId);
    if (!existing) return undefined;
    const next = this.updateSession(observationSessionId, {
      status: "revoked",
      consentState: "revoked",
      revokedAt: nowIso(),
      metadata: sanitizeRuntimeMetadata({ ...existing.metadata, revokeReason: reason }),
    });
    if (next) this.emitSession(next, "screen_observation_session_revoked");
    return next;
  }

  archiveObservationSession(observationSessionId: string): ScreenObservationSessionRecord | undefined {
    return this.updateSession(observationSessionId, { status: "archived" });
  }

  getDiagnosticsSummary(): ScreenObservationDiagnosticsSummary {
    const last = this.requests[0];
    return {
      totalRequests: this.requests.length,
      dryRunRequests: this.requests.filter((request) => request.status === "dry_run_only").length,
      blockedRequests: this.requests.filter((request) => request.status === "blocked").length,
      consentRequiredRequests: this.requests.filter((request) => request.status === "consent_required").length,
      totalSessions: this.sessions.length,
      dryRunSessions: this.sessions.filter((session) => session.status === "dry_run_only").length,
      revokedSessions: this.sessions.filter((session) => session.status === "revoked").length,
      captureEnabled: false,
      visionModelEnabled: false,
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

  private updateRequest(observationRequestId: string, update: Partial<ScreenObservationRequestRecord>): ScreenObservationRequestRecord | undefined {
    const existing = this.getObservationRequest(observationRequestId);
    if (!existing) return undefined;
    const next = { ...existing, ...update, observationRequestId, createdAt: existing.createdAt, updatedAt: nowIso() };
    this.upsertRequest(next);
    this.emitRequest(next);
    return next;
  }

  private upsertRequest(record: ScreenObservationRequestRecord): void {
    this.requests = [record, ...this.requests.filter((request) => request.observationRequestId !== record.observationRequestId)].slice(0, MAX_REQUESTS);
    this.deps.storage?.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(this.requests));
  }

  private updateSession(observationSessionId: string, update: Partial<ScreenObservationSessionRecord>): ScreenObservationSessionRecord | undefined {
    const existing = this.getObservationSession(observationSessionId);
    if (!existing) return undefined;
    const next = { ...existing, ...update, observationSessionId, createdAt: existing.createdAt, updatedAt: nowIso() };
    this.upsertSession(next);
    return next;
  }

  private upsertSession(record: ScreenObservationSessionRecord): void {
    this.sessions = [record, ...this.sessions.filter((session) => session.observationSessionId !== record.observationSessionId)].slice(0, MAX_SESSIONS);
    this.deps.storage?.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(this.sessions));
  }

  private emitRequest(record: ScreenObservationRequestRecord): void {
    const type = record.status === "blocked"
      ? "screen_observation_request_blocked"
      : record.status === "consent_required"
        ? "screen_observation_request_consent_required"
        : "screen_observation_request_created";
    this.deps.bus.emitEvent({
      type,
      message: `Screen observation request ${record.status}: ${record.title}`,
      priority: record.status === "blocked" ? "HIGH" : "MEDIUM",
      context: {
        observationRequestId: record.observationRequestId,
        surface: record.surface,
        capability: record.capability,
        riskLevel: record.riskLevel,
        captureEnabled: false,
        visionModelEnabled: false,
      },
    });
    this.deps.bus.emit(type, record);
  }

  private emitSession(record: ScreenObservationSessionRecord, type: string): void {
    this.deps.bus.emitEvent({
      type,
      message: `Screen observation session ${record.status}: ${record.title}`,
      priority: "MEDIUM",
      context: {
        observationSessionId: record.observationSessionId,
        surface: record.surface,
        capability: record.capability,
        riskLevel: record.riskLevel,
        captureEnabled: false,
        visionModelEnabled: false,
      },
    });
    this.deps.bus.emit(type, record);
  }

  private createInboxEvent(record: ScreenObservationRequestRecord): void {
    this.deps.inbox.ingestEvent({
      source: "system",
      sourceTrustLevel: "local",
      title: `Screen observation ${record.status}: ${record.title}`,
      body: record.policyDecision.userSafeReason,
      eventType: "screen_observation_request_created",
      requiresApproval: false,
      metadata: sanitizeRuntimeMetadata({
        observationRequestId: record.observationRequestId,
        surface: record.surface,
        capability: record.capability,
        riskLevel: record.riskLevel,
        status: record.status,
        captureEnabled: false,
        visionModelEnabled: false,
      }),
      provenance: {
        provenanceId: record.observationRequestId,
        sourceType: "runtime_snapshot",
        sourceId: record.observationRequestId,
        sourceTrustLevel: "local",
        createdBy: "screen-observation-service",
        createdAt: record.createdAt,
        digest: record.observationRequestId,
        parentProvenanceIds: record.provenanceIds,
        quarantineState: "clear",
        approvalState: "not_required",
        revocationState: "active",
      },
    });
  }
}

export const screenObservationService = new ScreenObservationService();
