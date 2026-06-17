# Provider Hub / Model Mesh Foundation

This document describes the foundation-only Provider Hub layers under `src/model-router/`. They are intentionally typed, deterministic, read-only, and side-effect-free.

## Scope of this foundation

Provider Hub currently has four separate responsibilities:

1. **Registry metadata** in `src/model-router/providerHubRegistry.ts` describes known provider identities, labels, categories, aliases, capabilities, task support, connection posture, and display metadata.
2. **Readiness evaluation** in `src/model-router/providerHubReadiness.ts` applies pure status logic to explicit `LucaProviderHubConnectionSnapshot` values.
3. **Settings snapshot adaptation** in `src/model-router/providerHubSettingsSnapshot.ts` converts explicit, normalized settings/key/runtime-availability inputs into Provider Hub connection snapshots and readiness results.
4. **Configure intent contracts** in `src/model-router/providerHubConfigureIntent.ts` convert registry/readiness/card/view-model state into typed, read-only configure intents for future UI affordances.

This foundation does **not**:

- change runtime model routing or provider execution;
- instantiate provider adapters;
- modify `ProviderFactory` routing behavior;
- change onboarding behavior;
- read or write settings directly;
- read user secrets, environment variables, local storage, IndexedDB, desktop keychains, or runtime process state;
- call provider APIs or other network APIs;
- start Ollama, LM Studio, or internal local runtimes;
- migrate settings;
- rewrite `App.tsx`.

## Registry responsibilities

`src/model-router/providerHubRegistry.ts` defines a stable `LucaProviderHubId` that is separate from the existing higher-level `LucaModelProviderType`. Each provider entry includes display metadata, category, connection posture, optional base URL/documentation URLs, supported task types, capabilities, cost tier, latency fit, privacy fit, notes, and common aliases.

The registry currently represents:

- Luca Prime as the managed premium default (`luca_managed`);
- OpenAI, Anthropic, Google Gemini, xAI Grok, Mistral, DeepSeek, Groq, Together, Fireworks, and Perplexity as connected cloud providers;
- OpenRouter as a router provider;
- Ollama, LM Studio, and the internal local runtime abstraction as local runtime providers;
- custom OpenAI-compatible endpoints as advanced BYOK/custom mode;
- disabled and unknown providers as safe fallback representations for UI, diagnostics, and future migration code.

## Readiness evaluator responsibilities

`src/model-router/providerHubReadiness.ts` adds a pure status layer on top of the registry. Callers provide a `LucaProviderHubConnectionSnapshot` that can say whether a user key is present, a custom base URL is set, a local runtime is available, or the provider has been explicitly disabled. The evaluator combines that explicit snapshot with registry metadata to answer whether the provider is ready, what task types and capabilities it supports, which capabilities are missing, and what user action is required before LucaOS can use it.

The evaluator intentionally does **not** discover connection state. It does not read settings, environment variables, API keys, local storage, IndexedDB, desktop keychains, local runtime processes, or provider APIs. It also does not instantiate provider adapters, start Ollama/LM Studio, call network APIs, persist settings, migrate onboarding state, or modify `ProviderFactory`.

The status model covers ready, missing user key, missing custom base URL, unavailable local runtime, disabled, unknown, unsupported task, and unsupported capability states. Luca Prime is ready without a user key unless explicitly disabled. Connected cloud providers and OpenRouter require a supplied key snapshot. Custom OpenAI-compatible endpoints require both key and base URL snapshots. Local runtime providers require a supplied runtime-available snapshot. Disabled and unknown entries are never ready.

## Settings snapshot adapter responsibilities

`src/model-router/providerHubSettingsSnapshot.ts` is a read-only bridge for future UI surfaces that already have settings/key/runtime information available as plain values. It accepts `LucaProviderHubSettingsSnapshotInput` instead of importing `settingsService` or touching storage. This keeps the adapter deterministic and safe to use in tests, Settings UI, Model Manager, or Operation Center display panels.

The adapter:

- normalizes provider key aliases with `normalizeProviderHubId(...)`;
- returns one `LucaProviderHubConnectionSnapshot` per Provider Hub registry entry in registry order;
- maps provider key presence for OpenAI, Anthropic, Google Gemini, xAI Grok, OpenRouter, custom OpenAI-compatible, and other registry providers when supplied by the caller;
- maps custom OpenAI-compatible base URL presence from an explicit `customBaseUrl` string;
- maps local runtime availability for Ollama, LM Studio, and the internal local runtime from explicit caller-provided booleans;
- maps `disabledProviderIds` to `enabled: false` snapshots;
- stores selected-model metadata on the normalized selected provider snapshot when `selectedProvider` and `selectedModelId` are supplied;
- ignores unknown provider strings safely;
- never mutates the input object.

`createProviderHubReadinessFromSettings(input, options?)` composes the adapter with `evaluateProviderHubReadinessForAll(...)`. It exists only as a convenience for display/readiness surfaces and does not change execution routing.

## Configure intent contract responsibilities

`src/model-router/providerHubConfigureIntent.ts` adds a typed intent boundary for future Provider Hub configuration affordances. It can describe that a provider should be reviewed, a user key should be added, a custom base URL should be set, a local runtime should be started manually, a supported model should be selected, or a provider is unsupported from the current readiness state. These intents are contracts only: they do not save keys, write settings, call provider APIs, test provider connections, instantiate adapters, modify runtime routing, or start local runtimes.

