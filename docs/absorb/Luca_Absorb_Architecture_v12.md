# Luca Absorb Architecture

## Purpose

This file stores the architecture patterns LucaOS should absorb from Hermes Agent, OpenClaw, OpenHuman, and GSD so LUCA can evolve into a stronger unified AI operating runtime.

The goal is not to copy products. The goal is to extract the strongest runtime, memory, execution, plugin, self-improvement, and user-context patterns, then port them into LucaOS as native LUCA subsystems.

---

## LucaOS North Star

**LUCA = Large Universal Control Agents**

LucaOS should become a persistent AI operating layer that can:

- occupy a host device as an operational body
- maintain one cognitive context across connected devices
- use frontier models, local models, and BYOK models
- operate through chat, voice, vision, tools, MCPs, plugins, widgets, browser use, and host controls
- remember, recover, self-improve, and continue workflows across sessions
- import/export memory, skills, tools, workflows, and context from other AI ecosystems

Core thesis:

```text
Frontier Models = Intelligence Engines
LUCA = Persistent Operating Runtime
Host Devices = Bodies / Embodiments
LucaLink = Nervous System Across Hosts
```

---

# 1. Absorb From Hermes Agent

## What Hermes is strongest at

Hermes is strongest in:

- runtime stability
- self-improvement loops
- trajectory learning
- operational memory
- skill refinement
- task recovery
- long-running agent execution
- industrial-agent discipline

## Patterns to absorb into LucaOS

### 1.1 Mission Tape Learning Loop

LucaOS already has `harnessService.ts` with mission tapes, capture, and shadow replay.

Upgrade it into:

**Luca Mission Tape Learning Core**

Every completed mission should store:

- user intent
- model used
- tools used
- MCP calls
- plugin calls
- screen/host state snapshots
- memory context used
- errors encountered
- recovery actions
- final result
- user feedback
- success/failure score
- reusable lessons

Acceptance test:

```text
Run one full task → Luca records mission tape → replay mission in shadow mode → compare expected result → extract lesson into memory/skill update.
```

### 1.2 Self-Improving Skills

Absorb Hermes-style skill evolution.

Luca should be able to improve:

- prompts
- tool descriptions
- workflow rules
- skill instructions
- recovery patterns
- model routing choices
- plugin usage strategies

Target LucaOS modules:

- `evolutionService.ts`
- `harnessService.ts`
- `memoryService.ts`
- `pluginLoader.ts`
- `mcpClientManager.js`

Implementation pattern:

```text
Mission Tape → Reflection → Proposed Improvement → Sandbox Test → Verification → Approval Gate → Commit Skill Update
```

### 1.3 Runtime Checkpoint + Rollback

For every long-running Luca operation, create checkpoints.

Checkpoint should include:

- active task state
- active tools
- host/device state
- current files touched
- model route
- memory state reference
- last successful step
- recovery plan

Acceptance test:

```text
Force a tool failure mid-task → Luca restores from last checkpoint → continues without losing mission state.
```

### 1.4 Closed Learning Loop

Luca should not only remember facts. It should improve operating behavior.

Closed loop:

```text
Do task → Observe result → Evaluate → Learn → Patch workflow → Verify → Store pattern
```

This should become a core LucaOS differentiator.

---

# 2. Absorb From OpenClaw

## What OpenClaw is strongest at

OpenClaw is strongest in:

- open agent ecosystem
- skills/plugins marketplace behavior
- easy community extensibility
- messaging/SaaS bridge patterns
- broad task automation
- third-party workflows
- public virality through installable source + skills

## Patterns to absorb into LucaOS

### 2.1 Universal Skill Import Layer

LucaOS should import and normalize skills from:

- OpenClaw skills
- Claude skills
- MCP servers
- local plugins
- browser tools
- user scripts
- workflow templates

Create:

**Luca Skill Adapter**

Normalized Luca Skill format:

```json
{
  "id": "skill.id",
  "name": "Skill Name",
  "source": "openclaw | claude | mcp | luca | custom",
  "description": "What this skill does",
  "permissions": ["filesystem.read", "browser.use"],
  "tools": [],
  "prompts": [],
  "memory_policy": "read | write | isolated",
  "risk_level": "safe | sensitive | dangerous",
  "sandbox": true,
  "version": "1.0.0"
}
```

Target LucaOS modules:

- `pluginLoader.ts`
- `mcpClientManager.js`
- `permissionGateService.ts`
- `memoryService.ts`

Acceptance test:

```text
Import external skill → Luca converts it into Luca Skill → asks permission → executes in sandbox → logs usage → syncs allowed skill across LucaLink.
```

### 2.2 Skill Marketplace Architecture

LucaOS should eventually support:

- skill discovery
- user-installed skills
- trusted publisher verification
- skill ratings
- permission scopes
- safe mode
- automatic updates
- rollback to previous skill version

Architecture:

```text
Luca Skill Marketplace
→ Skill Adapter
→ Permission Gate
→ Sandbox Runtime
→ Luca Mission Harness
→ Memory/Telemetry Feedback
```

### 2.3 SaaS/Messaging Bridge Pattern

OpenClaw proved users like accessing their AI from where they already live.

LucaOS should eventually support:

- Telegram
- WhatsApp
- Discord
- Slack
- Email
- mobile push
- browser extension
- desktop widget

But in LucaOS, these should not be separate bots. They should be access points into the same Luca identity.

Acceptance test:

```text
Send task from Telegram → Luca desktop receives mission → continues on host → result appears in Telegram and desktop dashboard.
```

### 2.4 Public Ecosystem Virality Pattern

When public release comes, provide:

- GitHub repo
- one-command install
- demo video
- skill examples
- template workflows
- “build your first Luca Skill” guide
- community Discord
- public roadmap

---

# 3. Absorb From OpenHuman

## What OpenHuman is strongest at

OpenHuman is strongest in:

- readable personal memory
- local-first knowledge vault
- Obsidian-style memory editing
- personal context ingestion
- app account sync
- simple companion interface
- sandboxed skills runtime
- human-facing memory trust

## Patterns to absorb into LucaOS

### 3.1 Luca Memory Vault

LucaOS already has persistent memory architecture. Upgrade it with a human-readable memory vault.

Create:

**Luca Memory Vault**

Memory should be stored both as structured data and readable Markdown.

Suggested folders:

```text
/LucaVault
  /profile
    identity.md
    preferences.md
    personality.md
  /projects
    lucaos.md
    user-projects.md
  /devices
    macbook.md
    mobile.md
    linked-devices.md
  /skills
    installed-skills.md
    skill-permissions.md
  /missions
    mission-log.md
    mission-lessons.md
  /private
    sensitive-memory.md
```

Acceptance test:

```text
User asks “what do you know about me?” → Luca opens Memory Vault summary → user edits a memory → Luca updates runtime memory index.
```

### 3.2 Auto-Ingestion From Connected Apps

OpenHuman-style auto-fetch is valuable.

LucaOS should ingest from:

- Gmail
- Calendar
- GitHub
- Notion
- Slack
- Drive
- browser history if allowed
- local files if allowed
- project folders
- mobile device context

But LucaOS must use strong permission controls.

Pattern:

```text
Connected App → Permission Scope → Periodic Fetch → Summarize → Memory Vault → Embedding/Graph Index → Luca Runtime
```

### 3.3 Token Compression Layer

Create:

**Luca Context Compressor**

Compress:

- email threads
- browser pages
- scraped docs
- tool outputs
- logs
- mission tapes
- codebase scans
- device telemetry

before sending to models.

Acceptance test:

```text
Large document/tool output → compressed summary + key facts + citations/anchors → model receives compact context.
```

### 3.4 Sandboxed Skill Runtime

OpenHuman uses isolated skill execution. LucaOS should harden third-party skills with:

- per-skill sandbox
- memory limit
- timeout limit
- permission scope
- filesystem restrictions
- network restrictions
- audit logs
- signature validation
- rollback

Target LucaOS modules:

- `pluginLoader.ts`
- `permissionGateService.ts`
- future `skillSandboxService.ts`

Acceptance test:

```text
Malicious skill attempts unauthorized file/network access → Luca blocks it → logs violation → disables skill.
```

### 3.5 Companion Simplicity Layer

LucaOS has Hologram Face, VoiceHUD, mini chat, and Core Mode.

Adopt OpenHuman’s simplicity discipline:

- one clear face/presence
- low-friction chat/voice entry
- no terminal required for normal users
- memory transparency
- emotional continuity
- “always there” feeling

Acceptance test:

```text
Normal user opens LucaOS → no dashboard confusion → can speak/type a task in under 10 seconds.
```

---

# 4. Absorb From GSD

## What GSD is strongest at

GSD is strongest in:

- structured execution discipline
- deterministic planning
- verification loops
- context engineering
- task artifacts
- isolated execution contexts
- project-state persistence
- reliable coding workflows

## Patterns to absorb into LucaOS

### 4.1 Luca Mission Engine

Create a strict mission pipeline.

```text
Intent
→ Context Scan
→ Requirements Extraction
→ Plan
→ User Approval Gate if risky
→ Execute Atomic Steps
→ Verify Each Step
→ Recover/Retry if failed
→ Final Test
→ Commit Memory
→ Report Result
```

This should sit above existing harness/evolution systems.

Target modules:

- `harnessService.ts`
- `evolutionService.ts`
- `permissionGateService.ts`
- `memoryService.ts`
- future `missionEngine.ts`

Acceptance test:

```text
Coding task → Luca creates plan → executes step-by-step → runs tests → verifies output → stores mission report.
```

### 4.2 Structured Project Artifacts

For coding/building tasks, Luca should create or update:

```text
.luca/
  PROJECT.md
  REQUIREMENTS.md
  ROADMAP.md
  STATE.md
  TASKS.md
  DECISIONS.md
  TEST_REPORT.md
  MISSION_TAPES/
```

This prevents context loss.

Acceptance test:

```text
Restart LucaOS mid-project → Luca reloads .luca/STATE.md and continues from exact prior project state.
```

### 4.3 Deterministic Verification Gates

Luca should not mark work complete until verification passes.

Verification types:

- TypeScript check
- lint
- unit tests
- integration tests
- app build
- UI smoke test
- Playwright/browser test
- file existence check
- command success check
- user acceptance prompt

Acceptance test:

