import type {
  LucaLinkSessionHost,
  LucaLinkSessionOwnershipState,
} from "./lucaLinkSessionOwnershipTypes";

const approvedHost = {
  trustState: "trusted_full",
  connectionState: "online",
  approvalState: "approved",
} as const;

export const LUCA_LINK_SESSION_OWNERSHIP_FIXTURES = {
  primaryHost: {
    hostId: "fixture-primary",
    displayName: "Home Desktop",
    role: "primary_host",
    ...approvedHost,
  },
  mobileCompanion: {
    hostId: "fixture-mobile",
    displayName: "Pocket Companion",
    role: "active_companion",
    trustState: "trusted_limited",
    connectionState: "online",
    approvalState: "approved",
  },
  displaySurface: {
    hostId: "fixture-display",
    displayName: "Studio Display",
    role: "display_surface",
    trustState: "trusted_limited",
    connectionState: "online",
    approvalState: "approved",
  },
  voiceRelayHost: {
    hostId: "fixture-voice",
    displayName: "Kitchen Voice Relay",
    role: "voice_relay",
    trustState: "trusted_limited",
    connectionState: "online",
    approvalState: "approved",
  },
  readOnlyObserver: {
    hostId: "fixture-observer",
    displayName: "Status Viewer",
    role: "read_only_observer",
    trustState: "trusted_limited",
    connectionState: "online",
    approvalState: "approved",
  },
  revokedHost: {
    hostId: "fixture-revoked",
    displayName: "Retired Tablet",
    role: "revoked",
    trustState: "revoked",
    connectionState: "revoked",
    approvalState: "revoked",
  },
  blockedHost: {
    hostId: "fixture-blocked",
    displayName: "Blocked Browser",
    role: "blocked",
    trustState: "untrusted",
    connectionState: "blocked",
    approvalState: "denied",
  },
  handoffTarget: {
    hostId: "fixture-handoff-target",
    displayName: "Travel Companion",
    role: "handoff_target",
    trustState: "trusted_limited",
    connectionState: "online",
    approvalState: "pending",
  },
} as const satisfies Record<string, LucaLinkSessionHost>;

export const LUCA_LINK_SESSION_OWNERSHIP_STATE_FIXTURE: LucaLinkSessionOwnershipState = {
  sessionId: "fixture-session",
  hosts: Object.values(LUCA_LINK_SESSION_OWNERSHIP_FIXTURES),
};
