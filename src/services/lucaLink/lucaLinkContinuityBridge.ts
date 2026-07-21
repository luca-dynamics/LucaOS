/**
 * LucaLink continuity bridge — read-side identity consolidation.
 *
 * Merges the live mesh surface (relay connectedDevices) with the device-trust
 * registry into one honest continuity view for Settings / shell. Prefer trust
 * records when present; fill gaps from connected runtime devices as provisional
 * "paired" entries (limited access, not invented trust elevation).
 *
 * No sockets, no pairing mutations, no execution. Planning / display only.
 */

import type {
  LucaLinkDeviceRole,
  LucaLinkDeviceTrustRegistrySummary,
  LucaLinkTrustedDeviceRecord,
} from "./lucaLinkDeviceTrustRegistry";
import {
  createLucaLinkLinkedHostRecord,
  type LucaLinkLinkedHostRecord,
} from "./lucaLinkLinkedHostRegistry";
import type { LucaLinkContinuationRegistrySummary } from "./lucaLinkContinuation";
import type { LucaLinkHandoffRegistrySummary } from "./lucaLinkHandoff";

/** Minimal mesh device shape (relay connectedDevices). */
export interface LucaLinkContinuityMeshDevice {
  deviceId: string;
  type: string;
  name: string;
  lastSeen: number;
}

export type LucaLinkSoftEnforcementModeLabel =
  | "disabled"
  | "observe-only"
  | "high-risk-only"
  | "full-outbound"
  | string;

export interface LucaLinkContinuityInputs {
  state: {
    connected: boolean;
    deviceId: string | null;
    connectedDevices: readonly LucaLinkContinuityMeshDevice[];
    error?: string | null;
  };
  trustedDevices: readonly LucaLinkTrustedDeviceRecord[];
  deviceTrustSummary?: LucaLinkDeviceTrustRegistrySummary;
  continuationSummary?: Pick<
    LucaLinkContinuationRegistrySummary,
    "total" | "valid" | "pending" | "consumed" | "expired"
  >;
  handoffSummary?: Pick<
    LucaLinkHandoffRegistrySummary,
    "total" | "pending" | "approved" | "sent"
  >;
  softEnforcementMode?: LucaLinkSoftEnforcementModeLabel;
  now?: number;
}

export interface LucaLinkContinuitySnapshot {
  /** Trust-first merged device list (includes provisional connected-only rows). */
  trustedDevices: LucaLinkTrustedDeviceRecord[];
  linkedHosts: LucaLinkLinkedHostRecord[];
  currentDeviceId?: string;
  meshConnected: boolean;
  connectedDeviceCount: number;
  trustedRecordCount: number;
  provisionalRecordCount: number;
  onlineHostCount: number;
  validContinuationCount: number;
  pendingHandoffCount: number;
  softEnforcementMode: LucaLinkSoftEnforcementModeLabel;
  /** True when any live mesh device or trust record is present. */
  hasLiveIdentity: boolean;
  /** Human-readable continuity status for UI chips. */
  statusLabel: string;
  statusDetail: string;
  warnings: string[];
}

function inferRole(
  device: Pick<LucaLinkContinuityMeshDevice, "deviceId" | "type">,
  currentDeviceId?: string | null,
): LucaLinkDeviceRole {
  if (currentDeviceId && device.deviceId === currentDeviceId) {
    return "primary-host";
  }
  const type = (device.type ?? "").toLowerCase();
  if (/sensor/.test(type)) return "sensor";
  if (/display|tv|projector|screen|monitor/.test(type)) return "display";
  if (/guest|browser|web/.test(type)) return "guest";
  if (/embodied|robot/.test(type)) return "embodied";
  if (/execution|server|kernel/.test(type)) return "execution";
  return "companion";
}

/**
 * Map a live connected mesh device into a provisional trust record when the
 * trust store has not yet recorded it. Limited access only — never elevates.
 */
export function mapConnectedDeviceToProvisionalTrustRecord(
  device: LucaLinkContinuityMeshDevice,
  currentDeviceId?: string | null,
  now: number = Date.now(),
): LucaLinkTrustedDeviceRecord {
  const lastSeen = device.lastSeen || now;
  return {
    deviceId: device.deviceId,
    displayName: device.name || "Unnamed LucaLink device",
    deviceType: device.type,
    role: inferRole(device, currentDeviceId),
    trustLevel: "paired",
    status: "connected",
    createdAt: lastSeen,
    updatedAt: lastSeen,
    lastSeenAt: lastSeen,
    capabilities: [],
    deniedCapabilities: [
      "shell.execute",
      "files.write",
      "code.modify",
      "browser.control",
      "payment.spend",
      "physical-world.action",
    ],
    permissionSummary: {
      conversation: true,
      notification: true,
      memory: false,
      tools: false,
      files: false,
      code: false,
      browser: false,
      shell: false,
      payment: false,
      physicalWorld: false,
      safety: true,
    },
    warnings: [
      "Provisional continuity record from live mesh — not yet elevated in the trust registry.",
    ],
    errors: [],
  };
}

/**
 * Prefer trust-store records; append provisional rows for connected devices
 * that are not yet in the trust registry. Does not invent elevation.
 */