```text
Luca modifies code → build fails → Luca diagnoses → patches → reruns tests → only reports success after pass.
```

### 4.4 Context Isolation Per Executor

For heavy tasks, isolate contexts.

Pattern:

```text
Planner Context
Executor Context
Verifier Context
Memory Context
User-Facing Summary Context
```

This prevents context collapse and reduces hallucinated execution.

### 4.5 Atomic Operation Units

Every mission should be broken into atomic operations:

```json
{
  "step_id": "mission.step.001",
  "goal": "Fix broken import",
  "tool": "filesystem.write",
  "expected_output": "Component compiles",
  "verification": "npm run type-check",
  "rollback": "restore previous file snapshot"
}
```

---

# 5. LUCA Native Upgrade Layer

After absorbing patterns, LUCA should not remain a copy of these systems.

LUCA should upgrade them through:

## 5.1 Cross-Device Runtime

Pattern:

```text
Mission starts on desktop
→ continues through mobile
→ uses smart display for visual output
→ syncs all memory through LucaLink
```

## 5.2 Host Embodiment

Every host exposes capability manifests:

```json
{
  "host_id": "macbook-main",
  "body_type": "desktop",
  "capabilities": ["filesystem", "browser", "apps", "voice", "vision", "gpu"],
  "limits": ["no_robotics_motion"],
  "trust_level": "owner_device"
}
```

If a robot body is connected:

```json
{
  "host_id": "robot-01",
  "body_type": "robotics",
  "capabilities": ["move", "speak", "see", "grasp", "navigate"],
  "limits": ["requires_physical_safety_gate"]
}
```

## 5.3 Luca Guard

All absorbed skills and missions must pass Luca Guard.

Luca Guard responsibilities:

- permission scopes
- signed skills
- sandbox checks
- user approval for sensitive tasks
- memory privacy classification
- external API risk detection
- dangerous command blocking
- audit logs

## 5.4 Model Router

LUCA should route tasks to best available model type:

- coding model
- reasoning model
- vision model
- voice model
- local privacy model
- memory compression model
- fast small model
- frontier cloud model

Routing factors:

- task type
- latency
- cost
- privacy
- hardware capability
- user preference
- success history

---

# 6. Priority Porting Roadmap

## Phase 1 — Stability + Execution Discipline

Port first:

1. GSD-style Mission Engine
2. deterministic verification gates
3. atomic operation units
4. checkpoint/rollback
5. mission tape replay upgrades

Why:

Stability is what will make LucaOS feel real.

## Phase 2 — Memory + Context Ownership

Port second:

1. OpenHuman-style Memory Vault
2. auto-ingestion from apps/devices
3. TokenJuice-like compression
4. readable/editable memory
5. memory import/export from AI apps

Why:

Persistent context across devices is LucaOS’s deepest value.

## Phase 3 — Ecosystem + Skills

Port third:

1. OpenClaw/Claude/MCP skill import
2. permission-scoped skill runtime
3. marketplace structure
4. skill sandbox
5. skill sync through LucaLink

Why:

Ecosystem creates network effects.

## Phase 4 — Evolution + Self-Repair

Port fourth:

1. Hermes-style reflection loop
2. skill/prompt evolution
3. trajectory learning
4. self-healing workflow updates
5. automatic routing improvements

Why:

This makes Luca improve over time.

## Phase 5 — Embodiment Expansion

Port fifth:

1. host capability manifests
2. device handoff protocol
3. robotics body abstraction
4. smart display/Luca Cast protocol
5. physical safety gates

Why:

This opens future hardware/robotics integration.

---

# 7. Public Positioning Once Ported

Do not say:

```text
LucaOS copied Hermes/OpenClaw/OpenHuman/GSD.
```

Say:

```text
LucaOS unifies the strongest patterns of modern agents — execution discipline, self-improvement, memory ownership, skills ecosystems, multimodal operation, and host embodiment — into one persistent AI operating layer.
```

Short version:

```text
LUCA is the operating runtime where agents become embodied, persistent, and cross-device.
```

---

# 8. Acceptance Criteria For “LUCA Surpasses Them”

LUCA can be considered stronger when it proves:

## Against Hermes

- equal or better mission recovery
- mission tapes improve future behavior
- skill evolution passes verification
- long-running tasks survive failure/restart

## Against OpenClaw

- imports external skills safely
- supports MCP/plugin marketplace
- stronger sandbox/permission model
- skills work across LucaOS devices

## Against OpenHuman

- readable Memory Vault exists
- user can edit memory
- connected apps/devices auto-ingest context
- companion mode feels simple and alive

## Against GSD

- missions are structured and verifiable
- coding tasks generate project artifacts
- every serious task has plan/execute/verify/report
- failed verification triggers autonomous recovery

## LucaOS Unique Win

- one persistent Luca identity operates across multiple host devices
- same memory/context follows user across desktop/mobile/widgets/future robotics
- Luca can operate host systems, not just respond inside an app

---

# 9. Implementation Checklist

- [ ] Create `missionEngine.ts`
- [ ] Extend `harnessService.ts` mission tapes with scoring/lessons
- [ ] Add `.luca/` project artifact generator
- [ ] Add deterministic verification gates
- [ ] Add `skillAdapterService.ts`
- [ ] Add `skillSandboxService.ts`
- [ ] Add Memory Vault markdown export/import
- [ ] Add memory importers for external AI apps
- [ ] Add context compressor service
- [ ] Add Luca Guard policy engine
- [ ] Add host capability manifest standard
- [ ] Add device handoff protocol for LucaLink
- [ ] Add reflection/evolution loop from mission tapes
- [ ] Add skill marketplace metadata format
- [ ] Add audit log viewer in LucaOS settings

---

# 10. Final Architecture Target

```text
LUCA OS Runtime
│
├── Luca Cortex
│   ├── reasoning
│   ├── planning
│   ├── model routing
│   └── intent understanding
│
├── Luca Mission Engine
│   ├── intent → plan → execute → verify → recover → report
│   ├── checkpoints
│   ├── mission tapes
│   └── deterministic verification
│
├── Luca Memory Vault
│   ├── readable memory
│   ├── vector/graph index
│   ├── app/device ingestion
│   └── import/export
│
├── Luca Skills Runtime
│   ├── MCP
│   ├── plugins
│   ├── OpenClaw/Claude skill import
│   ├── sandbox
│   └── marketplace
│
├── Luca Evolution Core
│   ├── reflection
│   ├── trajectory learning
│   ├── skill improvement
│   └── workflow repair
│
├── Luca Guard
│   ├── permissions
│   ├── policy
│   ├── sandbox enforcement
│   └── audit logs
│
├── LucaLink
│   ├── device registry
│   ├── memory sync
│   ├── command delegation
│   └── cross-host continuity
│
└── Luca Interface Layer
    ├── dashboard
    ├── Luca Screen
    ├── Ghost Browser
    ├── Hologram Face
    ├── Mini Chat
    └── VoiceHUD
```

---

## Closing Note

The goal is not to become another Hermes, OpenClaw, OpenHuman, or GSD.

The goal is for LucaOS to absorb their best architectural patterns and upgrade them into a single persistent, embodied, cross-device AI operating layer.



---

# Cross-Repo Feature Matrix

| Feature Area | Hermes Agent | OpenClaw | OpenHuman | GSD | Vellum Assistant | LucaOS | Recommended Luca Absorption |
|---|---|---|---|---|---|---|---|
| Memory Architecture | Reflective/runtime memory | Skill/session memory | Readable Memory Tree + Obsidian Vault | Project-state persistence | Brief/archive/staleness memory | Cortex/vector/LucaLink memory | Combine OpenHuman readable memory + Vellum brief/archive recall + LucaLink sync |
| Execution Discipline | Strong runtime continuity | Moderate | Moderate | Strongest deterministic execution | Strong context overflow recovery | Harness + Mission Tapes + Evolution | Absorb GSD verification pipelines + Vellum context survival |
| Self-Evolution | Strongest public evolution loops | Limited | Limited | Verification-focused | Limited | Evolution service already exists | Absorb Hermes trajectory learning + adaptive reflection |
| Plugin / Skills Runtime | Strong | Largest ecosystem | Strongest sandboxing | Task tools only | Security-gated tools | MCP/plugin runtime | Absorb OpenHuman sandbox isolation + OpenClaw marketplace |
| Security / Permissions | Strong | Riskier broad access | Sandboxed skills | Controlled execution | Strongest trust/credential gates | Permission gate exists | Absorb Vellum Credential Execution Service + Guardian model |
| Cross-Device Continuity | Limited | Channel-based | Integration-based | None | Multi-channel assistant | LucaLink strongest | Continue strengthening LucaLink protocol/runtime |
| Proactivity | Moderate | Workflow triggers | Background companion | Task-driven | Strongest scheduler/proactivity | Needs scheduler refinement | Absorb Vellum RRULE/Cron scheduler |
| Context Survival | Runtime compression | Variable | TokenJuice compression | Context/spec persistence | Strongest overflow recovery | Memory fallback exists | Absorb Vellum deterministic context survival |
| Companion UX | Low | Low/Moderate | Strongest emotional companion UX | Low | Moderate | Hologram + VoiceHUD + Widgets | Absorb OpenHuman simplicity/presence polish |
| Embodiment / Host Control | Partial | Partial computer use | Desktop companion | None | Channel assistant | Strongest host embodiment | Continue Luca-native embodiment systems |
| Runtime Replay / Recovery | Strong | Moderate | Limited | Moderate | Moderate | Strong replay + self-repair | Continue Hermes-style recovery hardening |
| Scheduling / Background Tasks | Limited | Workflow based | Background tasks | Task pipelines | Strong recurring scheduler | Partial | Absorb Vellum scheduling architecture |
| Memory Testing / Recall QA | Moderate | Limited | Moderate | Limited | Strong benchmark discipline | Partial | Absorb Vellum memory benchmarking |
| Agent Presence | Operational runtime | Tool ecosystem | Human-centered presence | Execution engine | Assistant personality | Persistent AI presence | Merge OpenHuman + LucaOS identity runtime |

## Final Convergence Goal

LucaOS should converge the strongest verified runtime patterns into one coherent architecture:

- Hermes → self-evolution + runtime hardening
- OpenClaw → ecosystem + skills marketplace
- OpenHuman → readable memory + companion simplicity + sandboxed skills
- GSD → deterministic execution verification
- Vellum → trust/security + context survival + scheduler
- LucaOS → embodiment + multimodal runtime + LucaLink continuity

