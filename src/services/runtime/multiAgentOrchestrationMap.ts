// MultiAgentOrchestrationMap — PR #163: Multi-Agent Orchestration Architecture Audit + Governance Map.
//
// AUDIT/MAP layer only. This file describes current LucaOS orchestration
// primitives and gaps. It intentionally does not import runtime services and
// does not expose spawn, execute, dispatch, or worker-start methods.

export type MultiAgentClassificationLabel =
  | "single-agent"
  | "planning-only"
  | "tool-execution"
  | "checkpointed"
  | "approval-gated"
  | "continuity-loop"
  | "skill-governed"
  | "parallel-capable"
  | "supervisor-required"
  | "needs-agent-role-registry"
  | "needs-agent-session-records"
  | "needs-task-graph"
  | "needs-output-merge-review"
  | "needs-per-agent-permissions"
  | "needs-memory-boundaries"
  | "needs-tool-boundaries"
  | "blocked-until-governance";

export type PrimitiveStatus = "present" | "partial" | "missing" | "legacy-risk";
export type RoadmapPhaseStatus = "future" | "blocked-until-governance";

export interface MultiAgentPrimitiveMapEntry {
  id: string;
  name: string;
  status: PrimitiveStatus;
  labels: MultiAgentClassificationLabel[];
  evidence: string[];
  governanceNotes: string[];
}

export interface MissingMultiAgentPrimitiveMapEntry {
  id: string;
  name: string;
  present: false;
  labels: MultiAgentClassificationLabel[];
  requiredBeforeImplementation: string[];
}

export interface MultiAgentRoadmapPhase {
  id: string;
  title: string;
  status: RoadmapPhaseStatus;
  labels: MultiAgentClassificationLabel[];
  scope: string[];
  explicitNonGoals: string[];
}

export interface MultiAgentAuditAnswer {
  question: string;
  answer: string;
  labels: MultiAgentClassificationLabel[];
}

export interface MultiAgentOrchestrationAuditMap {
  auditOnly: true;
  trueMultiAgentOrchestrationExists: false;
  executionAddedByThisMap: false;
  spawnMethodsAddedByThisMap: false;
  parallelExecutionAddedByThisMap: false;
  summary: string;
  currentPrimitives: MultiAgentPrimitiveMapEntry[];
  missingMultiAgentPrimitives: MissingMultiAgentPrimitiveMapEntry[];
  roadmap: MultiAgentRoadmapPhase[];
  auditAnswers: MultiAgentAuditAnswer[];
}

