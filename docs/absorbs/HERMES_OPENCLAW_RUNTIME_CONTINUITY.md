# Hermes/OpenClaw always-on runtime continuity reconnaissance

## Executive summary

Hermes Agent's exact backend/runtime implementation appears to be public at
[`NousResearch/hermes-agent`](https://github.com/NousResearch/hermes-agent). The
repository advertises an MIT license, a Python-first agent runtime, a messaging
gateway, FTS-backed session persistence, a cron scheduler, self-improving skills,
MCP integration, multiple terminal backends, and OpenClaw migration support. The
main LucaOS absorb value is **not code copying**; it is the architecture pattern:
a small always-on gateway/runtime process that owns event ingestion, resumable
session state, scheduled work, bounded tool authority, and auditable provenance.

OpenClaw is also public at [`openclaw/openclaw`](https://github.com/openclaw/openclaw)
and is MIT-licensed. Its public README and docs emphasize a local-first Gateway,
daemon installation, multi-channel inbox, multi-agent routing, workspace skills,
sessions, cron, host/sandbox execution split, and device nodes. These are useful
adjacent patterns for LucaOS because LucaOS already has memory, route-aware model
readiness, deterministic execution contracts, tool metadata, MCP clients, and
runtime diagnostics, but does **not** yet have one explicit persisted runtime
continuity plane for jobs, state snapshots, scheduler provenance, or self-authored
skill lifecycle governance.

The critical safety finding is that Hermes/OpenClaw-style systems combine memory,
skills, scheduled jobs, files, messaging, browser/MCP, and shell inside one owner
authority boundary. The Sleeper Channels paper frames the risk as a delayed,
cross-surface confused-deputy class: untrusted input can persist as memory, skill,
schedule, or filesystem state and fire later through a different surface. LucaOS
should therefore absorb runtime continuity **only with provenance gates**: every
memory, skill, scheduled job, runtime snapshot, and risky tool action needs source
metadata, an action-instance digest, one-shot owner approval, audit logs, expiry,
revocation, and quarantine rules.

This PR is documentation-only. It does not wire active scheduling, autonomous
background execution, tool runtime changes, App/dashboard changes, model routing,
voice pipeline changes, onboarding changes, or memoryService changes.

## Sources inspected

### Repository discovery attempts

Searches performed on 2026-05-28:

- `Hermes Agent Nouns Research GitHub`
- `OpenClaw Hermes Agent GitHub`
- `Hermes always-on agent memory scheduling shell skills`
- `Hermes personal AI stack self authored skills`
- `api.github.com/repos/NousResearch/hermes-agent/commits/main`
- `site:github.com/NousResearch/hermes-agent cron scheduler Hermes Agent`
- `site:github.com/NousResearch/hermes-agent hermes_state.py SessionDB`
- `site:hermes-agent.nousresearch.com Cron Scheduling Hermes Agent`
- `Sleeper Channels and Provenance Gates`
- `no multi-input approval reuse agent provenance gates`
- `action-instance digest approval agent`

### Exact Hermes Agent implementation found

- Repository: [`https://github.com/NousResearch/hermes-agent`](https://github.com/NousResearch/hermes-agent)
- License: MIT per repository README/license display and raw
  [`LICENSE`](https://raw.githubusercontent.com/NousResearch/hermes-agent/main/LICENSE).
- Branch/commit inspected: public `main` branch as served by GitHub on
  2026-05-28. The GitHub page displayed latest release `Hermes Agent v0.15.0
  (2026.5.28)` and the main branch repository file tree. A local `git ls-remote`
  attempt was blocked by a network `CONNECT tunnel failed, response 403`, so this
  reconnaissance records public web/GitHub file references rather than a local
  cloned commit SHA.
- Relevant public files/docs inspected:
  - [`README.md`](https://github.com/NousResearch/hermes-agent) — advertised
    learning loop, gateway, cron, terminal backends, toolsets, memory, skills,
    migration, and MIT license.
  - [`hermes_state.py`](https://raw.githubusercontent.com/NousResearch/hermes-agent/main/hermes_state.py)
    — SQLite session store with WAL fallback, FTS5, session/message schema,
    parent session chains, retry/locking behavior, and schema reconciliation.
  - [`run_agent.py`](https://raw.githubusercontent.com/NousResearch/hermes-agent/main/run_agent.py)
    — `AIAgent` constructor surface includes session DB, platform/user/chat
    metadata, callbacks, toolsets, checkpoint limits, and recall helpers.
  - [`gateway/session.py`](https://github.com/NousResearch/hermes-agent/blob/main/gateway/session.py)
    — gateway session storage, SQLite/JSON fallback, per-source session keys,
    reset policies, and active-process preservation behavior surfaced by search
    snippets.
  - [`cron/scheduler.py`](https://github.com/NousResearch/hermes-agent/blob/main/cron/scheduler.py)
    — scheduler execution, job provenance helpers, delivery resolution,
    cron-specific toolset resolution, script execution, wake gate parsing, and
    session DB persistence.
  - [`website/docs/user-guide/features/cron.md`](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/cron.md)
    — cron jobs, gateway tick behavior, `~/.hermes/cron/jobs.json`, `.tick.lock`,
    fresh agent sessions, skill injection, delivery targets, profile pinning,
    and cron toolset scoping.
  - [`website/docs/user-guide/sessions.md`](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/sessions.md)
    — session persistence in `~/.hermes/state.db`, full message history,
    FTS5 search, platform/user metadata, model config, system prompt snapshots,
    and parent session IDs.
  - [`agent/memory_manager.py`](https://github.com/NousResearch/hermes-agent/blob/main/agent/memory_manager.py)
    — public memory manager path inspected for memory layout signals.
  - [`agent/skill_manager.py`](https://github.com/NousResearch/hermes-agent/blob/main/agent/skill_manager.py)
    — public skill manager path inspected for skills lifecycle signals.
  - [`Issue #3968`](https://github.com/NousResearch/hermes-agent/issues/3968)
    — cron prompt-injection issue describing skill-content injection into cron,
    non-interactive auto-approval, and mitigations.

Safe to absorb from Hermes: architecture patterns, data-model boundaries, safety
requirements, daemon/session/scheduler topology, persistence concepts, and
operator UX primitives. Do not copy code into LucaOS without a separate license
review, attribution plan, and compatibility check, even though the public license
is permissive.

### Adjacent OpenClaw implementation inspected

- Repository: [`https://github.com/openclaw/openclaw`](https://github.com/openclaw/openclaw)
- License: MIT per raw [`LICENSE`](https://raw.githubusercontent.com/openclaw/openclaw/main/LICENSE).
- Branch/commit inspected: public `main` branch as served by GitHub on
  2026-05-28; no local clone because direct terminal GitHub access was blocked by
  the same CONNECT restriction.
- Relevant public files/docs inspected:
  - [`README.md`](https://raw.githubusercontent.com/openclaw/openclaw/main/README.md)
    — local-first Gateway, daemon install, channel list, onboarding, DM pairing,
    multi-agent routing, voice wake/talk, first-class tools, skills, host tools,
    sandbox defaults, workspace paths, and development loop.
  - GitHub README rendered lines around security/workspace details: host default
    for main session, sandbox mode for non-main sessions, denied high-risk
    toolsets in typical sandbox, workspace root, `AGENTS.md`, `SOUL.md`,
    `TOOLS.md`, and `skills/<skill>/SKILL.md`.

### Safety and threat model references

- [`Sleeper Channels and Provenance Gates: Persistent Prompt Injection in Always-on Autonomous AI Agents`](https://arxiv.org/abs/2605.13471)
  — arXiv abstract and public summary inspected. Key concepts absorbed:
  persistent process under owner identity, persistence substrates, firing
  separation, canonical action-instance digest, one-shot owner attestations,
  no paraphrase laundering, no multi-input grant reuse, no replay, and mediation
  hooks around cron.
- Public paper mirror/snippet at
  [`papers.cool/arxiv/2605.13471`](https://papers.cool/arxiv/2605.13471) and
  journal PDF mirror were inspected to confirm the threat framing and artifact
  link.
- [`OpenClaw Sleeper Channel Prompt Injection Defense Checklist`](https://www.getopenclaw.ai/how-to/openclaw-sleeper-channel-prompt-injection-defense)
  — secondary operational checklist inspected for practical defense mapping only;
  not used as a primary implementation source.

### LucaOS files inspected

- `src/services/eventBus.ts`
- `src/services/memoryService.ts`
- `src/services/memory/MemoryReadinessResolver.ts`
- `src/services/runtime/RuntimeDiagnosticsService.ts`
- `src/services/execution/LucaDeterministicExecution.ts`
- `src/services/execution/LucaExecutionReceipt.ts`
- `src/services/skills/SkillManifest.ts`
- `src/services/skills/SkillManifestAdapter.ts`
- `src/services/skills/SkillManifestMapping.ts`
- `src/services/skills/SkillLifecycleGate.ts`
- `src/services/toolRegistry.ts`
- `src/services/mcpClientManager.js`
- `src/services/agent/tools/AgentToolBridge.ts`
- `docs/luca-gsd-deterministic-execution-absorb.md`
- `docs/luca-deterministic-execution-contract.md`
- `docs/security/GUARD_SECURITY_SPEC.md`
- `docs/skills/SKILLS_RUNTIME_SPEC.md`
- `docs/runtime/RUNTIME_STANDARDS.md`
- `docs/runtime/MEMORY_SPEC.md`

## Hermes/OpenClaw architecture findings

### Persistent process lifecycle

Hermes has two main always-on entry points: the interactive CLI and a messaging
gateway. The README describes `hermes gateway` as the gateway for Telegram,
Discord, Slack, WhatsApp, Signal, email, and other surfaces, and the cron docs
state that cron execution is handled by the gateway daemon. This makes the
long-lived gateway the continuity anchor.

OpenClaw similarly positions the Gateway as the local-first control plane and
recommends daemon installation through onboarding (`openclaw onboard
--install-daemon`) so it stays running. Its README describes companion apps and
nodes as optional surfaces connected to the Gateway rather than the core runtime
itself.

**Absorb pattern:** LucaOS should introduce a `RuntimeContinuityService` as a
small orchestrator with explicit lifecycle state: `stopped`, `starting`,
`resuming`, `idle`, `busy`, `degraded`, `quarantined`, and `stopping`. It should
not perform autonomous work yet; PR #109 should only persist/read snapshots and
publish diagnostics.

### Startup/resume and runtime state snapshot

Hermes persists sessions in `~/.hermes/state.db`, including session metadata,
full message history, model configuration, system prompt snapshots, timestamps,
parent session IDs, tool call information, token counts, and source/platform
metadata. `hermes_state.py` initializes the DB, reconciles schema columns on
startup, uses WAL when possible, and falls back to DELETE journaling on
WAL-incompatible filesystems.

OpenClaw exposes operator commands such as `/status`, `/new`, `/reset`,
`/compact`, `/restart`, and session tools such as `sessions_list`,
`sessions_history`, and `sessions_send`, implying first-class session recovery
and operator-visible lifecycle controls.

**Absorb pattern:** LucaOS needs a runtime snapshot record that is separate from
chat memory: current session IDs, active task handles, model route snapshot,
privacy route snapshot, pending approvals, active tool scopes, scheduler pause
state, last heartbeat, and restart reason. Store behavior should be read-only
until provenance is available.

### Background loop and event ingestion

Hermes cron docs describe a gateway scheduler tick every 60 seconds. On each
tick, jobs are loaded from `~/.hermes/cron/jobs.json`, due jobs are selected,
fresh `AIAgent` sessions are started, attached skills may be injected, prompts
run to completion, results are delivered, and run metadata/next scheduled time is
updated. A `.tick.lock` prevents overlapping ticks.

OpenClaw describes a multi-channel inbox, gateway protocol, webhooks, Gmail
Pub/Sub, sessions, nodes, and channel adapters. It centralizes ingress through a
Gateway that routes channel/account/peer events to agents/workspaces.

**Absorb pattern:** LucaOS should evolve `eventBus` from an in-memory priority
queue into an event ingestion boundary with optional durable envelopes and
source provenance. A future scheduler must consume typed events rather than call
services directly.

### Scheduler/cron jobs and long-horizon task continuation

Hermes exposes a `cronjob` tool with create/list/pause/resume/edit/trigger/remove
style actions. Jobs can deliver to origin chat, local files, or configured
platform targets. Jobs run in fresh sessions and can attach skills. Profile
pinning can switch `HERMES_HOME`/config for the duration of the run. Cron-specific
toolsets are resolved separately from the CLI default, and scripts are restricted
to `HERMES_HOME/scripts/` with a timeout and wake-gate convention.

OpenClaw similarly advertises cron as a first-class tool family and recommends
sandbox/toolset defaults for non-main sessions.

**Absorb pattern:** LucaOS should not add active cron in PR #108. The next
implementation should add scheduler types and storage with all jobs disabled by
default, then add provenance-gated activation later.

### Task queue and state recovery after restart

Hermes' session DB stores ended/reopened state, parent session chains, and
session-source metadata. Gateway session storage preserves active processes from
reset policies according to public search snippets. Cron job metadata includes
run metadata and next scheduled time. Together these form a lightweight recovery
model: sessions and jobs are durable, active work is visible, and restarts can
resume metadata even if not every subprocess survives.

**Absorb pattern:** LucaOS should model tasks as durable intents with volatile
process handles. After restart, LucaOS should never silently resume a risky
process; it should surface `needs_owner_review` unless the job is read-only,
explicitly approved, and digest-matched.

### Tools/shell execution

Hermes advertises terminal backends: local, Docker, SSH, Singularity, Modal, and
Daytona. The README highlights shell execution via bundled Git Bash on Windows,
MCP server support, 40+ tools, RPC scripts, and isolated subagents.

OpenClaw's README states host tools run on the host by default for the `main`
session, with sandbox mode recommended for non-main/group/channel sessions. The
typical sandbox allowlist includes read/write/edit/session tools and denies high
risk browser/canvas/nodes/cron/discord/gateway toolsets.

**Absorb pattern:** LucaOS already has security levels, mission scopes,
concurrency-safety metadata, MCP client discovery/execution, and deterministic
execution architecture contracts. The missing piece is a provenance gate between
stored background artifacts and risky tool invocation.

### Memory continuity

Hermes splits at least two memory layers:

1. **Session memory:** full transcripts in SQLite with FTS5 search and platform
   metadata.
2. **Agent/user/procedural memory:** README/docs advertise persistent memory,
   user profiles, periodic nudges, session search, and skills as procedural
   memory.

OpenClaw exposes memory/persona artifacts through workspace files and migration
concepts such as `SOUL.md`, `MEMORY.md`, `USER.md`, and user-created skills.

**Absorb pattern:** LucaOS has strong semantic/vector memory foundations, but
should add a runtime memory category for non-user facts: job state, approvals,
active session snapshots, process metadata, skill provenance, and scheduled-task
state. These should not be mixed into user/persona memories by default.

### Skill/self-evolution continuity

Hermes README describes autonomous skill creation after complex tasks,
self-improving skills, a Skills Hub/open standard, migration of OpenClaw skills
into `~/.hermes/skills/openclaw-imports/`, and slash command browsing/execution
of skills. Cron can attach skills to jobs.

OpenClaw's README documents workspace skills under
`~/.openclaw/workspace/skills/<skill>/SKILL.md`, alongside injected prompt files
`AGENTS.md`, `SOUL.md`, and `TOOLS.md`. It also points to ClawHub as a skills
registry.

**Absorb pattern:** LucaOS should use its existing skills manifest and lifecycle
gate files as the start of a skills registry, but future self-authored skills
must be persisted with immutable provenance: source prompt, author surface,
reviewer, allowed tools, digest, version, replacement history, and rollback.

### Safety/provenance

Hermes issue #3968 is the clearest public concrete warning: skill content loaded
at cron execution time can bypass prompt scanning, inherit high authority when
prepended into the job prompt, and then run non-interactively. The issue's
suggested mitigations include scanning the assembled prompt, whitelisting cron
toolsets, resource limits, and stricter approval.

The Sleeper Channels paper generalizes this to any persistent substrate and
later firing surface. It specifically calls for canonical action-instance
digests and one-shot owner attestations so approval for one artifact cannot be
reused for paraphrased or aggregated future actions.

**Absorb pattern:** LucaOS should require provenance and approval at storage time
and at execution time. Stored instructions without provenance must be treated as
untrusted data, not control-plane authority.

## LucaOS current-state comparison

### What LucaOS already has

- **In-memory event bus:** `eventBus` defines prioritized events, a queue,
  bounded in-memory history, acknowledgements, and typed telemetry/tool events.
  It currently emits and processes events in-process and does not persist event
  envelopes across restarts.
- **Persistent local memory archive:** `memoryService` uses
  `LUCA_LUCA_ARCHIVE_V1` in localStorage, can sync memory updates/wipes through
  Luca Link, and can save primary-device memory snapshots to the backend.
- **Hybrid memory routing:** `memoryService` resolves local/delegated/standalone
  behavior and selected embedding model settings, while `MemoryReadinessResolver`
  models route/provider/privacy/readiness decisions.
- **Cortex/vector readiness:** runtime diagnostics probe memory vector-store
  readiness and report local archive + Cortex vector details through the
  runtime diagnostics service.
- **Deterministic execution foundation:** `LucaDeterministicExecution` models
  execution intents, steps, plans, risk levels, permission modes, receipt
  requirements, and an explicit architecture-only posture with live/autonomous
  execution disabled.
- **Execution receipts:** execution receipt types already capture receipt IDs,
  intent/plan/step IDs, actor tier, tool name, status, timestamps, inputs,
  outputs, side effects, verification, audit references, and runtime behavior
  posture.
- **Skill manifest/lifecycle groundwork:** LucaOS has skill manifests,
  lifecycle gates, manifest adapters, mapping tests, and a SKILLS runtime spec.
- **Tool metadata:** `toolRegistry` categorizes tools, assigns security levels,
  mission scopes, concurrency safety, and skill-set tags; system tools such as
  terminal/settings/model management are high-security.
- **MCP/tool bridge:** `mcpClientManager` discovers tools, tracks clients,
  health-checks before calls, and applies timeouts; `AgentToolBridge` intersects
  persona access with runtime-registered tools before backend execution.
- **Runtime diagnostics:** `RuntimeDiagnosticsService` summarizes chat,
  embedding, STT, TTS, memory, local runtime, key readiness, onboarding warnings,
  and recommended operator actions.

### What LucaOS lacks for Hermes-level runtime continuity

- A durable runtime continuity snapshot that survives app restarts.
- A single lifecycle controller for startup/resume/degraded/quarantine states.
- A persisted scheduler/job store.
- Job-level provenance, approval digest, expiry, and revocation.
- A background worker contract that consumes event envelopes rather than ad hoc
  direct service calls.
- A durable event log/audit stream for inbound messages, memory writes, skill
  writes, schedule writes, and tool executions.
- Distinct runtime memory for jobs/processes/skills separate from user/persona
  semantic memory.
- A self-authored skill registry with immutable provenance and allowed-tool
  scopes.
- Startup skill loading policy that can quarantine unknown, unsigned, revoked,
  or unreviewed skills.
- A control center to revoke/delete an artifact and every downstream artifact or
  approval derived from it.
- A scheduler UI/settings surface that clearly distinguishes disabled draft jobs,
  approved read-only jobs, approved risky jobs, and quarantined jobs.

### Important non-goals for this PR

This PR intentionally does **not** change:

- `App.tsx`
- dashboard shell or runtime panels
- `memoryService`
- voice/STT/TTS pipeline
- model routing/onboarding
- tool runtime/MCP execution
- active scheduler behavior
- autonomous background execution

## Absorb candidates

| Candidate | Classification | Why |
| --- | --- | --- |
| Runtime continuity snapshot types and document-first architecture | Absorb now | Low-risk and maps directly to current diagnostics/execution contracts. |
| Event envelope provenance fields | Absorb now | Needed before durable event ingestion or scheduler activation. |
| Scheduler/job data model with disabled-by-default storage | Absorb now | Enables design validation without autonomous execution. |
| Runtime lifecycle state machine | Absorb now | Useful for diagnostics and restart readiness without running background jobs. |
| Cron-like active tick loop | Absorb later | Requires provenance gates, operator UX, and resource controls first. |
| Fresh session per scheduled job | Absorb later | Good isolation pattern, but must be connected to memory/model route snapshots. |
| Per-platform/toolset scoping for jobs | Absorb later | Should reuse Luca tool security levels and route-aware privacy. |
| Skills as procedural memory | Absorb later | Aligns with Luca skills groundwork but needs registry/provenance first. |
| Self-authored skill replacement/update | Unsafe without provenance gates | High sleeper-channel risk if skills can alter future behavior. |
| Non-interactive shell/file/browser execution from cron | Unsafe without provenance gates | Directly implicated by Sleeper Channels and Hermes cron issue #3968. |
| Importing Hermes/OpenClaw code | Do not absorb in this PR | Research PR should avoid code copying; architecture mapping is sufficient. |
| Host-default execution for all main-session jobs | Do not absorb | LucaOS should fail closed and require per-action owner approval. |
| Memory writes that can become future instructions without source review | Unsafe without provenance gates | Converts untrusted input into persistent authority. |

## Recommended implementation PR sequence

### PR #109 — Always-on runtime continuity foundation

Goal: create the dormant continuity substrate, not autonomous execution.

Likely files to add/change:

- Add `src/services/runtime/RuntimeContinuityTypes.ts` for lifecycle states,
  snapshot schema, restart reasons, heartbeat summary, active handle metadata,
  and provenance references.
- Add `src/services/runtime/RuntimeContinuityStore.ts` as a disabled/local-only
  persistence adapter or pure in-memory adapter with a storage interface.
- Extend `src/services/runtime/RuntimeDiagnosticsService.ts` to report a
  continuity section once the store exists.
- Add tests under `src/services/runtime/` for snapshot normalization, restart
  state, and fail-closed defaults.
- Add docs under `docs/runtime/` explaining that no background execution is
  enabled.

Acceptance criteria:

- No scheduler tick.
- No tool calls.
- No memory writes unless explicitly tested in isolated store adapters.
- Continuity snapshot marks autonomous execution disabled by default.

### PR #110 — Scheduler/provenance gate foundation

Goal: define job storage, provenance, and approval packets before enabling runs.

Likely files to add/change:

- Add `src/services/scheduler/SchedulerTypes.ts` with job definitions, disabled
  default, schedule expressions, trigger types, delivery targets, run metadata,
  and provenance fields.
- Add `src/services/provenance/ProvenanceTypes.ts` with source artifact,
  normalized action packet, digest, owner approval, expiry, revoke chain,
  quarantine reason, and audit references.
- Add `src/services/provenance/ActionDigest.ts` for deterministic canonical
  digest creation.
- Add tests proving equivalent actions hash consistently and materially different
  actions do not share approvals.
- Add diagnostics-only scheduler status to runtime diagnostics/settings.

Acceptance criteria:

- Jobs can be drafted but not run.
- Risky jobs cannot be marked active without one-shot approval packet fields.
- No multi-input approval reuse.

### PR #111 — Skills registry/self-evolution continuity foundation

Goal: persist skills as governed artifacts, not free-form future authority.

Likely files to add/change:

- Add `src/services/skills/SkillRegistryStore.ts` for manifest + content digest +
  version metadata.
- Extend `src/services/skills/SkillManifest.ts` with provenance references,
  allowed tool scopes, allowed trigger classes, owner approval state, and expiry.
- Extend `src/services/skills/SkillLifecycleGate.ts` to quarantine unknown,
  unsigned, revoked, missing-provenance, or high-risk skills.
- Add `docs/skills/SKILLS_PROVENANCE_SPEC.md`.

Acceptance criteria:

- Registry can list/diff/quarantine skills.
- Loading a self-authored skill never grants shell/schedule/tool authority by
  default.
- Skill replacement keeps predecessor chain and rollback metadata.

### PR #112 — Memory governance/control center

Goal: give the operator review/revoke/delete controls across memory, skills,
jobs, and approvals.

Likely files to add/change:

- Add `src/services/memory/MemoryGovernanceTypes.ts` for memory provenance,
  trust level, quarantine state, retention, and downstream references.
- Extend memory diagnostics to surface untrusted/quarantined memory counts.
- Add settings/runtime UI panels for memory/job/skill provenance review.
- Add audit-log query helpers under `src/services/provenance/`.

Acceptance criteria:

- Operator can revoke a source artifact and see downstream memory/skill/job
  approvals invalidated.
- Untrusted memory can be recalled as data but not as instruction.
- All risky background paths fail closed when provenance is missing.

## Concrete LucaOS implementation map

### `services/runtime`

- `RuntimeContinuityTypes.ts`: lifecycle state, runtime snapshot, active task
  handles, restart reason, heartbeat, degradation, quarantine summary.
- `RuntimeContinuityStore.ts`: interface plus local adapter. Start with dormant
  storage only.
- `RuntimeContinuityService.ts`: later lifecycle coordinator that consumes events
  and snapshots; initially no active loop.
- `RuntimeDiagnosticsService.ts`: add continuity/scheduler/provenance status once
  data exists.

### `services/scheduler`

- `SchedulerTypes.ts`: job model, trigger model, schedule expression, delivery
  target, enabled flag, last/next run metadata, owner approval reference.
- `SchedulerStore.ts`: draft/disabled job persistence.
- `SchedulerPolicy.ts`: fail-closed policy checks before a job can run.
- `SchedulerRunner.ts`: later active tick/dispatch module; do not add until
  provenance foundations pass.

### `services/provenance`

- `ProvenanceTypes.ts`: source envelope, trust level, artifact kind, normalized
  action packet, digest, one-shot approval, expiry, revocation chain, audit refs.
- `ActionDigest.ts`: canonical JSON normalization and digest generation.
- `ApprovalLedger.ts`: one-shot approval storage and consumption.
- `AuditLog.ts`: append-only local audit adapter with future export support.

### `services/skills`

- Extend existing manifest/lifecycle work with registry persistence, skill content
  digests, versioning, provenance, allowed tools, allowed triggers, and quarantine.
- Candidate store path: local app data / archive-backed registry rather than
  unreviewed repo files.
- Skills should be readable by the agent as data until explicitly approved as
  callable behavior.

### `services/memory`

- Add runtime memory classes distinct from user semantic memory:
  `runtime_snapshot`, `job_state`, `skill_provenance`, `approval_record`,
  `audit_summary`.
- Add trust/quarantine metadata to future memory governance, not directly to
  existing memory writes in this PR.
- Keep route-aware privacy: local/BYOK/Luca Prime route decisions should be
  preserved on memory provenance.

### Runtime diagnostics and settings

- Add dashboard/status-only visibility before adding any active behavior:
  continuity state, scheduler disabled/enabled, jobs pending approval,
  quarantined skills, untrusted memories, last audit entry, and next required
  owner action.
- Settings should expose hard off switches before any background loop exists:
  scheduler disabled, background tool execution disabled, self-authored skill
  execution disabled, remote message-triggered actions disabled.

## Safety requirements before enabling always-on autonomy

1. **Every persisted artifact needs provenance.** Memory, skill, schedule, script,
   MCP config, context file, and runtime snapshot records need source surface,
   author identity if known, timestamp, route/privacy posture, trust level,
   content digest, and downstream references.
2. **Risky actions need canonical action-instance digests.** The digest must bind
   action kind, tool name, normalized arguments, target resource, credentials
   scope, input artifact IDs/digests, delivery target, model route, and expiry.
3. **Approvals are one-shot and exact.** Approval for one job/tool action must not
   approve paraphrased payloads, merged inputs, new targets, new credentials, or
   replayed actions.
4. **No multi-input approval reuse.** If a job/action is derived from multiple
   memories/messages/files, the approval packet must list every source digest.
   Adding or replacing one source invalidates the approval.
5. **No silent scheduled risky execution.** Background jobs that use shell,
   filesystem writes, browser, MCP, messaging, email, finance, device control,
   settings, memory mutation, or skill mutation require explicit owner approval
   at activation and digest match at every run.
6. **Untrusted stored content is data, not instruction.** Memories, skills, and
   context files created from public chats, web pages, documents, email, or
   remote devices must not be injected as system-level instructions until
   reviewed.
7. **Quarantine is default for missing provenance.** Unknown imported skills,
   old jobs, migrated memories, and unverified file patches should be visible but
   non-executable.
8. **Revocation must cascade.** Deleting/revoking a source message/file/memory
   should invalidate derived skills, schedules, approvals, and runtime snapshots.
9. **Audit logs must prove non-reuse.** Store run ID, source artifact digests,
   normalized action packet, approval ID, approval consumer, tool calls, result,
   side effects, and downstream artifacts.
10. **Credential scopes should be workflow-specific.** Do not let every scheduled
    job inherit owner-level tokens. Prefer read-only/local credentials, narrow
    OAuth scopes, per-workflow secrets, and explicit revocation.
11. **Runtime must fail closed after restart.** If LucaOS cannot prove a job,
    skill, memory, or process handle is approved and current, it should pause and
    request review.
12. **Operator UX must show provenance before action.** Approval prompts should
    explain what will run, why, from which sources, with which tools/credentials,
    where output goes, rollback plan, and expiry.

## Final PR #108 conclusion

Hermes Agent's public runtime is available and safe to study as an MIT-licensed
architecture reference. OpenClaw is also public and provides adjacent daemon,
gateway, workspace, skill, sandbox, and channel patterns. LucaOS should absorb
the **continuity plane** pattern — persistent runtime snapshot, event envelopes,
scheduler store, skills registry, and diagnostics — but should not enable
background execution until provenance gates exist. The safe next step is PR #109:
a dormant always-on runtime continuity foundation that records and reports state
without scheduling, tool calls, memory mutation, or autonomous behavior.