The goal is NOT feature accumulation.

The goal is:
Persistent Embodied Operational Intelligence.


---

# Hermes + Vellum/OpenHuman Identity Convergence Plan

## Goal

Merge:
- Hermes-style runtime cognition systems
with:
- Vellum/OpenHuman-style human-readable identity layers

inside LucaOS.

The objective is:
Persistent Embodied Operational Intelligence
with
Human-Readable Identity Continuity.

---

# Current LucaOS State

Current LucaOS already contains:

- Cortex memory system
- Mission tapes
- Evolution service
- Neural self-repair
- LucaLink continuity
- Hologram Face
- VoiceHUD
- Personality onboarding
- MCP/plugin runtime
- Persistent memory categories
- Cross-device synchronization

However, LucaOS currently appears more:
runtime-centric and operational-system oriented.

The missing refinement is:
formal layered cognition separation.

---

# Absorption Objective

LucaOS should absorb:

## From Hermes
(runtime cognition discipline)

- trajectory learning
- execution loops
- reflection systems
- runtime checkpoints
- recovery systems
- evolution pipelines
- mission continuity
- operational memory graphs

## From Vellum/OpenHuman
(human-readable identity cognition)

- SOUL.md pattern
- NOW.md active-state pattern
- readable memory vault
- editable AI identity
- human-facing continuity
- companion presence structure

---

# Proposed LucaOS Cognition Layer Structure

## 1. LUCA_SOUL.md

Purpose:
Core personality, behavioral alignment, long-term identity.

Contains:
- communication style
- ethics/rules
- emotional tone
- interaction philosophy
- creator alignment
- adaptive personality modifiers
- preferred user interaction behavior

Source Inspiration:
- Vellum SOUL.md
- OpenHuman identity runtime

Luca Upgrade:
Dynamic self-evolving soul layers with guarded mutation rules.

---

## 2. LUCA_NOW.md

Purpose:
Current active operational state.

Contains:
- active tasks
- current projects
- temporary focus
- recent decisions
- ongoing workflows
- active device state
- temporary operational memory

Source Inspiration:
- Vellum NOW.md

Luca Upgrade:
Cross-device synchronized active-state runtime via LucaLink.

---

## 3. LUCA_MEMORY/

Purpose:
Persistent long-term memory vault.

Contains:
- user knowledge
- projects
- relationship memory
- embeddings
- Cortex graph memory
- semantic snapshots
- timeline/history
- device events
- operational patterns

Source Inspiration:
- OpenHuman Memory Tree
- Vellum archive recall

Luca Upgrade:
Multimodal memory + host/device continuity memory.

---

## 4. LUCA_MISSIONS/

Purpose:
Structured execution orchestration.

Contains:
- execution plans
- verification checkpoints
- retries
- mission tapes
- recovery states
- execution DAGs
- task decomposition

Source Inspiration:
- GSD execution discipline
- Hermes runtime loops

Luca Upgrade:
Embodied multimodal execution across hosts/devices.

---

## 5. LUCA_TRAJECTORIES/

Purpose:
Store successful/failed operational learning traces.

Contains:
- successful workflows
- failed workflows
- evolution deltas
- runtime reflection
- adaptation patterns
- tool effectiveness scoring

Source Inspiration:
- Hermes trajectory learning

Luca Upgrade:
Cross-host operational learning continuity.

---

## 6. LUCA_SKILLS/

Purpose:
Unified skills/plugin ecosystem.

Contains:
- MCPs
- imported OpenClaw skills
- imported Claude skills
- Luca-native skills
- permission scopes
- sandbox metadata
- runtime requirements

Source Inspiration:
- OpenClaw ecosystem
- OpenHuman sandbox runtime

Luca Upgrade:
Cross-device executable skill continuity.

---

## 7. AGENTS.md

Purpose:
Engineering doctrine for GPT-5.5/Codex agents.

Contains:
- architecture philosophy
- coding conventions
- runtime constraints
- memory rules
- execution verification standards
- embodiment protocols
- LucaLink synchronization rules
- safety requirements

Source Inspiration:
- Claude Code ecosystems
- Vellum AGENTS.md

Luca Upgrade:
Embodied runtime doctrine for autonomous AI OS engineering.

---

# Final Luca Cognitive Stack

Layered cognition architecture:

SOUL
↓
NOW
↓
MEMORY
↓
MISSIONS
↓
TRAJECTORIES
↓
SKILLS
↓
RUNTIME EXECUTION
↓
EMBODIMENT LAYER
↓
LUCALINK CONTINUITY

---

# Why This Matters

This structure solves:
- context entropy
- runtime chaos
- identity fragmentation
- memory overload
- operational instability
- cross-device state confusion

while improving:
- persistence
- explainability
- recoverability
- Codex agent understanding
- long-running continuity
- human trust
- self-evolution quality

---

# LucaOS Upgrade Direction

The goal is NOT to copy:
- Hermes
- OpenHuman
- Vellum
- OpenClaw

The goal is:

Absorb their strongest runtime cognition patterns
and redesign them into one coherent Luca-native operating intelligence system.


---

# UI Architecture & Onboarding Comparison Correction

## Updated Verdict After Reviewing Latest LucaOS Onboarding Flow

Earlier comparisons underestimated LucaOS onboarding and reachability architecture.

After reviewing the updated LucaOS onboarding/runtime flow, LucaOS already surpasses:
- OpenHuman onboarding sophistication
- Vellum dashboard-independent reachability

in several important ways.

---

# OpenHuman UI Architecture

Strength:
- simple desktop onboarding
- emotional companion UX
- low-friction setup
- mascot/face presence
- no-terminal-required onboarding

Weakness:
- relatively shallow runtime initialization
- minimal adaptive system orchestration
- less operational personalization depth

Reference:
https://github.com/tinyhumansai/openhuman

---

# Vellum UI Architecture

Strength:
- menu bar assistant access
- Telegram/Slack reachability
- lightweight assistant surfaces
- low-friction accessibility

Weakness:
- not deeply embodied
- not an AI-native operating environment
- lacks adaptive multimodal onboarding/runtime initialization

Reference:
https://github.com/vellum-ai/vellum-assistant

---

# Updated LucaOS UI/Onboarding Architecture

## Boot & Runtime Initialization

LucaOS boot flow:

Boot Window
→ Subsystem Startup
→ Agent-Oriented Onboarding
→ Main Dashboard Runtime

Subsystem startup initializes:
- Electron runtime
- Cortex
- Memory systems
- Tools
- Widgets
- Voice systems
- Runtime services

This is significantly deeper than standard AI onboarding.

---

# Agent-Oriented Onboarding Architecture

## 1. Interaction Mode Selection

User selects:
- Chat Mode
or
- Voice Mode

Important:
Both modes share the same persistent runtime state.

Voice onboarding can complete the full setup flow.

This creates:
multimodal onboarding continuity.

---

## 2. Identity Initialization

Luca asks:
- user name
- communication style
- preferences

Used for:
- personality generation
- behavior adaptation
- runtime personalization

---

## 3. Visual Interface Personalization

Luca presents:
- theme cards
- opacity sliders
- blur/transparency configuration

This creates:
adaptive cinematic AI-native interface personalization.

---

## 4. Model Runtime Selection

User selects:
- Luca Prime (cloud runtime)
- Local Models
- BYOK

This is significantly more advanced than typical onboarding systems.

---

## 5. Intelligent Local Model Runtime Setup

Confirmed latest LucaOS behavior:

- scans kernel/system specifications
- determines compatible local models
- checks for Ollama presence
- automatically installs Ollama for non-technical users
- downloads selected models
- downloads Cortex-compatible voice/STT/TTS models
- configures local runtime automatically

This is:
AI-native runtime provisioning.

Very few AI systems currently implement this level of adaptive onboarding automation.

---

## 6. Persistent Personality Construction

After runtime selection:
Luca asks:
- communication preferences
- interaction style
- behavior preferences

Then:
builds persistent personality state.

This overlaps with:
- SOUL.md concepts
- companion runtime identity systems

but integrated directly into onboarding/runtime initialization.

---

# Dashboard-Independent Reachability

LucaOS already exceeds OpenHuman/Vellum in runtime reachability because of:

- Mini Chat Widget
- VoiceHUD
- Hologram Face
- Luca Screen
- Luca Cast
- shared persistent state across voice/chat/widgets

This creates:
distributed AI presence surfaces.

---

# Updated UI Verdict

## OpenHuman
Strongest at:
- simple emotional companion onboarding

## Vellum
Strongest at:
- lightweight assistant accessibility

## LucaOS
Strongest at:
- AI-native operating environment onboarding
- adaptive multimodal runtime initialization
- intelligent local model provisioning
- persistent multimodal state continuity
- distributed AI presence architecture
- dashboard-independent operational reachability

---

# Important LucaOS UI Principle

The innovation is not:
- glass effects
- hologram visuals
- widgets alone

The real innovation is:

software inhabited by persistent AI cognition.

That is LucaOS's actual UI philosophy.


---

# Foundational Doctrine Refactor Plan

## Purpose

LucaOS currently has strong runtime architecture, but the project needs formal foundational doctrine files so Codex/GPT-5.5 agents, future contributors, cofounders, and investors can understand the system as one coherent AI operating architecture.

These files should become the canonical source of truth for:

- what LucaOS is
- how Luca behaves
- how Luca remembers
- how Luca executes
- how Luca evolves
- how Luca embodies host systems
- how LucaLink synchronizes devices
- how safety, permissions, and recovery work

This is not marketing documentation.

This is engineering doctrine for a persistent embodied AI operating system.

---

# Required Foundational Documents

## 1. CONSTITUTION.md

### Purpose

Defines LucaOS principles, values, and non-negotiable operating beliefs.

### Should Cover

- user sovereignty
- memory ownership
- local-first / privacy-first philosophy
- host embodiment principles
- AI as augmentation, not uncontrolled replacement
- permission and consent doctrine
- safe autonomy
- cross-device continuity ethics
- model neutrality
- user-controlled personality and memory
- Luca’s role as operating layer, not OS kernel replacement

### Why It Matters

Prevents LucaOS from becoming directionless as the architecture grows.

### Inspired By