export const currentMultiAgentPrimitiveMap: MultiAgentPrimitiveMapEntry[] = [
  {
    id: "runtime-plan-service",
    name: "Runtime plan service",
    status: "present",
    labels: ["single-agent", "planning-only", "checkpointed", "approval-gated", "skill-governed"],
    evidence: [
      "src/services/runtime/RuntimePlanService.ts creates structured runtime plans and related checkpoint/governance artifacts.",
      "src/types/runtimePlan.ts explicitly marks riskyExecutionEnabled as false in runtime plan diagnostics.",
    ],
    governanceNotes: [
      "Closest current planning surface for a future orchestration layer, but it stores one plan record rather than a per-agent task graph.",
      "Approving a plan creates/advances governance artifacts; it is not a worker scheduler.",
    ],
  },
  {
    id: "runtime-orchestration-service",
    name: "Runtime orchestration facade",
    status: "present",
    labels: ["single-agent", "planning-only", "approval-gated"],
    evidence: [
      "src/services/runtime/RuntimeOrchestrationService.ts is a high-level facade for proposing plans from intent or observation.",
      "Its diagnostics report orchestrationEnabled true while riskyExecutionEnabled remains false.",
    ],
    governanceNotes: [
      "The name says orchestration, but the current contract is plan proposal and governed artifact creation only.",
      "It should remain read/plan/governance-oriented until agent roles, sessions, permissions, and review records exist.",
    ],
  },
  {
    id: "agent-planning-checkpoints",
    name: "Agent planning checkpoints",
    status: "present",
    labels: ["checkpointed", "approval-gated", "planning-only"],
    evidence: [
      "src/services/runtime/AgentPlanningCheckpointService.ts creates, approves, completes, and diagnoses planning checkpoints.",
      "src/types/agentPlanningCheckpoint.ts sets canAutoExecute to false in checkpoint diagnostics.",
    ],
    governanceNotes: [
      "Useful provenance and pause/review primitive for future supervisor review.",
      "Not currently a supervisor merge gate or per-agent output review mechanism.",
    ],
  },
  {
    id: "agent-session-continuity",
    name: "Agent session continuity records",
    status: "partial",
    labels: ["single-agent", "continuity-loop", "needs-agent-session-records"],
    evidence: [
      "src/services/runtime/AgentSessionContinuityService.ts stores resumable chat/tool-planning/memory-review/skill-review session continuity records.",
      "src/types/agentSessionContinuity.ts defines session modes and lifecycle states but no agent role, worker identity, parent/child relation, or memory/tool boundary fields.",
    ],
    governanceNotes: [
      "These are continuity records, not multi-agent session records.",
      "A future Agent Session Records PR should extend this concept without changing current continuity behavior.",
    ],
  },
  {
    id: "continuity-loop",
    name: "Runtime continuity loop",
    status: "present",
    labels: ["continuity-loop", "approval-gated", "single-agent"],
    evidence: [
      "src/services/runtime/RuntimeContinuityLoopService.ts runs a dry-run-only runtime heartbeat/tick loop.",
      "src/types/runtimeContinuity.ts exposes dryRunOnly true and approval/quarantine/degraded status fields.",
    ],
    governanceNotes: [
      "Good runtime health and resume substrate for long-running work.",
      "Does not spawn, schedule, or merge parallel agent workers.",
    ],
  },
  {
    id: "governed-tool-execution",
    name: "Governed tool execution",
    status: "present",
    labels: ["tool-execution", "approval-gated", "needs-per-agent-permissions", "needs-tool-boundaries"],
    evidence: [
      "src/services/runtime/GovernedToolExecutionService.ts creates and processes governed execution records from approved action requests.",
      "src/services/runtime/GovernedToolExecutionPolicy.ts evaluates capability, risk, target, provenance, and safe-URL constraints globally.",
    ],
    governanceNotes: [
      "Tool permissioning is request/capability/policy based, not scoped to a durable agent identity.",
      "Future multi-agent execution needs per-agent tool grants before any parallel workers are enabled.",
    ],
  },
  {
    id: "skill-governance",
    name: "Skill governance service",
    status: "present",
    labels: ["skill-governed", "approval-gated", "needs-tool-boundaries"],
    evidence: [
      "src/services/skills/SkillGovernanceService.ts records skill install/update/enable/disable/review requests and creates approvals for risky capabilities.",
      "src/services/skillTriggerService.ts activates transient skill sets from current intentions but not per-agent sessions.",
    ],
    governanceNotes: [
      "Useful for bounded capabilities, but the boundary is skill/request centered rather than agent centered.",
      "A future role registry should define which agent roles may request or use which skill classes.",
    ],
  },
  {
    id: "single-agent-service",
    name: "Autonomous AgentService loop",
    status: "present",
    labels: ["single-agent", "checkpointed", "tool-execution"],
    evidence: [
      "src/services/agent/AgentService.ts starts one autonomous task by default and maintains currentTask/currentTaskId state.",
      "It uses AgentPlanner, AgentMemory, AgentQuality, resource locks, traces, and cognitive checkpoint/memory services for a single-agent loop.",
    ],
    governanceNotes: [
      "This is the clearest current single-agent execution loop.",
      "Its optional workforce path delegates to legacy LucaWorkforce and should not be treated as governed multi-agent orchestration.",
    ],
  },
  {
    id: "luca-workforce-legacy",
    name: "Legacy LucaWorkforce multi-persona scaffold",
    status: "legacy-risk",
    labels: ["parallel-capable", "tool-execution", "needs-task-graph", "needs-output-merge-review", "blocked-until-governance"],
    evidence: [
      "src/services/agent/LucaWorkforce.ts defines WorkflowTask, WorkflowPlan, persona assignment, parallelGroups, and Promise.allSettled group execution.",
      "The same file describes the model as one Luca with multiple personas, not durable independent agent sessions.",
    ],
    governanceNotes: [
      "This is the only code found that appears parallel-capable today, but it is not wired to typed runtime governance records for per-agent sessions, permissions, memory boundaries, merge review, or output review.",
      "Treat as an audit finding and migration candidate, not as the safe foundation to enable in this PR.",
    ],
  },
  {
    id: "persona-tool-access",
    name: "Persona tool access lists",
    status: "partial",
    labels: ["needs-per-agent-permissions", "needs-tool-boundaries", "tool-execution"],
    evidence: [
      "src/services/agent/config/personaToolAccess.ts maps persona names to tool-name allowlists for reasoning/tool selection.",
      "src/services/agent/tools/AgentToolBridge.ts intersects persona tool lists with registered tools before tool selection/execution.",
    ],
    governanceNotes: [
      "This is persona-level tool filtering, not per-agent permissioning with session-scoped grants and audit records.",
      "It should inform, but not replace, future governed per-agent tool boundaries.",
    ],
  },
  {
    id: "memory-boundaries",
    name: "Agent and runtime memory primitives",
    status: "partial",
    labels: ["single-agent", "needs-memory-boundaries"],
    evidence: [
      "src/services/agent/AgentMemory.ts stores task-scoped memory and in-RAM session data keyed by task/session strings.",
      "docs/luca-memory-contract-map.md and docs/luca-self-evolution-memory-audit.md describe broader memory contracts and gaps.",
    ],
    governanceNotes: [
      "Current memory is task/session oriented, not partitioned by durable agent role/session identity.",
      "Parallel agents need explicit context sharing, redaction, and provenance boundaries before implementation.",
    ],
  },
];

