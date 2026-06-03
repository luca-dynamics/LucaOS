# LucaLink Host Mesh — Architecture Audit & Target Model (PR #182)

> **Status:** Architecture / documentation / model PR. **No runtime behavior
> changes.** This document audits the current LucaLink implementation and
> defines the target "LucaLink Mesh" architecture. The machine-readable
> companion to this document is
> [`src/services/lucaLink/lucaLinkArchitectureMap.ts`](../src/services/lucaLink/lucaLinkArchitectureMap.ts),
> which exports static definitions only and is **not** wired into runtime.

---

## Origin vs Primary Host

Origin is reserved for LucaOS Creator/source-code authority and root system blueprint control.
Primary Host is the user's main trusted device inside LucaLink Mesh.
Primary Host can approve mesh/device actions, but it is not Creator/Origin authority.

## A. Executive Summary

**What LucaLink currently is.** LucaLink is LucaOS's device-pairing and
remote-access layer. In practice it is two overlapping subsystems:

1. **`lucaLinkService.ts` → `lucaLink` singleton (the active runtime).** A
   Socket.IO client that connects a Primary Host room to companion/guest hosts via
   a relay server (`lucaos.onrender.com` by default), with a hybrid
   local-LAN/relay strategy, QR pairing, mDNS/ZeroConf rediscovery, WebRTC guest
   audio, PIN-gated guest access, mission sync, and sensor-pulse ingestion.
2. **`src/services/lucaLink/manager.ts` → `lucaLinkManager` (a more structured
   second stack).** Built on `SecureSocket` (X25519 handshake + AES-256-GCM),
   `DeviceRegistry`, `SessionManager`, and `ErrorHandler`, exposing a
   `command`/`response`/`event`/`sync`/`heartbeat` message model.

These two stacks coexist: `App.tsx` imports **both** — it uses `lucaLinkService`
for the guest handler and UI-state sync, and `lucaLinkManager` for
`command:received` routing. They do not share a transport, registry, or trust
model today.

**What LucaLink should become.** A single **secure multi-host nervous system**
for one Luca identity distributed across many trusted host bodies — desktop,
mobile, browser, guest sessions, smart-home/IoT, and (eventually) robotics and
display hosts. Instead of behaving like a desktop/mobile-only pairing, LucaOS
should behave like _one Luca_ that can sense, think, and act through whichever
host is best suited to a task.

**Why LucaLink is central to LucaOS as an embodied AI OS.** Every other LucaOS
pillar (memory, computer-use, voice/vision, missions, evolution) assumes a
single coherent agent. As soon as that agent spans multiple devices, LucaLink
becomes the layer that answers the five questions that make distributed
embodiment safe and useful:

1. **Who is this device?** (Identity)
2. **What can this device sense?** (Capability manifest — sensors)
3. **What can this device do?** (Capability manifest — actions)
4. **How trusted is this device?** (Trust level + permission policy)
5. **Should Luca route this task through this device?** (Host router)

---

## B. Current System Map

> File references are to the audited tree at PR #182.

### Primary Host "create room" flow

- `lucaLink.createRoom()` (`lucaLinkService.ts:166`) gets/creates a persistent
  device ID (`getOrCreateDeviceId`, localStorage key `luca_link_device_id`),
  requests a pairing token from the relay (`POST /api/pairing/generate`), and
  connects as `desktop`.
- On `registered`, the desktop calls `setupGuestHandlers()` to wire guest/WebRTC
  events.

### Companion host "join" flow

- `lucaLink.joinWithToken(token, localUrl?)` (`:179`) connects as `mobile` and
  then persists pairing data (localStorage key `luca_link_pairing_data`) for
  auto-reconnect.
- `autoConnect()` (`:194`) implements a "race": it starts background mDNS
  discovery and simultaneously attempts the last-known URL.

### QR pairing URL flow

- `getPairingUrl()` (`:604`) builds `luca://pair?relay=<relay>&token=<token>&local=<localUrl>`.
- `LucaLinkService.parsePairingUrl()` (`:628`) parses both `luca://` and
  `https://` forms. `qrScannerService.ts` calls `parsePairingUrl` then
  `lucaLink.joinWithToken(...)`.

