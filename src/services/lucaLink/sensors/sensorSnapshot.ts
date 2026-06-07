import type { LucaLinkAdapterExecutionPlan } from "../adapters/adapterSandboxTypes";
import { evaluateLucaLinkReadOnlySensorPolicy } from "./sensorBridgePolicy";
import type {
  LucaLinkReadOnlySensorSnapshot,
  LucaLinkSensorBridgePolicyOptions,
  LucaLinkSensorMetadataValue,
} from "./sensorBridgeTypes";

export interface CreateLucaLinkReadOnlySensorSnapshotInput {
  snapshotId: string;
  hostId: string;
  deviceId?: string;
  capturedAt: string;
  expiresAt: string;
  source?: LucaLinkReadOnlySensorSnapshot["source"];
  status?: LucaLinkReadOnlySensorSnapshot["status"];
  privacyLevel?: LucaLinkReadOnlySensorSnapshot["privacyLevel"];
  sensorKinds: readonly string[];
  blockedSensorKinds?: readonly string[];
  values?: Readonly<Record<string, LucaLinkSensorMetadataValue>>;
  capabilitySummary?: readonly string[];
  permissionSummary?: readonly string[];
  warnings?: readonly string[];
  blockers?: readonly string[];
}

function cloneValue(
  value: LucaLinkSensorMetadataValue,
): LucaLinkSensorMetadataValue {
  if (Array.isArray(value)) return [...value];
  if (value !== null && typeof value === "object") return { ...value };
  return value;
}

function cloneSnapshot(
  snapshot: LucaLinkReadOnlySensorSnapshot,
): LucaLinkReadOnlySensorSnapshot {
  return {
    ...snapshot,
    sensorKinds: [...snapshot.sensorKinds],
    blockedSensorKinds: [...snapshot.blockedSensorKinds],
    values: Object.fromEntries(
      Object.entries(snapshot.values).map(([key, value]) => [
        key,
        cloneValue(value),
      ]),
    ),
    capabilitySummary: [...snapshot.capabilitySummary],
    permissionSummary: [...snapshot.permissionSummary],
    warnings: [...snapshot.warnings],
    blockers: [...snapshot.blockers],
    readOnly: true,
    sideEffectsPerformed: false,
  };
}

export function createLucaLinkReadOnlySensorSnapshot(
  input: CreateLucaLinkReadOnlySensorSnapshotInput,
): LucaLinkReadOnlySensorSnapshot {
  return {
    snapshotId: input.snapshotId,
    hostId: input.hostId,
    ...(input.deviceId ? { deviceId: input.deviceId } : {}),
    capturedAt: input.capturedAt,
    expiresAt: input.expiresAt,
    source: input.source ?? "fixture",
    status: input.status ?? "draft",
    privacyLevel: input.privacyLevel ?? "project",
    readOnly: true,
    sensorKinds: [...input.sensorKinds],
    blockedSensorKinds: [...(input.blockedSensorKinds ?? [])],
    values: Object.fromEntries(
      Object.entries(input.values ?? {}).map(([key, value]) => [
        key,
        cloneValue(value),
      ]),
    ),
    capabilitySummary: [...(input.capabilitySummary ?? [])],
    permissionSummary: [...(input.permissionSummary ?? [])],
    warnings: [...(input.warnings ?? [])],
    blockers: [...(input.blockers ?? [])],
    sideEffectsPerformed: false,
  };
}

export function validateLucaLinkReadOnlySensorSnapshot(
  snapshot: LucaLinkReadOnlySensorSnapshot,
  options: LucaLinkSensorBridgePolicyOptions = {},
): LucaLinkReadOnlySensorSnapshot {
  const evaluation = evaluateLucaLinkReadOnlySensorPolicy(snapshot, options);
  return {
    ...cloneSnapshot(snapshot),
    status: evaluation.status,
    blockedSensorKinds: [...evaluation.blockedSensorKinds],
    warnings: [...evaluation.warnings],
    blockers: [...evaluation.blockers],
    sideEffectsPerformed: false,
  };
}

export function expireLucaLinkReadOnlySensorSnapshot(
  snapshot: LucaLinkReadOnlySensorSnapshot,
  now: string | Date,
): LucaLinkReadOnlySensorSnapshot {
  const copy = cloneSnapshot(snapshot);
  const at = now instanceof Date ? now : new Date(now);
  const expiresAt = new Date(copy.expiresAt);
  if (
    Number.isNaN(expiresAt.getTime()) ||
    expiresAt.getTime() <= at.getTime()
  ) {
    return {
      ...copy,
      status: "expired",
      blockers: Array.from(
        new Set([...copy.blockers, "Sensor snapshot has expired."]),
      ),
      sideEffectsPerformed: false,
    };
  }
  return copy;
}

export function summarizeLucaLinkReadOnlySensorSnapshot(
  snapshot: LucaLinkReadOnlySensorSnapshot,
): string {
  const device = snapshot.deviceId ? ` / ${snapshot.deviceId}` : "";
  return `${snapshot.hostId}${device}: ${snapshot.status}; ${snapshot.sensorKinds.length} read-only kind(s), ${snapshot.blockedSensorKinds.length} blocked kind(s); live collection disabled; sideEffectsPerformed false.`;
}

export interface CreateSensorSnapshotFromAdapterPlanOptions {
  snapshotId?: string;
  deviceId?: string;
  capturedAt: string;
  expiresAt: string;
  sensorKinds: readonly string[];
  values?: Readonly<Record<string, LucaLinkSensorMetadataValue>>;
  capabilitySummary?: readonly string[];
  permissionSummary?: readonly string[];
  privacyLevel?: LucaLinkReadOnlySensorSnapshot["privacyLevel"];
}

export function createSensorSnapshotFromAdapterPlan(
  plan: LucaLinkAdapterExecutionPlan,
  options: CreateSensorSnapshotFromAdapterPlanOptions,
): LucaLinkReadOnlySensorSnapshot {
  const supportsReadOnlySensorModel = plan.requestedCapabilities.some(
    (capability) =>
      capability === "sensor.read" || capability === "device.status.read",
  );
  const planBlocked = plan.status === "blocked" || plan.status === "rejected";
  const blockers = [...plan.blockers];
  if (!supportsReadOnlySensorModel) {
    blockers.push(
      "Adapter plan must request sensor.read or device.status.read for a model-only snapshot.",
    );
  }
  if (planBlocked) {
    blockers.push(
      "Blocked or rejected adapter plans cannot produce a ready snapshot.",
    );
  }

  const snapshot = createLucaLinkReadOnlySensorSnapshot({
    snapshotId: options.snapshotId ?? `sensor-${plan.planId}`,
    hostId: plan.targetHostId,
    deviceId: options.deviceId,
    capturedAt: options.capturedAt,
    expiresAt: options.expiresAt,
    source: "future_bridge",
    status: blockers.length > 0 ? "blocked" : "draft",
    privacyLevel: options.privacyLevel,
    sensorKinds: options.sensorKinds,
    values: options.values,
    capabilitySummary: options.capabilitySummary ?? [
      ...plan.requestedCapabilities.filter(
        (capability) =>
          capability === "sensor.read" || capability === "device.status.read",
      ),
      "Model-only; adapter entrypoint not executed",
    ],
    permissionSummary: options.permissionSummary ?? [
      "Adapter approval does not grant live sensor access",
    ],
    warnings: [
      ...plan.warnings,
      "Adapter plan was inspected without executing its entrypoint.",
    ],
    blockers,
  });
  return validateLucaLinkReadOnlySensorSnapshot(snapshot);
}