- Vellum Constitution
- Anthropic constitutional AI culture
- agentic system safety doctrines

### Luca Upgrade

Constitution should be readable by both:
- humans
- Codex/GPT agents
- Luca runtime policy systems

---

## 2. GLOSSARY.md

### Purpose

Defines LucaOS vocabulary so the codebase, docs, UI, and agents use consistent terminology.

### Must Define

- LucaOS
- LUCA
- Cortex
- LucaLink
- Luca Prime
- Local Models
- BYOK
- Host Embodiment
- Kernel / Host Body
- Luca Screen
- Ghost Browser
- Hologram Face
- VoiceHUD
- Mini Chat
- Luca Cast
- Mission Tape
- Mission Engine
- Evolution Core
- Neural Self-Repair
- Memory Vault
- Soul Layer
- Now Layer
- Skills Runtime
- MCP
- Embodiment Layer
- Operational Cognition
- Cross-Device Continuity
- Runtime Presence
- Tactical Mode
- Core Mode
- Origin Mode

### Why It Matters

Prevents terminology fragmentation and helps AI coding agents reason consistently.

---

## 3. ARCHITECTURE.md

### Purpose

High-level system map of LucaOS.

### Should Cover

- boot sequence
- subsystem startup
- onboarding flow
- model selection flow
- local model provisioning
- main dashboard panels
- widget runtime
- LucaLink protocol
- Cortex memory
- Mission Engine
- Skills runtime
- voice/vision runtime
- host control bridge
- self-repair
- self-evolution
- permission/safety gates

### Required Diagram

Include an architecture diagram like:

```text
User
↓
Luca Interface Layer
↓
Luca Cortex
↓
Mission Engine
↓
Memory / Skills / Models / Guard
↓
Host Embodiment Layer
↓
Windows / macOS / Linux / Mobile / Future Robot Body
↓
LucaLink Cross-Device Continuity
```

---

## 4. AGENTS.md

### Purpose

Codex/GPT-5.5 engineering instruction file for working inside LucaOS.

### Should Include

- project philosophy
- coding conventions
- folder/module boundaries
- runtime safety rules
- memory rules
- tool/plugin rules
- MCP integration rules
- UI/UX principles
- LucaLink synchronization rules
- no blind copying from external repos
- absorb patterns natively
- test requirements
- verification requirements
- security requirements
- documentation update requirements

### Important Rule

Every Codex/GPT agent working on LucaOS must read:

1. AGENTS.md
2. CONSTITUTION.md
3. ARCHITECTURE.md
4. Luca_Absorb_Architecture.md

before making major subsystem changes.

---

## 5. RUNTIME_STANDARDS.md

### Purpose

Defines industrial-grade runtime behavior.

### Should Cover

- retry rules
- timeout rules
- fallback rules
- mission checkpointing
- mission replay
- self-repair triggers
- crash recovery
- degraded mode
- safe mode
- memory validation
- model fallback
- tool failure handling
- context overflow handling
- logging standards
- telemetry standards
- diagnostic export

### Absorb From

- Hermes runtime hardening
- GSD execution verification
- Vellum context survival
- Luca mission tapes
- Luca neural self-repair

---

## 6. MISSION_ENGINE_SPEC.md

### Purpose

Defines Luca’s execution discipline.

### Standard Mission Flow

```text
Intent
→ Context Gathering
→ Plan
→ Risk Check
→ User Approval if Needed
→ Execute
→ Verify
→ Recover if Failed
→ Reflect
→ Persist Memory
→ Update Trajectory
→ Report
```

### Should Define

- planner role
- executor role
- verifier role
- recovery role
- reflection role
- mission tape format
- mission status lifecycle
- abort conditions
- escalation conditions
- human approval gates
- deterministic verification rules

### Absorb From

- GSD execution verification
- Hermes trajectory learning
- Vellum permission gates
- Luca harness service

---

## 7. MEMORY_SPEC.md

### Purpose

Defines Luca’s memory architecture.

### Should Cover

- short-term memory
- LUCA_NOW.md
- long-term memory
- LUCA_MEMORY/
- Cortex graph memory
- vector memory
- keyword fallback
- visual memory
- voice memory
- device memory
- project memory
- user preference memory
- memory expiry
- memory staleness
- memory confidence
- memory source attribution
- memory import/export
- cross-device memory sync
- editable memory vault

### Absorb From

- OpenHuman Memory Tree / Obsidian Vault
- Vellum brief/archive memory
- Luca Cortex memory
- LucaLink memory sync

---

## 8. LUCALINK_PROTOCOL.md

### Purpose

Defines cross-device continuity and embodiment synchronization.

### Should Cover

- device registry
- pairing flow
- trust model
- heartbeat
- state sync
- memory sync
- command delegation
- remote execution
- device capability profile
- host-body detection
- secure command signing
- disconnection handling
- recovery / re-inhabitation
- conflict resolution
- multi-device active-state handoff

### Why It Matters

LucaLink is one of LucaOS’s deepest differentiators.

It should become a formal protocol, not just a service implementation.

---

## 9. SKILLS_RUNTIME_SPEC.md

### Purpose

Defines how Luca imports, executes, isolates, and evolves skills.

### Should Cover

- MCP tools
- OpenClaw skill imports
- Claude skill imports
- Luca-native skills
- plugin permissions
- skill sandboxing
- tool registry
- skill versioning
- skill marketplace metadata
- skill trust scoring
- skill execution logs
- skill mutation/evolution rules
- local/cloud tool execution

### Absorb From

- OpenClaw ecosystem
- OpenHuman sandboxed QuickJS runtime
- Vellum trust-gated tools
- Luca MCP manager / plugin loader

---

## 10. GUARD_SECURITY_SPEC.md

### Purpose

Defines LucaOS safety, trust, and permission model.

### Should Cover

- guardian/trusted/unknown actors
- user approval gates
- permission scopes
- credential isolation
- risk scoring
- safe tool execution
- sandboxing
- audit logs
- security breach handling
- plugin trust levels
- memory write permissions
- cross-device trust levels
- production evolution restrictions
- dangerous command blocking

### Absorb From

- Vellum Credential Execution Service
- Vellum guardian model
- OpenHuman sandbox isolation
- Luca permission gate
- Luca neural self-repair security disconnects

---

## 11. UI_UX_DOCTRINE.md

### Purpose

Defines LucaOS AI-native interface philosophy.

### Should Cover

- boot window philosophy
- subsystem startup sequence
- agent-oriented onboarding
- chat/voice mode selection
- theme cards
- opacity/blur configuration
- model selection UX
- local model scan UX
- normal/tactical/origin mode differences
- dashboard panels
- widget surfaces
- Luca Screen
- Hologram Face
- Mini Chat
- VoiceHUD
- Luca Cast
- contextual UI activation
- dashboard-independent reachability
- cinematic restraint
- accessibility
- no overwhelming users

### Core Principle

The UI should feel like:

```text
software inhabited by persistent AI cognition
```

not:

```text
a chatbot embedded inside software
```

---

## 12. MODEL_ROUTING_SPEC.md

### Purpose

Defines how Luca chooses and manages models.

### Should Cover

- Luca Prime
- BYOK
- Local Models
- Ollama detection/install
- system specification scanning
- compatible model recommendation
- chat models
- coding models
- reasoning models
- memory models
- vision models
- STT/TTS models
- latency/cost/privacy routing
- fallback routing
- user override rules

### Why It Matters

LucaOS should not depend on one frontier model.

LUCA should be model-neutral and route intelligence based on task, privacy, performance, and user preference.

---

## 13. EVOLUTION_CORE_SPEC.md

### Purpose

Defines self-improvement and guarded evolution.

### Should Cover

- evolution triggers
- allowed mutation zones
- blocked mutation zones
- sandbox mutation process
- verification commands
- backup/rollback
- mission tape analysis
- trajectory learning
- skill refinement
- prompt/rule refinement
- tool description refinement
- production restrictions
- user approval gates

### Absorb From

- Hermes self-evolution
- Luca evolution service
- GSD verification
- Vellum permission rules

---

# Proposed Docs Folder Structure

```text
docs/
  foundation/
    CONSTITUTION.md
    GLOSSARY.md
    ARCHITECTURE.md
    AGENTS.md

  runtime/
    RUNTIME_STANDARDS.md
    MISSION_ENGINE_SPEC.md
    MEMORY_SPEC.md
    MODEL_ROUTING_SPEC.md
    EVOLUTION_CORE_SPEC.md

  security/
    GUARD_SECURITY_SPEC.md
    CREDENTIAL_EXECUTION_SPEC.md
    PERMISSION_MODEL.md

  embodiment/
    LUCALINK_PROTOCOL.md
    HOST_EMBODIMENT_SPEC.md
    DEVICE_CAPABILITY_PROFILE.md

  interface/
    UI_UX_DOCTRINE.md
    ONBOARDING_FLOW.md
    WIDGET_RUNTIME_SPEC.md

  skills/
    SKILLS_RUNTIME_SPEC.md
    MCP_INTEGRATION_SPEC.md
    SKILL_IMPORT_FORMAT.md

  absorb/
    Luca_Absorb_Architecture.md
```

---

# Refactor Priority Order

## Priority 1: Foundational Alignment

Create:

1. CONSTITUTION.md
2. GLOSSARY.md
3. ARCHITECTURE.md
4. AGENTS.md

Reason:
Codex/GPT agents need canonical context before touching major source code.

---

## Priority 2: Runtime Stability Doctrine

Create:

1. RUNTIME_STANDARDS.md
2. MISSION_ENGINE_SPEC.md
3. GUARD_SECURITY_SPEC.md

Reason:
LucaOS is entering stability/productization phase.

---

## Priority 3: Core Subsystem Specs

Create:

1. MEMORY_SPEC.md
2. LUCALINK_PROTOCOL.md
3. MODEL_ROUTING_SPEC.md
4. SKILLS_RUNTIME_SPEC.md

Reason:
These systems define LucaOS’s differentiators.

---

## Priority 4: Experience + Evolution Specs

Create:

1. UI_UX_DOCTRINE.md
2. EVOLUTION_CORE_SPEC.md
3. ONBOARDING_FLOW.md
4. WIDGET_RUNTIME_SPEC.md

Reason:
These define LucaOS as an AI-native operating environment.

---

# Codex Refactor Instruction

