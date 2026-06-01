/**
 * LucaLink Host Mesh — Architecture Map (PR #182)
 *
 * STATIC ARCHITECTURE DEFINITIONS ONLY.
 *
 * This module is the machine-readable companion to
 * `docs/lucalink-host-mesh-architecture.md`. It captures the *target*
 * "LucaLink Mesh" architecture (host roles, trust levels, permission
 * categories, sync lanes, target components, implementation roadmap) plus a
 * snapshot of the *current* Socket.IO event surface that the audit discovered.
 *
 * HARD CONSTRAINTS (do not violate when editing this file):
 * - This file MUST NOT be wired into runtime behavior.
 * - No side effects at module load (no network calls, no timers, no I/O).
 * - No imports from runtime services. Type-only imports are acceptable, but
 *   this file currently needs none.
 * - Everything exported here is a frozen, static description used for
 *   documentation, design review, and tests.
 */

// ===========================================================================
// Host Roles
// ===========================================================================

export type LucaLinkHostRoleId =
  | "primary"
  | "companion"
  | "execution"
  | "sensor"
  | "display"
  | "guest"
  | "embodied";

export interface LucaLinkHostRole {
  id: LucaLinkHostRoleId;
  label: string;
  summary: string;
  typicalDevices: string[];
  /** Capabilities this role is expected to expose to the mesh. */
  expectedCapabilities: string[];
  /** Whether this role may hold long-term memory write authority by default. */
  ownsMemoryAuthority: boolean;
  /** Whether this role may directly execute high-risk tools by default. */
  canExecuteDangerousTools: boolean;
}

export const lucaLinkHostRoles: readonly LucaLinkHostRole[] = Object.freeze([
  {
    id: "primary",
    label: "Primary Host",
    summary:
      "The user's main trusted LucaLink device. Owns user-mesh memory/runtime/tool authority and approves or denies other hosts, but is not Creator/Origin source-code authority.",
    typicalDevices: ["desktop", "laptop"],
    expectedCapabilities: [
      "memory.write",
      "shell.execute",
      "code.modify",
      "git.create_pr",
      "files.write",
    ],
    ownsMemoryAuthority: true,
    canExecuteDangerousTools: true,
  },
  {
    id: "companion",
    label: "Companion Host",
    summary:
      "A trusted phone/tablet for voice, camera, notifications, and quick commands. May request actions but not run dangerous tools directly.",
    typicalDevices: ["phone", "tablet"],
    expectedCapabilities: [
      "chat.send",
      "voice.capture",
      "camera.capture",
      "notification.send",
    ],
    ownsMemoryAuthority: false,
    canExecuteDangerousTools: false,
  },
  {
    id: "execution",
    label: "Execution Host",
    summary:
      "A powerful desktop/server that runs local models, coding tools, and build pipelines on behalf of the Primary Host.",
    typicalDevices: ["desktop", "server", "workstation"],
    expectedCapabilities: [
      "shell.execute",
      "code.modify",
      "files.write",
      "git.create_pr",
    ],
    ownsMemoryAuthority: false,
    canExecuteDangerousTools: true,
  },
  {
    id: "sensor",
    label: "Sensor Host",
    summary:
      "A camera/mic/location/watch/IoT node that feeds perception into Luca. Read-mostly; should not hold tool authority.",
    typicalDevices: ["watch", "iot", "speaker", "camera"],
    expectedCapabilities: [
      "voice.capture",
      "camera.capture",
      "location.read",
    ],
    ownsMemoryAuthority: false,
    canExecuteDangerousTools: false,
  },
  {
    id: "display",
    label: "Display Host",
    summary:
      "A TV/browser/projector/car screen that renders Luca output, dashboards, and visuals. Mostly output-only.",
    typicalDevices: ["tv", "projector", "car", "browser"],
    expectedCapabilities: ["chat.receive", "notification.send"],
    ownsMemoryAuthority: false,
    canExecuteDangerousTools: false,
  },
  {
    id: "guest",
    label: "Guest Host",
    summary:
      "A temporary web/device session with limited permissions and no long-term memory write by default. Expires.",
    typicalDevices: ["browser", "web"],
    expectedCapabilities: ["chat.send", "chat.receive"],
    ownsMemoryAuthority: false,
    canExecuteDangerousTools: false,
  },
  {
    id: "embodied",
    label: "Embodied Host",
    summary:
      "A robot/humanoid/future physical body with movement, cameras, manipulators, and spatial sensors. Requires explicit safety policy.",
    typicalDevices: ["robot", "humanoid", "drone"],
    expectedCapabilities: [
      "camera.capture",
      "location.read",
      "robotics.motion",
    ],
    ownsMemoryAuthority: false,
    canExecuteDangerousTools: false,
  },
] as const);

