# LucaOS Voice Runtime Absorb Plan

## Why Voice Runtime matters for LucaOS

LucaOS is designed as a two-way operation platform from the first user touchpoint:

- **Text Mode**
- **Voice Mode**

From onboarding onward, both modes must drive the same product capabilities. Voice Mode should operate onboarding and main dashboard flows end-to-end, not as a degraded speech-to-text wrapper. The Voice Runtime must support every operation available in text so users can move between keyboard and spoken interaction without capability loss.

Voice is a first-class Agent OS interface layer. The goal is an industrial, dependable, context-aware AI operating system experience rather than a basic chatbot microphone interaction.

Users must also be able to switch between text and voice at any point in the same flow (onboarding, setup, missions, settings, and runtime operations).

## Target Voice Mode experience

Voice Mode target behavior includes:

- Completing onboarding by voice only.
- Selecting theme and interface preferences by voice.
- Choosing provider path by voice: **Luca Prime**, **Local Models**, or **BYOK**.
- Initiating and confirming local model scans by voice.
- Opening tools, settings, memory, and browser surfaces by voice.
- Running missions and multi-step operations by voice.
- Confirming risky actions by voice with explicit confirmation prompts.
- Interrupting Luca while it is speaking (barge-in) and redirecting in real time.

## Voice Runtime architecture

### 1) Audio Input Layer

- Microphone capture
- Noise suppression
- VAD (voice activity detection) / silence detection
- Wake word / push-to-talk

### 2) STT Layer

- Local STT
- Cloud STT
- BYOK STT
- Multilingual/accent routing

### 3) Voice Understanding Layer

- Transcript cleanup
- Language detection
- Intent extraction
- Context-aware command routing
- Screen/onboarding/dashboard context awareness

### 4) Agent Runtime Layer

- `LucaCommandRuntime`
- Mission engine
- Computer-use runtime
- Browser runtime
- Tools/actions

### 5) TTS Layer

- Local TTS
- Cloud premium voices
- Cloned voices
- Emotional/style voices
- Streaming output

### 6) Voice Memory/Tape Layer

- Voice sessions
- Command history
- Confirmations
- Voice safety audit trail

### 7) Device Output Layer

- Desktop
- Mobile
- Smart TV
- Robot body
- LucaLink devices

## Shared command runtime principle

Text Mode and Voice Mode must converge on the same command/action runtime.

**Text path**

Text input  
→ `LucaCommandRuntime`  
→ actions / UI / runtime

**Voice path**

Voice input  
→ STT  
→ `LucaCommandRuntime`  
→ actions / UI / runtime  
→ TTS

Design rule: do **not** create separate business logic stacks for voice and text. Voice should be an input/output modality around the same command runtime contract.

## OmniVoice-Studio absorb notes

Absorb source:
- <https://github.com/debpalash/OmniVoice-Studio>

Patterns to evaluate and absorb conceptually:

- Multi-engine `TTSBackend` abstraction pattern.
- OpenAI-compatible audio API exposure pattern.
- Streaming TTS WebSocket pattern.
- Capture/dictation endpoint pattern.
- Voice profile/library management pattern.
- Local model installation and status matrix concepts.
- GPU/MPS/CUDA/CPU compatibility handling patterns.
- Local-first privacy posture and offline-capable operation principles.
- Voice diagnostics/logging and operational visibility patterns.
- Optional MCP/server-style integration patterns where useful.

Positioning clarification:

- OmniVoice-Studio is valuable as voice/audio infrastructure inspiration.
- LucaOS target scope is broader: a full voice-controlled AI operating system, not only voice studio tooling.
- Do not copy code directly unless license compatibility and legal review are completed.

## Industrial voice requirements

LucaOS Voice Runtime should satisfy industrial-grade requirements including:

- Realtime STT
- Realtime interruption / barge-in
- Streaming TTS
- Multilingual support
- Accent tolerance
- Emotion/style voice support
- Voice cloning/profile support
- Wake word
- Push-to-talk
- Noise suppression
- Voice command execution
- Voice safety confirmation
- Voice session tape
- Offline/local mode
- Cloud premium mode
- BYOK provider mode
- Cross-device continuity
- Voice-to-computer-use bridge

## Voice Runtime PR sequence

Suggested incremental PR order:

1. Voice Runtime architecture map
2. `VoiceBackend` / `STTBackend` / `TTSBackend` contracts
3. Local voice model registry scaffold
4. OpenAI-compatible audio API scaffold
5. Streaming TTS/STT contract
6. Voice session tape events
7. Voice Mode onboarding bridge
8. Voice HUD runtime bridge
9. Voice-to-computer-use bridge
10. Luca Prime / Local / BYOK voice provider routing
11. Wake word / VAD scaffold
12. Voice safety confirmation policy

## What not to do yet

- Do not add heavy model dependencies yet.
- Do not ship voice cloning without explicit consent and safety rules.
- Do not split text and voice command logic into separate runtime behavior.
- Do not enable risky voice actions without explicit confirmation.
- Do not claim ElevenLabs-level quality before real model benchmarks.
- Do not import/copy OmniVoice-Studio code directly without license review.
