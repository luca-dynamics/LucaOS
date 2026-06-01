# PR #163 — Multi-Agent Orchestration Architecture Audit + Governance Map

## Scope and hard boundary

This document audits LucaOS's current agent, planning, orchestration, continuity, skill, and tool-governance primitives. It is audit/map only.

This PR does **not** implement multi-agent orchestration. It does **not** add agent spawning, parallel execution, tool execution, memory changes, Settings changes, Boot changes, App shell changes, browser automation, screenshot/OCR/vision, file access, messaging execution, wireless/device control, or sensitive-surface enablement.

## Executive answer

LucaOS does **not** currently implement true governed multi-agent orchestration.

The repo already has strong building blocks for a future multi-agent system:

- single-agent autonomous task flow;
- runtime plan proposal;
- checkpoint/provenance records;
- approval-gated governed action/tool records;
- skill governance and transient skill activation;
- continuity loop and resumable Luca session records;
- traces, resource locks, task memory, and persona tool allowlists;
- a legacy `LucaWorkforce` scaffold that is parallel-capable but not governed enough to treat as safe multi-agent orchestration.

The missing pieces are the actual multi-agent governance primitives: Agent Role Registry, Agent Session Records, Task Graph / Dependency Graph, governed parallel worker sessions, supervisor review + output merge, inter-agent communication, per-agent permissions, per-agent memory boundaries, and per-agent tool boundaries.

## Repository areas inspected

The audit reviewed these relevant areas without changing runtime behavior:

- `src/services/runtime/RuntimePlanService.ts`
- `src/services/runtime/RuntimeOrchestrationService.ts`
- `src/services/runtime/AgentPlanningCheckpointService.ts`
- `src/services/runtime/AgentSessionContinuityService.ts`
- `src/services/runtime/RuntimeContinuityLoopService.ts`
- `src/services/runtime/RuntimeContinuityService.ts`
- `src/services/runtime/GovernedToolExecutionService.ts`
- `src/services/runtime/GovernedToolExecutionPolicy.ts`
- `src/services/skills/SkillGovernanceService.ts`
- `src/services/skillTriggerService.ts`
- `src/services/toolRegistry.ts`
- `src/services/agent/AgentService.ts`
- `src/services/agent/AgentPlanner.ts`
- `src/services/agent/AgentMemory.ts`
- `src/services/agent/LucaWorkforce.ts`
- `src/services/agent/LucaResourceLock.ts`
- `src/services/agent/LucaTracing.ts`
- `src/services/agent/tools/AgentToolBridge.ts`
- `src/services/agent/config/personaToolAccess.ts`
- `src/services/agent/cognitive/CheckpointManager.ts`
- `src/services/agent/cognitive/HumanInputOrchestrator.ts`
- `src/types/runtimePlan.ts`
- `src/types/agentPlanningCheckpoint.ts`
- `src/types/agentSessionContinuity.ts`
- `src/types/runtimeContinuity.ts`
- related architecture docs under `docs/runtime`, `docs/skills`, and existing Luca memory/self-evolution/runtime audit docs.

## Current architecture map

### 1. Single-agent Luca flow

`AgentService` is the clearest current autonomous loop. By default it starts one task, creates a task ID, loads task memory, plans steps, executes/verifies them, records failures/learnings, checkpoints periodically, and tracks `currentTask` / `currentTaskId` state.

Classification: `single-agent`, `checkpointed`, `tool-execution`.

Audit conclusion: this is a single-agent runtime loop, not a multi-agent session manager.

### 2. Task planning flow

`AgentPlanner` breaks a user goal into `AgentStep[]` using an LLM-first planner with rule-based fallback. `RuntimePlanService` separately creates governed `RuntimePlanRecord` objects with classified steps, provenance IDs, checkpoint/governance artifacts, and diagnostics. `RuntimeOrchestrationService` is a facade for proposing plans from intent or observation.

Classification: `single-agent`, `planning-only`, `checkpointed`, `approval-gated`, `skill-governed`.

Audit conclusion: current safe runtime planning is plan/provenance/governance oriented. It does not create a task graph of worker agents.

### 3. Tool execution flow

There are two relevant tool surfaces:

- `GovernedToolExecutionService` processes approved governed action requests through policy checks and allowed execution surfaces.
- The older agent/tool path uses `AgentToolBridge`, `ToolRegistry`, and persona tool allowlists for tool selection/execution.

