# Luca Private UI Migration Audit Checklist

Date: 2026-05-28 (UTC)
Status: Documentation-only migration prep (no runtime/UI wiring)

## 1) Purpose
- This checklist prepares LucaOS GitHub repo migration planning to safely absorb the creator's latest private MacBook LucaOS tiered UI/onboarding architecture.
- This is **not** an implementation PR.
- This checklist should be completed before moving private UI/onboarding code into GitHub.

## 2) Current GitHub baseline to compare
Use this baseline when diffing private MacBook architecture into public repo:
- `src/App.tsx` main runtime shell.
- `Header`.
- `OperationsSidebar`.
- `ChatPanel`.
- `OverlayManager`.
- `ManagementDashboard`.
- `SettingsModal`.
- `OnboardingFlow`.
- `VoiceHUD` / voice UI path.
- `VisualCore` / widgets.
- Current right panel modes: `MANAGE` / `LOGS` / `MEMORY` / `CLOUD`.
- Canonical `LucaUserTier` contract.
- `OriginEvolutionDashboardShell` (read-only shell, not broad-mounted).
- `OriginEvolutionControlService` (Origin-gated orchestration layer).

## 3) Private MacBook version expected surfaces
Audit checklist (mark each as Present / Partial / Missing / Divergent):
- [ ] Origin / Creator UI surface.
- [ ] Tactical UI surface.
- [ ] Normal UI surface.
- [ ] Onboarding mode selection: Chat / Voice.
- [ ] Theme/background opacity/blur setup.
- [ ] Model choice flow: Luca Prime / Local Models / BYOK.
- [ ] Local model hardware scanning path.
- [ ] Local Ollama install/pull flow (if present).
- [ ] STT/TTS/Cortex voice model download flow.
- [ ] Preferences/personality setup flow.
- [ ] Tier-specific dashboard layout contracts.
- [ ] Origin self-evolution access placement.
- [ ] Tactical tools/skills/diagnostics placement.
- [ ] Normal assistant-first layout.

## 4) File-by-file migration audit questions
Before copying any private files, answer:
- [ ] Which files are new in private version?
- [ ] Which files replace current GitHub files?
- [ ] Which files should be merged (surgical integration) instead of replaced?
- [ ] Does private `App.tsx` diverge from public `src/App.tsx`? If yes, list exact behavior deltas.
- [ ] Does private `OnboardingFlow` replace current onboarding or augment it?
- [ ] Does private UI already define tier routing?
- [ ] Does private UI use different state names for theme, model mode, voice mode, tier, or personality?
- [ ] Does private UI duplicate existing services/contracts already in this repo?
- [ ] Does private UI call runtime mutation or self-evolution actions directly?

## 5) Safety gates before migration
All must be explicitly verified before any runtime mount:
- [ ] Origin controls are not visible to Normal/Tactical surfaces.
- [ ] `OriginEvolutionDashboardShell` mounts only inside Origin / Creator path.
- [ ] Approve/promote/rollback controls are not active without explicit governance wiring.
- [ ] No `evolutionService` `mutate`/`commit` path is called from UI.
- [ ] No optimizer execution path is added in LucaOS core runtime.
- [ ] Voice routing remains behind existing provider/runtime flags.
- [ ] Computer-use actions remain permission-gated.
- [ ] Local model install/download paths require explicit user consent.
- [ ] BYOK keys are not stored insecurely.
- [ ] User tier source/confidence is explicit using `LucaUserTierContext`.

## 6) Recommended migration order
1. Import private onboarding as isolated components only (not mounted).
2. Add tier-routing shell using `LucaUserTier` with no privileged actions.
3. Mount Normal UI first.
4. Mount Tactical UI with safe diagnostics/tools only.
5. Mount Origin UI shell in read-only posture.
6. Connect `OriginEvolutionControlService` snapshots as read-only data.
7. Add guarded actions only after explicit approval/promotion policy PR.
8. Run desktop/local QA for voice/model download flows.

## 7) Conflict risk map
### High-risk files/areas
- `src/App.tsx`
- `src/components/Onboarding/*`
- `src/components/layout/*`
- `src/context/AppContext*`
- `src/services/settingsService*`
- `src/hooks/app/*`
- `src/services/voice*`
- `src/services/evolutionService.ts`

### Low-risk files/areas
- New docs.
- Isolated UI components not mounted.
- Pure types/contracts.
- Tests.

## 8) Explicit non-goals
- Do **not** merge private `App.tsx` blindly.
- Do **not** delete current voice runtime upgrades.
- Do **not** bypass tier gates.
- Do **not** expose Origin controls.
- Do **not** enable self-evolution runtime mutation.
- Do **not** run optimizer in core runtime.
- Do **not** introduce persistence for evolution without policy decisions.

## 9) Update references
This checklist should be read with and linked from:
- `docs/luca-user-tier-ui-integration-contract.md`
- `docs/luca-user-tier-contract.md`
- `docs/lucaos-self-evolution-repo-boundary.md`

## Tier Routing Shell Contract Checkpoint (2026-05-28)

- ✅ Routing contract added for Origin/Tactical/Normal/Unknown shell intent mapping.
- ✅ Contract-only helper layer (no render path integration).
- ✅ No `App.tsx` modifications.
- ✅ No Origin controls exposed.
- ✅ Future private MacBook migration can bind shell components to this contract in a later isolated PR.

## 2026-05-28 migration bridge update
- Tier shell stubs are isolated-only placeholders (not mounted).
- Tier routing preview adapter is pure metadata only.
- Onboarding handoff is contract-only.
- Origin dashboard snapshot adapter is read-only display data only.
- Private UI import map guides future MacBook migration.
- No App.tsx wiring, no Origin control exposure expansion, no runtime behavior change.