### Local LAN attempt (hybrid mode)

- In `connect()` (`:322`), if a `localUrl` is supplied for a mobile client, it
  probes `<localUrl>/mobile/socket.io/?EIO=4&transport=polling` with a 2s
  timeout. If healthy it switches to the LAN socket path `/mobile/socket.io`;
  otherwise it falls back to the relay (`/socket.io`).

### Relay fallback

- Default relay is `RELAY_SERVER_URL` (env `VITE_RELAY_SERVER_URL`) or
  `https://lucaos.onrender.com`. Overridable via
  `settings.lucaLink.relayServerUrl`.

### mDNS / ZeroConf discovery

- `startZeroConfDiscovery(token)` (`:225`) — native-only (`Capacitor`), watches
  `_luca._tcp` / `local.`, matches a TXT `token`, and reconnects to
  `http://<ip>:3003` on discovery.

### Guest session generation

- `generateGuestSession()` (`:693`) calls `POST /api/guest/generate` with the
  desktop device ID and returns `{ sessionId, guestUrl }`. The relay serves a
  guest web page at `/guest`.

### Guest PIN verification

- On `guest-connected`, the desktop checks `GET /api/remote-access/info`
  (Cortex). If `pinRequired`, it sends an `auth-challenge`; the guest replies
  with an `auth-response` carrying a PIN, which is verified via
  `POST /api/remote-access/verify-pin`. Success → `auth-success` + start session.

### WebRTC offer/answer/ICE handling

- `startGuestSession()` (`:810`) creates an `RTCPeerConnection` (Google STUN
  servers), creates an offer (`offerToReceiveAudio`), and emits `webrtc-offer`.
  `webrtc-answer` and `webrtc-ice-candidate` are handled in
  `setupGuestHandlers()` (`:845`). Inbound guest audio is auto-played.

### Secure message encrypt/decrypt concept

- Outbound: `beamPacket()` (`:1027`) looks up a session via
  `sessionManager.recoverSessionByDevice`, and if found wraps the payload with
  `CryptoService.createSecureMessage` (AES-256-GCM + HMAC), setting `secure:true`.
- Inbound: the `message` handler (`:424`) detects `secure` payloads, recovers
  the session, and decrypts via `CryptoService.decryptSecureMessage`. Messages
  without a session are dropped.

### Mission sync

- `syncMission(goldEgg)` (`:564`) broadcasts `{type:"sync", sync:{type:"mission",
data: goldEgg}}` to `all`. On receipt, the handler dynamically imports
  `lucaService` and calls `importSovereignMission(goldEgg)`.

### Sensor pulse path

- On a `SENSOR_PULSE` message, the handler feeds
  `meshObservationService.registerNodePulse(...)` and
  `cognitiveShardingEngine.ingestHealthSignal(...)` (battery/cpu/signal/active/
  npu). When `connectedDevices.length >= 2`, the `consciousnessLayer` is booted.

### Connected device registry

- The active service keeps a flat `connectedDevices: LucaLinkDevice[]` in
  `LucaLinkState`, updated from `sync/registry` messages. Separately,
  `deviceRegistry.ts` maintains a richer `Device` registry (used by
  `lucaLinkManager`), including capability detection, heartbeat timers, and a
  numeric trust score.

### State model

- Active service state is `LucaLinkState` (`connected`, `deviceId`,
  `pairingToken`, `connectedDevices`, `error`). See §D.

---

## C. Current Protocol / Event Map

Captured statically in `lucaLinkCurrentEventMap`. Grouped by layer:

**Relay Socket.IO (`lucaLinkService` ↔ `relay-server/index.js`)**

