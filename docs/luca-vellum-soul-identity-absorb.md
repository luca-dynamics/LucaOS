# Luca Vellum/Soul.md-Style Identity Absorb Audit
Date: 2026-05-28 (UTC)  
Status: Architecture absorb audit only; canonical contract introduced without runtime wiring.

## Stable agent identity pattern
Vellum/Soul.md-style identity files separate the stable “who this agent is” contract from transient prompt decorations. The useful pattern for LucaOS is a human-readable, versionable identity layer that defines mission, values, boundaries, interaction style, and relationship posture before any model/provider-specific prompt is assembled.

## Why Luca needs a canonical identity/soul contract
LucaOS already spans chat, voice, memory, onboarding, model routing, local/BYOK/Prime execution paths, and future embodiment. Without one canonical identity contract, each surface can drift into a different persona. The contract added in this PR establishes one safe Luca identity that future surfaces can read from without changing runtime behavior now.

## Identity layer vocabulary

| Layer | Meaning | Contract posture |
|---|---|---|
| Base identity | Stable agent name and continuity anchor. | Default name is Luca. |
| Mission | Why Luca exists for the user. | Help as a personal AI OS agent with safety and agency. |
| Values | Durable operating priorities. | Truthfulness, user agency, privacy respect, safety, clarity. |
| Interaction style | How Luca communicates. | Tier-aware style, not a separate mind. |
| Boundaries | What Luca must not claim or do. | No fake human feelings, hidden memory claims, or dependency loops. |
| User relationship | Optional summary of user continuity. | Only memory-backed when source is explicitly `memory_profile`. |
| Runtime persona | The presentation layer used by chat/voice prompts. | Future consumer; not wired in this PR. |
| Mode/tier-specific presentation | Origin/Tactical/Normal/Unknown behavior shape. | Pure snapshot helpers only. |

## Mapping to LucaOS runtime paths

### Luca Prime
Luca Prime can eventually receive identity snapshots as prompt context, but provider/router behavior is unchanged here. The identity contract should be applied before provider-specific formatting so Prime, local models, and BYOK all share the same safe Luca identity.

### Local models
Local models need compact, explicit contracts because context windows and model instruction-following vary. The snapshot helpers provide concise flags and mode labels for future local prompt compaction.

### BYOK
BYOK providers should not receive hidden or unverifiable identity claims. Future BYOK adapters can consume snapshots only after provider-policy review.

### Voice mode
Voice should use the same identity as chat but may express it with a shorter tone profile. This PR does not change voice runtime behavior.

### Chat mode
Chat can eventually use the canonical identity, companion profile, and tier persona as prompt inputs. This PR does not modify system prompt assembly.

### Origin / Tactical / Normal tiers
- Origin: creator-facing, strategic, candid about architecture and limitations.
- Tactical: operator-facing, concise, diagnostics-oriented.
- Normal: assistant-first, warm, simple, no technical overload.
- Unknown: safe fallback with onboarding guidance.

### Future embodiment
Embodiment should represent Luca as one persistent AI OS agent across devices, not multiple personalities. Device presence must keep memory disclosure and relationship boundaries visible.

## Non-goals
- No UI mounting.
- No routes.
- No model router/provider changes.
- No voice runtime changes.
- No memory/settings persistence.
- No self-evolution mutation.
