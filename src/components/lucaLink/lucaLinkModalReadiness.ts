import { ConnectionState } from "../../services/lucaLink/types";

export type LucaLinkModalReadinessTone = "ready" | "waiting" | "attention";

export interface LucaLinkModalReadinessSnapshot {
  connectionState: ConnectionState;
  isInitialized: boolean;
  initError?: string | null;
  linkedDevices: number;
  trustedDevices: number;
  blockedDevices: number;
  onlineHosts: number;
  activeGuests: number;
  pendingGuestAuth: number;
  deniedGuestInbound: number;
  rateLimitedGuestInbound: number;
  /** Optional continuity signals (continuation tokens + handoffs). */
  validContinuations?: number;
  pendingHandoffs?: number;
  continuityStatusLabel?: string;
}

export interface LucaLinkModalReadinessItem {
  id: "pairing" | "hosts" | "trust" | "guest" | "continuity";
  label: string;
  value: string;
  detail: string;
  tone: LucaLinkModalReadinessTone;
}

function formatCount(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function createLucaLinkModalReadinessItems(
  snapshot: LucaLinkModalReadinessSnapshot,
): LucaLinkModalReadinessItem[] {
  const pairingTone: LucaLinkModalReadinessTone = snapshot.initError
    ? "attention"
    : snapshot.connectionState === ConnectionState.CONNECTED
      ? "ready"
      : snapshot.isInitialized
        ? "waiting"
        : "waiting";

  const pairingValue = snapshot.initError
    ? "Needs attention"
    : snapshot.connectionState === ConnectionState.CONNECTED
      ? "Ready"
      : snapshot.isInitialized
        ? "Waiting"
        : "Preparing";

  const pairingDetail = snapshot.initError
    ? snapshot.initError
    : snapshot.linkedDevices > 0
      ? `${formatCount(snapshot.linkedDevices, "device")} paired`
      : "No device has joined yet";

  const hostTone: LucaLinkModalReadinessTone =
    snapshot.onlineHosts > 0 ? "ready" : "waiting";

  const trustTone: LucaLinkModalReadinessTone =
    snapshot.blockedDevices > 0
      ? "attention"
      : snapshot.trustedDevices > 0
        ? "ready"
        : "waiting";

  const guestAttention =
    snapshot.deniedGuestInbound + snapshot.rateLimitedGuestInbound;
  const guestTone: LucaLinkModalReadinessTone =
    guestAttention > 0
      ? "attention"
      : snapshot.activeGuests > 0
        ? "ready"
        : "waiting";

  const validContinuations = snapshot.validContinuations ?? 0;
  const pendingHandoffs = snapshot.pendingHandoffs ?? 0;
  const continuityTone: LucaLinkModalReadinessTone =
    pendingHandoffs > 0
      ? "waiting"
      : validContinuations > 0 || snapshot.onlineHosts > 0
        ? "ready"
        : "waiting";
  const continuityValue =
    pendingHandoffs > 0
      ? formatCount(pendingHandoffs, "handoff pending", "handoffs pending")
      : validContinuations > 0
        ? formatCount(validContinuations, "continuation ready", "continuations ready")
        : snapshot.continuityStatusLabel ?? "No active continuity";
  const continuityDetail =
    pendingHandoffs > 0
      ? "Conversation handoffs wait for explicit accept — never auto-execute"
      : validContinuations > 0
        ? "Approved continuations are tokens only; they do not send or run"
        : "Mesh + trust identity consolidates here when devices connect";

  return [
    {
      id: "pairing",
      label: "Pairing",
      value: pairingValue,
      detail: pairingDetail,
      tone: pairingTone,
    },
    {
      id: "hosts",
      label: "Host link",
      value:
        snapshot.onlineHosts > 0
          ? formatCount(snapshot.onlineHosts, "host")
          : "No host online",
      detail:
        snapshot.onlineHosts > 0
          ? "This LucaOS host is visible to linked surfaces"
          : "Waiting for a live LucaLink host connection",
      tone: hostTone,
    },
    {
      id: "trust",
      label: "Trust",
      value:
        snapshot.blockedDevices > 0
          ? `${snapshot.blockedDevices} blocked`
          : formatCount(snapshot.trustedDevices, "trusted device"),
      detail:
        snapshot.trustedDevices > 0
          ? "Capability access still requires approval"
          : "New devices start with limited access",
      tone: trustTone,
    },
    {
      id: "continuity",
      label: "Continuity",
      value: continuityValue,
      detail: continuityDetail,
      tone: continuityTone,
    },
    {
      id: "guest",
      label: "Guest access",
      value:
        snapshot.activeGuests > 0
          ? formatCount(snapshot.activeGuests, "active guest")
          : "No active guest",
      detail:
        guestAttention > 0
          ? formatCount(guestAttention, "guest event") + " blocked or slowed"
          : snapshot.pendingGuestAuth > 0
            ? formatCount(snapshot.pendingGuestAuth, "guest") +
              " waiting for verification"
            : "Guest sessions stay limited until approved",
      tone: guestTone,
    },
  ];
}
