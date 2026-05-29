import { eventBus } from "../eventBus";
import { runtimeInboxService, type RuntimeInboxService, sanitizeRuntimeMetadata } from "./RuntimeInboxService";
import { evaluateGatewayRequest, sanitizeGatewayInput } from "./BrowserDesktopGatewayPolicy";
import type {
  GatewayDiagnosticsSummary,
  GatewayRequestRecord,
} from "../../types/browserDesktopGateway";

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface CreateGatewayRequestInput {
  title: string;
  summary: string;
  source: string;
  sourceId?: string;
  target?: string;
  provenanceIds?: string[];
  metadata?: Record<string, unknown>;
}

export interface BrowserDesktopGatewayServiceDependencies {
  storage?: StorageLike;
  inbox: Pick<RuntimeInboxService, "ingestEvent">;
  bus: Pick<typeof eventBus, "emitEvent" | "emit">;
}

const STORAGE_KEY = "LUCA_BROWSER_DESKTOP_GATEWAY_REQUESTS_V1";
const MAX_REQUESTS = 200;

function nowIso(): string {
  return new Date().toISOString();
}

function getStorage(): StorageLike | undefined {
  if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  if (typeof localStorage !== "undefined") return localStorage;
  return undefined;
}

function readRequests(store: StorageLike | undefined): GatewayRequestRecord[] {
  try {
    const raw = store?.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export class BrowserDesktopGatewayService {
  private requests: GatewayRequestRecord[];

  constructor(
    private readonly deps: BrowserDesktopGatewayServiceDependencies = {
      storage: getStorage(),
      inbox: runtimeInboxService,
      bus: eventBus,
    },
  ) {
    this.requests = readRequests(this.deps.storage);
  }

  createGatewayRequest(input: CreateGatewayRequestInput): GatewayRequestRecord {
    const timestamp = nowIso();
    const sanitized = sanitizeGatewayInput({
      message: `${input.title}. ${input.summary}`,
      source: input.source,
      sourceId: input.sourceId,
      target: input.target,
      metadata: input.metadata,
    });
    const policyDecision = evaluateGatewayRequest({
      message: sanitized.message,
      source: sanitized.source,
      sourceId: sanitized.sourceId,
      target: sanitized.target,
      metadata: sanitized.metadata,
    });
    const status = policyDecision.blockedBy.length > 0
      ? "blocked"
      : policyDecision.allowedForDryRun
        ? "dry_run_only"
        : "waiting_user";
    const record: GatewayRequestRecord = {
      gatewayRequestId: `gateway-request:${timestamp}:${Math.random().toString(36).slice(2, 8)}`,
      title: sanitized.message.split(".")[0].slice(0, 160) || "Gateway request",
      summary: sanitized.message.slice(0, 1_000),
      source: sanitized.source,
      sourceId: sanitized.sourceId,
      surface: policyDecision.surface,
      capability: policyDecision.capability,
      target: sanitized.target,
      status,
      riskLevel: policyDecision.riskLevel,
      policyDecision,
      provenanceIds: [...(input.provenanceIds ?? [])],
      createdAt: timestamp,
      updatedAt: timestamp,
      blockedBy: policyDecision.blockedBy.length > 0 ? [...policyDecision.blockedBy] : undefined,
      metadata: sanitizeRuntimeMetadata(sanitized.metadata),
    };

    this.upsert(record);
    this.emit(record);
    this.createInboxEvent(record);
    return record;
  }

  listGatewayRequests(): GatewayRequestRecord[] {
    return [...this.requests];
  }

  getGatewayRequest(gatewayRequestId: string): GatewayRequestRecord | undefined {
    return this.requests.find((request) => request.gatewayRequestId === gatewayRequestId);
  }

  archiveGatewayRequest(gatewayRequestId: string): GatewayRequestRecord | undefined {
    return this.update(gatewayRequestId, { status: "archived" });
  }

  blockGatewayRequest(gatewayRequestId: string, reason = "Blocked by gateway research policy."): GatewayRequestRecord | undefined {
    const existing = this.getGatewayRequest(gatewayRequestId);
    const blockedBy = existing?.blockedBy && existing.blockedBy.length > 0 ? existing.blockedBy : [reason];
    return this.update(gatewayRequestId, { status: "blocked", blockedBy });
  }

  getDiagnosticsSummary(): GatewayDiagnosticsSummary {
    const last = this.requests[0];
    return {
      totalRequests: this.requests.length,
      dryRunRequests: this.requests.filter((request) => request.status === "dry_run_only").length,
      blockedRequests: this.requests.filter((request) => request.status === "blocked").length,
      waitingUserRequests: this.requests.filter((request) => request.status === "waiting_user").length,
      highRiskRequests: this.requests.filter((request) => request.riskLevel === "high").length,
      criticalRiskRequests: this.requests.filter((request) => request.riskLevel === "critical").length,
      executionEnabled: false,
      dryRunOnly: true,
      lastRequestAt: last?.updatedAt,
    };
  }

  private update(gatewayRequestId: string, update: Partial<GatewayRequestRecord>): GatewayRequestRecord | undefined {
    const existing = this.getGatewayRequest(gatewayRequestId);
    if (!existing) return undefined;
    const next = { ...existing, ...update, gatewayRequestId, createdAt: existing.createdAt, updatedAt: nowIso() };
    this.upsert(next);
    this.emit(next);
    return next;
  }

  private upsert(record: GatewayRequestRecord): void {
    this.requests = [record, ...this.requests.filter((request) => request.gatewayRequestId !== record.gatewayRequestId)].slice(0, MAX_REQUESTS);
    this.deps.storage?.setItem(STORAGE_KEY, JSON.stringify(this.requests));
  }

  private emit(record: GatewayRequestRecord): void {
    const type = record.status === "blocked"
      ? "browser_desktop_gateway_request_blocked"
      : record.status === "dry_run_only"
        ? "browser_desktop_gateway_request_dry_run_only"
        : "browser_desktop_gateway_request_created";
    this.deps.bus.emitEvent({
      type,
      message: `Gateway request ${record.status}: ${record.title}`,
      priority: record.status === "blocked" ? "HIGH" : "MEDIUM",
      context: {
        gatewayRequestId: record.gatewayRequestId,
        surface: record.surface,
        capability: record.capability,
        riskLevel: record.riskLevel,
        executionEnabled: false,
      },
    });
    this.deps.bus.emit(type, record);
  }

  private createInboxEvent(record: GatewayRequestRecord): void {
    this.deps.inbox.ingestEvent({
      source: "system",
      sourceTrustLevel: "local",
      title: `Gateway ${record.status}: ${record.title}`,
      body: record.policyDecision.userSafeReason,
      eventType: "browser_desktop_gateway_request_created",
      requiresApproval: false,
      metadata: sanitizeRuntimeMetadata({
        gatewayRequestId: record.gatewayRequestId,
        surface: record.surface,
        capability: record.capability,
        riskLevel: record.riskLevel,
        status: record.status,
        executionEnabled: false,
      }),
      provenance: {
        provenanceId: record.gatewayRequestId,
        sourceType: "runtime_snapshot",
        sourceId: record.gatewayRequestId,
        sourceTrustLevel: "local",
        createdBy: "browser-desktop-gateway-service",
        createdAt: record.createdAt,
        digest: record.gatewayRequestId,
        parentProvenanceIds: record.provenanceIds,
        quarantineState: "clear",
        approvalState: "not_required",
        revocationState: "active",
      },
    });
  }
}

export const browserDesktopGatewayService = new BrowserDesktopGatewayService();