When returning to the original LucaOS source code, instruct Codex/GPT-5.5:

```text
Read Luca_Absorb_Architecture.md.

Create the foundational doctrine structure described in the Foundational Doctrine Refactor Plan.

Do not change runtime behavior yet.

First generate the docs/foundation, docs/runtime, docs/security, docs/embodiment, docs/interface, docs/skills, and docs/absorb directories.

Then draft each doctrine file using existing LucaOS code as source of truth.

After documentation exists, compare implementation gaps against the doctrine and propose safe staged refactors.

Do not blindly copy external repositories.
Absorb architecture patterns natively into LucaOS.
```

---

# Success Criteria

This refactor succeeds when:

- LucaOS has canonical foundation docs
- Codex agents understand subsystem boundaries
- Luca terminology is consistent
- runtime doctrine is explicit
- security doctrine is explicit
- LucaLink is documented as protocol
- memory architecture is documented
- mission execution is documented
- UI philosophy is documented
- future contributors can understand LucaOS without relying only on founder explanation

This transforms LucaOS from:
feature-rich prototype

into:
documented AI operating system architecture.


---

# CUA / Computer-Use Infrastructure Absorption Plan

## Source Repo

Repo:
https://github.com/trycua/cua

CUA describes itself as:
Open-source infrastructure for Computer-Use Agents.

Core scope:
- sandboxes
- SDKs
- benchmarks
- computer-use drivers
- VM/container execution
- desktop automation
- trajectory recording
- cross-OS agent environments

---

# Why CUA Matters For LucaOS

LucaOS aims to embody host systems.

For LucaOS to truly occupy a host body and operate it like a human, the computer-use layer must become one of the strongest subsystems in the architecture.

Current LucaOS already has:
- native host control bridge
- Electron IPC control channel
- Cortex/backend fallback bridge
- app launching
- system status/control
- mobile app launching
- LucaLink tool delegation
- Playwright dependency
- RobotJS dependency
- active window dependency
- multimodal/vision dependencies

But CUA adds a missing maturity layer:
- isolated computer-use sandboxes
- background GUI control
- cross-OS sandbox API
- replayable trajectories
- benchmark-driven evaluation
- VM/runtime management
- training/evaluation environments

---

# Confirmed CUA Patterns To Absorb

## 1. Background Computer-Use Driver

CUA Driver can drive native macOS apps in the background.

Important capabilities:
- click
- type
- verify
- operate without stealing cursor/focus/Space
- supports non-Accessibility surfaces
- works with Chromium web content, canvas tools, Figma, Blender, DAWs, and game engines
- records every session as replayable trajectory
- usable through CLI or MCP server

LucaOS Absorption Target:
Luca Background Control Driver

Purpose:
Allow Luca to operate host apps without disrupting the user’s active cursor/session.

Why It Matters:
LucaOS should not always take over the user’s screen directly.
A background-control lane makes Luca feel more like an operating intelligence than a visible bot clicking around.

---

## 2. Agent-Ready Sandboxes

CUA provides one API for controlling VM/container images across:
- Linux
- macOS
- Windows
- Android
- cloud sandboxes
- local QEMU environments
- bring-your-own-image environments

Supported operations include:
- shell run
- screenshot
- mouse click
- keyboard type
- mobile gestures

LucaOS Absorption Target:
Luca Sandbox Body Layer

Purpose:
Let Luca inhabit:
- real host body
- sandbox host body
- cloud VM body
- local VM body
- Android/iOS device body
- future robotic/simulation body

Why It Matters:
God Mode and self-evolution should not run dangerous tests directly on the user’s real host.

---

## 3. CuaBot Co-op Computer-Use

CUA includes CuaBot:
- gives any coding agent a sandbox for computer use
- supports Claude Code and OpenClaw in sandbox
- can run GUI workflows
- supports screenshot/type/click commands
- individual windows appear natively on desktop
- includes shared clipboard and audio
- supports agent-browser and agent-device

LucaOS Absorption Target:
Luca Co-op Sandbox Runtime

Purpose:
Allow LucaOS to run external agents/tools/skills inside controlled computer-use bodies.

Example:
- Run OpenClaw skill in sandbox
- Run Claude-style workflow in sandbox
- Run browser automation in sandbox
- Run risky plugin in disposable environment

---

## 4. Cua-Bench

CUA-Bench evaluates computer-use agents on:
- OSWorld
- ScreenSpot
- Windows Arena
- custom tasks

It can:
- create base images
- run benchmark datasets
- run agents with parallelism
- export trajectories for training

LucaOS Absorption Target:
LucaBench Computer-Use Evaluation Harness

Purpose:
Measure how well Luca actually operates computers.

Must Evaluate:
- desktop app control
- browser control
- file operations
- mobile app actions
- cross-OS workflows
- UI drift recovery
- vision grounding
- action verification
- recovery from failed clicks/actions
- God Mode safety behavior

Why It Matters:
LucaOS cannot claim strong host embodiment without measurable computer-use reliability.

---

## 5. Lume VM Management

CUA includes Lume:
- macOS/Linux VM management
- near-native Apple Silicon performance
- uses Apple Virtualization.Framework
- can pull and run macOS VM images

LucaOS Absorption Target:
Luca Virtual Host Manager

Purpose:
Manage virtual host bodies for:
- testing
- training
- self-evolution
- sandbox workflows
- dangerous operation simulation
- cross-OS regression tests

---

## 6. Replayable Trajectory Recording

CUA records computer-use sessions as replayable trajectories.

LucaOS Absorption Target:
Mission Tape + Computer-Use Trajectory Fusion

Purpose:
Merge:
- Luca Mission Tapes
with:
- CUA-style GUI trajectories

So every computer-use action stores:
- screenshot before action
- perceived state
- action command
- tool/model used
- cursor/key event
- result screenshot
- verification outcome
- error/recovery attempt
- final mission state

Why It Matters:
This becomes core data for:
- debugging
- self-evolution
- training
- regression testing
- safety audit
- recovery replay

---

## 7. Cross-OS Computer-Use Abstraction

CUA abstracts computer-use across macOS, Linux, Windows, and Android.

LucaOS Absorption Target:
Luca Embodiment API

Purpose:
A unified interface:

```text
observe()
click()
type()
shell()
openApp()
screenshot()
gesture()
verify()
snapshot()
restore()
```

across:
- desktop
- mobile
- sandbox
- browser
- VM
- robot/simulation body

---

## 8. Security / Red-Team Harness For Computer-Use Agents

Computer-use agents are vulnerable to:
- indirect prompt injection
- malicious webpages
- hybrid web/OS attacks
- unsafe credential handling
- unauthorized system actions

LucaOS Absorption Target:
Luca Guard RedTeamCUA Harness

Purpose:
Test Luca against:
- malicious web instructions
- injected UI text
- unsafe downloads
- fake approval prompts
- credential theft attempts
- malicious plugin actions
- cross-device command abuse
- God Mode escalation attempts

---

# Current LucaOS Computer-Use State

Confirmed public LucaOS code shows:

## Native Control Service

File:
src/services/nativeControlService.ts

Capabilities:
- Electron IPC bridge
- Cortex/backend fallback
- volume control
- battery/system stats
- system load
- app launching
- running app list
- media controls
- native casting

Current Limit:
It is host-control oriented, not full CUA-grade sandboxed GUI control.

---

## App Control Service

File:
src/services/appControlService.ts

Capabilities:
- mobile app package/scheme mapping
- Capacitor app launcher
- desktop app launch via nativeControl
- LucaLink delegation to connected mobile device
- supported app registry
- app search

Current Limit:
It supports app launching/delegation, but not full in-app GUI task execution.

---

## Package-Level Computer-Use Dependencies

File:
package.json

Relevant dependencies:
- playwright
- robotjs
- active-win
- chromium-bidi
- @modelcontextprotocol/sdk
- @mediapipe/tasks-vision
- @tensorflow/tfjs
- socket.io
- electron
- capacitor
- whatsapp-web.js

Interpretation:
LucaOS has the building blocks for computer-use, browser-use, and host interaction.

Current Missing Layer:
CUA-style sandbox + benchmark + trajectory + VM abstraction.

---

# Required LucaOS Computer-Use Refactor

## New Subsystems To Add

### 1. LucaComputerUseCore

Unified computer-use API for:
- real host
- sandbox host
- browser host
- mobile host
- VM host

### 2. LucaSandboxBody

Disposable environments for:
- autonomous workflows
- God Mode
- plugin testing
- self-evolution
- unsafe experiments

### 3. LucaBench

Benchmark suite for:
- OS tasks
- browser tasks
- coding tasks
- app tasks
- mobile tasks
- recovery tasks

### 4. LucaTrajectoryRecorder

Records:
- screenshots
- actions
- results
- verification
- recovery
- mission tape links

### 5. LucaBackgroundDriver

Allows Luca to operate apps without hijacking user cursor/focus when platform permits.

### 6. LucaEmbodimentAPI

Unified API:
```text
observe
screenshot
click
type
gesture
shell
openApp
readUI
verify
snapshot
restore
```

### 7. LucaCUARedTeam

Security benchmark suite for:
- prompt injection
- malicious UI
- browser-to-OS attacks
- unsafe file/system actions
- plugin abuse

---

# Absorption Priority

## Priority 1

Add doctrine/spec files:
- COMPUTER_USE_SPEC.md
- EMBODIMENT_API_SPEC.md
- SANDBOX_BODY_SPEC.md
- LUCA_BENCH_SPEC.md

## Priority 2

Unify existing:
- nativeControlService
- appControlService
- Ghost Browser
- vision screenshot pipeline
- LucaLink delegation

under:
LucaComputerUseCore.

## Priority 3

Add sandbox mode:
- local VM/sandbox when available
- browser sandbox
- mobile sandbox
- future robot/simulation sandbox

## Priority 4

Merge Mission Tapes with computer-use trajectories.

## Priority 5

Add benchmark tasks and red-team tasks.

---

# Key Architecture Principle

LucaOS should support two computer-use modes:

## 1. Direct Host Mode

Luca operates the user's real device.

Best for:
- trusted tasks
- normal workflows
- user-supervised actions
- low-risk tasks

## 2. Sandbox Body Mode

Luca operates a disposable virtual host.

Best for:
- God Mode
- self-evolution
- risky tools
- plugin testing
- browser exploration
- autonomous experiments
- training/evaluation

