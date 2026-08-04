# ADR-0002: Assistant Interaction Model

**Status:** Accepted  
**Version:** 1.0.0  
**Owner:** LucaOS Product & Interaction Architecture  
**Package:** `LucaOS Core Architecture`  

---

## Context
LucaOS presents the assistant through multiple surfaces (VoiceHUD, Floating Assistant, Lock Screen, Desktop Widget, Onboarding). To ensure consistent behavior, all surfaces derive from a single interaction model rather than implementing independent logic.

---

## Decision
The Assistant Interaction Engine is the canonical behavioral identity of LucaOS. Every UI surface (VoiceHUD, Floating Assistant, Lock Screen, Widgets) is a thin client projection of this single interaction state.

---

## Core Principles

### Principle 1 — One Authoritative Interaction State
At any moment, the assistant exists in exactly one interaction state. Every UI surface observes this state. No component owns its own conversation lifecycle.

### Principle 2 — Rendering Is a Projection of State
The Orb, transcript, suggestion chips, tool cards, typing indicators, and progress UI never determine state. They render the current interaction state.

### Principle 3 — Inputs Are Signals, Not State
Microphone input, keyboard, touch, wake word, camera, and sensors are all **signals**. Signals may request a state transition; they never become the state themselves.

### Principle 4 — Tool Execution Is First-Class
Tool execution is not hidden behind "Thinking." It has its own explicit lifecycle (`Queued`, `Running`, `Streaming`, `Completed`, `Failed`, `Cancelled`).

### Principle 5 — Interruptions Are Native
Interruptions (barge-in) are expected. A user speaking while Luca speaks is a normal transition—not an exception. The interaction model supports interruption natively.

### Principle 6 — Streaming Is Continuous
Responses stream incrementally. UI updates continuously. The system never waits for a complete response before rendering.

### Principle 7 — Surfaces Are Thin Clients
VoiceHUD, Floating Assistant, Widget, Lock Screen, and Desktop all subscribe to the same interaction engine. No surface implements independent assistant behavior.

### Principle 8 — Identity Lives Above Presentation
Assistant identity, conversation timing, motion, speech cadence, and interaction rules are platform behavior. Themes, skins, and layouts change presentation only.

---

## Canonical State Architecture

```text
User Input / Sensors
      │
      ▼
Signal Processing (VAD, STT, Touch)
      │
      ▼
Interaction Engine
      │
      ├── Conversation State Machine
      ├── Tool Execution Lifecycle
      ├── Audio Amplitude / VAD
      ├── Memory Event Stream
      └── Notification Bus
              │
              ▼
Surface Renderers (Thin Clients)
      ├── VoiceHUD Surface
      ├── Luca Orb (@luca/orb)
      ├── Live Transcript Engine
      ├── Tool Execution Cards
      ├── Suggestion Chips
      └── Floating Assistant Mode
```

---

## Relationship to ADR-0001
* **ADR-0001** defines Luca's visual identity (`@luca/orb`).
* **ADR-0002** defines Luca's behavioral identity (Interaction Engine).

Together, they establish the platform contract for every assistant experience in LucaOS.
