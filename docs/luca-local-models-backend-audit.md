# Luca Local-Models Backend — Audit & Stabilization Plan

**Type:** Audit + plan (documentation-only)
**Status:** Read-only audit. No source/runtime/UI/model behavior changes. Assesses the current local-model backend for the new scope (import a curated static LocalAI catalog into Luca's registry, keep Luca's runtimes; desktop-local + remote-endpoint connection) and recommends rebuild-vs-refine before any code.
**Date:** 2026-06-25

Read together with:
- `docs/luca-onboarding-local-intelligence-setup-spec.md` (P5b UX)
- `docs/luca-premium-onboarding-functional-handoff-map.md`
- `src/services/ModelManagerService.ts`, `src/services/onboarding/LocalProvisioningService.ts`
- `src/services/llm/ModelRegistry.ts`, `src/services/llm/ProviderFactory.ts`, `OpenAIAdapter.ts`
- LocalAI: https://github.com/mudler/LocalAI · gallery https://models.localai.io

> Decisions driving this audit: **catalog import only** (keep Luca's runtimes) · **curated, static** subset · **desktop + remote endpoint** · **audit first.**

---

## 1. What exists today (inventory)

| Surface | Role | Runtime | State |
| --- | --- | --- | --- |
| `services/ModelManagerService.ts` | Desktop local model catalog + manager (hand-curated list w/ `VERIFIED_OLLAMA_TAGS`) | **Ollama** / "internal" | Developed (~1.2k lines) |
| `services/onboarding/LocalProvisioningService.ts` | Onboarding desktop provisioning: plans (brain/stt/tts/vision/memory), hardware resolution, download, resume/recovery | Ollama via ModelManager | Developed (~560 lines) |
| `services/llm/ModelRegistry.ts` (`OFFLINE_MODELS`) | **Browser** in-browser inference catalog | WebLLM / MediaPipe / ONNX | Small, hand-curated |
| `services/llm/ProviderFactory.ts` + adapters | Provider routing (OpenAI/Anthropic/Gemini/Grok/DeepSeek/Local/WebLLM) with a `baseUrl` override | OpenAI-compatible + others | Developed |
| Onboarding panels (`HardwareScanPanel`, `OllamaInstall/Wake`, `LocalPlanReview`, `Provisioning`) | The provisioning UI | Ollama flow | Ollama-specific |

## 2. The root stability issue

Luca does not have *one* local-model registry — it has **two parallel hand-curated catalogs** (Ollama desktop in `ModelManagerService`, WebLLM browser in `ModelRegistry`) plus provider adapters, with model lists maintained by hand in multiple places. That fragmentation — not any single broken file — is what makes "industrial-strong" hard: adding a model means editing several lists, and there is no single source of truth or a registry that multiple runtimes feed into.

**Good news for the chosen scope:** a remote OpenAI-compatible endpoint (i.e. a LocalAI server) is **already largely supported** — `ProviderFactory` accepts a `baseUrl` override and `settings.brain.customOpenAiCompatibleApiKey/BaseUrl` exist. LocalAI speaks the OpenAI API, so "connect to LocalAI (local or remote)" reuses `OpenAIAdapter` + `baseUrl`. We do **not** need a new runtime.

## 3. Rebuild vs refine — verdict per component

| Component | Verdict | Why |
| --- | --- | --- |
| `LocalProvisioningService` (Ollama desktop) | **Refine, keep** | Plans, hardware resolution, resume/recovery are real and working; add a LocalAI/endpoint path alongside Ollama, don't rebuild. |
| Provider layer (`ProviderFactory` + `OpenAIAdapter`) | **Reuse** | `baseUrl` override already enables local/remote LocalAI. Add a thin connection/health layer, not a new adapter. |
| Two parallel catalogs (`ModelManagerService` Ollama + `ModelRegistry` WebLLM) | **Refactor toward one registry** | Introduce a single typed registry source that runtimes read from; migrate the two lists into it incrementally. This is the core stability win. |
| Onboarding provisioning panels | **Refine** | Add a calm "connect to LocalAI / remote endpoint" path (per the P5b spec); keep the Ollama hardware-scan path. Not a full rebuild. |
| LocalAI catalog | **Add new (curated, static)** | Import a vetted subset of LocalAI gallery entries as OpenAI-compatible model descriptors. |

**Headline:** *refine + unify*, not rebuild. The pieces are individually decent; the missing thing is a single registry abstraction and a stable connection layer for the OpenAI-compatible (LocalAI) path.

## 4. Proposed target shape (for the chosen scope)

1. **Unified model registry** (`LucaModelRegistry`): one typed catalog with a `source`/`runtime` discriminator (`ollama` | `webllm` | `openai-compatible`), `license`, size, capabilities. Existing Ollama + WebLLM lists migrate in over time; the curated LocalAI entries land as `openai-compatible`.
2. **Curated static LocalAI slice:** a vetted subset of the LocalAI gallery, captured as a static data file with provenance (source URL, license per model), each described as an OpenAI-compatible model served by a LocalAI base URL. No live dependency on `models.localai.io`.
3. **Connection/health layer:** a small stable client over `OpenAIAdapter` for a LocalAI endpoint — base-URL config (localhost for desktop, user URL for remote), health probe, model-availability check, timeouts/retry, clear degraded states. This is the "industrial-strong" part.
4. **Desktop vs remote:** desktop can run/point at a local LocalAI; web/Capacitor point at a user-configured remote URL (reusing `customOpenAiCompatibleBaseUrl`), with the same health layer and honest unavailable states.

## 5. Open decisions before building (need your call)

1. **Where does the curated LocalAI catalog physically connect on desktop?** (a) Assume the user runs LocalAI themselves and we just connect; (b) Luca bundles/manages a LocalAI server lifecycle (much heavier — install/start/stop). *Recommend (a) first* (connect-only), bundle later if wanted.
2. **Curated subset criteria:** who/what defines "vetted"? (e.g. a fixed allowlist of ~10–20 well-tested models with permissive licenses, sizes labeled). *Recommend a small reviewed allowlist to start.*
3. **Registry unification appetite:** do the existing Ollama + WebLLM catalogs migrate into the unified registry now, or does the LocalAI slice land first and unification follow? *Recommend: land the LocalAI slice + connection layer first (immediate value), unify incrementally.*
4. **License/attribution:** confirm we record per-model license + source provenance in the catalog (some gallery models are non-commercial). *Recommend yes, mandatory field.*

## 6. Proposed staged PRs (after decisions)

- **L1** — pure `LucaModelRegistry` type + curated static LocalAI catalog slice (data + license/provenance), dormant + tested.
- **L2** — pure LocalAI connection/health resolver over the OpenAI-compatible `baseUrl` (probe/availability/timeouts), dormant + tested.
- **L3** — wire the connection layer + catalog behind settings/endpoint config (reuse `customOpenAiCompatibleBaseUrl`).
- **L4** — refine the P5b provisioning UI to offer the LocalAI/endpoint path alongside Ollama.
- **L5** — incremental registry unification (migrate Ollama/WebLLM lists), then QA across desktop/remote.

### L5 progress note

`src/services/llm/lucaLocalCatalogBridge.ts` provides a merged **read** view over:

1. `lucaUnifiedModelRegistry` (ollama / webllm / openai-compatible),
2. `local-models/LocalModelCatalog` (runtime facade including cortex/mediapipe),
3. `ModelRegistry.OFFLINE_MODELS` (browser install metadata).

`ModelRegistryService.getModels()` prefers `getOfflineModelsFromLocalCatalog()`. Model Manager + OfflineModelManager display metadata use `resolveLocalCatalogMetadata()` only (license, sourceUrl, RAM, labels). Ollama status/delete/canary/generate paths go through runtime facade helpers. Operational download status remains in ModelRegistry; desktop install status remains in ModelManagerService. Parallel source lists are still the write-side data files; product UI should not import them directly.

## 7. Rules honored

Documentation-only audit. `git diff --check` clean. Adds one doc under `docs/`. No source, runtime, UI, model, provider, provisioning, or onboarding behavior changes; existing services are referenced for assessment, not modified.