This dual-body approach is essential for safe embodied AI.

---

# Final CUA Absorption Verdict

CUA is strongest in:
- computer-use infrastructure
- sandboxed host bodies
- cross-OS control abstraction
- background macOS control
- benchmarks and RL environments
- replayable trajectories
- VM/runtime management

LucaOS is strongest in:
- persistent cognition
- cross-device continuity
- multimodal operating presence
- host embodiment philosophy
- UI/runtime identity

Therefore:
LucaOS should not copy CUA as an app.

LucaOS should absorb CUA as:
the computer-use infrastructure layer beneath LUCA embodiment.

This is critical for making LucaOS genuinely capable of operating computer kernels effortlessly.


---

# Three-Tier Runtime Access Architecture

## Confirmed LucaOS Runtime Separation

LucaOS already separates the runtime into three operational modes:

1. Origin Mode
2. Tactical Mode
3. Core / Normal Mode

This is a major architectural strength.

The separation allows:
- advanced creator-level autonomy/evolution
- developer/operator extensibility
- safe mainstream usability

without exposing dangerous complexity to all users.

---

# 1. Origin Mode

## Purpose

Internal creator/core-team operational mode.

This mode exists for:
- LucaOS creators
- trusted internal engineers
- advanced architecture evolution
- runtime experimentation
- guarded self-evolution

---

## Capabilities

### Full Runtime Access

- deep system diagnostics
- internal runtime visualization
- architecture introspection
- subsystem debugging
- direct Cortex access
- advanced mission inspection

### Self-Evolution Access

Only Origin Mode can:
- run source-level self-evolution
- mutate internal architecture
- test runtime mutations
- benchmark evolved builds
- generate architecture patches
- evaluate candidate implementations

Important:
Self-evolution must occur:
- in sandboxed environments
- with replay/testing
- with benchmark verification
- with rollback support
- with human approval

---

## Internal Infrastructure Access

Origin Mode can access:
- benchmark harnesses
- red-team harnesses
- sandbox orchestration
- trajectory datasets
- evolution simulators
- system mutation tools
- internal telemetry
- advanced embodiment testing

---

## Security Doctrine

Origin Mode is:
- not public
- not consumer-facing
- not enabled in distributed builds

Origin Mode exists for:
controlled evolution of LucaOS itself.

---

# 2. Tactical Mode

## Purpose

Advanced developer/operator/pro-user runtime.

This mode is for:
- developers
- AI operators
- automation engineers
- power users
- researchers
- workflow builders

---

## Capabilities

### Advanced Runtime Features

- MCP integrations
- plugin systems
- advanced workflows
- coding agents
- automation pipelines
- sandboxed computer-use
- browser automation
- LucaLink orchestration
- local model infrastructure
- skill imports/exports

### Developer Tooling

- runtime logs
- advanced settings
- prompt chains
- workflow editing
- model routing control
- sandbox execution
- custom skills/tools

---

## Important Restriction

Tactical Mode does NOT allow:
- unrestricted source mutation
- unrestricted self-evolution
- direct architecture rewriting
- internal protected subsystem modification

Those remain Origin-only.

---

## Philosophy

Tactical Mode should feel like:
an advanced cognitive operating environment.

Not:
raw engineering chaos.

---

# 3. Core / Normal Mode

## Purpose

Safe mainstream AI operating experience.

This mode is for:
- normal users
- consumers
- non-technical users
- companion workflows
- productivity workflows

---

## Capabilities

### Safe AI-Native Experience

- chat
- voice
- multimodal interaction
- LucaLink continuity
- Mini Chat
- VoiceHUD
- Luca Screen
- Hologram Face
- memory continuity
- local/cloud model selection
- guided automation
- safe computer-use
- widgets/presence surfaces

### Guided Onboarding

- chat/voice onboarding
- theme cards
- opacity configuration
- model recommendations
- Ollama auto-install
- personality generation
- adaptive UI simplification

---

## UX Principle

Core Mode should feel:
- simple
- cinematic
- safe
- intelligent
- persistent
- emotionally coherent

without exposing:
- runtime complexity
- dangerous autonomy
- engineering internals

---

# Runtime Governance Separation

## Creator Evolution Pipeline

Only Origin Mode can perform:

```text
Architecture Mutation
→ Sandbox Evaluation
→ Benchmark Validation
→ Security Verification
→ Human Review
→ Approved Update
→ Public Release
```

This is the correct LucaOS self-evolution model.

---

# Public User Adaptation Pipeline

Public LucaOS instances should only perform:

- memory personalization
- workflow optimization
- preference learning
- safe skill adaptation
- local behavioral tuning
- context optimization

NOT:
source-code self-mutation.

---

# Why This Architecture Is Important

This separation solves a major AI systems problem:

How to build:
- powerful autonomous cognition
while maintaining:
- safety
- stability
- usability
- governance
- trust

---

# Comparison To Other AI Systems

Most AI systems expose:
- one interface for everyone

LucaOS instead uses:
adaptive operational complexity layers.

This is much closer to:
- operating systems
- industrial control systems
- professional creative software
- cognitive infrastructure

than:
- chatbot applications.

---

# Doctrine Integration Targets

This architecture must be formally documented inside:

- UI_UX_DOCTRINE.md
- GUARD_SECURITY_SPEC.md
- EVOLUTION_CORE_SPEC.md
- ACCESS_CONTROL_SPEC.md
- ONBOARDING_FLOW.md
- MODEL_ROUTING_SPEC.md

---

# Core Principle

```text
Origin = evolve/build LucaOS
Tactical = deeply operate/extend LucaOS
Core = safely live with LucaOS
```

This is one of LucaOS’s strongest governance and UX architecture decisions.


---

# TipTour macOS Pattern: Focus Context + CUA Driver

## Source Repo

Repo:
https://github.com/milind-soni/tiptour-macos

TipTour is a practical example of integrating CUA Driver Core into a normal macOS assistant product.

This is not a separate architecture category from CUA.

It is a concrete implementation pattern showing how CUA-style computer-use can be combined with:
- voice
- screen understanding
- user-highlighted focus context
- macOS Accessibility
- precise GUI actions

---

# Why TipTour Matters For LucaOS

CUA gives LucaOS the computer-use infrastructure.

TipTour shows how that infrastructure becomes a usable product experience.

The key pattern is:

```text
Voice / Screen Understanding
→ User Focus Highlight
→ Accessibility Context
→ CUA Driver Action
→ Verification
```

This is directly relevant to:
- VoiceHUD
- Luca Screen
- Hologram Face
- Ghost Browser
- host embodiment
- Core Mode usability
- Tactical Mode precision workflows

---

# Pattern To Absorb

## Luca Focus Context Layer

Purpose:
Let the user point, highlight, select, or visually indicate an area of the screen, then bind that visual region to Luca’s current mission.

Example commands:
- “Luca, fix this part.”
- “Move this over there.”
- “Summarize this section.”
- “Click that option.”
- “Use this window for the task.”
- “Only work inside this selected area.”

---

# Required LucaOS Behavior

When the user highlights/selects a region:

1. Capture focused screen region.
2. Bind region to active mission context.
3. Extract UI/accessibility metadata when available.
4. Use CUA Driver/Core or equivalent computer-use API for actions.
5. Prefer Accessibility/API/DOM targeting over blind click coordinates.
6. Verify that action stayed inside expected context.
7. Save action trace into Mission Tape / trajectory recorder.
8. Fall back to full-screen perception only if focused context fails.

---

# Architecture Mapping

## Eyes

Luca Vision / screen understanding.

## Ears

VoiceHUD / speech input.

## Hands

CUA Driver / LucaComputerUseCore.

## Precision Layer

macOS Accessibility / Windows UI Automation / Linux AT-SPI / Android Accessibility.

## Memory Layer

Mission Tape + GUI trajectory record.

## Safety Layer

Luca Guard + permission gates + focused action scope.

---

# LucaOS Subsystems To Extend

## LucaComputerUseCore

Add:
- focused region action mode
- region-bound click/type/scroll
- accessibility-assisted targeting
- context-local verification

## Luca Screen

Add:
- user highlight overlay
- focused visual region capture
- action-region binding

## VoiceHUD

Add:
- voice command binding to selected region
- deictic commands like “this,” “that,” “here,” “there”

## Mission Engine

Add:
- focused-context mission state
- region-specific verification
- scope violation detection

## Luca Guard

Add:
- focus-scoped permissions
- deny actions outside highlighted scope unless escalated

---

# Why This Improves LucaOS

This makes LucaOS computer-use:

- more natural
- more precise
- safer
- less dependent on fragile full-screen reasoning
- easier for normal users
- stronger for multimodal workflows
- closer to human-like instruction following

Instead of requiring users to explain everything verbally, they can visually indicate the target.

This is very important for embodied AI because humans often communicate with:

```text
speech + pointing + context
```

not speech alone.

---

# Absorption Priority

Medium-high priority.

This should be implemented after:
- LucaComputerUseCore
- LucaTrajectoryRecorder
- basic sandbox/direct host modes

but before:
- full advanced God Mode autonomy

because focused context improves safety and usability for both Core and Tactical users.

---

# Final TipTour Absorption Verdict

TipTour proves that CUA Driver Core can be embedded into a polished assistant UX.

LucaOS should absorb the TipTour pattern as:

```text
Focused multimodal computer-use:
voice + visual focus + accessibility + CUA driver + verification
```

This strengthens LucaOS’s ability to operate host environments naturally and safely.


---

# Cursor-Guided Embodied Cognition

## Core Insight

The mouse cursor/highlight should become:
a precision intention interface for LucaOS.

Instead of forcing users to explain everything verbally, users can:
- point
- hover
- drag-select
- highlight
- focus windows
- circle regions
- indicate spatial context visually

This allows LUCA to bind:
human intention
to
computer-use precision.

---

# Why This Matters

Humans naturally communicate through:

```text
speech
+
pointing
+
visual grounding
+
context
```

not speech alone.

Most AI assistants still rely too heavily on:
- text prompting
- global screen reasoning
- ambiguous instructions

Cursor-guided embodiment dramatically improves:
- precision
- usability
- reliability
- speed
- natural interaction

---

# Architecture Principle

The cursor becomes:
an extension of human intention.

The highlighted region becomes:
temporary operational context.