// ===========================================================================
// Trust Levels
// ===========================================================================

export type LucaLinkTrustLevelId =
  | "guest"
  | "paired"
  | "trusted"
  | "admin"
  | "owner";

export interface LucaLinkTrustLevel {
  id: LucaLinkTrustLevelId;
  label: string;
  /** Relative rank; higher means more authority. */
  rank: number;
  summary: string;
}

export const lucaLinkTrustLevels: readonly LucaLinkTrustLevel[] = Object.freeze([
  {
    id: "guest",
    label: "Guest",
    rank: 0,
    summary:
      "Temporary, least-privilege session. No memory write, no tool execution, time-limited.",
  },
  {
    id: "paired",
    label: "Paired",
    rank: 1,
    summary:
      "A device that completed pairing but has not earned elevated trust. Basic chat/presence only.",
  },
  {
    id: "trusted",
    label: "Trusted",
    rank: 2,
    summary:
      "A known device approved by the Primary Host for richer sync (memory read, settings sync, sensor input).",
  },
  {
    id: "admin",
    label: "Admin",
    rank: 3,
    summary:
      "A trusted host explicitly granted high-risk capabilities (tool/code/shell) under policy.",
  },
  {
    id: "owner",
    label: "Owner",
    rank: 4,
    summary:
      "Owner-level authority inside the user's LucaLink mesh. Can approve or revoke mesh hosts, but is not Creator/Origin source-code authority.",
  },
] as const);

// ===========================================================================
// Permission Categories
// ===========================================================================

export type LucaLinkPermissionCategory =
  | "chat.send"
  | "chat.receive"
  | "voice.capture"
  | "voice.playback"
  | "camera.capture"
  | "screen.capture"
  | "location.read"
  | "notification.send"
  | "memory.read"
  | "memory.write"
  | "settings.sync"
  | "files.read"
  | "files.write"
  | "browser.control"
  | "shell.execute"
  | "code.modify"
  | "git.create_pr"
  | "smart_home.control"
  | "robotics.motion"
  | "payment.spend";

export interface LucaLinkPermissionDescriptor {
  id: LucaLinkPermissionCategory;
  /** Coarse risk band used by the future trust policy and host router. */
  risk: "low" | "medium" | "high" | "critical";
  summary: string;
}

export const lucaLinkPermissionCategories: readonly LucaLinkPermissionDescriptor[] =
  Object.freeze([
    { id: "chat.send", risk: "low", summary: "Send chat/messages to Luca." },
    {
      id: "chat.receive",
      risk: "low",
      summary: "Receive chat/output from Luca.",
    },
    {
      id: "voice.capture",
      risk: "medium",
      summary: "Capture microphone audio.",
    },
    {
      id: "voice.playback",
      risk: "low",
      summary: "Play Luca audio output on this host.",
    },
    {
      id: "camera.capture",
      risk: "high",
      summary: "Capture camera frames/video.",
    },
    {
      id: "screen.capture",
      risk: "high",
      summary: "Capture this host's screen.",
    },
    {
      id: "location.read",
      risk: "medium",
      summary: "Read device geolocation.",
    },
    {
      id: "notification.send",
      risk: "low",
      summary: "Surface notifications on this host.",
    },
    {
      id: "memory.read",
      risk: "medium",
      summary: "Read from Luca semantic memory.",
    },
    {
      id: "memory.write",
      risk: "high",
      summary: "Write/mutate Luca long-term memory.",
    },
    {
      id: "settings.sync",
      risk: "medium",
      summary: "Read/write synced settings.",
    },
    { id: "files.read", risk: "medium", summary: "Read host filesystem." },
    {
      id: "files.write",
      risk: "high",
      summary: "Write/modify host filesystem.",
    },
    {
      id: "browser.control",
      risk: "high",
      summary: "Drive a browser via computer-use.",
    },
    {
      id: "shell.execute",
      risk: "critical",
      summary: "Execute arbitrary shell commands.",
    },
    {
      id: "code.modify",
      risk: "critical",
      summary: "Modify source code / repos.",
    },
    {
      id: "git.create_pr",
      risk: "critical",
      summary: "Open pull requests on behalf of the user.",
    },
    {
      id: "smart_home.control",
      risk: "high",
      summary: "Actuate smart-home / IoT devices.",
    },
    {
      id: "robotics.motion",
      risk: "critical",
      summary: "Command physical motion of an embodied host.",
    },
    {
      id: "payment.spend",
      risk: "critical",
      summary: "Authorize spending / payments.",
    },
  ] as const);

