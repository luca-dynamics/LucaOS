# Technical Specification: Interaction State Machine

**Status:** Accepted / Implementation Blueprint  
**Version:** 1.0.0  
**Owner:** LucaOS Product & Interaction Architecture  
**Target Package:** `packages/voice-engine`  
**Governing ADRs:** ADR-0001 (Visual Identity), ADR-0002 (Interaction Model), ADR-0003 (Assistant Event Model)  

---

## 1. Executive Summary
This document specifies the exact runtime behavior, legal state transition triggers, event handling, and public selector API for the `packages/voice-engine` package.

---

## 2. Interaction State Machine Taxonomy

### Persistent States
- `Idle` (Resting / Ready)
- `Listening` (VAD active / capturing user voice)
- `ProcessingSpeech` (Transcribing speech to text)
- `Thinking` (LLM processing / planning)
- `ToolExecution` (Observable tool running)
- `Responding` (TTS & progressive response streaming)
- `Interrupted` (User barge-in event during response)
- `Error` (Failure state with recovery handling)
- `Sleeping` (Low-power background state)

---

## 3. Transition Matrix & Triggers

| From State | To State | Event Trigger | Required Engine Actions |
| :--- | :--- | :--- | :--- |
| `Idle` | `Listening` | `SpeechDetected` / `WakeDetected` | Start VAD, set Orb `Listening`, publish `ListeningStarted` |
| `Listening` | `ProcessingSpeech` | `SpeechEnded` | Stop audio capture, send to STT, publish `ProcessingStarted` |
| `ProcessingSpeech` | `Thinking` | `TranscriptCompleted` | Send prompt to LLM, publish `ThinkingStarted` |
| `Thinking` | `ToolExecution` | `ToolRequested` | Queue tool, publish `ToolExecutionStarted`, set Orb `Thinking` |
| `Thinking` | `Responding` | `DirectLLMResponse` | Start TTS stream, publish `SpeakingStarted`, set Orb `Speaking` |
| `ToolExecution` | `Responding` | `ToolCompleted` | Aggregate tool results, stream final answer, set Orb `Speaking` |
| `ToolExecution` | `Thinking` | `ToolNeedsSubplan` | Trigger secondary planning pass |
| `Responding` | `Idle` | `ResponseCompleted` | Settle audio stream, reset buffers, set Orb `Idle` |
| `Responding` | `Interrupted` | `UserBargeIn` | Immediately abort TTS, cancel stream, publish `ResponseInterrupted`, transition to `Listening` |
| `Error` | `Idle` | `ErrorHandled` | Reset error state, set Orb `Idle` |
| `Sleeping` | `Idle` | `WakeRequested` | Restore engine from low power, set Orb `Idle` |

---

## 4. Sequence Diagram & Flow

```text
User Speech ──> SpeechDetected ──> [Listening]
                                        │
                                   SpeechEnded
                                        │
                                        ▼
                              [ProcessingSpeech]
                                        │
                              TranscriptCompleted
                                        │
                                        ▼
                                   [Thinking]
                                   │        │
                     ToolRequested │        │ DirectLLMResponse
                                   ▼        ▼
                           [ToolExecution] [Responding]
                                   │        │
                       ToolCompleted        │ ResponseCompleted
                                   └────┬───┘
                                        ▼
                                     [Idle]
```

---

## 5. Public UI Selector API (`voice-engine`)

UI surfaces (VoiceHUD, Floating Assistant, Widgets) consume engine state **strictly through read-only selectors**:

```typescript
export function selectInteractionState(): InteractionState;
export function selectOrbState(): OrbState;
export function selectTranscript(): TranscriptSnapshot;
export function selectSuggestions(): string[];
export function selectToolExecution(): ToolExecutionSnapshot | null;
export function selectSpeaking(): boolean;
export function selectThinking(): boolean;
export function selectNotifications(): NotificationSnapshot[];
export function selectMemory(): MemorySnapshot[];
export function selectVoiceLevel(): number;
```

---

## 6. Engineering Invariants & Ownership Matrix

| Layer | Responsibility | Invariant Rule |
| :--- | :--- | :--- |
| **Events (ADR-0003)** | Immutable Facts | Records completed facts (`SpeechDetected`) |
| **State Machine (ADR-0002)** | State Transitions | Authoritative state transitions & turn lifecycle |
| **Runtimes (Audio/LLM/Tool)** | Execution | Executes audio capture, LLM streaming, and tool calls |
| **UI Surfaces (VoiceHUD/Orb)** | Thin Projections | **The UI never derives assistant behavior; it renders state.** |

---

## 7. Non-Goals
* The `voice-engine` package does **not** render DOM/UI components.
* It does **not** manage themes or CSS styles.
* It does **not** execute WebGL/Skia graphics shader passes.
* It does **not** own layout or window positioning.