export const missingMultiAgentPrimitiveMap: MissingMultiAgentPrimitiveMapEntry[] = [
  {
    id: "agent-role-registry",
    name: "Agent Role Registry",
    present: false,
    labels: ["needs-agent-role-registry", "supervisor-required", "blocked-until-governance"],
    requiredBeforeImplementation: [
      "Canonical role IDs, responsibilities, allowed task classes, escalation rules, and default tool/memory scopes.",
      "Governed migration path from persona names to runtime agent roles.",
    ],
  },
  {
    id: "agent-session-records",
    name: "Agent Session Records",
    present: false,
    labels: ["needs-agent-session-records", "needs-memory-boundaries", "needs-tool-boundaries"],
    requiredBeforeImplementation: [
      "Durable parent/child agent-session records with role, task assignment, lifecycle, provenance, approvals, memory scope, and tool scope.",
      "Clear distinction between Luca continuity sessions and worker agent sessions.",
    ],
  },
  {
    id: "task-graph",
    name: "Task Graph / Dependency Graph",
    present: false,
    labels: ["needs-task-graph", "supervisor-required"],
    requiredBeforeImplementation: [
      "Typed graph nodes/edges for dependencies, parallel eligibility, required approvals, expected artifacts, and merge gates.",
      "Static validation that no dependency or permission boundary is bypassed.",
    ],
  },
  {
    id: "parallel-agent-workers",
    name: "Governed parallel agent workers",
    present: false,
    labels: ["parallel-capable", "needs-agent-session-records", "blocked-until-governance"],
    requiredBeforeImplementation: [
      "Workers may not be enabled until role registry, session records, task graph validation, per-agent permissions, and supervisor review exist.",
      "Legacy parallel-capable code must be brought under runtime governance before use.",
    ],
  },
  {
    id: "supervisor-output-merge-review",
    name: "Supervisor Review + Output Merge",
    present: false,
    labels: ["supervisor-required", "needs-output-merge-review", "approval-gated"],
    requiredBeforeImplementation: [
      "A Luca supervisor step that reviews worker outputs, resolves conflicts, verifies artifacts, and records merge decisions.",
      "Human approval escalation for risky, conflicting, or low-confidence output merges.",
    ],
  },
  {
    id: "inter-agent-communication",
    name: "Inter-agent communication protocol",
    present: false,
    labels: ["needs-agent-session-records", "needs-memory-boundaries", "blocked-until-governance"],
    requiredBeforeImplementation: [
      "Message/event schema for agent-to-agent requests, shared artifacts, supervisor broadcasts, and redacted context transfer.",
      "Audit trail proving what context each agent received and produced.",
    ],
  },
  {
    id: "per-agent-permissions",
    name: "Per-agent permissions and boundaries",
    present: false,
    labels: ["needs-per-agent-permissions", "needs-memory-boundaries", "needs-tool-boundaries", "blocked-until-governance"],
    requiredBeforeImplementation: [
      "Per-agent grants for tools, memory namespaces, file/device/browser surfaces, budgets, and approval thresholds.",
      "Policy checks that bind every tool or memory access to an agent-session identity.",
    ],
  },
];

