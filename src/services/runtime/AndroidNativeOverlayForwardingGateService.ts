import { eventBus } from "../eventBus";
import {
  getAndroidNativeOverlayForwardingDecision,
  getAndroidNativeOverlayPolicy,
} from "./AndroidNativeOverlayGovernancePolicy";
import {
  MAX_NATIVE_OVERLAY_FORWARDING_RECORDS,
  NATIVE_OVERLAY_FORWARDING_GATE_EVENT,
  NATIVE_OVERLAY_SURFACE_IDS,
  type NativeOverlayForwardingDiagnosticsSummary,
  type NativeOverlayForwardingKind,
  type NativeOverlayForwardingRecord,
  type NativeOverlayForwardingSafetyFlags,
  type NativeOverlayForwardingSource,
  type NativeOverlayForwardingStatus,
} from "../../types/androidNativeOverlayGovernance";

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface AndroidNativeOverlayForwardingGateServiceDependencies {
  storage?: StorageLike;
  bus?: Pick<typeof eventBus, "emitEvent" | "emit">;
}

const STORAGE_KEY = "LUCA_ANDROID_NATIVE_OVERLAY_FORWARDING_GATE_V1";

const SAFETY_FLAGS: NativeOverlayForwardingSafetyFlags = {
  governanceApplied: true,
  forwardingGateStubOnly: true,
  forwardingEnabled: false,
  nativePermissionRequested: false,
  voiceCaptureStarted: false,
  voiceCaptureStopped: false,
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
  return `android-native-overlay-forwarding:${nowIso()}:${Math.random().toString(36).slice(2, 8)}`;
}

function defaultStorage(): StorageLike | undefined {
  if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  if (typeof localStorage !== "undefined") return localStorage;
  return undefined;
}

function readArray(store: StorageLike | undefined): NativeOverlayForwardingRecord[] {
  try {
    const raw = store?.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export class AndroidNativeOverlayForwardingGateService {
  private records: NativeOverlayForwardingRecord[];
  private readonly storage?: StorageLike;
  private readonly bus: Pick<typeof eventBus, "emitEvent" | "emit">;

  constructor(deps: AndroidNativeOverlayForwardingGateServiceDependencies = {}) {
    this.storage = deps.storage ?? defaultStorage();
    this.bus = deps.bus ?? eventBus;
    this.records = readArray(this.storage);
  }

  recordForwardingAttempt(
    source: NativeOverlayForwardingSource,
    kind: NativeOverlayForwardingKind,
  ): NativeOverlayForwardingRecord {
    const decision = getAndroidNativeOverlayForwardingDecision(source, kind);
    const policy = getAndroidNativeOverlayPolicy(decision.surfaceId);
    const record: NativeOverlayForwardingRecord = {
      ...SAFETY_FLAGS,
      ...decision,
      nativeOverlayForwardingId: newId(),
      timestamp: nowIso(),
      recommendedFutureApprovalCopy: policy.recommendedFutureApprovalCopy,
    };

    this.records = [record, ...this.records].slice(0, MAX_NATIVE_OVERLAY_FORWARDING_RECORDS);
    this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.records));
    this.bus.emit(NATIVE_OVERLAY_FORWARDING_GATE_EVENT, record);
    this.bus.emitEvent({
      type: NATIVE_OVERLAY_FORWARDING_GATE_EVENT,
      message: `Android native overlay forwarding blocked: ${source}`,
      priority: "HIGH",
      context: {
        nativeOverlayForwardingId: record.nativeOverlayForwardingId,
        surfaceId: record.surfaceId,
        source,
        kind,
        status: record.status,
        allowed: false,
        blockedBy: record.blockedBy,
        governanceApplied: true,
        forwardingGateStubOnly: true,
        forwardingEnabled: false,
        nativePermissionRequested: false,
        voiceCaptureStarted: false,
      },
    });
    return record;
  }

  listRecords(): NativeOverlayForwardingRecord[] {
    return [...this.records];
  }

  getDiagnosticsSummary(): NativeOverlayForwardingDiagnosticsSummary {
    const count = (status: NativeOverlayForwardingStatus) =>
      this.records.filter((record) => record.status === status).length;
    return {
      ...SAFETY_FLAGS,
      totalRecords: this.records.length,
      blockedUntilNativeOverlayPolicyAttempts: count("blocked_until_native_overlay_policy"),
      needsExplicitForwardingPolicyAttempts: count("needs_explicit_forwarding_policy"),
      lastAttemptAt: this.records[0]?.timestamp ?? null,
      surfaces: [...NATIVE_OVERLAY_SURFACE_IDS],
    };
  }
}

export const androidNativeOverlayForwardingGateService = new AndroidNativeOverlayForwardingGateService();
