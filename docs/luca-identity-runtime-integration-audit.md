# Luca Identity Runtime Integration Audit
Date: 2026-05-28 (UTC)
Status: Runtime persona/prompt identity is now wired where safe; no persistence, model routing, voice provider, UI route, optimizer, or evolution mutation changes.

## Search method
Codex audited `src` and `docs` with ripgrep for: `persona`, `personality`, `identity`, `system prompt`, `prompt builder`, `assistant name`, `Luca`, `tone`, `voice persona`, `onboarding preferences`, `user profile`, `memory profile`, `communication style`, `style preset`, `Luca Prime`, `BYOK`, and `local model`. Broad matches included UI labels and historical docs; the table below classifies files with material identity/persona/system-prompt/voice-persona logic.

## Classification

| Classification | Files | Decision and reason |
|---|---|---|
| replaced_now | `src/config/personaConfig.ts` | The old fallback persona instructions contained duplicated hardcoded Luca identity strings and unsafe/theatrical self-descriptions. They now prepend a canonical Luca runtime identity block from `LucaIdentityRuntimeAdapter`, preserve existing persona modes and tool maps, keep memory/task text passed by existing callers, and avoid provider/model routing changes. |
| refined_now | `src/services/identity/LucaIdentityRuntimeAdapter.ts` | Added the typed runtime adapter that composes `LucaAgentIdentity`, `LucaCompanionProfile`, and `LucaTierPersona` into prompt-safe snapshots for chat, voice, onboarding, system, memory, and unknown surfaces. |
| refined_now | `src/services/identity/index.ts` | Re-exported the runtime adapter so existing identity consumers can import from the identity barrel without breaking current foundation exports. |
| refined_now | `src/services/personalityService.ts` | The existing personality context and voice system instruction now include canonical Luca identity, memory disclosure, forbidden claims, and tier-safe fallback tone metadata. Existing localStorage-backed personality behavior was preserved because it is an established runtime path. One internal fake-emotion-flavored reason string was made neutral. |
| refined_now | `src/services/identity/LucaIdentityRuntimeAdapter.test.ts` | Added pure tests for safe prompt identity, tier tone behavior, memory-profile disclosure rules, forbidden claims, unknown-tier fallback, and compatibility with the existing persona prompt helper. |
| preserved | `src/services/lucaService.ts` | Main chat orchestration still calls `PERSONA_CONFIG` for prompt assembly, so it receives the canonical identity block through the refined helper. The rest of the service was preserved to avoid unrelated tool/runtime/provider changes. |
| preserved | `src/services/liveService.ts` | Voice session assembly still calls `PERSONA_CONFIG` or explicit onboarding/dictation instructions. Persona-based voice prompts now receive canonical identity through `PERSONA_CONFIG`; dictation and explicit instructions remain untouched to preserve strict transcription/onboarding override behavior. |
| preserved | `src/services/hybridVoiceService.ts` | Hybrid voice uses `personalityService.getVoiceSystemInstruction`, which now includes canonical identity metadata. The audio transport/provider runtime was intentionally untouched. |
| preserved | `src/types/lucaPersonality.ts` | Existing personality types and tone-style presets were preserved for compatibility with settings and personality dashboards. |
| preserved | `src/types/lucaUserTier.ts` | Existing tier normalization and capability helpers are used by the adapter; no capability or UI exposure changes were made. |
| preserved | `src/config/buildConfig.ts`, `src/config/layerBoundary.ts` | Build/audience metadata is read only to derive prompt tone fallback in `personaConfig`; no capabilities changed and no Origin-only controls were exposed. |
| preserved | `src/config/themeColors.ts` | Persona UI theme mapping is unrelated to prompt identity and was not changed. |
| preserved | `src/config/voiceTools.ts` | Voice tool definitions are provider/tooling metadata, not persona prompt identity. |
| preserved | `src/services/llm/ProviderFactory.ts` | Luca Prime/BYOK/local model routing is explicitly out of scope; prompt identity does not alter routing. |
| preserved | `src/services/onboarding/OnboardingSetupService.ts` and `src/types/lucaOnboardingTierHandoff.ts` | Onboarding handoff remains contract/persistence-managed by existing code. The new adapter has an onboarding surface for future pure mapping, but no settings or memory writes were added. |
| preserved | `src/services/memory/*`, `src/services/memoryService.ts` | Memory systems remain unchanged. The adapter only discloses memory-profile summaries when the caller explicitly marks `source: "memory_profile"`; it does not write memory. |
| preserved | `src/services/awarenessService.ts` | Local fallback greetings/persona signals were not changed because they are not a central prompt builder and changing them would broaden runtime behavior beyond identity prompt integration. |
| preserved | `src/services/cognitiveDeliberator.ts` | Uses current personality mode for goal heuristics; not a prompt identity builder and not changed. |
| preserved | `src/services/agent/config/personaToolAccess.ts`, `src/services/personaService.ts`, `src/services/PersonaManager.js` | Tool access and persona config loading were preserved to avoid changing capability exposure. Canonical identity is injected at fallback prompt construction, not tool authorization. |
| preserved | `docs/luca-identity-companion-contract.md`, `docs/luca-tier-persona-behavior.md`, `docs/luca-current-identity-touchpoint-audit.md`, `docs/luca-onboarding-tier-handoff-contract.md`, `docs/luca-user-tier-ui-integration-contract.md` | Updated to reflect that the canonical identity foundation is now connected to safe runtime persona/prompt surfaces. |
| deferred_with_reason | React UI surfaces under `src/components/**` and `src/App.tsx` | Broad search found many Luca/persona/tier/UI labels, but wiring UI routes or dashboards would require unrelated UI/tier-gating work and could expose controls. No UI route changes were made. |
| deferred_with_reason | Voice transport/provider internals in `src/services/liveService.ts` and `src/services/hybridVoiceService.ts` | Only persona metadata/prompt text was in scope. Provider transport, audio capture, route authority, and cloud/local voice behavior were not rewritten. |
| deferred_with_reason | Provider/model routing (`src/services/llm/*`, model manager components/docs) | Luca Prime, BYOK, and local model routing are not identity text concerns. Changing them would violate the no-routing-change rule. |
| deferred_with_reason | Evolution/optimizer/self-mutation services and docs | Identity prompt integration must not call `evolutionService` mutate/commit or execute optimizers. Those systems remain untouched. |