| Event                                                     | Direction     | Purpose                                                   |
| --------------------------------------------------------- | ------------- | --------------------------------------------------------- |
| `register`                                                | client→relay  | Announce device (`deviceId`, `type`, `name`, `token`).    |
| `registered`                                              | relay→client  | Registration acknowledged.                                |
| `message`                                                 | both          | Generic `LucaLinkMessage` envelope; may set `secure`.     |
| `sync` (`message.type`)                                   | broadcast     | Carries `sync.type` payloads.                             |
| `registry` (`sync.type`)                                  | relay→clients | Connected device list.                                    |
| `mission` (`sync.type`)                                   | broadcast     | Sovereign mission `goldEgg` string.                       |
| `SENSOR_PULSE` (`message.type`)                           | host→primary  | Health/perception pulse.                                  |
| `heartbeat`                                               | client→relay  | Liveness.                                                 |
| `error`                                                   | relay→client  | Server error (e.g. invalid token).                        |
| `guest-join`                                              | guest→relay   | Guest joins a Primary Host session.                       |
| `guest-connected`                                         | relay→desktop | Guest attached to the Primary Host session.               |
| `guest-message`                                           | relay→desktop | Guest chat/auth message for Primary Host handling.        |
| `desktop-to-guest`                                        | desktop→relay | Primary Host response/audio to guest (legacy event name). |
| `desktop-message`                                         | relay→guest   | Delivered Primary Host output (legacy event name).        |
| `guest-disconnected`                                      | relay→desktop | Guest left the Primary Host session.                      |
| `webrtc-offer` / `webrtc-answer` / `webrtc-ice-candidate` | both          | WebRTC signaling for guest audio.                         |

**SecureSocket (`lucaLinkManager`)**

| Event                                                                           | Purpose                                |
| ------------------------------------------------------------------------------- | -------------------------------------- |
| `secure:message`                                                                | Encrypted `EncryptedMessage` envelope. |
| `key:exchange:request` / `key:exchange:response`                                | X25519 public-key handshake.           |
| `command:received` / `command:result`                                           | Command request/result routing.        |
| `message:received`, `message:sent`, `connected`, `disconnected`, `reconnecting` | Manager-level lifecycle.               |

**HTTP endpoints**

| Endpoint                             | Host   | Purpose                                      |
| ------------------------------------ | ------ | -------------------------------------------- |
| `POST /api/pairing/generate`         | relay  | Issue pairing token.                         |
| `POST /api/guest/generate`           | relay  | Issue guest session + URL.                   |
| `GET /guest`                         | relay  | Guest web page.                              |
| `GET /health`                        | relay  | Health check.                                |
| `GET /api/remote-access/info`        | Cortex | Local IP + `pinRequired`.                    |
| `POST /api/remote-access/verify-pin` | Cortex | Validate guest PIN.                          |
| `GET /api/luca-link/status`          | Cortex | Link status (referenced in `config/api.ts`). |

Internal message-type constants also seen: `UI_STATE_SYNC`, `client:message`
(in `App.tsx`), and manager message kinds `command|response|event|sync|heartbeat`.

---

## D. Current State / Data Model

**Active service (`lucaLinkService.ts`)**

```ts
interface LucaLinkState {
  connected: boolean;
  deviceId: string | null;
  pairingToken: string | null;
  connectedDevices: LucaLinkDevice[];
  error: string | null;
}

interface LucaLinkDevice {
  deviceId: string;
  type: string;
  name: string;
  lastSeen: number;
}

interface LucaLinkMessage {
  // service variant
  id: string;
  type: string;
  source: string;
  target: string;
  timestamp: number;
  payload?: unknown;
  secure?: boolean;
  sync?: { type: string; data: unknown };
}
```

**Module types (`src/services/lucaLink/types.ts`)**

```ts
interface Device {
  id: string;
  name: string;
  type: "mobile" | "tablet" | "desktop" | "watch" | "tv" | "speaker" | "iot";
  platform:
    | "ios"
    | "android"
    | "web"
    | "macos"
    | "windows"
    | "linux"
    | "tizen"
    | "webos"
    | "wearos";
  capabilities: string[];
  status: "online" | "offline" | "away";
  lastSeen: Date;
  trustLevel: number; // 0-100
  metadata: DeviceMetadata;
  publicKey?: string;
  identityPublicKey?: string;
}

interface Session {
  sessionId: string;
  deviceId: string;
  sharedSecret: string; // encrypted
  publicKey: string;
  lastSeen: number;
  capabilities: string[];
  preferences: Record<string, any>;
}

interface EncryptedMessage {
  iv;
  encrypted;
  signature;
  timestamp;
  nonce;
}
interface KeyPair {
  publicKey;
  secretKey;
} // Uint8Array
interface SharedSecret {
  key: Uint8Array;
  createdAt;
  expiresAt;
}
```