LUCA should interpret:
- this
- that
- here
- there
- these
- move this
- edit that
- summarize this
- click here

using:
visual grounding + focused region binding.

---

# Operational Flow

```text
User points/highlights region
↓
Luca captures focused context
↓
Accessibility metadata extracted
↓
Voice/chat instruction received
↓
Mission Engine binds command to region
↓
LucaComputerUseCore executes action
↓
Verification layer confirms result
↓
Mission Tape stores trajectory
```

---

# LucaOS Subsystems To Extend

## Luca Screen

Add:
- visual highlight overlay
- drag region selection
- focus-window selection
- multi-region selection
- contextual action handles

---

## VoiceHUD

Add support for:
- “this”
- “that”
- “here”
- “there”
- “move this”
- “edit this”
- “work on this section”

Voice commands should automatically bind to:
current visual focus context.

---

## Hologram Face

Should visually acknowledge:
- active focused region
- current task target
- operational scope

This improves:
embodied presence feeling.

---

## LucaComputerUseCore

Add:
- focused-region execution mode
- context-local actions
- scoped click/type/scroll
- accessibility-assisted targeting
- constrained verification

Prefer:
Accessibility/UI metadata
over
raw coordinate clicking
when available.

---

## Mission Engine

Add:
- FocusContext object
- region-bound mission state
- focus persistence across steps
- scope violation detection

Mission Example:

```text
Mission:
"Fix this chart"

FocusContext:
Window = Excel
Region = selected graph area
Scope = local-only actions
```

---

## Luca Guard

Add:
- focus-scoped permissions
- deny actions outside focused scope unless escalated
- visual boundary enforcement
- focus integrity verification

This improves:
- safety
- trust
- predictability

especially for:
Core/Normal users.

---

# Why This Improves Computer-Use

Without focus context:

```text
AI
→ reasons over full screen
→ searches globally
→ higher hallucination risk
→ slower
```

With focus context:

```text
Human visually constrains target
→ Luca operates locally
→ less ambiguity
→ faster execution
→ higher precision
```

This is one of the strongest UX improvements for embodied AI systems.

---

# Relationship To CUA

CUA provides:
- the hands
- execution infrastructure
- drivers
- sandbox environments

Cursor-guided embodiment adds:
- intention grounding
- human spatial guidance
- visual task precision

Together they create:
human-guided embodied cognition.

---

# Relationship To Robotics

This architecture mirrors real-world robotics interaction:

Human:
- points
- gestures
- indicates object

Robot:
- binds object context
- performs constrained action

LucaOS should treat:
desktop environments
the same way robotics systems treat:
physical environments.

---

# Long-Term LucaOS Vision

Eventually:
all LucaOS embodiment surfaces should support:
- cursor grounding
- gesture grounding
- gaze grounding
- touchscreen grounding
- stylus grounding
- voice grounding

so LUCA can understand:
human intent spatially,
not only linguistically.

---

# Final Verdict

Cursor-guided embodied cognition is one of the most important UX patterns LucaOS should absorb.

It transforms:
computer-use
from:
global AI guessing

into:
human-guided operational embodiment.

This significantly improves:
- precision
- safety
- reliability
- multimodal interaction quality
- naturalness
- user trust
- embodied AI feeling


---

# CloakBrowser Pattern: Resilient Browser Embodiment Infrastructure

## Source Repo

Repo:
https://github.com/CloakHQ/CloakBrowser

CloakBrowser is a stealth Chromium runtime that acts as a drop-in Playwright/Puppeteer replacement using a custom Chromium binary with source-level fingerprint patches.

Important framing for LucaOS:
Do NOT absorb this as abuse/evasion tooling.

Absorb it as:
resilient browser embodiment infrastructure
for legitimate AI-agent browsing, enterprise workflows, research, and user-owned automation.

---

# Why CloakBrowser Matters For LucaOS

LucaOS has Ghost Browser and browser-use foundations.

But AI browser agents often fail because:
- websites detect automation
- sessions break
- browser fingerprints are inconsistent
- CDP/automation signals leak
- headless/headed differences appear
- interaction behavior looks robotic
- cookies/localStorage/session state are not preserved reliably

For LUCA to embody browsers properly, Ghost Browser must become a persistent browser body, not just a browser automation wrapper.

---

# Confirmed CloakBrowser Patterns To Absorb

## 1. Drop-In Playwright/Puppeteer Replacement Pattern

CloakBrowser exposes normal Playwright/Puppeteer-style APIs while swapping the browser runtime underneath.

LucaOS Absorption Target:
Ghost Browser Runtime Adapter

Purpose:
Let LucaOS switch between:
- default Chromium
- Playwright Chromium
- Electron Chromium
- hardened browser runtime
- sandbox browser body

without changing high-level mission logic.

Architecture:

```text
Mission Engine
→ LucaBrowserUseCore
→ Browser Runtime Adapter
→ Playwright / Electron / Cloak-like Chromium / Sandbox Browser
```

Why It Matters:
LucaOS should not lock Ghost Browser into one browser implementation.

---

## 2. Source-Level Browser Runtime Hardening

CloakBrowser patches Chromium at source level for browser fingerprint consistency.

Absorb safely as:
browser runtime reliability hardening.

Not:
anti-detection abuse.

LucaOS Absorption Target:
Ghost Browser Hardening Layer

Purpose:
Improve browser-body reliability by normalizing:
- canvas behavior
- WebGL behavior
- audio behavior
- font behavior
- GPU reporting
- screen properties
- WebRTC exposure
- automation flags
- CDP behavior
- browser timing signals

Why It Matters:
A browser body should behave consistently across sessions and environments.

---

## 3. Humanized Input Behavior

CloakBrowser supports humanized mouse, keyboard, and scroll behavior.

LucaOS Absorption Target:
Luca Human-Like Interaction Profile

Purpose:
Make Luca’s browser/computer-use actions:
- smoother
- less robotic
- less disruptive
- more natural
- less likely to break UI assumptions

Important:
This should be used for UX and reliability, not deception.

Integrate with:
- Cursor-Guided Embodied Cognition
- CUA Driver
- LucaComputerUseCore
- Mission Tape trajectories

---

## 4. Persistent Browser Profiles

CloakBrowser supports persistent profiles that preserve cookies and localStorage across sessions.

LucaOS Absorption Target:
Ghost Browser Body Profiles

Purpose:
Each mission/user/device can have persistent browser bodies with:
- cookies
- localStorage
- permissions
- sessions
- identity state
- tabs/workspaces
- trusted domains
- profile metadata

Why It Matters:
A browser body is an embodiment surface. It should have continuity.

---

## 5. Browser Profile Manager Pattern

CloakBrowser Manager is a self-hosted browser profile manager for:
- unique browser profiles
- proxies
- persistent sessions
- noVNC interaction

LucaOS Absorption Target:
Luca Browser Body Manager

Purpose:
Manage:
- personal browser body
- work browser body
- sandbox browser body
- research browser body
- disposable mission browser body
- risky-site sandbox browser body

Integrate with:
- Luca Guard
- LucaLink
- Mission Engine
- Ghost Browser
- Browser sandbox profiles

---

## 6. Binary Auto-Download + Integrity Verification

CloakBrowser downloads a Chromium binary on first run and verifies SHA-256 checksums.

LucaOS Absorption Target:
Trusted Browser Runtime Installer

Purpose:
When LucaOS installs browser bodies or drivers:
- download from trusted source
- verify checksum
- cache locally
- version runtime
- rollback if corrupted

Why It Matters:
Browser bodies are high-trust execution surfaces and must be verified.

---

## 7. Standard Browser API Compatibility

CloakBrowser works with normal Playwright/Puppeteer code.

LucaOS Absorption Target:
Browser Use Compatibility Layer

Purpose:
Existing Luca browser workflows should not need rewriting when switching browser runtime.

This enables:
- Ghost Browser using normal Playwright
- sandbox browser using same mission API
- hardened browser using same mission API
- external agents using same browser interface

---

# Current LucaOS Browser-Use State

Confirmed LucaOS public code/dependency signals:

## Existing Building Blocks

- Electron/Chromium shell
- Ghost Browser concept
- Playwright dependency
- Chromium BiDi dependency
- RobotJS dependency
- active window tracking
- Electron IPC bridge
- native host control
- MCP tool orchestration
- vision/screen grounding dependencies
- LucaLink device delegation

Interpretation:
LucaOS already has browser-use foundations.

Current Missing Layer:
Ghost Browser does not yet appear to have:
- hardened browser runtime abstraction
- browser body profile manager
- persistent mission browser bodies
- stealth/fingerprint-aware reliability layer
- browser runtime installer/checksum verification
- browser body security policy
- profile isolation architecture

---

# Required LucaOS Refactor

## New Subsystems

### 1. LucaBrowserUseCore

Unified browser-use API:

```text
openPage()
click()
type()
scroll()
extract()
screenshot()
runJS()
readDOM()
verify()
saveState()
restoreState()
```

### 2. GhostBrowserRuntimeAdapter

Runtime switcher for:
- Electron Chromium
- Playwright Chromium
- hardened Chromium runtime
- sandbox browser
- remote browser body

### 3. BrowserBodyProfileManager

Manages:
- persistent profiles
- disposable profiles
- mission profiles
- work/personal separation
- cookies/localStorage
- permissions
- browser identity metadata

### 4. BrowserBodyGuard

Security policy layer for:
- credential exposure
- untrusted pages
- prompt injection
- suspicious downloads
- cross-site automation
- risky browser actions
- profile access rules

### 5. BrowserRuntimeInstaller

Handles:
- runtime downloads
- checksums
- versioning
- rollback
- cache management

### 6. HumanInteractionProfile

Controls:
- mouse curves
- typing cadence
- scroll behavior
- pause timing
- user/non-user active mode

---

# Safety Boundary

LucaOS must NOT market this as:
- bypassing websites
- bot evasion
- scraping abuse
- avoiding detection for harmful automation

LucaOS should frame it as:
- resilient browser embodiment
- persistent browser-body infrastructure
- reliable legitimate automation
- user-owned browser continuity
- enterprise-safe browsing agents

---

# How This Connects To Other Absorptions

## With CUA

CUA provides:
- sandbox bodies
- GUI control
- benchmarks
- trajectories

CloakBrowser provides:
- hardened browser body runtime
- persistent browser profiles
- browser identity continuity

