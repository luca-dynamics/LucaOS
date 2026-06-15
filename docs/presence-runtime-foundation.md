# Presence Runtime foundation

**Status:** typed foundation only

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

## What is not wired yet

This PR intentionally does **not**:

- replace the state synchronization loop in `App.tsx`;
- change wake-word or voice-shortcut routing;
- register the runtime as an Electron, React, or LucaLink singleton;
- alter existing IPC channel names or remove any channels;
- move voice, conversation, sensor, approval, or settings ownership;
- change MiniChat, Hologram, Widget, or Control Center rendering;
- extract Electron window factories.

The new runtime therefore has no effect on current application behavior. It is an importable, testable migration target for later PRs.

## Relationship to PR #313 and PR #315

PR #313 documented the current Presence topology and proposed a transport-safe runtime boundary. This foundation implements the first contracts, reducer, policies, and compatibility adapters from that plan while leaving the existing owners in place.

PR #315 changed wake-word and voice summons to present the Hologram first and preserve the user's active application focus. The surface policy codifies that behavior as the future runtime default; it does not route the summon a second time or modify Electron behavior.

## Suggested next migration PRs

1. Publish current dashboard state through `PresenceSnapshot` compatibility adapters while retaining all existing IPC channels.
2. Add small bridge modules for MiniChat, Hologram, and Widget, then remove their duplicate payload parsing only after parity tests.
3. Feed wake-word and shortcut intents into the runtime while preserving the PR #315 Electron fallback behavior.
4. Migrate voice state ownership and capability status behind injected runtime ports.
5. Add disclosed sensor leases and sanitized approval prompts, including explicit focus-required escalation.
6. Make LucaLink and Electron parallel adapters for the same versioned snapshot/event contracts.
7. Only after those migrations, reduce dashboard ownership and extract Electron window factories in separately reviewable PRs.
