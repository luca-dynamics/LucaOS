# Model Router Architecture Audit + Hardcoded Fallback Cleanup Plan

## Current Architecture

LucaOS does not yet have one state-of-the-art model router. It has several partially overlapping routing surfaces:

- `src/services/llm/ProviderFactory.ts` is the main chat/provider adapter factory. It resolves Luca Prime, BYOK, and local routes before constructing Gemini, Anthropic, OpenAI-compatible, Grok, DeepSeek, or local adapters.
- `src/types/modelRouting.ts` defines the current readiness-facing model mode, provider kind, capability, fallback policy, and route decision types used by settings/onboarding readiness.
- `src/services/models/ModelReadinessResolver.ts` resolves readiness for chat, vision, embedding, STT, and TTS based on settings, local model catalog state, local runtime availability, and provider-key state.
- `src/services/ModelManagerService.ts` owns the desktop local-model catalog, Ollama tags, runtime type, catalog warnings, and local model status refresh.
- `src/services/llm/ModelRegistry.ts` owns a separate offline model catalog for browser/mobile-style offline models.
- `src/services/onboarding/OnboardingModelModeCoordinator.ts` writes Luca Prime, Local, and BYOK choices into settings and asks the readiness resolver for route warnings.
- `src/services/voice/VoiceProviderRouter.ts` is a voice-specific scaffold router with local/cloud/BYOK preference order and no live model execution by itself.
- `src/config/brain.config.ts` defines global cloud defaults and provider model maps.
- `src/config/vision.config.ts` defines vision-specific planning, insight, and action model choices, including an action fallback.
- `src/services/settingsService.ts` defines persisted settings defaults, model-provider settings, and one-time hardware-aware migrations.

This PR adds a static audit inventory and a lightweight future contract in `src/model-router/` without changing runtime provider selection. Provider Hub registry foundation has now started in `src/model-router/providerHubRegistry.ts`, Provider Hub readiness foundation has started in `src/model-router/providerHubReadiness.ts`, and a read-only settings snapshot adapter has started in `src/model-router/providerHubSettingsSnapshot.ts`, so LucaOS can describe managed, connected cloud, router, local runtime, custom, disabled, and unknown providers before runtime wiring changes.

## Known Entry Points

| Entry point | Current responsibility | Audit note |
| --- | --- | --- |
| `ProviderFactory.resolveProvisioningRoute` | Converts brain settings/persona/provider override into Luca Prime, BYOK, or Local route. | Chat route decisions happen close to adapter construction. |
| `ProviderFactory.createProviderForRoute` | Instantiates provider adapters. | Unknown provider fallback silently creates a Gemini adapter. |
| `resolveModelRouteFromSnapshot` | Pure readiness resolver for local/BYOK/Luca Prime route status. | Useful foundation, but not the sole runtime route authority. |
| `modelManager` | Local model definitions, Ollama tags, catalog readiness, and refresh APIs. | Catalog includes memory requirements but routing does not yet use a central hardware-fit score. |
| `OnboardingModelModeCoordinator` | Persists mode-specific settings for Luca Prime, Local, and BYOK. | Writes hardcoded provider model choices during onboarding. |
| `VoiceProviderRouter` | Chooses voice backend kind by preference and capability. | Voice route trace is separate from chat/model readiness trace. |
| `visionConfig` | Chooses vision task models and ui-tars action fallback. | Vision fallback is not expressed as a typed shared fallback policy. |
| `settingsService` | Defaults/migrations for brain, memory, voice, and local preference settings. | Several defaults are duplicated as string literals. |

## Known Fallbacks

| Classification | File/context | Model/reference | Risk |
| --- | --- | --- | --- |
| Provider compatibility alias | `src/services/llm/ProviderFactory.ts` Groq provider override | `llama3-70b-8192` | Medium: runtime alias is useful but should be metadata-driven. |
| Unsafe hardcoded runtime fallback | `src/services/llm/ProviderFactory.ts` unknown provider branch | `BRAIN_CONFIG.defaults.brain` via Gemini adapter | High: silent provider change lacks approval/trace. |
| Safe default / duplicated literal | `src/services/models/ModelReadinessResolver.ts` Prime STT | `cloud-gemini` | Medium: readiness default is understandable but not centrally typed. |
| Legacy setting default | `src/services/settingsService.ts` default voice STT | `cloud-gemini` | Medium: local default mode coexists with cloud STT literal. |
| Hardware migration fallback | `src/services/settingsService.ts` Intel Mac/Windows migration | memory/STT/vision/brain cloud defaults | High: mutates settings outside shared route trace. |
| Unsafe vision runtime fallback | `src/config/vision.config.ts` action model fallback | `gemini-2.0-flash` | High: fallback has no shared policy, approval, or diagnostics trace. |
| BYOK provider defaults | `src/services/onboarding/OnboardingModelModeCoordinator.ts` | Gemini/OpenAI/Claude/Grok literals | Medium: provider choices live outside capability metadata. |
| Local catalog candidate fallback | `src/services/models/ModelReadinessResolver.ts` local candidate lookup | first ready/category model | High: no shared hardware/privacy/task-fit score. |

Additional UI-only/test/documentation examples exist in trading, docs, and tests. They should not be treated as runtime-critical unless they feed provider execution.

## Provider / Local / BYOK Flows

### Luca Prime

