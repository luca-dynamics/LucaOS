# 📜 **LucaOS Core Platform & Product Principles**

**Status:** Immutable Foundation Principles  
**Scope:** Whole Platform (Monorepo, Subsystems, & Product Design)

---

## 🌟 **North Star Compass Directive**

> **"Every feature must strengthen the illusion of one continuous intelligence rather than expose a collection of independent AI services."**

---

## 🏛️ 1. Core Principles Hierarchy

### 🌌 Principle I: Intelligence Before Interface
> **Luca is an embodied persistent cognitive intelligence, not a chatbot or a decorative widget.**

The visual interface (<LucaOrb />, light face, spatial hologram, widget, or robot) exists to project an underlying cognitive presence, not to create interactive visual effects.

---

### 🎨 Principle II: Cognition Before Embodiment
> **Cognition, presence, identity, and memory must never depend on any specific visual embodiment.**

Visual and spatial embodiments are pure presentation subscribers. They consume `ExpressionState` and render frames. Embodiment renderers MUST NEVER contain conversation, memory, reasoning, or tool logic.

---

### 🛡️ Principle III: Renderer Independence
> **`ExpressionState` MUST NEVER reference specific graphics technologies or embodiment renderers.**

`ExpressionState` is 100% renderer-agnostic. It carries only cognitive dynamics (`energy`, `coherence`, `valence`, `expressiveness`, `chromaShift`, `gazePoint`). It must never import or reference `Orb`, `Shader`, `Canvas`, `ThreeJS`, `WebGPU`, `Face`, or `Avatar`.

---

### 🧠 Principle IV: Identity Before Reasoning
> **Luca's identity is distinct from the underlying AI reasoning provider.**

Reasoning providers (OpenAI, Claude, Gemini, DeepSeek, or local models) are interchangeable problem-solving engines. They operate under a centralized `IdentityModel` defining Luca's personality, communication style, safety doctrine, and social calibration.

---

### ⚡ Principle V: Event-Driven Architecture & Contract Freeze
> **Subsystems communicate via asynchronous, typed events on the EventBus.**

Direct cross-package coupling is strictly prohibited. Domain events, public contracts, ADRs, and state machine reducers are frozen baseline infrastructure.

---

### 🔐 Principle VI: User Trust & Explicit Permission Gates
> **Actions with user side-effects require explicit permission gates.**

Read-only operations execute automatically. Personal read/write, system terminal, and financial actions require transparent approval policies managed by `ToolPermissionPolicy`.

---

### 🧩 Principle VII: Capability Through Composition
> **Complex platform behaviors emerge from composition, not monoliths.**

Subsystems (`@luca/audio`, `@luca/presence-engine`, `@luca/conversation-engine`, `@luca/devtools`) are composed deterministically inside `LucaRuntimeProcess` using fluent dependency injection.
