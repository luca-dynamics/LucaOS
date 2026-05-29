// Intent Routing types — PR #123: Intent Routing Layer
// Routing classifies user intent and decides the safe governance path.
// Routing does NOT execute anything.

// ---------------------------------------------------------------------------
// Enums / unions
// ---------------------------------------------------------------------------

export type LucaRoutingMode = "auto" | "fast" | "plan" | "agent";

export type LucaIntentRoute =
  | "fast_response"
  | "memory_proposal"
  | "runtime_plan"
  | "governed_action_request"
  | "safe_execution_request"
  | "skill_request"
  | "planning_checkpoint"
  | "blocked_risky_action"
  | "ask_user";

export type LucaIntentRiskLevel =
  | "safe"
  | "low"
  | "elevated"
  | "high"
  | "critical";

export type LucaIntentSignal =
  | "simple_chat"
  | "writing_or_rewrite"
  | "explanation"
  | "memory_candidate"
  | "multi_step_task"
  | "project_workflow"
  | "future_continuity"
  | "tool_action"
  | "safe_local_action"
  | "skill_or_plugin"
  | "reminder_or_schedule"
  | "session_resume"
  | "risky_system_action"
  | "risky_file_action"
  | "risky_network_action"
  | "risky_wallet_finance"
  | "risky_browser_action"
  | "risky_device_action"
  | "risky_code_mutation"
  | "risky_self_evolution"
  | "unclear_consequential";

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export interface LucaIntentRoutingDecision {
  decisionId: string;
  mode: LucaRoutingMode;
  route: LucaIntentRoute;
  riskLevel: LucaIntentRiskLevel;
  confidence: number;
  userIntentSummary: string;
  reason: string;
  signals: LucaIntentSignal[];
  shouldCreatePlan: boolean;
  shouldCreateMemoryProposal: boolean;
  shouldCreateGovernedRequest: boolean;
  shouldCreateSkillRequest: boolean;
  shouldCreateCheckpoint: boolean;
  shouldAskUser: boolean;
  shouldBlock: boolean;
  createdPlanId?: string;
  createdMemoryProposalIds?: string[];
  createdGovernedRequestIds?: string[];
  createdSkillRequestIds?: string[];
  createdCheckpointIds?: string[];
  inboxEventIds?: string[];
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface LucaIntentRoutingInput {
  message: string;
  mode: LucaRoutingMode;
  source: string;
  sourceId?: string;
  sessionId?: string;
  userTier?: string;
  provenanceIds: string[];
  metadata?: Record<string, unknown>;
}

export interface LucaIntentRoutingResult {
  decision: LucaIntentRoutingDecision;
  userFacingSummary: string;
  assistantResponseHint: string;
  createdArtifactsSummary: string;
  noExecutionPerformed: true;
}

// ---------------------------------------------------------------------------
// Diagnostics
// ---------------------------------------------------------------------------

export interface IntentRoutingDiagnosticsSummary {
  currentRoutingMode: LucaRoutingMode;
  totalRoutingDecisions: number;
  fastResponses: number;
  plannedRoutes: number;
  memoryProposalRoutes: number;
  governedRequestRoutes: number;
  skillRequestRoutes: number;
  blockedRoutes: number;
  askUserRoutes: number;
  lastRouteAt: string | null;
  routingEnabled: true;
  autoExecutionEnabled: false;
  riskyExecutionEnabled: false;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const INTENT_ROUTING_MAX_MESSAGE_LENGTH = 4_000;
export const INTENT_ROUTING_MAX_REASON_LENGTH = 500;
export const INTENT_ROUTING_MAX_SUMMARY_LENGTH = 500;
export const INTENT_ROUTING_MAX_METADATA_KEYS = 30;
export const INTENT_ROUTING_MAX_METADATA_VALUE_LENGTH = 500;
export const INTENT_ROUTING_MAX_DECISIONS = 300;

export const LUCA_ROUTING_MODES: LucaRoutingMode[] = ["auto", "fast", "plan", "agent"];

export const ROUTING_MODE_LABELS: Record<LucaRoutingMode, string> = {
  auto: "Auto \u2014 Luca decides",
  fast: "Fast \u2014 quick reply only",
  plan: "Plan \u2014 organize into steps",
  agent: "Agent \u2014 track and continue work",
};

export const ROUTING_MODE_SHORT_LABELS: Record<LucaRoutingMode, string> = {
  auto: "Auto",
  fast: "Fast",
  plan: "Plan",
  agent: "Agent",
};

export const ROUTING_MODE_DESCRIPTIONS: Record<LucaRoutingMode, string> = {
  auto: "Luca decides whether to respond fast, create a plan, create proposals, or escalate.",
  fast: "Prefer quick chat response. No plans unless safety requires it.",
  plan: "Prefer structured runtime plans for tasks and workflows. Nothing executes.",
  agent: "Prefer runtime continuity with plans, checkpoints, and governed requests. Nothing executes without approval.",
};
