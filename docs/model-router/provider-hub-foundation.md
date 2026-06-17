# Provider Hub / Model Mesh Foundation

This document introduces the foundation-only Provider Hub registry added under `src/model-router/`. It is intentionally typed, deterministic, and side-effect-free.

## Scope of this foundation

The Provider Hub registry is an intelligence-source metadata layer. It describes LucaOS-managed, connected cloud, router, local runtime, custom, disabled, and unknown provider representations without instantiating adapters or changing routing behavior.

This foundation does **not**:

- change runtime model routing or provider execution;
- instantiate provider adapters;
- read user settings, environment variables, local storage, or API keys;
- call network APIs;
- migrate settings;
- replace Luca Prime, Local, BYOK, Ollama, Gemini, Anthropic, OpenAI, Grok, DeepSeek, voice, vision, memory, or onboarding behavior.

## Registry responsibilities

`src/model-router/providerHubRegistry.ts` defines a stable `LucaProviderHubId` that is separate from the existing higher-level `LucaModelProviderType`. Each provider entry includes display metadata, category, connection posture, optional base URL/documentation URLs, supported task types, capabilities, cost tier, latency fit, privacy fit, notes, and common aliases.

The registry currently represents:

- Luca Prime as the managed premium default (`luca_managed`);
- OpenAI, Anthropic, Google Gemini, xAI Grok, Mistral, DeepSeek, Groq, Together, Fireworks, and Perplexity as connected cloud providers;
- OpenRouter as a router provider;
- Ollama, LM Studio, and the internal local runtime abstraction as local runtime providers;
- custom OpenAI-compatible endpoints as advanced BYOK/custom mode;
- disabled and unknown providers as safe fallback representations for UI, diagnostics, and future migration code.

## Product architecture boundaries

Provider Hub is not replacing MCP, plugins, or connectors. Provider Hub describes where intelligence can come from. MCP/plugins/connectors remain the action layer: tools, app integrations, external capabilities, and side-effecting operations.

Luca Prime remains the LucaOS-managed premium default. Connected providers let users bring existing AI subscriptions or provider accounts. BYOK and custom endpoints remain advanced mode. Local runtime entries cover Ollama, LM Studio, and internal local runtimes without starting or managing those runtimes from this registry.

## Deterministic helper surface

The foundation exposes pure helpers for registry reads, category filtering, task filtering, key-requirement filtering, alias normalization, task support, capability support, and deterministic summary counts. These helpers do not read settings or secrets, and they do not perform I/O.

## Migration path

Future PRs can wire this metadata into:

1. `ModelReadinessResolver` for provider capability and key/readiness explanations;
2. onboarding and settings UI for Provider Hub discovery and connection state;
3. `ProviderFactory` for metadata-driven provider compatibility without changing behavior until explicitly migrated;
4. voice, vision, memory, code, tool-planning, and long-context route planning;
5. Operation Center route traces so users can see requested task, selected provider, fallback posture, privacy/latency/cost fit, and required actions.

Until those migrations land, the registry is documentation and typed metadata only.
