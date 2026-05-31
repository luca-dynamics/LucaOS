import { eventBus } from "../eventBus";
import {
  getOverlayCaptureGateDecision,
  getOverlayCaptureSurfacePolicy,
} from "./OverlayCaptureGovernancePolicy";
import {
  MAX_OVERLAY_CAPTURE_GATE_RECORDS,
  OVERLAY_CAPTURE_GATE_EVENT,
  OVERLAY_CAPTURE_SURFACE_IDS,
  type OverlayCaptureActivationSafetyFlags,
  type OverlayCaptureActivationStatus,
  type OverlayCaptureGateDiagnosticsSummary,
  type OverlayCaptureGateRecord,
  type OverlayCaptureSurfaceId,
} from "../../types/overlayCaptureGovernance";

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface OverlayCaptureActivationGateServiceDependencies {
  storage?: StorageLike;
  bus?: Pick<typeof eventBus, "emitEvent" | "emit">;
}

const STORAGE_KEY = "LUCA_OVERLAY_CAPTURE_GATE_RECORDS_V1";

const SAFETY_FLAGS: OverlayCaptureActivationSafetyFlags = {
  governanceApplied: true,
  activationGateStubOnly: true,
  captureStarted: false,
  captureStopped: false,
  capturePermissionRequested: false,
  executionChanged: false,
  toolExecutionEnabled: false,
  automationEnabled: false,
  externalActionEnabled: false,
  fileAccessEnabled: false,
  messagingEnabled: false,
  wirelessControlEnabled: false,
  walletPaymentEnabled: false,
};

function nowIso(): string {
  return new Date().toISOString();
}

function newId(): string {
  return `overlay-capture-gate:${nowIso()}:${Math.random().toString(36).slice(2, 8)}`;
}

function defaultStorage(): StorageLike | undefined {
  if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  if (typeof localStorage !== "undefined") return localStorage;
  return undefined;
}

function readArray(store: StorageLike | undefined): OverlayCaptureGateRecord[] {
  try {
    const raw = store?.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export class OverlayCaptureActivationGateService {
  private records: OverlayCaptureGateRecord[];
  private readonly storage?: StorageLike;
  private readonly bus: Pick<typeof eventBus, "emitEvent" | "emit">;

  constructor(deps: OverlayCaptureActivationGateServiceDependencies = {}) {
    this.storage = deps.storage ?? defaultStorage();
    this.bus = deps.bus ?? eventBus;
    this.records = readArray(this.storage);
  }

  recordActivationAttempt(surfaceId: OverlayCaptureSurfaceId): OverlayCaptureGateRecord {
    const policy = getOverlayCaptureSurfacePolicy(surfaceId);
    const decision = getOverlayCaptureGateDecision(surfaceId);
    const record: OverlayCaptureGateRecord = {
      ...SAFETY_FLAGS,
      ...decision,
      captureGateRecordId: newId(),
      sourceComponent: policy.sourceComponent,
      captures: [...policy.captures],
      riskLevel: policy.riskLevel,
      canBypassVisualCoreGovernance: policy.canBypassVisualCoreGovernance,
      canInvokeTools: policy.canInvokeTools,
      needsExplicitActivationGate: policy.needsExplicitActivationGate,
      recommendedFutureApprovalCopy: policy.recommendedFutureApprovalCopy,
      timestamp: nowIso(),
    };
    this.records = [record, ...this.records].slice(0, MAX_OVERLAY_CAPTURE_GATE_RECORDS);
    this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.records));
    this.bus.emit(OVERLAY_CAPTURE_GATE_EVENT, record);
    this.bus.emitEvent({
      type: OVERLAY_CAPTURE_GATE_EVENT,
      message: `Overlay capture activation blocked: ${surfaceId}`,
      priority: "HIGH",
      context: {
        captureGateRecordId: record.captureGateRecordId,
        surfaceId,
        status: record.status,
        allowed: false,
        blockedBy: record.blockedBy,
        governanceApplied: true,
        activationGateStubOnly: true,
        captureStarted: false,
        capturePermissionRequested: false,
      },
    });
    return record;
  }

  listRecords(): OverlayCaptureGateRecord[] {
    return [...this.records];
  }

  getDiagnosticsSummary(): OverlayCaptureGateDiagnosticsSummary {
    const count = (status: OverlayCaptureActivationStatus) =>
      this.records.filter((record) => record.status === status).length;
    return {
      ...SAFETY_FLAGS,
      totalRecords: this.records.length,
      blockedUntilDedicatedPolicyAttempts: count("blocked_until_dedicated_policy"),
      needsExplicitCapturePolicyAttempts: count("needs_explicit_capture_policy"),
      lastAttemptAt: this.records[0]?.timestamp ?? null,
      surfaces: [...OVERLAY_CAPTURE_SURFACE_IDS],
    };
  }
}

export const overlayCaptureActivationGateService = new OverlayCaptureActivationGateService();