> **Observation: two divergent `LucaLinkMessage` shapes** exist (the service's
> `{id,type,source,target,...}` vs the module's
> `{type:"command"|"response"|...,payload,...}`). Unifying these is a target-model
> goal (see §G Identity/Transport).

**Persistence**

| Store                   | Key / Object             | Contents                                       |
| ----------------------- | ------------------------ | ---------------------------------------------- |
| `localStorage`          | `luca_link_device_id`    | Persistent device ID (`luca-xxxxxxxxxxxx`).    |
| `localStorage`          | `luca_link_pairing_data` | `{ token, localUrl?, timestamp }`.             |
| IndexedDB (`sessionDB`) | sessions                 | `Session` objects (encrypted shared secret).   |
| IndexedDB (`sessionDB`) | offline queue            | Queued `LucaLinkMessage`s (with retry counts). |

**Guest sessions** are kept in-memory only:
`guestSessions: Map<sessionId, { peerConnection, sessionId }>`.

---

## E. Security / Trust Assessment

| Area                               | Current behavior                                                                                                      | Assessment                                                                                              |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Pairing token lifecycle            | Token minted by relay `/api/pairing/generate`; persisted client-side in `luca_link_pairing_data`.                     | No documented expiry/rotation on the client; token reused for auto-reconnect indefinitely.              |
| Persistent device ID               | Random 12-char ID in localStorage, survives reconnects.                                                               | Not cryptographically bound to an identity key; clearing storage silently re-identifies the device.     |
| Relay vs local security            | Relay is a public Socket.IO server; LAN mode probes plain HTTP `http://<ip>:3003`.                                    | Local mode is unauthenticated transport (relies on app-layer crypto only); relay sees routing metadata. |
| Guest PIN flow                     | PIN checked via Cortex `verify-pin`; gates `startGuestSession`.                                                       | PIN is the only guest gate; no attempt throttling/lockout documented; no guest scope beyond chat.       |
| WebRTC security                    | Standard DTLS-SRTP via STUN; offer initiated by desktop after auth.                                                   | No TURN fallback; ICE/candidate source is trusted from relay routing.                                   |
| Encrypted packet / session manager | `beamPacket` + `secure:message` use AES-256-GCM + HMAC; X25519 DH for shared secret; Ed25519 identity sign available. | Solid primitives, but **only `beamPacket` opts in**; ordinary `send()` is plaintext.                    |
| Master key storage                 | `SessionManager.masterPassword = "luca-link-master-key"` (hardcoded) wraps stored secrets via CryptoJS AES.           | **Significant gap** — a hardcoded master key offers no real at-rest protection.                         |
| Key rotation                       | `SharedSecret.expiresAt` + `needsRotation()` exist; `KEY_ROTATION_INTERVAL = 24h`.                                    | Type-level only; **no runtime rotation loop** observed.                                                 |
| Device revocation                  | None.                                                                                                                 | **Missing** — no way to revoke a paired device or kill its sessions remotely.                           |
| Per-device permission policy       | `Device.trustLevel` is a 0–100 number; `calculateTrustScore` adds recency bonus.                                      | **No capability-scoped permissions**; trust is a single scalar, not a policy.                           |
| Lane permissions                   | N/A                                                                                                                   | **Missing** — all message types flow over one channel with no per-lane gating.                          |
| Audit log                          | None.                                                                                                                 | **Missing** — no record of pairings, grants, or high-risk actions.                                      |
| Replay protection                  | `decryptSecureMessage` enforces a 60s `maxAge` + nonce + signature.                                                   | Reasonable for secure packets; nonces are not persisted/deduped across restarts.                        |

---

## F. Current Gaps

The following target-model pieces do not yet exist (tracked in
`lucaLinkTargetComponents` + roadmap):