Combined:
LucaOS gets strong browser embodiment.

---

## With TipTour

TipTour provides:
- user focus context
- voice + screen guidance

CloakBrowser provides:
- reliable browser body execution

Combined:
User can point at a browser region and Luca acts precisely through a stable browser body.

---

## With Vellum

Vellum provides:
- credential execution isolation
- trust gates

CloakBrowser requires:
- browser credential/profile safety

Combined:
Browser profile access should be permissioned and audited.

---

# Absorption Priority

Medium priority after:
- LucaComputerUseCore
- sandbox/direct host modes
- mission trajectory recording

High priority before:
- public Ghost Browser automation marketplace
- full autonomous web workflows
- God Mode web operation

---

# Final CloakBrowser Absorption Verdict

CloakBrowser is strongest in:
- hardened browser runtime
- persistent browser profiles
- Playwright/Puppeteer compatibility
- browser fingerprint consistency
- humanized input behavior
- self-hosted browser profile management

LucaOS should absorb it as:
Ghost Browser embodiment infrastructure.

This helps LucaOS evolve Ghost Browser from:
browser automation
into:
persistent browser body.


---

# CloakBrowser Re-Absorption: Ghost Browser Runtime Hardening

## Source Repo

Repo:
https://github.com/CloakHQ/CloakBrowser

Related repos:
- https://github.com/CloakHQ/CloakBrowser-Manager
- https://github.com/CloakHQ/chromium-stealth-builds

---

# Correct LucaOS Framing

LucaOS browser-use should NOT be framed as botting.

LucaOS is an AI operating layer.

Therefore, Ghost Browser should be treated as:
a user-authorized browser body for Luca.

The goal is:
- reliable user-owned browsing workflows
- persistent browser identity
- fewer false interruptions
- smooth automation for legitimate work
- browser-body continuity
- stable mission execution

The browser should not be artificially blocked simply because Luca is operating it on behalf of the user.

---

# Why CloakBrowser Matters

CloakBrowser is not just a Playwright wrapper.

It uses:
- custom Chromium binary
- source-level C++ fingerprint patches
- drop-in Playwright/Puppeteer compatibility
- binary auto-download/caching
- browser fingerprint consistency
- automation signal removal
- humanized input behavior
- persistent profile support
- profile manager ecosystem

This makes it useful as:
Ghost Browser Runtime Hardening infrastructure.

---

# Patterns LucaOS Should Absorb Fully

## 1. Custom Browser Runtime Layer

CloakBrowser replaces the underlying Chromium binary while preserving familiar automation APIs.

LucaOS Target:
GhostBrowserRuntimeAdapter

Purpose:
Allow LucaOS to switch browser bodies without changing mission logic.

Supported runtimes:
- Electron Chromium
- Playwright Chromium
- Cloak-style hardened Chromium
- sandbox browser
- remote browser body
- mobile browser body

---

## 2. Source-Level Browser Hardening

CloakBrowser patches Chromium internals instead of relying only on JavaScript stealth patches.

LucaOS Target:
Ghost Browser Hardened Runtime

Absorb concepts:
- canvas consistency
- WebGL consistency
- audio fingerprint consistency
- font fingerprint consistency
- GPU/device reporting consistency
- WebRTC behavior control
- screen/platform consistency
- automation signal removal
- timing consistency
- CDP behavior normalization

Goal:
Make Luca’s browser body behave consistently like a normal user-owned browser.

---

## 3. Browser Body Identity

A browser body should have persistent identity state.

LucaOS Target:
BrowserBodyProfileManager

Each profile should preserve:
- cookies
- localStorage
- session state
- permissions
- tabs/workspaces
- mission history
- trusted domains
- profile trust level
- device association
- LucaLink sync metadata

Profile types:
- Personal Browser Body
- Work Browser Body
- Sandbox Browser Body
- Disposable Mission Browser Body
- Research Browser Body
- High-Risk Isolation Browser Body

---

## 4. Browser Profile Isolation

CloakBrowser-Manager pattern shows isolated profile management.

LucaOS Target:
Ghost Browser Body Manager

Purpose:
Separate browser identities by mission/context.

Examples:
- user personal browsing
- work account browsing
- sandbox research
- risky website exploration
- plugin-controlled browser body
- autonomous God Mode browser sandbox

---

## 5. Humanized Interaction Profile

CloakBrowser supports human-like input behavior.

LucaOS Target:
Luca Human Interaction Runtime

Purpose:
Make Luca actions:
- smoother
- less disruptive
- closer to real human interaction rhythms
- more compatible with modern web UX
- less likely to break UI workflows

Integrate with:
- Cursor-Guided Embodied Cognition
- TipTour Focus Context Layer
- CUA Driver
- Mission Tape trajectories

---

## 6. Trusted Runtime Installer

CloakBrowser auto-downloads browser binaries and verifies them.

LucaOS Target:
Ghost Browser Runtime Installer

Must support:
- trusted download source
- checksum verification
- versioning
- runtime cache
- rollback
- platform detection
- runtime compatibility checks

This mirrors LucaOS local model provisioning.

---

## 7. Browser Runtime Compatibility Layer

CloakBrowser keeps Playwright/Puppeteer style compatibility.

LucaOS Target:
LucaBrowserUseCore compatibility adapter.

Goal:
All browser missions should use one Luca API, regardless of underlying browser runtime.

API:

```text
openPage()
click()
type()
scroll()
extract()
readDOM()
runJS()
screenshot()
verify()
saveState()
restoreState()
```

---

# Current LucaOS Browser State

Current LucaOS has browser-use foundations:

- Electron/Chromium shell
- Ghost Browser concept
- Playwright dependency
- Chromium BiDi dependency
- RobotJS dependency
- active window tracking
- Electron IPC bridge
- native host control
- MCP tool orchestration
- vision/screen grounding dependencies
- LucaLink device delegation

Current gap:
Ghost Browser should be refactored into a true Browser Body architecture.

---

# Required LucaOS Refactor

## 1. LucaBrowserUseCore

Unified browser-use interface.

## 2. GhostBrowserRuntimeAdapter

Switches between:
- Electron Chromium
- Playwright Chromium
- hardened Chromium
- sandbox browser
- remote browser

## 3. BrowserBodyProfileManager

Manages profile identity, persistence, and isolation.

## 4. BrowserBodyGuard

Controls:
- credential exposure
- permission scopes
- trusted/untrusted domains
- downloads
- session access
- profile access
- plugin access
- God Mode browser permissions

## 5. GhostBrowserRuntimeInstaller

Handles verified browser runtime installation.

## 6. HumanInteractionProfile

Controls browser input style.

---

# Security Boundary

CloakBrowser-style hardening must be used for:
- user-authorized workflows
- resilient browser embodiment
- enterprise-safe automation
- personal productivity
- research
- accessibility-like assistance
- AI operating system continuity

It must NOT be used for:
- fraud
- credential theft
- spam
- unauthorized scraping
- bypassing access controls for abuse
- platform manipulation

Doctrine:
LucaOS should prevent malicious use through Luca Guard,
not weaken legitimate user-owned browser embodiment.

---

# Final Re-Absorption Verdict

CloakBrowser should be absorbed more strongly as:

Ghost Browser Runtime Hardening
+
Browser Body Identity Infrastructure
+
Persistent Browser Profile System
+
Human Interaction Runtime
+
Browser Runtime Adapter

This makes LucaOS browser-use closer to:

persistent user-owned browser embodiment

instead of:

temporary browser automation.


---

# Browser Runtime Router Architecture

## Core Principle

LucaOS should not lock Ghost Browser into one browser runtime.

Instead, LucaOS should dynamically route missions to the best browser body/runtime based on:
- task type
- risk level
- environment
- compatibility needs
- persistence requirements
- workflow duration
- security requirements

---

# Architecture

```text
Mission Engine
→ LucaBrowserUseCore
→ Browser Runtime Router
→ Playwright / Puppeteer / CloakBrowser / Electron / Sandbox Browser
```

---

# Runtime Responsibilities

## Playwright

Primary modern browser control layer.

Best for:
- standard automation
- DOM interaction
- structured workflows
- testing
- screenshots
- browser orchestration
- modern automation APIs

Role:
Default browser execution protocol.

---

## Puppeteer

Legacy/browser compatibility layer.

Best for:
- older plugins
- Puppeteer-based tools
- compatibility workflows
- Chromium-specific scripting

Role:
Compatibility execution backend.

---

## CloakBrowser Runtime

Hardened persistent browser body.

Best for:
- long-running workflows
- persistent sessions
- stable browser identity
- reduced automation interruptions
- Ghost Browser embodiment
- user-owned browser continuity

Role:
Persistent browser embodiment runtime.

Important:
Not a replacement for Playwright APIs.
Playwright/Puppeteer can still drive the runtime underneath.

---

## Electron Chromium

Internal LucaOS browser/runtime shell.

Best for:
- Luca internal surfaces
- Ghost Browser UI
- widgets
- onboarding
- Luca-native workflows
- embedded operational panels

Role:
Native Luca operating browser surface.

---

## Sandbox Browser Body

Isolated disposable browser environment.

Best for:
- God Mode
- risky browsing
- untrusted sites
- autonomous experimentation
- self-evolution testing
- plugin isolation

Role:
Safe browser embodiment environment.

---

# Runtime Routing Logic

Example routing behavior:

```text
Internal Luca UI
→ Electron Chromium

Standard browser automation
→ Playwright

Legacy Puppeteer workflow
→ Puppeteer

Persistent browser identity needed
→ CloakBrowser-backed runtime

Automation interruptions detected
→ CloakBrowser-backed runtime

High-risk workflow
→ Sandbox Browser

Benchmark/testing mode
→ CUA Sandbox Browser
```

---

# Why This Architecture Is Superior

Replacing the stack completely with CloakBrowser would:
- tightly couple LucaOS to one runtime
- reduce flexibility
- increase maintenance risk
- reduce compatibility

The router architecture allows:
- runtime flexibility
- future browser bodies
- better compatibility
- safer embodiment
- adaptive mission execution

---

# Final Principle

Playwright/Puppeteer are:
browser control protocols.

CloakBrowser is:
a stronger browser body/runtime.

CUA provides:
sandbox embodiment environments.

Electron provides:
LucaOS native operating shell.

Together they form:
adaptive browser embodiment infrastructure for Ghost Browser.