// ===========================================================================
// Sync Lanes
// ===========================================================================

export type LucaLinkSyncLaneId =
  | "identity"
  | "presence"
  | "conversation"
  | "memory"
  | "settings"
  | "mission"
  | "sensor"
  | "tool"
  | "artifact"
  | "notification"
  | "model"
  | "safety";

export type LucaLinkLaneDirection =
  | "primary->host"
  | "host->primary"
  | "bidirectional"
  | "broadcast";

export type LucaLinkConflictPolicy =
  | "primary-host-wins"
  | "last-write-wins"
  | "append-only"
  | "merge"
  | "no-conflict";

export interface LucaLinkSyncLane {
  id: LucaLinkSyncLaneId;
  label: string;
  purpose: string;
  examplePayloads: string[];
  direction: LucaLinkLaneDirection;
  /** Permission categories a host must hold to participate in this lane. */
  requiredPermissions: LucaLinkPermissionCategory[];
  encryptionRequired: boolean;
  conflictPolicy: LucaLinkConflictPolicy;
}

export const lucaLinkSyncLanes: readonly LucaLinkSyncLane[] = Object.freeze([
  {
    id: "identity",
    label: "Identity Lane",
    purpose: "Exchange host manifests, public keys, and role assignments.",
    examplePayloads: ["LucaHostManifest", "identityPublicKey", "role-grant"],
    direction: "bidirectional",
    requiredPermissions: [],
    encryptionRequired: true,
    conflictPolicy: "primary-host-wins",
  },
  {
    id: "presence",
    label: "Presence Lane",
    purpose: "Track which hosts are online, away, battery/network status.",
    examplePayloads: ["heartbeat", "status:online", "battery-level"],
    direction: "broadcast",
    requiredPermissions: [],
    encryptionRequired: false,
    conflictPolicy: "last-write-wins",
  },
  {
    id: "conversation",
    label: "Conversation Lane",
    purpose: "Hand off active chat/voice turns between hosts.",
    examplePayloads: ["chat-message", "voice-turn", "handoff-token"],
    direction: "bidirectional",
    requiredPermissions: ["chat.send", "chat.receive"],
    encryptionRequired: true,
    conflictPolicy: "append-only",
  },
  {
    id: "memory",
    label: "Memory Lane",
    purpose: "Replicate / hand off semantic memory and sovereign facts.",
    examplePayloads: ["memory-delta", "sovereign-fact", "embedding-shard"],
    direction: "bidirectional",
    requiredPermissions: ["memory.read", "memory.write"],
    encryptionRequired: true,
    conflictPolicy: "merge",
  },
  {
    id: "settings",
    label: "Settings Lane",
    purpose: "Sync user/appearance/runtime settings across hosts.",
    examplePayloads: ["settings-patch", "theme-token", "feature-flag"],
    direction: "bidirectional",
    requiredPermissions: ["settings.sync"],
    encryptionRequired: true,
    conflictPolicy: "primary-host-wins",
  },
  {
    id: "mission",
    label: "Mission Lane",
    purpose: "Broadcast and hydrate mission/sovereign-mission state.",
    examplePayloads: ["goldEgg", "mission-tape-delta", "objective-update"],
    direction: "broadcast",
    requiredPermissions: ["memory.read"],
    encryptionRequired: true,
    conflictPolicy: "primary-host-wins",
  },
  {
    id: "sensor",
    label: "Sensor Lane",
    purpose: "Stream perception pulses (battery/cpu/signal/location) to Luca.",
    examplePayloads: ["SENSOR_PULSE", "node-health", "location-fix"],
    direction: "host->primary",
    requiredPermissions: ["location.read", "camera.capture", "voice.capture"],
    encryptionRequired: true,
    conflictPolicy: "append-only",
  },
  {
    id: "tool",
    label: "Tool Lane",
    purpose: "Route tool execution requests/results between hosts.",
    examplePayloads: ["tool-invoke", "tool-result", "command/response"],
    direction: "bidirectional",
    requiredPermissions: ["shell.execute", "browser.control", "files.write"],
    encryptionRequired: true,
    conflictPolicy: "no-conflict",
  },
  {
    id: "artifact",
    label: "Artifact Lane",
    purpose: "Transfer files/blobs/build artifacts between hosts.",
    examplePayloads: ["file-chunk", "artifact-manifest", "diff-bundle"],
    direction: "bidirectional",
    requiredPermissions: ["files.read", "files.write"],
    encryptionRequired: true,
    conflictPolicy: "last-write-wins",
  },
  {
    id: "notification",
    label: "Notification Lane",
    purpose: "Fan out user-facing notifications to display/companion hosts.",
    examplePayloads: ["notify", "alert", "reminder"],
    direction: "primary->host",
    requiredPermissions: ["notification.send"],
    encryptionRequired: false,
    conflictPolicy: "append-only",
  },
  {
    id: "model",
    label: "Model Lane",
    purpose: "Advertise/route local model availability and inference jobs.",
    examplePayloads: ["model-manifest", "inference-request", "shard-assign"],
    direction: "bidirectional",
    requiredPermissions: [],
    encryptionRequired: true,
    conflictPolicy: "no-conflict",
  },
  {
    id: "safety",
    label: "Safety Lane",
    purpose:
      "Carry revocation, kill-switch, key-rotation, and embodied-host safety signals.",
    examplePayloads: ["revoke-device", "rotate-key", "emergency-stop"],
    direction: "primary->host",
    requiredPermissions: [],
    encryptionRequired: true,
    conflictPolicy: "primary-host-wins",
  },
] as const);