- **Capability registry** — beyond ad-hoc `detectCapabilities()` strings.
- **Host roles** — no `primary/companion/execution/sensor/display/guest/embodied`.
- **Per-device permissions** — only a scalar `trustLevel`.
- **Trust levels** — no `guest/paired/trusted/admin/owner` policy ladder.
- **Sync lanes** — single undifferentiated message channel.
- **Host routing engine** — `selectBestDevice` exists but is capability+trust
  only, unused by the active service, and lacks cost/privacy/latency factors.
- **Memory conflict handling** — `resolveConflicts` only dedupes sessions, not
  memory content.
- **Settings sync policy** — `UI_STATE_SYNC` is fire-and-forget; no policy.
- **Conversation handoff** — no first-class "move this chat to another host".
- **Offline queue / store-and-forward** — exists in `SessionManager` but not
  wired into the active `lucaLinkService` path.
- **Device revocation / key rotation** — neither is runtime-enforced.
- **Guest expiry / permission class** — guests are chat-only with no TTL.
- **Local vs VPN vs relay policy clarity** — transport choice is heuristic, not
  policy-driven.
- **Sensor privacy boundaries** — `SENSOR_PULSE` is ingested without per-lane
  consent/scoping.
- **Embodied host safety policy** — no motion/actuation safety layer.
- **Unified message/identity model** — two `LucaLinkMessage` shapes + two stacks.

---

## G. Target LucaLink Mesh Architecture

The target is a layered model; each layer is represented in
`lucaLinkTargetComponents`.

```
            ┌─────────────────────────────────────────────┐
            │                 Audit Log                    │
            ├─────────────────────────────────────────────┤
   Identity │  LucaLink Identity (deviceId + Ed25519 keys) │
            ├─────────────────────────────────────────────┤
 Capability │  Capability Manifest (LucaHostManifest)      │
            ├─────────────────────────────────────────────┤
      Trust │  Trust & Permission Policy (levels × perms)  │
            ├─────────────────────────────────────────────┤
   Registry │  Host Registry (roles, capabilities, state)  │
            ├─────────────────────────────────────────────┤
     Router │  Host Router (capability/trust/cost scoring) │
            ├─────────────────────────────────────────────┤
      Lanes │  Sync Lanes (identity…safety, permissioned)  │
            ├─────────────────────────────────────────────┤
  Transport │  Transport Manager (LAN | relay | VPN | RTC) │
            └─────────────────────────────────────────────┘
   Cross-cutting: Guest Gateway · Memory/Conversation Handoff ·
                  Sensor Mesh · Embodied Host Adapter
```

- **Identity Layer** — stable device ID bound to an Ed25519 identity key;
  signed host manifests.
- **Capability Manifest** — `LucaHostManifest` (see §H) describing hardware,
  sensors, capabilities, and models.
- **Trust & Permission Policy** — trust levels (§I) mapped to permission
  categories; the source of truth for "may this host do X?".
- **Sync Lanes** — typed, permissioned channels (§J).
- **Host Registry** — authoritative known-host table (extends
  `deviceRegistry.ts`).
- **Host Router** — task placement (§K).
- **Transport Manager** — abstracts LAN/relay/VPN/WebRTC behind one interface.
- **Guest Gateway** — hardened, expiring, least-privilege guest access.
- **Memory / Conversation Handoff** — moves chat + relevant memory between hosts.
- **Sensor Mesh** — perception aggregation with privacy boundaries.
- **Embodied Host Adapter** — robotics/motion with explicit safety policy.
- **Audit Log** — append-only record of pairings, grants, revocations, routes.

---

## H. Capability Manifest Design

Proposed (design-only) interface. **Not wired into runtime.** A future PR #183
would add this as a real type and populate it from `deviceRegistry` detection.

