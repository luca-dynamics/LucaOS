/**
 * LucaLink linked-host registry presentation model.
 *
 * This module normalizes the existing device trust registry into a stable,
 * product-facing host and permission vocabulary. It performs no persistence,
 * pairing, transport, approval, or remote action execution.
 */

import type { LucaExperienceMode } from "../../experience/experienceMode";
import type {
  LucaLinkDeviceRole,
  LucaLinkDeviceTrustLevel,
  LucaLinkDeviceTrustStatus,
  LucaLinkTrustedDeviceRecord,
} from "./lucaLinkDeviceTrustRegistry";

export type LucaLinkLinkedHostDeviceType =
  | "desktop"
  | "mobile"
  | "browser"
  | "display"
  | "watch"
  | "server"
  | "unknown";

export type LucaLinkLinkedHostConnectionState =
  | "online"
  | "offline"
  | "pairing"
  | "pending_approval"
  | "revoked"
  | "blocked";

export type LucaLinkLinkedHostTrustState =
  | "untrusted"
  | "pending"
  | "trusted_limited"
  | "trusted_full"
  | "revoked";

export type LucaLinkPermissionId =
  | "read_presence"
  | "sync_context"
  | "sync_memory"
  | "relay_notifications"
  | "share_screen"
  | "voice_relay"
  | "file_exchange"
  | "remote_action"
  | "tool_execution"
  | "admin_trust";

export type LucaLinkPermissionState =
  | "allowed"
  | "denied"
  | "requested"
  | "pending";

export interface LucaLinkPermissionDefinition {
  id: LucaLinkPermissionId;
  label: string;
  description: string;
  sensitive: boolean;
}

export interface LucaLinkPermissionSummaryItem extends LucaLinkPermissionDefinition {
  state: LucaLinkPermissionState;
}

export interface LucaLinkPermissionProfile {
  permissions: LucaLinkPermissionSummaryItem[];
  allowedCount: number;
  deniedCount: number;
  pendingCount: number;
  sensitiveAllowedCount: number;
}

