# ADR-0003: Assistant Event Model

**Status:** Accepted  
**Version:** 1.0.0  
**Owner:** LucaOS Core Architecture  
**Package:** `LucaOS Core Architecture`  

---

## Context
LucaOS requires a unified, immutable platform event contract. Every surface (VoiceHUD, Floating Assistant, Lock Screen, Widgets) and runtime (Audio, LLM, Tools, Memory) communicates through platform events.

---

## Decision
The Assistant Event Model is the immutable platform event contract for LucaOS. The event pipeline operates strictly on the platform chain:  
**Events (What happened) -> State (What it means) -> Rendering (How it looks)**.

---

## Event Design Principles

### Principle 1 — Events Are Immutable
Events describe facts that have already occurred. They never mutate.

### Principle 2 — Events Are Facts, Not Commands
Events record completed facts (`SpeechDetected`, `ListeningStarted`), never commands (`StartListening`). Commands request work; events record facts.

### Principle 3 — Events Are Timestamped and Enveloped
Every event carries metadata (`id`, `type`, `timestamp`, `sessionId`, `turnId`, `correlationId`, `source`, `payload`).

### Principle 4 — Events Never Render UI
The event system knows nothing about UI components (VoiceHUD, Orb, Transcript, Widgets). It publishes facts.

---

## Universal Event Envelope

```typescript
export type EventSource = "audio-runtime" | "llm-runtime" | "tool-runtime" | "memory-runtime" | "system";

export interface AssistantEvent<T = unknown> {
  id: string;
  type: string;
  timestamp: number;
  sessionId: string;
  turnId?: string;
  correlationId?: string;
  source: EventSource;
  payload: T;
}
```

---

## Event Taxonomy Domains
* **Audio Events**: `ListeningStarted`, `SpeechDetected`, `SpeechEnded`, `MicrophoneStopped`
* **Conversation Events**: `WakeWordDetected`, `TurnStarted`, `TurnCompleted`, `Interrupted`
* **LLM Events**: `LLMStarted`, `LLMTokenStream`, `LLMCompleted`
* **Tool Events**: `ToolExecutionQueued`, `ToolExecutionStarted`, `ToolExecutionProgress`, `ToolExecutionCompleted`, `ToolExecutionFailed`
* **Memory Events**: `MemoryRead`, `MemoryWritten`
* **Lifecycle Events**: `ThinkingStarted`, `SpeakingStarted`, `SpeakingFinished`, `Sleep`, `Wake`

---

## Canonical Event Pipeline

```text
Sensors / Runtimes (Audio, LLM, Tools)
      │
      ▼
ADR-0003: Assistant Event Stream (Immutable Facts)
      │
      ▼
ADR-0002: Interaction Engine (Authoritative State)
      │
      ▼
ADR-0001: Visual Identity & Renderers (@luca/orb, VoiceHUD)
```

---

## Relationship to Platform ADR Architecture
1. **ADR-0003**: Defines **how information flows through the system** (Events).
2. **ADR-0002**: Defines **how Luca behaves** (Interaction Engine & State).
3. **ADR-0001**: Defines **how Luca looks** (`@luca/orb` Visual Identity).