```ts
interface LucaHostManifest {
  deviceId: string; // stable, bound to identity key
  deviceName: string;
  platform:
    | "ios"
    | "android"
    | "web"
    | "macos"
    | "windows"
    | "linux"
    | "tizen"
    | "webos"
    | "wearos"
    | "robot";
  hostRole: LucaLinkHostRoleId; // primary | companion | execution | ...
  hardware: {
    cpuCores?: number;
    memoryGb?: number;
    gpu?: string;
    npuAvailable?: boolean;
    batteryPercent?: number;
  };
  sensors: Array<
    | "camera"
    | "microphone"
    | "location"
    | "accelerometer"
    | "lidar"
    | "temperature"
    | "presence"
  >;
  capabilities: LucaLinkPermissionCategory[]; // what it *can* do (pre-policy)
  models: Array<{ id: string; sizeB?: number; quant?: string; local: boolean }>;
  trust: {
    level: LucaLinkTrustLevelId;
    grantedPermissions: LucaLinkPermissionCategory[];
    approvedBy?: string; // Primary Host deviceId
    approvedAt?: number;
  };
  status: {
    presence: "online" | "away" | "offline";
    network?: "wifi" | "5g" | "4g" | "3g" | "vpn" | "relay" | "offline";
    lastSeen: number;
  };
}
```

The static role/permission/trust vocabularies above are exported from
`lucaLinkArchitectureMap.ts` so this manifest can be validated against them
later without duplication.

---

## I. Trust Levels

Defined in `lucaLinkTrustLevels` (ascending authority):

| Level     | Rank | Meaning                                                                                 |
| --------- | ---- | --------------------------------------------------------------------------------------- |
| `guest`   | 0    | Temporary, least-privilege, time-limited. No memory write, no tools.                    |
| `paired`  | 1    | Completed pairing; basic chat/presence only.                                            |
| `trusted` | 2    | Primary Host-approved for memory read, settings sync, sensor input.                     |
| `admin`   | 3    | Explicitly granted high-risk capabilities (tool/code/shell) under policy.               |
| `owner`   | 4    | Owner-level mesh authority; approves/revokes hosts but is not Creator/Origin authority. |

**Permission categories** (defined in `lucaLinkPermissionCategories`, each with a
risk band):

`chat.send`, `chat.receive`, `voice.capture`, `voice.playback`,
`camera.capture`, `screen.capture`, `location.read`, `notification.send`,
`memory.read`, `memory.write`, `settings.sync`, `files.read`, `files.write`,
`browser.control`, `shell.execute`, `code.modify`, `git.create_pr`,
`smart_home.control`, `robotics.motion`, `payment.spend`.

High-risk categories (`shell.execute`, `code.modify`, `git.create_pr`,
`robotics.motion`, `payment.spend`) are classified `critical` and must require
`admin`/`owner` trust plus explicit grant.

---

## J. Sync Lanes

Defined in `lucaLinkSyncLanes`. Each lane carries `purpose`, example payloads,
direction, required permissions, encryption requirement, and a conflict policy.

| Lane           | Direction     | Purpose                                  | Required perms                            | Encrypted | Conflict          |
| -------------- | ------------- | ---------------------------------------- | ----------------------------------------- | --------- | ----------------- |
| `identity`     | bidirectional | Host manifests, public keys, role grants | —                                         | yes       | primary-host-wins |
| `presence`     | broadcast     | Online/away, battery/network             | —                                         | no        | last-write-wins   |
| `conversation` | bidirectional | Hand off chat/voice turns                | chat.send/receive                         | yes       | append-only       |
| `memory`       | bidirectional | Replicate memory + sovereign facts       | memory.read/write                         | yes       | merge             |
| `settings`     | bidirectional | Sync settings/appearance/runtime         | settings.sync                             | yes       | primary-host-wins |
| `mission`      | broadcast     | Mission/goldEgg hydration                | memory.read                               | yes       | primary-host-wins |
| `sensor`       | host→primary  | Perception pulses (SENSOR_PULSE)         | location/camera/voice                     | yes       | append-only       |
| `tool`         | bidirectional | Tool invoke/result routing               | shell.execute/browser.control/files.write | yes       | no-conflict       |
| `artifact`     | bidirectional | File/blob/build-artifact transfer        | files.read/write                          | yes       | last-write-wins   |
| `notification` | primary→host  | Fan-out notifications                    | notification.send                         | no        | append-only       |
| `model`        | bidirectional | Local model advertise/route              | —                                         | yes       | no-conflict       |
| `safety`       | primary→host  | Revocation, kill-switch, key rotation    | —                                         | yes       | primary-host-wins |

