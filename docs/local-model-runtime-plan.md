# LucaOS Local Model Runtime Plan

LucaOS currently integrates local models through several paths: Electron-managed Ollama setup, Python Cortex/`llama-cpp-python`, browser/mobile WebLLM and MediaPipe models, and custom OpenAI-compatible endpoints. The target architecture is a central local-model runtime that keeps those options but gives them shared contracts, admission control, leases, diagnostics, and model catalog metadata.

## Osaurus Reference Boundary

Osaurus does **not** use Ollama as its first-party default local runtime. Its first-party local path is a native Apple Silicon MLX/vMLX runtime that owns model lifecycle, batching, cache behavior, parsing, and runtime stability. Osaurus treats Ollama/LM Studio-style endpoints as compatible external providers, not as the core local runtime.

For LucaOS, Ollama is therefore a pragmatic bootstrap runtime, not the architectural end state. It gives LucaOS a stable desktop local-model path while the central runtime contracts, diagnostics, leases, and future native/Cortex runtime mature.

## Phase 1: Foundation

- Add shared local model request/response/event types.
- Add a central catalog for known local models across Ollama, Cortex, WebLLM, and MediaPipe.
- Add request admission so local inference cannot be oversubscribed by default.
- Add model leases so future model unload/switch logic can wait for active generations to drain.
- Do not change existing runtime behavior in this phase.

## Phase 2: Ollama Bootstrap Runtime

- Wrap existing Ollama install/start/pull/status behavior in an `OllamaRuntime` adapter.
- Use Ollama as the stable bootstrap desktop runtime while keeping the runtime registry capable of selecting Cortex, OpenAI-compatible endpoints, WebLLM, MediaPipe, or a future native runtime.
- Preserve the existing `LocalLLMAdapter` public API while moving implementation behind the runtime facade.

## Phase 3: Diagnostics

- Expose runtime health, active request counts, active leases, selected model, and last local error.
- Add a UI/debug surface after the service snapshot is stable.

## Phase 4: Cortex Runtime

- Wrap Cortex OpenAI-compatible endpoints behind a managed runtime adapter.
- Keep Cortex experimental until it has streaming, cancellation, and server-side active-generation protection.

## Phase 5: Native Runtime Direction

- If LucaOS needs Osaurus-class local runtime ownership, add a native runtime lane rather than treating Ollama as the final default.
- Candidate lanes include a hardened Cortex/`llama-cpp` service, a platform-native MLX path on macOS, or another owned runtime with explicit lifecycle, cache, parser, and memory controls.

## Phase 6: Call-site Migration

- Migrate ad hoc provider detection into the shared runtime registry.
- Start with frontend local chat flows, then server-side routes such as trading debate.