export const multiAgentRoadmap: MultiAgentRoadmapPhase[] = [
  {
    id: "phase-1-role-registry",
    title: "Agent Role Registry",
    status: "future",
    labels: ["needs-agent-role-registry", "blocked-until-governance"],
    scope: ["Define role IDs, responsibilities, allowed task classes, escalation paths, and default boundaries."],
    explicitNonGoals: ["Do not spawn agents.", "Do not execute tools from roles alone."],
  },
  {
    id: "phase-2-session-records",
    title: "Agent Session Records",
    status: "future",
    labels: ["needs-agent-session-records", "needs-memory-boundaries", "needs-tool-boundaries"],
    scope: ["Create durable worker/supervisor session records linked to runtime plans, checkpoints, approvals, and provenance."],
    explicitNonGoals: ["Do not run sessions in parallel yet.", "Do not change current continuity behavior."],
  },
  {
    id: "phase-3-task-graph",
    title: "Task Graph / Dependency Graph",
    status: "future",
    labels: ["needs-task-graph", "supervisor-required"],
    scope: ["Map plan steps into graph nodes with dependencies, artifacts, review gates, and parallel eligibility."],
    explicitNonGoals: ["Do not execute graph nodes.", "Do not infer approval bypasses from graph shape."],
  },
  {
    id: "phase-4-supervisor-review",
    title: "Supervisor Review + Output Merge",
    status: "future",
    labels: ["supervisor-required", "needs-output-merge-review", "approval-gated"],
    scope: ["Define review records, merge decisions, conflict handling, verification requirements, and human escalation."],
    explicitNonGoals: ["Do not auto-merge worker outputs.", "Do not replace existing approval center behavior."],
  },
  {
    id: "phase-5-boundaries",
    title: "Per-Agent Tool Permissions + Memory/Context Boundaries",
    status: "blocked-until-governance",
    labels: ["needs-per-agent-permissions", "needs-memory-boundaries", "needs-tool-boundaries", "blocked-until-governance"],
    scope: ["Bind every future worker to explicit tool grants, memory namespaces, context-redaction rules, budgets, and provenance."],
    explicitNonGoals: ["Do not broaden global tool access.", "Do not add file, browser, messaging, or device execution surfaces."],
  },
  {
    id: "phase-6-governed-parallel-execution",
    title: "Governed Parallel Execution",
    status: "blocked-until-governance",
    labels: ["parallel-capable", "supervisor-required", "blocked-until-governance"],
    scope: ["Only after phases 1-5, allow guarded parallel worker sessions with supervisor review, output merge, and full audit trails."],
    explicitNonGoals: ["Do not enable legacy LucaWorkforce parallelism as-is.", "Do not add browser automation, screenshots/OCR/vision, file access, messaging execution, or device control."],
  },
];

