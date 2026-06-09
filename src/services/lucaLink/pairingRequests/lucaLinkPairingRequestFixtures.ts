import type { LucaLinkPairingRequestSource } from "./lucaLinkPairingRequestTypes";
import { createLucaLinkPairingRequestDraft, createPairingExpiration } from "./lucaLinkPairingRequestPolicy";

export const LUCA_LINK_PAIRING_FIXTURE_NOW = "2026-06-09T12:00:00.000Z";
const EXPIRES = createPairingExpiration(LUCA_LINK_PAIRING_FIXTURE_NOW);

export const LUCA_LINK_PAIRING_REQUEST_SOURCES = {
  primaryHost: {
    hostId: "fixture-primary-host",
    displayName: "Primary Host",
    deviceType: "desktop",
    hostType: "primary_host",
    platform: "LucaOS Preview Desktop",
    isPrimaryHost: true,
  },
  mobileCompanion: {
    hostId: "fixture-mobile-companion",
    displayName: "Mobile Companion Preview",
    deviceType: "mobile",
    hostType: "active_companion",
    platform: "Fictional Mobile OS",
  },
  browserHost: {
    hostId: "fixture-browser-host",
    displayName: "Browser Host Preview",
    deviceType: "browser",
    hostType: "browser_host",
    platform: "Preview Browser",
  },
  displaySurface: {
    hostId: "fixture-display-surface",
    displayName: "Studio Display Preview",
    deviceType: "display",
    hostType: "display_surface",
    platform: "Display Preview Runtime",
  },
  wearable: {
    hostId: "fixture-watch-wearable",
    displayName: "Watch Preview",
    deviceType: "watch",
    hostType: "wearable",
    platform: "Wearable Preview OS",
  },
  blockedHost: {
    hostId: "fixture-blocked-host",
    displayName: "Blocked Host Preview",
    deviceType: "browser",
    hostType: "browser_host",
    platform: "Blocked Preview Browser",
  },
} as const satisfies Record<string, LucaLinkPairingRequestSource>;

const base = {
  targetHostId: LUCA_LINK_PAIRING_REQUEST_SOURCES.primaryHost.hostId,
  requestedAt: LUCA_LINK_PAIRING_FIXTURE_NOW,
  expiresAt: EXPIRES,
};

export const LUCA_LINK_PAIRING_REQUEST_FIXTURES = {
  pendingMobileCompanion: createLucaLinkPairingRequestDraft({
    ...base,
    requestId: "fixture-pairing-request-4281",
    source: LUCA_LINK_PAIRING_REQUEST_SOURCES.mobileCompanion,
    method: "qr_code",
    requestedPermissions: ["read_presence", "sync_context"],
  }),
  browserHostRequest: createLucaLinkPairingRequestDraft({
    ...base,
    requestId: "fixture-pairing-request-5102",
    source: LUCA_LINK_PAIRING_REQUEST_SOURCES.browserHost,
    method: "manual_code",
    requestedPermissions: ["read_presence", "relay_notifications"],
  }),
  displaySurfaceRequest: createLucaLinkPairingRequestDraft({
    ...base,
    requestId: "fixture-pairing-request-6203",
    source: LUCA_LINK_PAIRING_REQUEST_SOURCES.displaySurface,
    method: "nearby_preview",
    requestedPermissions: ["read_presence", "share_screen"],
  }),
  watchWearableRequest: createLucaLinkPairingRequestDraft({
    ...base,
    requestId: "fixture-pairing-request-7304",
    source: LUCA_LINK_PAIRING_REQUEST_SOURCES.wearable,
    method: "short_code",
    requestedPermissions: ["read_presence", "relay_notifications"],
  }),
  expiredRequest: createLucaLinkPairingRequestDraft({
    ...base,
    requestId: "fixture-pairing-request-0005",
    source: LUCA_LINK_PAIRING_REQUEST_SOURCES.mobileCompanion,
    method: "qr_code",
    expiresAt: "2026-06-09T11:00:00.000Z",
    status: "expired",
  }),
  deniedRequest: createLucaLinkPairingRequestDraft({
    ...base,
    requestId: "fixture-pairing-request-0006",
    source: LUCA_LINK_PAIRING_REQUEST_SOURCES.browserHost,
    method: "manual_code",
    status: "denied_preview",
  }),
  blockedHostRequest: createLucaLinkPairingRequestDraft({
    ...base,
    requestId: "fixture-pairing-request-0007",
    source: LUCA_LINK_PAIRING_REQUEST_SOURCES.blockedHost,
    method: "link_token_preview",
    status: "blocked",
  }),
  qrPreviewRequest: createLucaLinkPairingRequestDraft({
    ...base,
    requestId: "fixture-pairing-request-8392",
    source: LUCA_LINK_PAIRING_REQUEST_SOURCES.mobileCompanion,
    method: "qr_code",
  }),
  shortCodePreviewRequest: createLucaLinkPairingRequestDraft({
    ...base,
    requestId: "fixture-pairing-request-9444",
    source: LUCA_LINK_PAIRING_REQUEST_SOURCES.wearable,
    method: "short_code",
  }),
  sensitiveRuntimeRequest: createLucaLinkPairingRequestDraft({
    ...base,
    requestId: "fixture-pairing-request-1010",
    source: LUCA_LINK_PAIRING_REQUEST_SOURCES.browserHost,
    method: "qr_code",
    requestedPermissions: ["read_presence", "remote_action", "tool_execution", "admin_trust"],
  }),
  memorySyncRequest: createLucaLinkPairingRequestDraft({
    ...base,
    requestId: "fixture-pairing-request-1111",
    source: LUCA_LINK_PAIRING_REQUEST_SOURCES.mobileCompanion,
    method: "short_code",
    requestedPermissions: ["read_presence", "sync_memory"],
  }),
  missingPrimaryHostRequest: createLucaLinkPairingRequestDraft({
    ...base,
    requestId: "fixture-pairing-request-1212",
    source: LUCA_LINK_PAIRING_REQUEST_SOURCES.displaySurface,
    targetHostId: "fixture-missing-primary-host",
    method: "manual_code",
  }),
} as const;
