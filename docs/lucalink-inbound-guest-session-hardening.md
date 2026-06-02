# LucaLink Inbound + Guest Session Hardening

PR #198 adds a staged inbound security boundary for LucaLink guest sessions. The goal is to harden guest and inbound surfaces without changing pairing, PIN authentication, guest chat, mission sync, sensor pulse observation, or WebRTC signaling semantics.

## Purpose

The runtime enforcement gate added outbound protection for send-like paths. This hardening layer covers the complementary inbound guest surface by:

- tracking guest session state in memory;
- classifying guest inbound event kinds;
- preserving safe guest conversation, presence, auth response, and WebRTC signaling;
- sanitizing and rate-limiting guest chat input; and
- denying only guest payloads that clearly attempt unsafe LucaLink/device/runtime authority.

## Inbound and Guest Boundary

Guest sessions are treated as limited, non-authoritative participants. They may converse with Luca, respond to authentication challenges, announce presence through existing guest connection events, and participate in the existing WebRTC signaling path.

Guests are not Primary Hosts and cannot claim owner/admin authority. The Primary Host boundary remains the normal mesh authority boundary for trusted devices. `Origin` remains reserved for LucaOS Creator/source-code authority and is not used as a normal LucaLink host role, trust level, approval concept, fallback source, or user-device authority.

## Allowed Guest Capabilities

Default guest capabilities are intentionally small:

- `conversation`
- `presence`
- `webrtc-signaling`
- `auth-response`

These map to existing guest chat, connection/disconnection observation, PIN/auth response handling, and WebRTC offer/answer/ICE signaling.

## Denied Guest Capabilities

Guests are not granted sensitive runtime or device authority, including:

- memory access;
- tool execution;
- safety override;
- full identity/trust access;
- shell, files, code, browser, or git execution/control;
- payment/spend authority;
- robotics, smart-home, or physical-world actuation; and
- sensitive settings or device trust mutation.

Clearly dangerous guest requests for these capabilities are denied before reaching the guest chat handler.

## Auth and PIN Preservation

The auth response flow is explicitly preserved. Guest auth response payloads are classified separately from normal chat so PIN verification can continue through the existing flow. The policy does not add new auth events, persistence, backend endpoints, or push notifications.

## WebRTC Preservation

Existing WebRTC answer and ICE candidate handling remains intact. WebRTC signaling is observed and classified, but the policy defaults to allowing offer/answer/ICE traffic so guest audio/session setup is not disrupted. The PR does not add socket events or change peer connection setup.

## Rate Limiting and Sanitization

Guest chat is bounded by safe defaults:

- default session TTL: 30 minutes;
- maximum message length: 4000 characters;
- maximum guest messages per minute: 30;
- control characters are removed except normal whitespace; and
- over-length messages are truncated before chat handling.

Rate-limited messages are not sent to the guest chat handler, and denial/rate-limit replies use generic language that does not reveal policy internals.

## No Persistence or Dangerous Execution

Guest security state and inbound audit records are in-memory only. This hardening layer does not add:

- persistence;
- new socket events;
- backend endpoints;
- network telemetry;
- shell/file/code/browser/git execution;
- tool execution;
- payment execution; or
- robotics/smart-home/physical-world actions.

## Next Step

The next security step is Device Trust Management: explicit, read-only-to-editable device trust controls that can manage device capabilities without weakening the Primary Host boundary or introducing `Origin` as normal mesh authority.
