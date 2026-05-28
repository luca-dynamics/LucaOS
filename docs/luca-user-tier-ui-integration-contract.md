# LucaOS User-Tier UI Integration Contract for Self-Evolution
Date: 2026-05-28 (UTC)
Status: Contract/documentation-only (no runtime wiring)

## Purpose
Define how LucaOS self-evolution contracts integrate with the intended user-tier UI architecture (Origin / Tactical / Normal), while explicitly acknowledging the current public repository is behind the latest private creator MacBook architecture.

## 1) Current repo UI reality
The current repo UI renders a main dashboard composition that includes:
- `Header`
- `OperationsSidebar`
- `ChatPanel`
- right management panel
- `OverlayManager`

This structure does **not** fully represent the latest private Origin/Tactical/Normal UI and onboarding architecture. For self-evolution integration planning, this public repo must be treated as behind the latest local MacBook version.

## 2) Intended latest LucaOS tier model

### Origin / Creator
- creator-only interface
- full evolution visibility
- proposal inbox
- run/candidate review
- constraint reports
- PR-back reports
- rollback plans
- external lab status
- approve/reject/promote/rollback only after future guarded wiring
- can trigger/review external lab workflows in future governed paths

### Tactical
- advanced/power-user interface
- diagnostics and tools/skills visibility
- limited proposal/request submission
- safe summary inspection
- cannot approve/promote/rollback high-risk or core capability changes

### Normal
- simple assistant-first interface
- mostly chat/voice centered
- no raw self-evolution controls
- can provide feedback evidence only
- receives approved stable improvements

## 3) OriginEvolutionDashboardShell placement contract
- `OriginEvolutionDashboardShell` is a React UI shell.
- It is not currently mounted.
- It should eventually mount only inside the Origin / Creator interface.
- It must not be added to Normal/Tactical dashboard surfaces until explicit tier-gating is implemented.
- It remains read-only until `OriginEvolutionControlService` and explicit approval gates are wired in a future governed action PR.

## 4) Onboarding relationship
Future onboarding/routing architecture should determine and/or persist:
- user tier / interface mode
- preferred interaction mode (Chat or Voice)
- model mode (`Luca Prime` / `Local Models` / `BYOK`)
- theme/background opacity/blur
- personality/preferences
- local capability detection that affects Tactical/Normal behavior differences

## 5) Self-evolution access by tier

| System | Origin | Tactical | Normal |
|---|---|---|---|
| `EvolutionProposalInbox` | Full governed review + decision workflow | Limited low-risk proposal/request submission where policy allows | No raw proposal submission; evidence/feedback only |
| `ExternalEvolutionImportAdapter` | Allowed (review-only import path) | Not allowed for high-risk/core imports; default no direct import authority | Not allowed |
| `ConstraintGateReportVerifier` | Full report verification visibility | Safe summary visibility only (future policy-gated) | No raw verifier surface |
| `PrBackMetadataVerifier` | Full metadata verification visibility | Safe summary visibility only (future policy-gated) | No raw verifier surface |
| `OriginEvolutionControlService` | Origin-only control surface | No direct control access | No direct control access |
| `OriginEvolutionDashboardShell` | Intended mount target (Origin-only) | Do not mount | Do not mount |

## 6) Safe migration plan from private MacBook version
1. Import/compare the private onboarding + tier-routing architecture into this repo.
2. Map private UI surfaces onto current public repo components without breaking existing runtime behavior.
3. Preserve already-merged self-evolution contracts and adapter-only governance posture.
4. Mount `OriginEvolutionDashboardShell` only after Origin tier can be explicitly identified and enforced.
5. Prevent Origin-only controls from appearing in Tactical/Normal surfaces.
6. Keep runtime mutation disabled until explicit governance/action PRs wire guarded actions.

## 7) What not to do yet
- Do not wire the Origin shell into `src/App.tsx` blindly.
- Do not add an EVOLUTION tab visible to all users.
- Do not connect approve/promote/rollback buttons.
- Do not call `evolutionService` `mutate`/`commit`.
- Do not add optimizer execution in core runtime.
- Do not add persistence without policy/governance decisions.

## 8) Cross-doc alignment references
This contract should be read alongside:
- `docs/lucaos-self-evolution-repo-boundary.md`
- `docs/luca-origin-evolution-dashboard-shell.md`
- `docs/luca-origin-evolution-control-service.md`
- `docs/luca-evolution-governance-contract.md`

Those docs should reference this user-tier UI integration contract as the canonical bridge between current public-repo UI reality and intended private-tier architecture.


## 9) Canonical pure tier contract reference (2026-05-28)
- Source contract: `src/types/lucaUserTier.ts` (pure types + helpers).
- Primary spec: `docs/luca-user-tier-contract.md`.
- This integration document remains UI-planning only; no UI wiring is introduced in this contract-layer PR.
- Origin/Tactical/Normal UI migration remains future work after onboarding/tier resolution is aligned with private MacBook architecture.

- See `docs/luca-private-ui-migration-audit-checklist.md` for pre-import private MacBook UI migration audit workflow.
