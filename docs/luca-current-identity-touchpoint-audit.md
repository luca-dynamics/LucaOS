# Luca Current Identity Touchpoint Audit
Date: 2026-05-28 (UTC)
Status: Repo audit plus runtime persona/prompt identity adapter. Chat/voice prompt text is refined through existing persona helpers; no onboarding persistence, settings/memory writes, model-router changes, UI routes, or evolution runtime actions changed.

## Search method
Codex searched the repository for: `persona`, `personality`, `identity`, `system prompt`, `systemPrompt`, `tone`, `onboarding preferences`, `voice persona`, `assistant name`, `Luca Prime`, `BYOK`, `local models`, `memory profile`, and `user profile` across `src` and `docs`, excluding disallowed UI files.

## Current identity/persona touchpoints

| Area | Current files/signals | Finding | PR stance |
|---|---|---|---|
| Mutable personality runtime | `src/services/personalityService.ts`, `src/types/lucaPersonality.ts` | Existing runtime manages evolving traits, relationship stage, milestones, tone style, localStorage persistence, and prompt-context text. | Preserve now. Do not refactor because it writes persistence and affects live prompts. New identity contracts are future replacement/wrapper candidates. |
| Onboarding | `src/services/onboarding/OnboardingSetupService.ts`, `src/types/lucaOnboardingTierHandoff.ts`, docs onboarding specs | Onboarding currently initializes personality for operator and has tier handoff contracts for model mode, interaction mode, and personality summary. | Defer wiring. Future onboarding can populate identity/profile snapshots after explicit persistence policy. |
| Memory profile | `src/services/memory/MemoryContracts.ts`, `src/services/memory/MemoryTierMapping.ts`, `docs/luca-memory-contract-map.md` | Memory has `profile` tier/category mapping that can represent user/profile/persona memory. | Preserve. New helpers allow memory-backed relationship summary only when source is `memory_profile`; no memory writes added. |
| Awareness/fallback greetings | `src/services/awarenessService.ts` | Contains persona-specific local fallback greetings and hardcoded persona modes such as `RUTHLESS`, `HACKER`, `ENGINEER`, `ASSISTANT`, `LUCAGENT`. Some strings imply strong local core presence. | Do not change in this PR because it changes runtime greetings. Future migration should map persona names into tier persona contract and review unsafe/over-personified wording. |
| Diagnostics/settings persona | `src/services/diagnosticsService.ts`, `src/services/settingsService*` | Diagnostics reads `settings.general?.persona` and reports model/provider status including Luca Prime/BYOK. | Do not touch settings service or runtime diagnostics behavior. |
| Conversation/operator profile types | `src/types/conversation.ts`, `src/types/operatorProfile.ts` | Types include identity/profile/personality/tone fields. | Preserve and later map to companion profile fields with compatibility aliases if needed. |
| Voice docs/runtime contracts | `docs/voice-runtime-absorb-plan.md`, `src/services/voice/*` | Voice architecture references Luca Prime/Local/BYOK routing and onboarding bridges. | No voice runtime changes. Future voice can consume compact identity snapshots. |
| Absorb architecture docs | `docs/absorb/Luca_Absorb_Architecture_v12.md` | Describes identity, personality, OpenHuman/Vellum-style layers, persistent AI presence, and future embodiment. | New docs specialize that architecture into a safe contract-only identity foundation. |
| User tiers | `src/types/lucaUserTier.ts`, user-tier docs | Origin/Tactical/Normal/Unknown are already pure tier contracts. | New identity helpers consume tier names without altering tier routing or UI. |

## Duplicate or unclear definitions
- `src/types/lucaPersonality.ts` and `src/services/personalityService.ts` define a rich mutable personality system that predates the new canonical identity contract.
- `src/types/operatorProfile.ts` and `src/types/conversation.ts` define profile/identity/tone shapes that overlap with companion profile fields.
- Tier docs mention personality/preferences but did not previously define the canonical companion contract.
- Awareness fallback greetings duplicate persona mode behavior with hardcoded strings instead of a shared contract.

## Unsafe or unclear claims to review later
- Persona runtime language such as “evolving personality,” “profile continuity,” and local fallback phrasing can be acceptable only with visible memory/source disclosure and careful boundaries.
- Fallback greetings with over-personified availability or unsupported local-control phrasing should be reviewed before becoming part of canonical companion UX.
- Any “relationship” language should avoid emotional dependency, romance, fake longing, or claims of human feelings.

## Hardcoded persona strings
Current hardcoded persona modes include `RUTHLESS`, `HACKER`, `ENGINEER`, `ASSISTANT`, and `LUCAGENT`. These should not be removed blindly because runtime services may depend on them. Future migration should map them into `LucaTierPersona` behavior or compatibility aliases.

## Runtime behavior intentionally not changed in this PR
- `personalityService` storage, trait evolution, relationship progression, and prompt context generation.
- Onboarding initialization behavior.
- Awareness fallback greetings.
- Voice runtime/provider routing.
- Model router/provider behavior.
- Settings or memory persistence.
- Self-evolution mutation/optimizer paths.

## Recommended replacement plan
1. Keep the new `src/services/identity/*` contract as the canonical target.
2. Add read-only adapters from existing personality/operator profile types into identity snapshots in a future PR.
3. Add prompt integration only after tests prove no hidden memory or fake emotion claims are introduced.
4. Migrate hardcoded persona modes into tier persona presentation gradually with compatibility aliases.
5. Add UI/onboarding population only after the private MacBook onboarding architecture is available for comparison.

## Runtime integration follow-up (2026-05-28)
The identity foundation is no longer contract-only for prompt/persona text. `LucaIdentityRuntimeAdapter` now connects the canonical identity, companion profile, and tier persona contracts to safe runtime surfaces.

- `src/config/personaConfig.ts` now prepends canonical identity summaries, tier tone guidance, memory disclosure, forbidden claims, and boundaries to non-dictation persona instructions.
- `src/services/personalityService.ts` now includes canonical identity metadata in personality context and voice system instructions while preserving existing profile persistence behavior.
- `src/services/lucaService.ts` and `src/services/liveService.ts` are preserved but receive improved persona prompt text through their existing `PERSONA_CONFIG` calls.
- No fake human emotion claims or hidden persistent-memory claims are introduced; persistent relationship summaries are disclosed only for explicit `memory_profile` input.
- No provider routing, voice transport, UI route, settings write, memory write, optimizer execution, or evolution mutation was added.
- See `docs/luca-identity-runtime-integration-audit.md` for the current-code classification of replaced, refined, preserved, and deferred touchpoints.


## Awareness and personality refinement follow-up (2026-05-28)
- `src/services/personalityService.ts` now captures previous `lastSeen` before updating it, so return-after-time-away tone changes are based on the actual prior interaction timestamp.
- Personality prompt context keeps the existing evolving profile system but wraps it with canonical Luca identity boundaries, memory disclosure, no hidden memory claims, and no fake human emotion/dependency language.
- Relationship-stage wording now uses safer phrases such as “High-context working relationship” and “Continuity is based on stored/profiled interaction context where available.”
- `src/services/awarenessService.ts` local fallback greetings and awakening prompts now describe Luca as an AI OS agent interface coming online, local fallback as available, and actions as guided/permitted rather than autonomous control.
- Suggestion prompts for Notion, Google Drive, and AI memory import now ask Luca to guide or prepare steps and require permission before browser/system action.
- `src/services/personalityService.test.ts` adds regression coverage for canonical identity context, voice guidance, prior-`lastSeen` calculation order, unsafe wording removal, and softened autonomous-action suggestions.