// ===========================================================================
// Target Architecture Components
// ===========================================================================

export interface LucaLinkTargetComponent {
  id: string;
  label: string;
  summary: string;
  /** Existing files/areas this component would build upon. */
  buildsOn: string[];
}

export const lucaLinkTargetComponents: readonly LucaLinkTargetComponent[] = Object.freeze([
  {
    id: "transport",
    label: "LucaLink Transport",
    summary:
      "Pluggable transport manager over local LAN, relay, VPN, and WebRTC with consistent semantics.",
    buildsOn: [
      "src/services/lucaLinkService.ts",
      "src/services/lucaLink/secureSocket.ts",
      "relay-server/index.js",
    ],
  },
  {
    id: "identity",
    label: "LucaLink Identity",
    summary:
      "Stable per-host identity: device ID, Ed25519 identity keys, and signed host manifests.",
    buildsOn: [
      "src/services/lucaLink/crypto.ts",
      "src/services/lucaLinkService.ts",
    ],
  },
  {
    id: "host-registry",
    label: "LucaLink Host Registry",
    summary:
      "Authoritative registry of known hosts, roles, capabilities, and last-seen state.",
    buildsOn: ["src/services/lucaLink/deviceRegistry.ts"],
  },
  {
    id: "trust-policy",
    label: "LucaLink Trust Policy",
    summary:
      "Maps trust levels + roles to allowed permission categories per host.",
    buildsOn: ["src/services/lucaLink/deviceRegistry.ts"],
  },
  {
    id: "sync-lanes",
    label: "LucaLink Sync Lanes",
    summary:
      "Typed, permissioned channels (identity/presence/conversation/memory/etc.) over the transport.",
    buildsOn: ["src/services/lucaLinkService.ts"],
  },
  {
    id: "host-router",
    label: "LucaLink Host Router",
    summary:
      "Decides which host should execute a given task using a capability/trust/cost scoring model.",
    buildsOn: ["src/services/lucaLink/deviceRegistry.ts"],
  },
  {
    id: "memory-handoff",
    label: "LucaLink Memory / Conversation Handoff",
    summary:
      "Moves active conversation and relevant memory between hosts with conflict handling.",
    buildsOn: [
      "src/services/lucaLink/sessionManager.ts",
      "src/services/lucaService.ts",
    ],
  },
  {
    id: "sensor-mesh",
    label: "LucaLink Sensor Mesh",
    summary:
      "Aggregates perception pulses into Luca's situational awareness with privacy boundaries.",
    buildsOn: [
      "src/services/meshObservationService.ts",
      "src/services/cognitiveShardingEngine.ts",
    ],
  },
  {
    id: "guest-gateway",
    label: "LucaLink Guest Gateway",
    summary:
      "Hardened, expiring, least-privilege gateway for temporary web/device guests.",
    buildsOn: [
      "src/services/lucaLinkService.ts",
      "relay-server/index.js",
    ],
  },
  {
    id: "embodied-host-adapter",
    label: "LucaLink Embodied Host Adapter",
    summary:
      "Adapter + safety policy layer for robots/humanoids (motion, manipulators, spatial sensors).",
    buildsOn: [],
  },
  {
    id: "audit-log",
    label: "LucaLink Audit Log",
    summary:
      "Append-only record of pairings, permission grants, revocations, and high-risk routes.",
    buildsOn: [],
  },
] as const);