Luca Prime currently means managed cloud mode in settings (`cloud-managed`) and is normalized to `luca-prime` in `src/types/modelRouting.ts`. Readiness uses Gemini key state with environment fallback enabled. Provider construction passes empty API keys to adapters so managed-key fallback remains inside adapter/client behavior.

### Local

Local mode currently uses `local-luca`, local model IDs, `preferOllama`, `LOCAL_*_MODEL_IDS`, `modelManager`, and runtime availability checks. Local catalog entries include platform, memory requirement, runtime (`ollama` or `internal`), and `ollamaTag`, but route selection does not yet use a central hardware-fit evaluator.

### BYOK

BYOK currently uses `useCustomApiKey`, provider inference from selected model strings, provider-key state checks, and onboarding provider-to-model maps. The route can report missing keys, but provider capability metadata and compatibility aliases are not centralized.

## Subsystem Consumers

- **Chat/brain:** `ProviderFactory`, `ModelReadinessResolver`, settings brain defaults, and local model catalogs.
- **Voice:** `VoiceProviderRouter`, voice provider readiness helpers, voice onboarding bridges, settings voice provider/STT/TTS fields, and `ModelReadinessResolver` STT/TTS readiness.
- **Vision:** `visionConfig`, settings brain vision model, computer-use/visual systems that consume vision settings.
- **Memory/embedding:** settings memory provider/model, brain memory/embedding defaults, Personal Intelligence memory layers, and readiness embedding capability.
- **Tools/skills/code/tool planning:** agent/tool orchestration can indirectly depend on the active provider/model but lacks a dedicated task-type route contract today.
- **Onboarding/settings/dashboard:** onboarding mode coordinator, Settings Model Manager tab, brain/settings panels, and dashboard disclosure/readiness surfaces.
- **Operation Center/diagnostics:** current diagnostics can normalize statuses, but model route decisions are not emitted as a first-class trace.

## Risk Register

| Risk | Severity | Why it matters | Proposed mitigation |
| --- | --- | --- | --- |
| Silent cloud fallback | High | A provider miss can become a Gemini/Luca Prime call without explicit route trace. | Typed fallback policy with approval/key/network flags. |
| Local fallback without hardware fit | High | Heavy local models may be selected or recommended on unsuitable devices. | Hardware-fit evaluator using RAM/VRAM/runtime/platform/task type. |
| Split chat/voice/vision routing | High | Different subsystems encode provider preference differently. | Shared `LucaModelTaskType`, provider type, and route trace. |
| BYOK string inference | Medium | Provider readiness depends on model-name heuristics. | Provider capability registry and explicit BYOK route metadata. |
| Duplicated cloud defaults | Medium | Defaults drift across config, settings, onboarding, and readiness. | Central fallback/default policy records. |
| Missing Operation Center trace | Medium | Users/operators cannot explain why a fallback happened. | Emit `LucaModelRouteTrace` after central router migration. |
| Settings migrations mutate routes | Medium | One-time migrations rewrite model choices without durable decision provenance. | Store migration route trace and use fit evaluator. |

## Recommended Migration Plan

1. **Centralize Model Router Contract** — started now with `src/model-router/modelRouterContract.ts`.
2. **Replace scattered fallback constants with typed fallback policy** — deferred until policy can be integrated without changing behavior.
3. **Add provider capability registry** — started with a side-effect-free Provider Hub registry that includes provider aliases, capabilities, key requirements, cost tier, latency posture, privacy posture, categories, and supported task types; runtime consumers remain deferred. A pure Provider Hub readiness evaluator and read-only settings snapshot adapter have also started so future settings/onboarding code can pass explicit key/base-url/runtime availability facts into deterministic connection snapshots without changing runtime execution, writing settings, or instantiating adapters.
4. **Add hardware-fit evaluator for local models** — evaluate RAM, VRAM, runtime availability, platform, privacy, and task type before local recommendations.
5. **Add BYOK readiness evaluator** — separate key availability, provider compatibility, user approval, and requested task support.
6. **Add Luca Prime / Local / BYOK route decision helper** — make pure route decisions before adapter construction or settings writes.
7. **Add Operation Center route trace** — surface requested task type, route mode, provider type, model, fallback, privacy, hardware, latency, cost, and requirements.
8. **Migrate onboarding and settings to shared contract** — replace hardcoded onboarding/default writes with typed route decisions.
9. **Migrate voice / vision / memory / tool planning routes** — map subsystem-specific route requests into the shared contract.
10. **Remove unsafe hardcoded fallback behavior** — only after typed policy, tests, diagnostics, and compatibility migration are in place.

## Operation Center / Diagnostics Plan

Future route decisions should emit a `LucaModelRouteTrace` containing:

- requested task type
- selected route mode
- selected provider type
- selected model
- fallback used or not
- fallback reason
- privacy fit
- hardware fit
- latency fit
- cost tier
- requires approval/download/key
- `sideEffectsPerformed: false` for pure route-planning helpers

This PR defines the trace shape only. It does not wire runtime tracing.

## Deferred Work

This PR intentionally does **not** rewrite runtime routing, delete fallbacks, alter provider keys, change local downloads/Ollama behavior, change Luca Prime/BYOK behavior, mutate user settings, or call external model APIs. Follow-up PRs should migrate one route surface at a time behind tests and diagnostics.
