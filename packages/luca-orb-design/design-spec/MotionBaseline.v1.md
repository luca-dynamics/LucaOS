# Motion Baseline v1.0

The canonical behavioral motion specification artifact for all Luca embodiments and renderers.

---

## 1. Frozen Parameters & Operating Envelopes

| Motion Parameter | Baseline Target | Approved Envelope | Decision ID | Status |
| :--- | :---: | :---: | :---: | :---: |
| **`breathingPeriod`** | `4.2s` | `3.8s – 4.6s` | D011 | ✅ Frozen |
| **`floatAmplitude`** | `3.5px` | `3.0px – 4.0px` | D011 | ✅ Frozen |
| **`microTremorFreq`** | `3.7Hz` | `3.2Hz – 4.2Hz` | D011 | ✅ Frozen |
| **`motionInertia`** | `0.880` | `0.850 – 0.920` | D011 | ✅ Frozen |

---

## 2. Intended Perception Table

| Technical Parameter | Frozen Perceptual Effect |
| :--- | :--- |
| **`breathingPeriod`** | Calm, unhurried respiration that feels quietly alive without demanding attention |
| **`floatAmplitude`** | Weightless yet physically grounded suspension in dark studio space |
| **`microTremorFreq`** | Subconscious liquid surface tension vitality that prevents frozen computer graphics appearance |
| **`motionInertia`** | Deliberate commitment and physical momentum conservation during state transitions |

---

## 3. Four Behavioral Perception Layers

1. **Layer 1 — Vitality (Is it alive?)**
   - Non-sinusoidal breathing curve (slow, deep inhale; gentle, relaxed exhale). Body expansion operates below conscious distraction.
2. **Layer 2 — Attention (Is it aware?)**
   - Compound float drift (`floatOffset`) and highlight wandering (`highlightDrift`) communicate attentive focus without staring or twitching.
3. **Layer 3 — Intention (Is movement deliberate?)**
   - State shifts execute a natural decision sequence: `Stimulus → Anticipation → Commitment → Motion → Settling → Stillness`.
4. **Layer 4 — Continuity (Is state fluid?)**
   - Phase curves and momentum are strictly preserved across state transitions; zero abrupt restarts, snapping, or phase jumps.

---

## 4. Temporal Failure Modes Matrix

| Motion Component | Failure if Too Low | Failure if Too High |
| :--- | :--- | :--- |
| **Breathing** | Dead, static object | Inflating balloon / aggressive pulsing |
| **Float** | Rigidly fixed in space | Floating party balloon / lost gravity |
| **Tremor** | Frozen CG artifact | Nervous vibration / twitching noise |
| **Highlight Drift** | Static painted glass | Wandering flashlight beam |
| **Inertia** | Snappy, mechanical UI transition | Sluggish, unresponsive lag |

---

## 5. Temporal Invariants

- **Unbroken Respiration**: Breathing phase never pauses or resets to zero during transitions.
- **Continuous Position**: Motion never teleports or snaps across frames.
- **Momentum Conservation**: Kinetic momentum is always conserved during state shifts.
- **Asymmetrical Settling**: Settling phase is always longer than the initial acceleration phase.
- **Wandering Highlight**: Specular highlight drift phase never resets upon profile change.
- **Unsynchronized Systems**: Breathing, float drift, and micro-tremor frequencies are mutually prime and never synchronize perfectly.
- **Dynamic Stillness**: Stillness is never mathematically static ($t > 0$ always exhibits micro-vitality).

---

## 6. Behavior Replay Suite Contract

Every renderer must reproduce deterministic 60fps motion trajectories across the 8 canonical test profiles:
1. `Idle` (30s baseline respiration)
2. `Listening` (15s audio-reactive focus)
3. `Thinking` (20s internal processing shimmer)
4. `Speaking` (15s rhythmic modulation)
5. `Success` (5s settling resolution)
6. `Error` (5s uncertainty expression)
7. `Sleeping` (15s low-energy pulse)
8. `Wake` (5s activation sequence)

---

## 7. Verification Matrix & Certification

- [x] **Multi-Scale Verification**: Verified stable at `380px`, `128px`, `64px`, `48px`, `32px`, and `24px` Golden Master size targets.
- [x] **Temporal Continuity Verification**: Zero phase jumps or position snapping recorded across 60fps timeline trace.
- [x] **Integration Check**: Motion preserves `GeometryBaseline.v1.md`, `MaterialBaseline.v1.md`, and `LightingBaseline.v1.md`.
- [x] **Design Constitution Compliance**: Verified compliant with Motion Language, Identity Manifesto, and Perception Principles.

---

## 8. Certification Sign-Off

- **Status**: **APPROVED & FROZEN** (Decision D011)
- **Immutable Governance Rule**: No renderer or integration code may alter this motion baseline without reopening a formal Design Decision.