## Files changed in this PR
- `src/services/identity/LucaIdentityRuntimeAdapter.ts`
- `src/services/identity/LucaIdentityRuntimeAdapter.test.ts`
- `src/services/identity/index.ts`
- `src/config/personaConfig.ts`
- `src/services/personalityService.ts`
- `docs/luca-identity-runtime-integration-audit.md`
- `docs/luca-identity-companion-contract.md`
- `docs/luca-tier-persona-behavior.md`
- `docs/luca-current-identity-touchpoint-audit.md`
- `docs/luca-onboarding-tier-handoff-contract.md`
- `docs/luca-user-tier-ui-integration-contract.md`

## Runtime behavior now improved
- Chat persona fallback prompts now include a canonical Luca identity summary, tier tone guidance, memory disclosure, forbidden claims, and boundaries.
- Voice persona metadata that flows through `personalityService.getVoiceSystemInstruction` now includes the same canonical identity and safety guidance.
- The adapter is safe for prompt use, has explicit `persistenceEnabled: false`, and only discloses relationship summaries for `memory_profile` sources.

## Preserved behavior
- Existing persona modes, voice names, task/memory prompt inputs, tool maps, and strict dictation behavior remain in place.
- Existing personality localStorage behavior remains unchanged; this PR only improves how identity is read into prompt context.
- No package files, model routing, voice provider runtime, persistence schemas, UI routes, or evolution actions were changed.
