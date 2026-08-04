# 🌌 **LucaOS Embodied Intelligence Philosophy & Architectural Specification**

## 1. Executive Philosophy Statement

> **Luca is not an interface that talks. Luca is a persistent intelligence that perceives, attends, remembers, reasons, and expresses itself through interchangeable embodiments. The Orb is the first embodiment—not the intelligence itself. Any future embodiment must project the same internal cognitive state without altering the underlying intelligence.**

---

## 2. The 10-Layer Cognitive Intelligence Pipeline

Unlike traditional chatbots (`User ➔ Prompt ➔ LLM ➔ Response`), LucaOS separates cognition from presentation via a strict 10-layer cognitive pipeline:

```text
               LucaOS Cognitive Intelligence Pipeline
──────────────────────────────────────────────────────────────────────────

                  1. World & Sensors (Microphone, Camera, System Events)
                                   │
                                   ▼
                  2. Perception (@luca/audio — VAD, Resampling, STT)
                                   │
                                   ▼
                  3. Attention Manager (Saliency & Priority Filtering)
                                   │
                                   ▼
                  4. Working Memory (Short-Term Turn Context & History)
                                   │
                                   ▼
                  5. Identity Model (@luca/conversation-engine — Personality & Calibration)
                                   │
                                   ▼
                  6. Reasoning Engine (@luca/conversation-engine — ModelRouter, ConversationSession)
                                   │
                                   ▼
                  7. Intent Planner (@luca/conversation-engine — ToolSession, ActionGraph)
                                   │
                                   ▼
                  8. Presence Engine (@luca/presence-engine — 8 Cognitive States)
                                   │
                                   ▼
                  9. ExpressionState (Intermediate DTO: Pulse, Motion, Color)
                                   │
                                   ▼
                 10. Embodiment Layer (LucaOrb / Light Face / Spatial Hologram)
```

---

## 3. The Unified Embodiment Contract (`Embodiment.ts`)

Every physical or visual manifestation of Luca implements the standard `Embodiment` interface:

```typescript
export interface Embodiment {
  initialize(): Promise<void>;
  update(state: ExpressionState): void;
  suspend(): void;
  resume(): void;
  destroy(): void;
}
```

Supportable Embodiments:
* `LucaOrb` (Hardware WebGL/SkSL Shader)
* `Light Face` (Embodied Light Character)
* `Spatial Hologram` (WebGPU Holographic Volumetric Mesh)
* `XR Avatar` (WebXR Spatial Character)
* `Desktop Companion` (OS Overlay Widget)
* `Robotic Projection` (Physical Hardware Actuators)

---

## 4. Strict ExpressionState Isolation Rule

> **`ExpressionState` MUST NEVER reference: `Orb`, `Shader`, `Canvas`, `ThreeJS`, `WebGPU`, `Face`, or `Avatar`.**

`ExpressionState` is pure cognitive expression carrying only renderer-agnostic properties:
* `energy` `(0.0 – 1.0)`
* `coherence` `(0.0 – 1.0)`
* `valence` `(-1.0 – +1.0)`
* `expressiveness` `(0.0 – 1.0)`
* `chromaShift` `(0.0 – 1.0)`
* `gazePoint` `{ x, y, z }`

---

## 5. Cognitive States vs. Emotional States

Presence channels represent **cognitive states**, not transient emotional reactions:
* `Attention`
* `Intent`
* `Confidence`
* `Curiosity`
* `Urgency`
* `Mental Load`
* `Engagement`
* `Calmness`

This guarantees that Luca appears consistently attentive, focused, and coherent across all surfaces and embodiments.