The configure intent helpers are pure and deterministic:

- `createProviderHubConfigureIntent(entry, readiness)` builds an intent from a registry entry and readiness result;
- `createProviderHubConfigureIntentFromCard(card)` builds the same intent from an existing Provider Hub panel card;
- `createProviderHubConfigureIntentsFromViewModel(viewModel)` creates intents for all cards in an existing Provider Hub panel view model;
- `getProviderHubConfigureIntentKind(readiness)` maps readiness state to a safe intent kind;
- `createProviderHubConfigureIntentDiagnostics(intent)` emits safe diagnostics text.

Luca Prime produces a managed review intent and never requests a user API key. Missing cloud keys produce `add_api_key`; missing custom OpenAI-compatible base URLs produce `set_base_url`; unavailable Ollama/LM Studio/local runtimes produce `start_local_runtime`; unsupported task/capability and unknown provider states produce `unsupported`; disabled providers produce a review or unsupported posture based on the readiness state. Every intent carries explicit false flags for side effects, settings writes, provider API calls, and runtime startup.

Configure intent diagnostics may include provider identity, label, category, readiness state, required action, intent kind, supported tasks, capability summaries, and the false side-effect flags. They must not include API keys, raw secrets, environment values, local storage values, request bodies, raw headers, or provider API responses.

## Product architecture boundaries

Provider Hub is not replacing MCP, plugins, or connectors. Provider Hub describes where intelligence can come from and whether an explicit connection snapshot is sufficient for a provider to be considered usable. MCP/plugins/connectors remain the action layer: tools, app integrations, external capabilities, and side-effecting operations.

Luca Prime remains the LucaOS-managed premium default. Connected providers let users bring existing AI subscriptions or provider accounts. BYOK and custom endpoints remain advanced mode. Local runtime entries cover Ollama, LM Studio, and internal local runtimes without starting or managing those runtimes from the registry, readiness evaluator, or settings snapshot adapter.

## Deterministic helper surface

The foundation exposes pure helpers for registry reads, category filtering, task filtering, key-requirement filtering, alias normalization, task support, capability support, connection snapshot creation, readiness evaluation, all-provider readiness evaluation, settings snapshot adaptation, ready-result filtering, action filtering, and deterministic summary counts. These helpers do not read settings or secrets, and they do not perform I/O.

## Migration path

Future PRs can wire this metadata into:

1. Settings UI, Model Manager, and Operation Center as a display-only Provider Hub panel;
2. `ModelReadinessResolver` for provider capability and key/readiness explanations;
3. onboarding and settings UI for Provider Hub discovery and connection state;
4. `ProviderFactory` for metadata-driven provider compatibility without changing behavior until explicitly migrated;
5. voice, vision, memory, code, tool-planning, and long-context route planning;
6. Operation Center route traces so users can see requested task, selected provider, fallback posture, privacy/latency/cost fit, and required actions.

Until those migrations land, the registry, readiness evaluator, settings snapshot adapter, and configure intent contracts remain documentation, typed metadata, and pure read-only bridge utilities only.

## Route decision planner responsibilities

`src/model-router/providerHubRoutePlanner.ts` adds a pure Provider Hub route decision planner before any runtime routing migration. The planner accepts explicit task, capability, preference, connection snapshot, optional manual connection-test result, preferred-provider, allow-flag, and fallback inputs. It returns deterministic candidates and a decision describing which provider would be selected if a future runtime integration chose to honor the plan.

The planner intentionally remains planning-only. It does **not** import or modify `ProviderFactory`, instantiate provider adapters, send prompts to providers, call provider APIs, automatically test connections, save settings, read secrets, read environment variables, use browser storage, start local runtimes, or alter current runtime model routing.

The planner evaluates each registry provider by composing registry metadata with the readiness evaluator, then applies route allow flags and scoring signals:

- ready providers are selected before non-ready providers;
- unsupported tasks or missing required capabilities are excluded from selection;
- `allowCloudProviders`, `allowLocalProviders`, and `allowPaidProviders` can block otherwise known providers;
- `managed_first` boosts Luca Prime;
- `local_first` and `privacy_first` boost ready local runtimes such as Ollama or LM Studio without starting them;
- `lowest_latency` boosts low-latency posture providers;
- `lowest_cost` boosts free, local, and low-cost providers;
- configured model IDs are carried into the selected model field when available;
- manual connection-test `success` improves a provider score;
- manual connection-test `failed` is treated as a safe negative signal, and may block selection when fallback selection is disabled;
- manual connection-test `unsupported` does not block a provider that is otherwise ready;
- a ready and supported preferred provider wins;
- an unavailable preferred provider falls back only when `allowFallbacks` is true;
- if no supported provider is ready but supported providers are configurable, the planner returns `configuration_required`;
- if no provider supports the requested task and capabilities, the planner returns `no_supported_provider`.

Route decision diagnostics are safe JSON text. They include task type, required capabilities, preference, selected provider, selected model ID, candidate/fallback/blocked counts, top planner reasons, and explicit false flags for `sideEffectsPerformed`, `runtimeRoutingChanged`, and `providerApiCalled`. Diagnostics must not include API keys, raw secrets, base URL query strings, headers, request/response bodies, or provider API responses.
