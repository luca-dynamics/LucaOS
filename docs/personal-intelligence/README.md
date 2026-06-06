# Luca Personal Intelligence Core

LucaOS is not only a UI shell. A durable personal operating system also needs explicit identity, goals, memory, skills, execution doctrine, privacy boundaries, and learning loops. The Personal Intelligence Core defines those foundational contracts as an isolated, typed module under `src/personal-intelligence`.

## Scope

This foundation provides:

- an Identity Core for stable user and Luca personalization preferences;
- Mission Profiles for goals, constraints, success criteria, and operating state;
- a privacy-aware Memory Item schema, in-memory store, and serialization-only filesystem adapter;
- a versioned Skill Manifest standard and pure registry;
- the Sense → Understand → Plan → Approve → Act → Verify → Learn doctrine;
- a bounded Learning Log; and
- policy helpers for explicit Privacy Zones.

## Integration boundary

The module is intentionally passive. It does not register itself with app boot, providers, VisualCore, LucaLink, Device Center, relay, WebRTC, VPN, or runtime execution. The filesystem adapter returns readable file descriptions but performs no disk I/O. Runtime integration can happen after PR #204 verification, through separately reviewed adapters.

Import the complete public API from `src/personal-intelligence/index.ts` or import a focused submodule directly.