// ===========================================================================
// Current Event Map (snapshot of the audited runtime surface)
// ===========================================================================

export type LucaLinkEventLayer = "relay-socket" | "secure-socket" | "cortex-http";

export interface LucaLinkCurrentEvent {
  name: string;
  layer: LucaLinkEventLayer;
  summary: string;
}

/**
 * Snapshot ONLY. These names describe the *existing* runtime so future PRs can
 * map old events onto the new sync lanes. This file does not emit, listen to,
 * or otherwise touch any of them.
 */
export const lucaLinkCurrentEventMap: readonly LucaLinkCurrentEvent[] = Object.freeze([
  {
    name: "register",
    layer: "relay-socket",
    summary: "Device announces itself to the relay with id/type/token.",
  },
  {
    name: "registered",
    layer: "relay-socket",
    summary: "Relay confirms registration.",
  },
  {
    name: "message",
    layer: "relay-socket",
    summary: "Generic envelope (LucaLinkMessage), optionally `secure`.",
  },
  {
    name: "sync",
    layer: "relay-socket",
    summary: "message.type='sync' carrying registry/mission payloads.",
  },
  {
    name: "registry",
    layer: "relay-socket",
    summary: "sync.type='registry' — connected device list.",
  },
  {
    name: "mission",
    layer: "relay-socket",
    summary: "sync.type='mission' — sovereign mission goldEgg string.",
  },
  {
    name: "SENSOR_PULSE",
    layer: "relay-socket",
    summary: "Perception/health pulse fed to mesh observation + sharding.",
  },
  {
    name: "heartbeat",
    layer: "relay-socket",
    summary: "Liveness ping to keep the relay device fresh.",
  },
  {
    name: "secure:message",
    layer: "secure-socket",
    summary: "Encrypted envelope handled by SecureSocket/manager.",
  },
  {
    name: "key:exchange:request",
    layer: "secure-socket",
    summary: "SecureSocket initiates X25519 public-key exchange.",
  },
  {
    name: "key:exchange:response",
    layer: "secure-socket",
    summary: "Peer returns its public key to derive the shared secret.",
  },
  {
    name: "command:received",
    layer: "secure-socket",
    summary: "Inbound command routed by LucaLinkManager.",
  },
  {
    name: "command:result",
    layer: "secure-socket",
    summary: "Result for a previously issued command.",
  },
  {
    name: "guest-join",
    layer: "relay-socket",
    summary: "Guest socket joins a desktop-owned session.",
  },
  {
    name: "guest-connected",
    layer: "relay-socket",
    summary: "Relay tells desktop a guest connected.",
  },
  {
    name: "guest-message",
    layer: "relay-socket",
    summary: "Chat/auth message from a guest.",
  },
  {
    name: "desktop-to-guest",
    layer: "relay-socket",
    summary: "Desktop response/audio routed to a guest.",
  },
  {
    name: "guest-disconnected",
    layer: "relay-socket",
    summary: "Guest session ended.",
  },
  {
    name: "webrtc-offer",
    layer: "relay-socket",
    summary: "WebRTC SDP offer for guest audio.",
  },
  {
    name: "webrtc-answer",
    layer: "relay-socket",
    summary: "WebRTC SDP answer from guest.",
  },
  {
    name: "webrtc-ice-candidate",
    layer: "relay-socket",
    summary: "Trickle ICE candidate exchange.",
  },
  {
    name: "/api/pairing/generate",
    layer: "cortex-http",
    summary: "Relay endpoint issuing a short pairing token.",
  },
  {
    name: "/api/guest/generate",
    layer: "cortex-http",
    summary: "Relay endpoint issuing a guest session + URL.",
  },
  {
    name: "/api/remote-access/info",
    layer: "cortex-http",
    summary: "Cortex endpoint reporting local IP + pinRequired.",
  },
  {
    name: "/api/remote-access/verify-pin",
    layer: "cortex-http",
    summary: "Cortex endpoint validating a guest PIN.",
  },
] as const);