Mapping existing events onto lanes: `sync/registry`→`presence/identity`,
`sync/mission`→`mission`, `SENSOR_PULSE`→`sensor`, guest chat→`conversation`,
`command`/`response`→`tool`, `UI_STATE_SYNC`→`settings`.

---

## K. Host Routing Model

The Host Router answers question #5: _should Luca route this task through this
host?_ This is a **design-only** scoring model (not implemented in this PR).

Inputs per candidate host:

- **capability match** — does the host expose the required permission/capability? (hard gate)
- **trust level** — is the host trusted enough for the task's risk band? (hard gate)
- **privacy fit** — does the task's data sensitivity match the host's privacy posture?
- **latency** — network round-trip (LAN < VPN < relay).
- **battery** — penalize low-battery mobile/sensor hosts for heavy work.
- **compute** — cores/RAM/GPU/NPU vs task cost.
- **network** — connection quality/quota.
- **user context** — which host the user is actively using.
- **risk level** — high-risk tasks bias toward `execution`/`primary`.

Rough scoring sketch (illustrative only):

```
if (!host.capabilities.includes(required)) return DISQUALIFIED;
if (host.trust.rank < task.minTrustRank)   return DISQUALIFIED;

score =
    w_capability * capabilityFit        // 0..1
  + w_privacy    * privacyFit            // 0..1
  + w_latency    * (1 - normLatency)     // prefer low latency
  + w_compute    * computeHeadroom       // 0..1
  + w_battery    * batteryHeadroom       // 0..1
  + w_context    * userActiveOnHost      // 0 or 1
  - w_risk       * riskPenalty;          // de-rate risky placements

route → argmax(score) among qualified hosts
```

`deviceRegistry.selectBestDevice()` is the seed for this; the future engine
(PR #186) generalizes it with the factors above.

---

## L. Product UX Model (future LucaLink Settings)

Target structure for the LucaLink Settings tab (a future device center, PR #187).
The current tab already has _Linked Devices_, _Pair New Device_, _Sync
Behavior_, _Access Control_, and _Advanced Details_ sections — these map forward
to:

- **Linked Devices** — list of hosts with role badge, trust level, presence.
- **Device Detail** — manifest view (hardware, sensors, models, last seen).
- **Permissions** — per-device permission toggles grouped by risk band.
- **Sync** — per-lane enable/disable + conflict-policy display.
- **Guest Sessions** — active guests, expiry, scope, revoke.
- **Advanced Network** — transport policy (LAN/VPN/relay), relay URL, mDNS.
- **Audit Log** — pairings, grants, revocations, high-risk routes.
- **Danger Zone** — revoke device, rotate keys, wipe sessions, reset identity.

---

## M. Implementation Roadmap

Mirrors `lucaLinkImplementationRoadmap`. Each PR is additive and should preserve
runtime behavior until explicitly enabled.

| PR       | Title                                   | Depends on |
| -------- | --------------------------------------- | ---------- |
| **#183** | Device Manifest + Capability Registry   | #182       |
| **#184** | Trust & Permission Policy               | #183       |
| **#185** | Sync Lane Protocol                      | #184       |
| **#186** | Host Routing Engine                     | #185       |
| **#187** | LucaLink Settings Device Center         | #183, #184 |
| **#188** | Memory / Conversation Handoff           | #185, #186 |
| **#189** | Guest Access Hardening                  | #184       |
| **#190** | Sensor Mesh + Embodied Host Preparation | #185, #186 |

---

## Appendix — Files Inspected

- `src/services/lucaLinkService.ts` (active relay/socket service)
- `src/services/lucaLink/{manager,secureSocket,sessionManager,crypto,deviceRegistry,errorHandler,types}.ts`
- `src/services/storage/sessionDB.ts` (referenced)
- `src/components/settings/SettingsLucaLinkTab.tsx`
- `src/services/qrScannerService.ts`
- `src/config/api.ts`
- `relay-server/index.js`
- `src/App.tsx` (LucaLink init + guest handler + command routing)
- `src/services/meshObservationService.ts`, `src/services/cognitiveShardingEngine.ts`
- `src/services/lucaService.ts` (`importSovereignMission`)

```

```