export function mergeTrustedDevicesWithConnected(
  trustedDevices: readonly LucaLinkTrustedDeviceRecord[],
  connectedDevices: readonly LucaLinkContinuityMeshDevice[],
  currentDeviceId?: string | null,
  now: number = Date.now(),
): {
  devices: LucaLinkTrustedDeviceRecord[];
  provisionalCount: number;
} {
  const byId = new Map<string, LucaLinkTrustedDeviceRecord>();
  for (const record of trustedDevices) {
    byId.set(record.deviceId, record);
  }

  let provisionalCount = 0;
  for (const connected of connectedDevices) {
    if (byId.has(connected.deviceId)) continue;
    byId.set(
      connected.deviceId,
      mapConnectedDeviceToProvisionalTrustRecord(
        connected,
        currentDeviceId,
        now,
      ),
    );
    provisionalCount += 1;
  }

  return {
    devices: Array.from(byId.values()),
    provisionalCount,
  };
}

function buildStatus(
  snapshot: Omit<
    LucaLinkContinuitySnapshot,
    "statusLabel" | "statusDetail" | "warnings"
  >,
  inputs: LucaLinkContinuityInputs,
): Pick<LucaLinkContinuitySnapshot, "statusLabel" | "statusDetail" | "warnings"> {
  const warnings: string[] = [];
  if (inputs.state.error) warnings.push(inputs.state.error);
  if (snapshot.provisionalRecordCount > 0) {
    warnings.push(
      `${snapshot.provisionalRecordCount} mesh device(s) are provisional until trust is recorded.`,
    );
  }

  if (!snapshot.meshConnected && snapshot.connectedDeviceCount === 0) {
    return {
      statusLabel: "No live mesh",
      statusDetail: "Pair or reconnect a device to restore continuity.",
      warnings,
    };
  }

  if (snapshot.onlineHostCount > 0 && snapshot.trustedRecordCount > 0) {
    return {
      statusLabel: "Live continuity",
      statusDetail: `${snapshot.onlineHostCount} host(s) online · ${snapshot.trustedRecordCount} trust record(s)`,
      warnings,
    };
  }

  if (snapshot.connectedDeviceCount > 0) {
    return {
      statusLabel: "Mesh only",
      statusDetail:
        "Devices are connected but trust continuity is still limited.",
      warnings,
    };
  }

  return {
    statusLabel: "Trust only",
    statusDetail: "Trust records exist without a live mesh connection.",
    warnings,
  };
}

/** Build the product-facing continuity snapshot from live manager inputs. */
export function buildLucaLinkContinuitySnapshot(
  inputs: LucaLinkContinuityInputs,
): LucaLinkContinuitySnapshot {
  const now = inputs.now ?? Date.now();
  const currentDeviceId = inputs.state.deviceId ?? undefined;
  const connectedDevices = inputs.state.connectedDevices ?? [];
  const { devices, provisionalCount } = mergeTrustedDevicesWithConnected(
    inputs.trustedDevices,
    connectedDevices,
    currentDeviceId,
    now,
  );
  const linkedHosts = devices.map((device) =>
    createLucaLinkLinkedHostRecord(device, currentDeviceId),
  );
  const onlineHostCount = linkedHosts.filter(
    (host) => host.connectionState === "online",
  ).length;
  const validContinuationCount = inputs.continuationSummary?.valid ?? 0;
  const pendingHandoffCount = inputs.handoffSummary?.pending ?? 0;
  const softEnforcementMode = inputs.softEnforcementMode ?? "disabled";

  const partial = {
    trustedDevices: devices,
    linkedHosts,
    currentDeviceId,
    meshConnected: inputs.state.connected === true,
    connectedDeviceCount: connectedDevices.length,
    trustedRecordCount: inputs.trustedDevices.length,
    provisionalRecordCount: provisionalCount,
    onlineHostCount,
    validContinuationCount,
    pendingHandoffCount,
    softEnforcementMode,
    hasLiveIdentity: devices.length > 0,
  };

  return {
    ...partial,
    ...buildStatus(partial, inputs),
  };
}

/** Map continuity hosts into the shell Body-card device rows. */
export function mapContinuityHostsToBodyDevices(
  hosts: readonly LucaLinkLinkedHostRecord[],
): Array<{ id: string; name: string; type: string; status: string }> {
  return hosts.map((host) => {
    const trust =
      host.trustState === "trusted_full"
        ? "trusted"
        : host.trustState === "trusted_limited"
          ? "limited"
          : host.trustState === "pending"
            ? "pending"
            : host.trustState === "revoked"
              ? "revoked"
              : "guest";
    const connection =
      host.connectionState === "online"
        ? "active"
        : host.connectionState === "pending_approval"
          ? "pending"
          : host.connectionState === "pairing"
            ? "pairing"
            : host.connectionState === "blocked" ||
                host.connectionState === "revoked"
              ? host.connectionState
              : "offline";
    return {
      id: `lucalink-${host.id}`,
      name: host.displayName,
      type: `${host.deviceType} · ${host.platform} · ${trust}`,
      status: connection,
    };
  });
}
