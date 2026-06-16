# Presence Runtime foundation

**Status:** typed foundation with first compatibility wiring

**Runtime behavior change:** none

## What this foundation adds

The first `src/presence/` module establishes a framework-neutral contract for Luca Presence without moving ownership out of the current dashboard renderer or Electron process:

- JSON-safe Presence state and snapshot contracts for MiniChat, Hologram, Widget, and the dashboard Control Center;
- discriminated events for surface lifecycle, voice, wake word, sensors, approvals, LucaLink synchronization, and explicit dashboard requests;
- a pure reducer plus a small in-memory runtime wrapper with state, snapshot, dispatch, subscription, and reset operations;
- pure surface/focus/fallback policy helpers that make Hologram the default wake-word and voice-shortcut surface while reserving dashboard escalation for explicit or exceptional flows;
- public disclosure terminology for Voice Presence, Screen Context, Protected Actions, Device Awareness, and the Control Center;
- compatibility adapters between current `widget-update`, `hologram-update`, and LucaLink `UI_STATE_SYNC` payloads and the new transport-safe snapshot.

The compatibility boundary converts legacy `Set<string>` mission authorization state to arrays. Presence snapshots contain no functions, DOM/Electron objects, maps, sets, or class instances.

## First compatibility wiring

The dashboard's existing widget synchronization loop now converts its legacy
state payload to a transport-safe `PresenceSnapshot`, then converts that
snapshot back through the Widget, Hologram, and LucaLink compatibility
adapters. Electron continues to use `sync-widget-state`, `widget-update`, and
`hologram-update`, while LucaLink continues to use `UI_STATE_SYNC`.

Fields not modeled by `PresenceSnapshot` yet, including brain and embedding
model identifiers and approval request data, remain on the legacy payload and
are merged into the adapter output. Presence-owned fields take precedence so
mission authorization `Set` values become JSON-safe arrays, particularly for
LucaLink serialization.

This wiring does not change surface visibility, focus behavior, wake-word
routing, voice ownership, MiniChat message routing, sensor behavior, approval
behavior, or rendering.

## What remains legacy

This PR intentionally does **not**:

- change wake-word or voice-shortcut routing;
- register the runtime as an Electron, React, or LucaLink singleton;
- alter existing IPC channel names or remove any channels;
- move voice, conversation, sensor, approval, or settings ownership;
- change MiniChat, Hologram, Widget, or Control Center rendering;
- extract Electron window factories.

The runtime still does not own current application state. The compatibility
bridge is an importable, testable migration boundary around the existing
dashboard-owned synchronization loop.

## Relationship to PR #313 and PR #315

PR #313 documented the current Presence topology and proposed a transport-safe runtime boundary. This foundation implements the first contracts, reducer, policies, and compatibility adapters from that plan while leaving the existing owners in place.

PR #315 changed wake-word and voice summons to present the Hologram first and preserve the user's active application focus. The surface policy codifies that behavior as the future runtime default; it does not route the summon a second time or modify Electron behavior.

## Suggested next migration PRs

1. Add small bridge modules for MiniChat, Hologram, and Widget, then remove their duplicate payload parsing only after parity tests.
2. Feed wake-word and shortcut intents into the runtime while preserving the PR #315 Electron fallback behavior.
3. Migrate voice state ownership and capability status behind injected runtime ports.
4. Add disclosed sensor leases and sanitized approval prompts, including explicit focus-required escalation.
5. Make LucaLink and Electron parallel adapters for the same versioned snapshot/event contracts.
6. Only after those migrations, reduce dashboard ownership and extract Electron window factories in separately reviewable PRs.

## Surface bridge foundation

The Presence foundation now includes pure surface adapters under
`src/presence/bridges/` for MiniChat, Hologram, and Widget. These modules
centralize conversion from current legacy payloads into `PresenceSnapshot`,
conversion back to each surface's existing transport shape, and small
surface-specific selectors for voice display, dictation, disclosure, focus,
and approval prompt state.

The bridges reuse the existing Presence compatibility helpers rather than
creating parallel conversion rules. When an outgoing helper receives the
original legacy payload, it preserves fields that are not modeled by the
snapshot—such as brain model identifiers, the current approval request shape,
and Hologram `presenceSource`—while normalized Presence fields take precedence.
This also keeps mission authorization identifiers JSON-safe by converting
legacy `Set` values to arrays.

IPC channels, Electron fan-out, React parsing, settings access, LucaLink
broadcasting, and surface rendering remain legacy-owned. No bridge registers a
runtime singleton or performs host side effects, and visible runtime behavior
is unchanged.

The next migration step is to adopt these bridge selectors at the existing
React and application synchronization boundaries in small parity-tested
changes. Once all surfaces consume the centralized adapters, their duplicate
legacy parsing can be removed without changing transport channels or native
window behavior.

## Electron window factory extraction

Presence-related Electron window creation is now split into dedicated CommonJS
factory modules under `platforms/electron/windows/`:

- `createMiniChatWindow.cjs` creates the existing MiniChat BrowserWindow.
- `createHologramWindow.cjs` creates the existing Hologram BrowserWindow.
- `createWidgetWindow.cjs` creates the existing dictation Widget BrowserWindow.
- `createVisualCoreWindow.cjs` creates the existing Visual Core / Smart Screen BrowserWindow.
- `index.cjs` re-exports the factory functions for `main.cjs`.

This extraction intentionally preserves the current BrowserWindow dimensions,
positioning, transparency, focusability, always-on-top and workspace behavior,
preload configuration, route query strings, development and packaged URL
handling, ready-to-show callbacks, close cleanup, and existing logging. The
factories receive Electron and runtime dependencies from `main.cjs` instead of
importing broad process globals, which keeps this step extraction-only and makes
the next boundaries easier to review.

`platforms/electron/main.cjs` still owns all Presence IPC handlers, tray and
hotkey actions, wake-word and voice routing, sensor permissions, Visual Core
state queues, and top-level window references. No IPC channel names, wake-word
behavior, MiniChat/Hologram/Widget rendering, voice runtime ownership, or tray
labels/actions changed as part of this extraction.

The next migration step is to extract Presence IPC adapter registration behind
similarly injected dependencies while keeping existing channels and routing
behavior stable.
