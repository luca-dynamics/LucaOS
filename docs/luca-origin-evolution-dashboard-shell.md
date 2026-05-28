# Luca Origin Evolution Dashboard Shell

## Purpose
This document defines a **non-functional, read-only Origin Creator dashboard shell** for LucaOS self-evolution workflows.

The shell is intentionally visual-only so Origin operators can validate information architecture before guarded runtime plumbing is introduced.

## Implemented Artifact
- Component: `src/components/origin/OriginEvolutionDashboardShell.tsx`
- Mode posture: **Origin-only**
- Behavior posture: **read-only**

## Included Shell Sections
The dashboard shell contains static cards for:
1. Proposal Inbox
2. Evolution Runs
3. Candidate Variants
4. Constraint Gates
5. PR-back Reports
6. Rollback Plans
7. External Lab Status
8. Safety Banner

## Safety Contract (Current State)
The shell enforces the following UI-level constraints:
- no runtime mutation
- no optimizer execution
- no auto-apply
- no approval/promote/rollback handlers
- no network calls
- no `evolutionService` calls

Static metadata embedded in the component:
- `mockOnly: true`
- `runtimeBehaviorChanged: false`

## Mounting Guidance
No route or public navigation was force-wired in this change.

Recommended future mount path (when Origin routing contract is explicit):
- mount from Origin overlay/surface composition layer under `src/surfaces/origin/*`
- keep visibility restricted to Origin boundary checks

## Out of Scope
This shell **does not**:
- execute mutations
- commit code
- approve/promote candidates
- change Normal/Tactical behavior
- alter runtime orchestration

## User-tier integration reference
- Canonical tier placement contract: `docs/luca-user-tier-ui-integration-contract.md`.
- `OriginEvolutionDashboardShell` remains Origin-only and read-only until tier gating + governed action wiring are explicitly implemented.
