# LucaOS Architecture (Foundational)

## System Thesis
Frontier/local/BYOK models are intelligence engines; LucaOS is the persistent operating runtime embodied across host devices.

## Layer Map
```text
User
↓
Interface Layer (Dashboard, VoiceHUD, Hologram, Mini Chat, Luca Screen, Widgets)
↓
Cortex (intent, planning, reasoning, routing)
↓
Mission Engine (plan → execute → verify → recover → record)
↓
Memory / Skills / Model Router / Luca Guard
↓
Embodiment Layer (host controls, browser body, mobile/desktop bridges, sandbox bodies)
↓
Host Systems (macOS, Linux, Windows, Mobile, future robotics)
↓
LucaLink Continuity (sync, delegation, handoff)
```

## Boot and Runtime Initialization
1. Boot/startup initializes runtime subsystems.
2. Onboarding gathers identity + mode + model/runtime preferences.
3. Model path chosen (Luca Prime, Local, BYOK), with provisioning checks.
4. Persistent surfaces come online with shared state.

## Major Subsystems
- **Mission Engine**: deterministic execution discipline with checkpoints and recovery.
- **Memory**: readable + structured memory with sync and attribution.
- **Model Router**: task/privacy/cost/latency-aware routing.
- **Skills Runtime**: MCP/plugins/imported skills with policy-gated execution.
- **Luca Guard**: permissions, risk classification, approvals, and audit trail.
- **LucaLink**: multi-device continuity and mission handoff.

## Architectural Rules
- Do not treat Luca as a chat-only assistant.
- Prefer guarded composition over direct mutation.
- External patterns are absorbed into Luca-native modules and naming.