Classification: `tool-execution`, `approval-gated`, `needs-per-agent-permissions`, `needs-tool-boundaries`.

Audit conclusion: tools are governed by global request/capability policy and persona allowlists. They are not permissioned against durable per-agent session identities.

### 4. Approval/governance flow

Runtime plans can create checkpoints, governed action requests, memory proposals, and skill governance requests. Planning checkpoint diagnostics explicitly indicate that checkpoints cannot auto-execute. Runtime plan diagnostics explicitly keep risky execution disabled.

Classification: `approval-gated`, `checkpointed`, `planning-only`.

Audit conclusion: approval primitives exist and should be reused by any future multi-agent design, but they are not yet supervisor-review or output-merge records.

### 5. Checkpoint/provenance flow

`AgentPlanningCheckpointService` creates planning checkpoint records with provenance IDs, proposed next steps, risk level, approvals, and related governed/memory/skill request IDs. The cognitive `CheckpointManager` also exists for workflow checkpoint/restore-style behavior in the older agent loop.

Classification: `checkpointed`, `approval-gated`.

Audit conclusion: checkpoints are a good substrate for future supervisor review but do not currently represent worker output review, merge decisions, or inter-agent dependencies.

### 6. Continuity loop flow

`RuntimeContinuityLoopService` maintains dry-run-only runtime loop status, heartbeat/tick behavior, pending approval counts, scheduled/reminder state, quarantine/degraded reasons, and resumability metadata. `AgentSessionContinuityService` stores resumable Luca session records for modes like chat, tool planning, memory review, and skill review.

Classification: `continuity-loop`, `single-agent`, `needs-agent-session-records`.

Audit conclusion: these are Luca continuity/session records, not multi-agent worker-session records. They are still useful foundations for future agent-session lifecycle design.

### 7. Skill governance flow

`SkillGovernanceService` records skill install/update/enable/disable/review requests, flags risky requested capabilities, and can create approval requests. `SkillTriggerService` activates transient skill sets from current intentions and model recommendations.

Classification: `skill-governed`, `approval-gated`, `needs-tool-boundaries`.

Audit conclusion: skill governance exists, but skill access is not scoped by durable per-agent roles/sessions.

### 8. Existing “agent mode” / persona behavior

`src/services/agent/types.ts` defines task, memory, step, action, sandbox, config, and event types for Agent Mode. `personaToolAccess.ts` maps personas to tool allowlists. `LucaWorkforce` uses persona assignment (`ENGINEER`, `HACKER`, `AUDITOR`, etc.) to split steps.

Classification: `single-agent`, `parallel-capable`, `needs-agent-role-registry`.

Audit conclusion: personas are not the same as governed multi-agent roles. A future Agent Role Registry should absorb the useful persona taxonomy while adding durable role IDs, boundaries, escalation paths, and review rules.

## Legacy parallel-capable scaffold: LucaWorkforce

`LucaWorkforce` is the only code found that looks meaningfully parallel-capable today. It defines:

- `WorkflowTask` with persona, dependencies, status, result/error, and snapshots;
- `WorkflowPlan` with tasks and `parallelGroups`;
- step-to-persona assignment;
- dependency grouping;
- group execution using `Promise.allSettled`;
- resource locks and tracing around task execution;
- graph data generation for workflow visualization.

However, the file itself frames this as “one Luca, multiple capabilities,” not independent durable agents. It does not provide governed worker session records, per-agent memory boundaries, per-agent tool grants, supervisor merge review, inter-agent messaging, or output review records.

Classification: `parallel-capable`, `tool-execution`, `needs-task-graph`, `needs-output-merge-review`, `blocked-until-governance`.

Audit conclusion: do **not** enable or extend this as multi-agent orchestration in this PR. Treat it as a legacy scaffold/migration candidate that must be wrapped in governance before any future parallel execution work.

## True multi-agent orchestration gap matrix