// ===========================================================================
// Implementation Roadmap
// ===========================================================================

export interface LucaLinkRoadmapEntry {
  pr: number;
  title: string;
  summary: string;
  dependsOn: number[];
}

export const lucaLinkImplementationRoadmap: readonly LucaLinkRoadmapEntry[] = Object.freeze([
  {
    pr: 183,
    title: "Device Manifest + Capability Registry",
    summary:
      "Introduce LucaHostManifest + a capability registry built on deviceRegistry.",
    dependsOn: [182],
  },
  {
    pr: 184,
    title: "Trust & Permission Policy",
    summary:
      "Map trust levels + roles to permission categories with enforcement hooks.",
    dependsOn: [183],
  },
  {
    pr: 185,
    title: "Sync Lane Protocol",
    summary:
      "Implement typed, permissioned sync lanes over the existing transport.",
    dependsOn: [184],
  },
  {
    pr: 186,
    title: "Host Routing Engine",
    summary:
      "Add the capability/trust/cost scoring router for task placement.",
    dependsOn: [185],
  },
  {
    pr: 187,
    title: "LucaLink Settings Device Center",
    summary:
      "Rebuild the Settings tab into a device center (detail/permissions/sync/guests/audit).",
    dependsOn: [183, 184],
  },
  {
    pr: 188,
    title: "Memory / Conversation Handoff",
    summary:
      "Move active conversation + relevant memory between hosts with conflict handling.",
    dependsOn: [185, 186],
  },
  {
    pr: 189,
    title: "Guest Access Hardening",
    summary:
      "Add guest expiry, permission classes, and revocation to the guest gateway.",
    dependsOn: [184],
  },
  {
    pr: 190,
    title: "Sensor Mesh + Embodied Host Preparation",
    summary:
      "Formalize the sensor lane, privacy boundaries, and embodied-host safety policy.",
    dependsOn: [185, 186],
  },
] as const);

// ===========================================================================
// Audit metadata
// ===========================================================================

export const lucaLinkArchitectureAuditNote = Object.freeze({
  pr: 182,
  title: "LucaLink Host Mesh Architecture Audit",
  scope:
    "Documentation + static architecture definitions only. No runtime behavior change.",
  doc: "docs/lucalink-host-mesh-architecture.md",
  concept:
    "LucaLink Mesh = secure multi-host nervous system for one Luca identity across many host bodies.",
} as const);
