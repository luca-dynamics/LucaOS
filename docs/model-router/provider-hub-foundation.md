# Provider Hub / Model Mesh Foundation

This document describes the foundation-only Provider Hub layers under `src/model-router/`. They are intentionally typed, deterministic, read-only, and side-effect-free.

## Scope of this foundation

Provider Hub currently has three separate responsibilities:

1. **Registry metadata** in `src/model-router/providerHubRegistry.ts` describes known provider identities, labels, categories, aliases, capabilities, task support, connection posture, and display metadata.
2. **Readiness evaluation** in `src/model-router/providerHubReadiness.ts` applies pure status logic to explicit `LucaProviderHubConnectionSnapshot` values.
3. **Settings snapshot adaptation** in `src/model-router/providerHubSettingsSnapshot.ts` converts explicit, normalized settings/key/runtime-availability inputs into Provider Hub connection snapshots and readiness results.

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

Until those migrations land, the registry, readiness evaluator, and settings snapshot adapter remain documentation, typed metadata, and pure read-only bridge utilities only.