export const multiAgentAuditAnswers: MultiAgentAuditAnswer[] = [
  {
    question: "Does LucaOS currently implement true multi-agent orchestration?",
    answer: "No. LucaOS has planning, checkpoints, continuity, governed tool execution, persona tool lists, and a legacy parallel-capable workforce scaffold, but no governed role registry, durable worker session model, task graph, supervisor merge/review gate, or per-agent boundaries.",
    labels: ["single-agent", "needs-agent-role-registry", "needs-agent-session-records", "needs-task-graph"],
  },
  {
    question: "If not, what building blocks already exist?",
    answer: "Runtime plans, planning checkpoints, governed action/tool records, skill governance requests, continuity sessions, runtime heartbeat/dry-run loop, traces, resource locks, task memory, and persona tool allowlists.",
    labels: ["planning-only", "checkpointed", "approval-gated", "continuity-loop", "skill-governed"],
  },
  {
    question: "Which services are closest to becoming an orchestration layer?",
    answer: "RuntimePlanService and RuntimeOrchestrationService are closest for planning/governance, AgentPlanningCheckpointService is closest for pause/review provenance, and AgentSessionContinuityService is closest for resumable session state. Legacy LucaWorkforce is closest to task decomposition/parallel shape but is blocked until governance.",
    labels: ["planning-only", "checkpointed", "parallel-capable", "blocked-until-governance"],
  },
  {
    question: "Is current task planning single-agent or multi-agent?",
    answer: "Current safe runtime planning is single-agent/planning-only. Legacy workforce can assign plan steps to personas, but that is not a governed multi-agent task graph.",
    labels: ["single-agent", "planning-only", "needs-task-graph"],
  },
  {
    question: "Are there any existing agent/session records?",
    answer: "There are AgentSessionContinuity records for resumable Luca sessions and AgentTask records for the autonomous loop, but no durable per-worker agent session records with role, parent, permissions, memory boundary, and output artifacts.",
    labels: ["continuity-loop", "needs-agent-session-records"],
  },
  {
    question: "Can any code spawn parallel workers today?",
    answer: "LucaWorkforce contains a legacy Promise.allSettled parallel group path for persona tasks. This is parallel-capable code, not safe governed multi-agent orchestration, and should remain blocked until governance catches up.",
    labels: ["parallel-capable", "blocked-until-governance"],
  },
  {
    question: "Are tools permissioned per agent or only globally?",
    answer: "Tools are governed primarily by global request/capability policies and persona tool allowlists. There is no durable per-agent-session permission boundary.",
    labels: ["tool-execution", "needs-per-agent-permissions", "needs-tool-boundaries"],
  },
  {
    question: "Are memory and context boundaries defined per agent?",
    answer: "No. Memory is task/session/runtime oriented; there is no per-agent memory namespace, context-redaction contract, or inter-agent context transfer audit.",
    labels: ["needs-memory-boundaries"],
  },
  {
    question: "Is there a supervisor/reviewer/merge step?",
    answer: "No dedicated supervisor merge/review step exists. Checkpoints and approvals provide review primitives, but not worker-output review, conflict resolution, or merge governance.",
    labels: ["supervisor-required", "needs-output-merge-review", "approval-gated"],
  },
  {
    question: "What would a safe multi-agent roadmap look like?",
    answer: "Role registry, agent session records, task/dependency graph, supervisor output merge review, per-agent tool permissions, per-agent memory/context boundaries, and only then governed parallel execution.",
    labels: ["needs-agent-role-registry", "needs-agent-session-records", "needs-task-graph", "needs-output-merge-review", "blocked-until-governance"],
  },
];

export const multiAgentOrchestrationAuditMap: MultiAgentOrchestrationAuditMap = {
  auditOnly: true,
  trueMultiAgentOrchestrationExists: false,
  executionAddedByThisMap: false,
  spawnMethodsAddedByThisMap: false,
  parallelExecutionAddedByThisMap: false,
  summary:
    "LucaOS does not currently have true governed multi-agent orchestration. The repo contains strong single-agent planning, checkpoint, continuity, skill governance, and tool-governance building blocks plus a legacy parallel-capable LucaWorkforce scaffold, but it lacks the role/session/task-graph/supervisor/boundary primitives required before safe parallel agents are enabled.",
  currentPrimitives: currentMultiAgentPrimitiveMap,
  missingMultiAgentPrimitives: missingMultiAgentPrimitiveMap,
  roadmap: multiAgentRoadmap,
  auditAnswers: multiAgentAuditAnswers,
};

export function getMultiAgentOrchestrationAuditMap(): MultiAgentOrchestrationAuditMap {
  return multiAgentOrchestrationAuditMap;
}
