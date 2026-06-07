# Luca Personal Intelligence Core

LucaOS is not only a UI shell. A durable personal operating system also needs explicit identity, goals, memory, skills, execution doctrine, privacy boundaries, and learning loops. The Personal Intelligence Core defines those foundational contracts as an isolated, typed module under `src/personal-intelligence`.

## Scope

PR #205 created passive contracts for:

- an Identity Core for stable user and Luca personalization preferences;
- Mission Profiles for goals, constraints, success criteria, and operating state;
- a privacy-aware Memory Item schema, in-memory store, and serialization-only filesystem description;
- a versioned Skill Manifest standard and pure registry;
- the Sense → Understand → Plan → Approve → Act → Verify → Learn doctrine;
- a bounded Learning Log; and
- policy helpers for explicit Privacy Zones.

PR #206 adds integration boundaries, readiness evaluation, mapping descriptions, execution-trace safeguards, and combined preview composition. Later phases added Settings previews, governed persistence proposals, the disabled/dry-run-first memory adapter, and the controlled approval pilot. The current [runtime trace and learning-events phase](runtime-trace-learning-events.md) adds in-memory evidence and proposal-ready learning previews while remaining defensive and side-effect-free.

## Integration boundary

No Personal Intelligence execution wiring is active. The module does not register itself with app boot, providers, VisualCore, LucaLink, Device Center, relay, WebRTC, VPN, storage, network, tool execution, or runtime services. Memory serialization returns readable file descriptions but performs no disk I/O, and skill entrypoints remain inert declarations.

Future wiring must pass privacy, approval, persistence, execution, network, and runtime gates in separately reviewed PRs. See the [runtime wiring audit](runtime-wiring-audit.md), [integration boundaries](integration-boundaries.md), and [future roadmap](future-wiring-roadmap.md).

Import the complete public API from `src/personal-intelligence/index.ts` or import a focused submodule directly.
