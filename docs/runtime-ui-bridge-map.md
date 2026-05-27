# Runtime UI Bridge Map

This document tracks service-level runtime-to-UI bridge scaffolds.

- Voice Mode UI bridge: subscription and snapshot API for mode/session/transcript/response state.
- Voice HUD subscription bridge: listener wrapper around `VoiceHudRuntimeBridge` state transitions.
- Voice onboarding UI bridge: listener API over onboarding progression state and responses.
- Computer-use confirmation UI bridge: listener API over pending confirmations and approve/reject results.
- Combined snapshot helper: merges bridge snapshots into a single runtime UI bundle.

All bridges are scaffold-only and do not import React/UI components. Real provider and browser execution remain disabled.
