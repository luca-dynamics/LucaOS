# LucaOS Agent Engineering Doctrine

## Mandatory Read Order Before Major Changes
1. `docs/foundation/AGENTS.md`
2. `docs/foundation/CONSTITUTION.md`
3. `docs/foundation/ARCHITECTURE.md`
4. `docs/absorb/Luca_Absorb_Architecture_v12.md`

## Core Instructions
- LucaOS is a persistent embodied AI operating layer, not a chatbot.
- Do not refactor runtime behavior unless explicitly requested.
- Use existing LucaOS code patterns as source of truth.
- Do not blindly copy external repos; absorb patterns natively.

## Runtime Safety Rules
- Route risky actions through Luca Guard policy checks.
- Respect mode boundaries (Origin/Tactical/Core).
- Keep self-evolution in guarded Origin workflows only.

## Implementation Standards
- Mission workflow standard: plan → execute → verify → recover → record.
- Add/maintain testable acceptance criteria when defining specs.
- Preserve backward-compatible terminology and clear subsystem boundaries.

## Documentation Standards
- When adding/changing architecture behavior, update the relevant spec under `docs/`.
- Keep glossary terms canonical and consistent across docs/UI/code.