| Primitive | Current status | Notes |
| --- | --- | --- |
| Agent Role Registry | Missing | Personas/tool lists exist, but no canonical role registry with responsibilities, allowed task classes, escalation, memory/tool boundaries. |
| Agent Session Records | Missing | Luca continuity/session records exist, but no per-worker agent-session records with parent/child, role, permissions, artifacts, and lifecycle. |
| Parallel Agent Workers | Missing as governed runtime | `LucaWorkforce` is parallel-capable legacy code, but not governed enough to count as safe multi-agent orchestration. |
| Task Graph / Dependency Graph | Missing | Agent steps and workforce dependencies exist, but no typed governed task graph with dependency validation, approval gates, and merge artifacts. |
| Supervisor / Merge Step | Missing | Checkpoints and approvals exist, but no supervisor output review, conflict resolution, merge decision, or artifact acceptance records. |
| Output Review Step | Missing | No worker-output review contract. |
| Inter-agent Communication | Missing | No typed protocol for agent-to-agent messages, redacted context transfer, or supervisor broadcasts. |
| Per-agent Permissions | Missing | Tool governance is global/request/capability based; persona allowlists are not durable session-scoped permissions. |
| Per-agent Memory Boundaries | Missing | Memory is task/session/runtime oriented; no worker-specific memory namespaces or sharing/redaction policy. |
| Per-agent Tool Boundaries | Missing | No binding between every tool access and an agent-session identity. |

## Answers to the requested audit questions

1. **Does LucaOS currently implement true multi-agent orchestration?**  
   No. It has planning, checkpoints, continuity, governed tool execution, persona tool lists, and a legacy parallel-capable scaffold, but not true governed multi-agent orchestration.

2. **If not, what building blocks already exist?**  
   Runtime plans, planning checkpoints, governed action/tool requests, skill governance, continuity sessions, dry-run continuity loop, traces, resource locks, task memory, and persona tool allowlists.

3. **Which services are closest to becoming an orchestration layer?**  
   `RuntimePlanService` and `RuntimeOrchestrationService` are closest for plan/governance flow. `AgentPlanningCheckpointService` is closest for pause/review provenance. `AgentSessionContinuityService` is closest for resumable session state. `LucaWorkforce` is closest to a task/parallel shape but is blocked until governance.

4. **Is current task planning single-agent or multi-agent?**  
   Safe runtime planning is single-agent/planning-only. Legacy workforce planning can assign personas but is not a governed multi-agent task graph.

5. **Are there any existing agent/session records?**  
   There are Luca continuity session records and single-agent task records. There are no durable per-worker agent session records.

6. **Can any code spawn parallel workers today?**  
   `LucaWorkforce` can run persona task groups with `Promise.allSettled`, so it is parallel-capable. It should be considered blocked until governance because it lacks required multi-agent safety boundaries.

7. **Are tools permissioned per agent or only globally?**  
   Tools are governed globally by request/capability policy and filtered by persona allowlists. They are not permissioned per durable agent session.

8. **Are memory and context boundaries defined per agent?**  
   No. Current memory is task/session/runtime oriented, without per-agent memory namespaces or inter-agent context transfer policy.

9. **Is there a supervisor/reviewer/merge step?**  
   No dedicated supervisor merge/review step exists. Checkpoints and approvals are useful review primitives but not output-merge governance.

10. **What would a safe multi-agent roadmap look like?**  
    Agent Role Registry → Agent Session Records → Task Graph / Dependency Graph → Supervisor Review + Output Merge → Per-Agent Tool Permissions → Per-Agent Memory/Context Boundaries → Governed Parallel Execution.

## Safe follow-up roadmap

These follow-ups are recommendations only and should be implemented in separate PRs:

1. **Agent Role Registry**  
   Define canonical role IDs, task classes, escalation rules, and default tool/memory boundaries. Do not spawn agents.

2. **Agent Session Records**  
   Add durable worker/supervisor session records linked to runtime plans, checkpoints, approvals, and provenance. Do not run sessions in parallel yet.

3. **Task Graph / Dependency Graph**  
   Map plan steps into typed graph nodes and edges with dependency validation, approval gates, expected artifacts, and merge requirements. Do not execute graph nodes.

4. **Supervisor Review + Output Merge**  
   Define review records, conflict handling, verification requirements, output acceptance, and human escalation. Do not auto-merge worker outputs.

5. **Per-Agent Tool Permissions + Memory/Context Boundaries**  
   Bind future worker sessions to explicit tool grants, memory namespaces, context redaction rules, budgets, and provenance.

6. **Governed Parallel Execution**  
   Only after the above exists, allow guarded parallel worker sessions with supervisor review, output merge, and full audit trails. Do not enable legacy `LucaWorkforce` parallelism as-is.

## Typed governance map

This audit is also represented in `src/services/runtime/multiAgentOrchestrationMap.ts` with:

- current primitive entries;
- explicitly missing multi-agent primitives;
- roadmap phases;
- answers to the ten audit questions;
- hard booleans documenting that this map adds no execution, spawn, or parallel behavior.
