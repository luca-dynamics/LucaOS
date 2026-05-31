import { eventBus } from "../eventBus";
import {
  getOriginOverlayCriticalControlGateDecision,
} from "./OriginOverlayCriticalControlGovernancePolicy";
import {
  MAX_ORIGIN_OVERLAY_CONTROL_GATE_RECORDS,
  ORIGIN_OVERLAY_CONTROL_GATE_EVENT,
  ORIGIN_OVERLAY_CRITICAL_CONTROL_IDS,
  type OriginOverlayControlGateDiagnosticsSummary,
  type OriginOverlayControlGateRecord,
  type OriginOverlayControlGateStatus,
  type OriginOverlayCriticalControlId,
  type OriginOverlayCriticalControlSafetyFlags,
} from "../../types/originOverlayCriticalControls";

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface OriginOverlayCriticalControlGateServiceDependencies {
  storage?: StorageLike;
  bus?: Pick<typeof eventBus, "emitEvent" | "emit">;
}

const STORAGE_KEY = "LUCA_ORIGIN_OVERLAY_CRITICAL_CONTROL_GATE_V1";

const SAFETY_FLAGS: OriginOverlayCriticalControlSafetyFlags = {
  governanceApplied: true,
  criticalControlGateStubOnly: true,
  controlExecuted: false,
  rootAdminGranted: false,
  lockdownOverridden: false,
  destructiveActionEnabled: false,
  deviceControlEnabled: false,
  customSkillExecutionEnabled: false,
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
  return `origin-overlay-control:${nowIso()}:${Math.random().toString(36).slice(2, 8)}`;
}

function defaultStorage(): StorageLike | undefined {
  if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  if (typeof localStorage !== "undefined") return localStorage;
  return undefined;
}

function readArray(store: StorageLike | undefined): OriginOverlayControlGateRecord[] {
  try {
    const raw = store?.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export class OriginOverlayCriticalControlGateService {
  private records: OriginOverlayControlGateRecord[];
  private readonly storage?: StorageLike;
  private readonly bus: Pick<typeof eventBus, "emitEvent" | "emit">;

  constructor(deps: OriginOverlayCriticalControlGateServiceDependencies = {}) {
    this.storage = deps.storage ?? defaultStorage();
    this.bus = deps.bus ?? eventBus;
    this.records = readArray(this.storage);
  }

  recordCriticalActionAttempt(controlId: OriginOverlayCriticalControlId): OriginOverlayControlGateRecord {
    const decision = getOriginOverlayCriticalControlGateDecision(controlId);
    const record: OriginOverlayControlGateRecord = {
      ...SAFETY_FLAGS,
      ...decision,
      originOverlayControlGateRecordId: newId(),
      timestamp: nowIso(),
    };

    this.records = [record, ...this.records].slice(0, MAX_ORIGIN_OVERLAY_CONTROL_GATE_RECORDS);
    this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.records));
    this.bus.emit(ORIGIN_OVERLAY_CONTROL_GATE_EVENT, record);
    this.bus.emitEvent({
      type: ORIGIN_OVERLAY_CONTROL_GATE_EVENT,
      message: `Origin overlay critical control blocked: ${controlId}`,
      priority: "HIGH",
      context: {
        originOverlayControlGateRecordId: record.originOverlayControlGateRecordId,
        controlId,
        controlKind: record.controlKind,
        status: record.status,
        allowed: false,
        blockedBy: record.blockedBy,
        governanceApplied: true,
        criticalControlGateStubOnly: true,
        controlExecuted: false,
        rootAdminGranted: false,
        lockdownOverridden: false,
        toolExecutionEnabled: false,
      },
    });
    return record;
  }

  listRecords(): OriginOverlayControlGateRecord[] {
    return [...this.records];
  }

  getDiagnosticsSummary(): OriginOverlayControlGateDiagnosticsSummary {
    const count = (status: OriginOverlayControlGateStatus) =>
      this.records.filter((record) => record.status === status).length;
    return {
      ...SAFETY_FLAGS,
      totalRecords: this.records.length,
      blockedUntilOriginControlPolicyAttempts: count("blocked_until_origin_control_policy"),
      needsDedicatedCriticalControlPolicyAttempts: count("needs_dedicated_critical_control_policy"),
      lastAttemptAt: this.records[0]?.timestamp ?? null,
      controls: [...ORIGIN_OVERLAY_CRITICAL_CONTROL_IDS],
    };
  }
}

export const originOverlayCriticalControlGateService = new OriginOverlayCriticalControlGateService();