export interface LucaLinkLinkedHostRecord {
  id: string;
  displayName: string;
  deviceType: LucaLinkLinkedHostDeviceType;
  hostType: LucaLinkDeviceRole;
  platform: string;
  lastSeenAt?: number;
  connectionState: LucaLinkLinkedHostConnectionState;
  trustState: LucaLinkLinkedHostTrustState;
  permissionProfile: LucaLinkPermissionProfile;
  activeSessionId?: string;
  isCurrentDevice: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface LucaLinkStateDisplayMetadata {
  label: string;
  tone: "neutral" | "positive" | "warning" | "critical";
  description: string;
}

export interface LucaLinkDeviceCenterDisclosure {
  showPermissionDetails: boolean;
  showSessionStatus: boolean;
  showTrustDiagnostics: boolean;
}

export const LUCA_LINK_PERMISSION_DEFINITIONS: Record<
  LucaLinkPermissionId,
  LucaLinkPermissionDefinition
> = {
  read_presence: {
    id: "read_presence",
    label: "Presence",
    description: "See whether this host is available to LucaLink.",
    sensitive: false,
  },
  sync_context: {
    id: "sync_context",
    label: "Context sync",
    description: "Receive approved conversation and handoff context.",
    sensitive: false,
  },
  sync_memory: {
    id: "sync_memory",
    label: "Memory sync",
    description: "Request access to approved memory context.",
    sensitive: false,
  },
  relay_notifications: {
    id: "relay_notifications",
    label: "Notification relay",
    description: "Receive approved LucaLink notifications.",
    sensitive: false,
  },
  share_screen: {
    id: "share_screen",
    label: "Screen sharing",
    description: "Request visibility of a shared screen surface.",
    sensitive: true,
  },
  voice_relay: {
    id: "voice_relay",
    label: "Voice relay",
    description: "Relay an approved voice session between hosts.",
    sensitive: false,
  },
  file_exchange: {
    id: "file_exchange",
    label: "File exchange",
    description: "Request an explicitly approved file transfer.",
    sensitive: true,
  },
  remote_action: {
    id: "remote_action",
    label: "Remote actions",
    description: "Request a governed action on another host.",
    sensitive: true,
  },
  tool_execution: {
    id: "tool_execution",
    label: "Tool execution",
    description: "Request tool execution through an approval boundary.",
    sensitive: true,
  },
  admin_trust: {
    id: "admin_trust",
    label: "Administrative trust",
    description: "Manage advanced host trust with Primary Host approval.",
    sensitive: true,
  },
};

const PERMISSION_ORDER = Object.keys(
  LUCA_LINK_PERMISSION_DEFINITIONS,
) as LucaLinkPermissionId[];

function permission(
  id: LucaLinkPermissionId,
  state: LucaLinkPermissionState,
): LucaLinkPermissionSummaryItem {
  return { ...LUCA_LINK_PERMISSION_DEFINITIONS[id], state };
}

export function isLucaLinkPermissionSensitive(
  permissionId: LucaLinkPermissionId,
): boolean {
  return LUCA_LINK_PERMISSION_DEFINITIONS[permissionId].sensitive;
}

export function getLucaLinkDeviceTypeLabel(
  deviceType: LucaLinkLinkedHostDeviceType,
): string {
  return {
    desktop: "Desktop",
    mobile: "Mobile",
    browser: "Browser",
    display: "Display",
    watch: "Watch",
    server: "Server",
    unknown: "Unknown device",
  }[deviceType];
}

export function getLucaLinkConnectionStateMetadata(
  state: LucaLinkLinkedHostConnectionState,
): LucaLinkStateDisplayMetadata {
  const metadata: Record<
    LucaLinkLinkedHostConnectionState,
    LucaLinkStateDisplayMetadata
  > = {
    online: {
      label: "Online",
      tone: "positive",
      description: "Available to LucaLink.",
    },
    offline: {
      label: "Offline",
      tone: "neutral",
      description: "Not currently reachable.",
    },
    pairing: {
      label: "Pairing",
      tone: "warning",
      description: "Pairing is not complete.",
    },
    pending_approval: {
      label: "Pending approval",
      tone: "warning",
      description: "Explicit approval is still required.",
    },
    revoked: {
      label: "Revoked",
      tone: "critical",
      description: "Local trust has been revoked.",
    },
    blocked: {
      label: "Blocked",
      tone: "critical",
      description: "This host is blocked locally.",
    },
  };
  return metadata[state];
}

export function getLucaLinkTrustStateMetadata(
  state: LucaLinkLinkedHostTrustState,
): LucaLinkStateDisplayMetadata {
  const metadata: Record<
    LucaLinkLinkedHostTrustState,
    LucaLinkStateDisplayMetadata
  > = {
    untrusted: {
      label: "Untrusted",
      tone: "neutral",
      description: "No trusted access has been granted.",
    },
    pending: {
      label: "Pending approval",
      tone: "warning",
      description: "Trust requires explicit approval.",
    },
    trusted_limited: {
      label: "Limited access",
      tone: "positive",
      description: "Only scoped permissions are available.",
    },
    trusted_full: {
      label: "Trusted device",
      tone: "positive",
      description:
        "Broader trust is recorded; sensitive actions still require approval.",
    },
    revoked: {
      label: "Revoked",
      tone: "critical",
      description: "Trust is no longer active.",
    },
  };
  return metadata[state];
}

export function getLucaLinkDeviceCenterDisclosure(
  mode: LucaExperienceMode,
): LucaLinkDeviceCenterDisclosure {
  return {
    showPermissionDetails: mode !== "basic",
    showSessionStatus: mode !== "basic",
    showTrustDiagnostics: mode === "creator",
  };
}

export function inferLucaLinkLinkedHostDeviceType(
  deviceType: string | undefined,
  role: LucaLinkDeviceRole,
): LucaLinkLinkedHostDeviceType {
  const text = `${deviceType ?? ""} ${role}`.toLowerCase();
  if (/watch|wearable/.test(text)) return "watch";
  if (/mobile|phone|tablet|ios|android|companion/.test(text)) return "mobile";
  if (/browser|web|guest/.test(text)) return "browser";
  if (/display|tv|projector|screen|monitor/.test(text)) return "display";
  if (/server|kernel|execution/.test(text)) return "server";
  if (/desktop|laptop|workstation|primary-host/.test(text)) return "desktop";
  return "unknown";
}

export function mapLucaLinkTrustState(
  trustLevel: LucaLinkDeviceTrustLevel,
  status: LucaLinkDeviceTrustStatus,
): LucaLinkLinkedHostTrustState {
  if (status === "revoked" || status === "blocked") return "revoked";
  if (trustLevel === "paired") return "pending";
  if (trustLevel === "trusted") return "trusted_limited";
  if (trustLevel === "admin" || trustLevel === "owner") return "trusted_full";
  return "untrusted";
}

export function mapLucaLinkConnectionState(
  trustLevel: LucaLinkDeviceTrustLevel,
  status: LucaLinkDeviceTrustStatus,
): LucaLinkLinkedHostConnectionState {
  if (status === "revoked") return "revoked";
  if (status === "blocked") return "blocked";
  if (trustLevel === "paired") return "pending_approval";
  if (status === "connected") return "online";
  if (status === "known" && trustLevel === "guest") return "pairing";
  return "offline";
}

export function summarizeLucaLinkPermissionProfile(
  device: LucaLinkTrustedDeviceRecord,
): LucaLinkPermissionProfile {
  const active = device.status !== "revoked" && device.status !== "blocked";
  const approvalState: LucaLinkPermissionState = active ? "pending" : "denied";
  const states: Record<LucaLinkPermissionId, LucaLinkPermissionState> = {
    read_presence: active ? "allowed" : "denied",
    sync_context:
      active && device.permissionSummary.conversation ? "allowed" : "denied",
    sync_memory:
      active && device.permissionSummary.memory ? "allowed" : "denied",
    relay_notifications:
      active && device.permissionSummary.notification ? "allowed" : "denied",
    share_screen:
      active && device.permissionSummary.browser ? "requested" : "denied",
    voice_relay:
      active && device.permissionSummary.conversation ? "allowed" : "denied",
    file_exchange:
      active && device.permissionSummary.files ? approvalState : "denied",
    remote_action: "denied",
    tool_execution:
      active &&
      (device.permissionSummary.tools ||
        device.permissionSummary.code ||
        device.permissionSummary.shell)
        ? approvalState
        : "denied",
    admin_trust:
      active && (device.trustLevel === "admin" || device.trustLevel === "owner")
        ? approvalState
        : "denied",
  };
  const permissions = PERMISSION_ORDER.map((id) => permission(id, states[id]));
  return {
    permissions,
    allowedCount: permissions.filter((item) => item.state === "allowed").length,
    deniedCount: permissions.filter((item) => item.state === "denied").length,
    pendingCount: permissions.filter(
      (item) => item.state === "pending" || item.state === "requested",
    ).length,
    sensitiveAllowedCount: permissions.filter(
      (item) => item.sensitive && item.state === "allowed",
    ).length,
  };
}

export function createLucaLinkLinkedHostRecord(
  device: LucaLinkTrustedDeviceRecord,
  currentDeviceId?: string,
): LucaLinkLinkedHostRecord {
  const deviceType = inferLucaLinkLinkedHostDeviceType(
    device.deviceType,
    device.role,
  );
  return {
    id: device.deviceId,
    displayName: device.displayName,
    deviceType,
    hostType: device.role,
    platform:
      device.deviceType?.trim() || getLucaLinkDeviceTypeLabel(deviceType),
    lastSeenAt: device.lastSeenAt,
    connectionState: mapLucaLinkConnectionState(
      device.trustLevel,
      device.status,
    ),
    trustState: mapLucaLinkTrustState(device.trustLevel, device.status),
    permissionProfile: summarizeLucaLinkPermissionProfile(device),
    isCurrentDevice:
      device.deviceId === currentDeviceId || device.role === "primary-host",
    createdAt: device.createdAt,
    updatedAt: device.updatedAt,
  };
}
