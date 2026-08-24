import { llmService } from "../llmService";
import {
  modelManager,
  localModelLibrary as modelManagerService,
  type LocalModel,
} from "../local-models/LocalModelLibrary";
import { memoryService } from "../memoryService";
import {
  memoryReadinessResolver,
  type ResolveMemoryRouteOptions,
} from "../memory/MemoryReadinessResolver";
import { modelReadinessResolver } from "../models/ModelReadinessResolver";
import { settingsService, type LucaSettings } from "../settingsService";
import {
  normalizeLucaUserTier,
  type LucaUserTier,
} from "../../types/lucaUserTier";
import {
  normalizeModelMode,
  type ModelMode,
  type ModelPrivacyPosture,
  type ModelReadinessState,
  type ModelRouteDecision,
} from "../../types/modelRouting";
import type { MemoryReadinessState, MemoryRouteDecision } from "../../types/memoryRouting";
import { localRuntimeDiagnostics } from "../local-models/LocalRuntimeDiagnostics";
import { runtimeContinuityService } from "./RuntimeContinuityService";
import { runtimeContinuityLoopService } from "./RuntimeContinuityLoopService";
import { schedulerRegistryService } from "../scheduler/SchedulerRegistryService";
import { reminderDeliveryService } from "../scheduler/ReminderDeliveryService";
import { runtimeInboxService } from "./RuntimeInboxService";
import { agentSessionContinuityService } from "./AgentSessionContinuityService";
import { approvalRequestCenterService } from "../provenance/ApprovalRequestCenterService";
import { governedActionRequestService } from "./GovernedActionRequestService";
import { governedToolExecutionService } from "./GovernedToolExecutionService";
import { provenanceGateService } from "../provenance/ProvenanceGateService";
import { skillRegistryService } from "../skills/SkillRegistryService";
import { skillGovernanceService } from "../skills/SkillGovernanceService";
import { memoryGovernanceService } from "../memory/MemoryGovernanceService";
import { memoryProposalService } from "../memory/MemoryProposalService";
import { governedMemoryWriteService } from "../memory/GovernedMemoryWriteService";
import { agentPlanningCheckpointService } from "./AgentPlanningCheckpointService";
import { runtimePlanService } from "./RuntimePlanService";
import { intentRoutingService } from "./IntentRoutingService";
import { browserDesktopGatewayService } from "./BrowserDesktopGatewayService";
import type { RuntimePlanDiagnosticsSummary } from "../../types/runtimePlan";
import type { IntentRoutingDiagnosticsSummary } from "../../types/intentRouting";
import type { GatewayDiagnosticsSummary } from "../../types/browserDesktopGateway";
import type { RuntimeContinuitySummary } from "../../types/runtimeContinuity";
import type { SchedulerDiagnosticsSummary } from "../../types/scheduler";
import type { ProvenanceDiagnosticsSummary } from "../../types/provenance";
import type { SkillRegistryDiagnosticsSummary } from "../../types/skillContinuity";
import type { MemoryGovernanceDiagnosticsSummary } from "../../types/memoryGovernance";
import type { ReminderDeliveryDiagnosticsSummary } from "../../types/reminderDelivery";
import type { RuntimeInboxDiagnosticsSummary } from "../../types/runtimeInbox";
import type { AgentSessionContinuityDiagnosticsSummary } from "../../types/agentSessionContinuity";
import type { ApprovalRequestDiagnosticsSummary } from "../../types/approvalCenter";
import type { GovernedActionRequestDiagnosticsSummary } from "../../types/governedActionRequest";
import type { GovernedToolExecutionDiagnosticsSummary } from "../../types/governedToolExecution";
import type { MemoryProposalDiagnosticsSummary, MemoryWriteDiagnosticsSummary } from "../../types/memoryProposal";
import type { SkillGovernanceDiagnosticsSummary } from "../../types/skillGovernance";
import type { AgentPlanningCheckpointDiagnosticsSummary } from "../../types/agentPlanningCheckpoint";

export type RuntimeReadinessSeverity =
  | "ready"
  | "warning"
  | "blocked"
  | "unknown";

export type RuntimeDiagnosticsAudience = "normal" | "tactical" | "origin";

export type RuntimeRecommendedActionId =
  | "open_model_manager"
  | "add_byok_key"
  | "start_ollama"
  | "install_ollama"
  | "switch_to_luca_prime"
  | "retry_route_check"
  | "none";

export interface RuntimeRecommendedAction {
  id: RuntimeRecommendedActionId;
  label: string;
  description: string;
}

export interface RuntimeRouteDiagnostics {
  capability: "chat" | "embedding" | "stt" | "tts";
  label: string;
  mode: ModelMode;
  provider: ModelRouteDecision["provider"];
  model: string;
  readiness: ModelReadinessState;
  severity: RuntimeReadinessSeverity;
  reason: string;
  warnings: string[];
  privacy: ModelPrivacyPosture;
  networkAllowed: boolean;
  fallbackPolicy: ModelRouteDecision["fallbackPolicy"];
  keySource: NonNullable<ModelRouteDecision["keySource"]> | "none";
  runtime: NonNullable<ModelRouteDecision["runtime"]> | "unknown";
}

export interface RuntimeMemoryDiagnostics {
  label: string;
  mode: MemoryRouteDecision["mode"];
  provider: string;
  embeddingModel: string;
  vectorStore: string;
  readiness: MemoryReadinessState;
  severity: RuntimeReadinessSeverity;
  reason: string;
  warnings: string[];
  privacy: MemoryRouteDecision["privacy"];
  networkAllowed: boolean;
  fallbackPolicy: MemoryRouteDecision["fallbackPolicy"];
  localEmbeddingModelInstalled?: boolean;
  localRuntimeAvailable?: boolean;
}

/**
 * Snapshot of the local model runtime facade (Phase 3 of
 * docs/local-model-runtime-plan.md): registered runtime adapters with their
 * health, plus admission (active request) and lease pressure. Absent when the
 * facade snapshot itself fails — the legacy ollama/cortex probes still report.
 */
export interface RuntimeLocalRuntimeFacadeDiagnostics {
  generatedAt: number;
  registeredRuntimes: string[];
  runtimes: Array<{
    runtime: string;
    status: string;
    reachable?: boolean;
    modelCount?: number;
    message?: string;
  }>;
  activeRequests: number;
  activeLeases: number;
  leaseUnderflows: number;
}

export interface RuntimeLocalRuntimeDiagnostics {
  ollama: {
    available: boolean;
    installed?: boolean;
    installedModelCount: number;
  };
  cortex: {
    available: boolean | "unknown";
  };
  facade?: RuntimeLocalRuntimeFacadeDiagnostics;
}

export interface RuntimeOnboardingWarning {
  capability: string;
  mode: string;
  provider: string;
  readiness: string;
  reason: string;
  warnings: string[];
}

export interface RuntimeKeyReadinessSummary {
  required: boolean;
  ready: boolean;
  sources: Array<"vault" | "settings" | "environment" | "none">;
  missingProviders: string[];
}

export interface RuntimeDiagnosticsSummary {
  activeMode: ModelMode;
  activeModeLabel: string;
  headline: string;
  severity: RuntimeReadinessSeverity;
  description: string;
}

export interface RuntimeGovernanceDiagnostics {
  runtimeContinuity: RuntimeContinuitySummary;
  scheduler: SchedulerDiagnosticsSummary;
  provenance: ProvenanceDiagnosticsSummary | { pendingApprovals: number };
  skills: SkillRegistryDiagnosticsSummary;
  memoryGovernance: MemoryGovernanceDiagnosticsSummary;
  reminders: ReminderDeliveryDiagnosticsSummary;
  inbox: RuntimeInboxDiagnosticsSummary;
  sessions: AgentSessionContinuityDiagnosticsSummary;
  approvalCenter: ApprovalRequestDiagnosticsSummary;
  governedRequests: GovernedActionRequestDiagnosticsSummary;
  governedExecutions: GovernedToolExecutionDiagnosticsSummary;
  memoryProposals: MemoryProposalDiagnosticsSummary;
  memoryWrites: MemoryWriteDiagnosticsSummary;
  skillGovernance: SkillGovernanceDiagnosticsSummary;
  gateway: GatewayDiagnosticsSummary;
  planningCheckpoints: AgentPlanningCheckpointDiagnosticsSummary;
  runtimePlans: RuntimePlanDiagnosticsSummary;
  intentRouting: IntentRoutingDiagnosticsSummary;
  pendingMemoryProposals: number;
  approvedMemoryWritesWaiting: number;
  completedMemoryWrites: number;
  pendingSkillRequests: number;
  approvedSkillRequestsWaiting: number;
  pendingPlanningCheckpoints: number;
  blockedGovernanceItems: number;
  visibility: "friendly" | "compact" | "full";
  safeSummary: string;
}

export interface RuntimeDiagnostics {
  summary: RuntimeDiagnosticsSummary;
  audience: RuntimeDiagnosticsAudience;
  routes: {
    chat: RuntimeRouteDiagnostics;
    embedding: RuntimeRouteDiagnostics;
    stt: RuntimeRouteDiagnostics;
    tts: RuntimeRouteDiagnostics;
  };
  memory: RuntimeMemoryDiagnostics;
  localRuntime: RuntimeLocalRuntimeDiagnostics;
  keyReadiness: RuntimeKeyReadinessSummary;
  onboardingWarnings: RuntimeOnboardingWarning[];
  recommendedActions: RuntimeRecommendedAction[];
  governance: RuntimeGovernanceDiagnostics;
  generatedAt: number;
}


const MEMORY_VECTOR_STORE_PROBE_TIMEOUT_MS = 1500;

export function memoryVectorStoreOptionsFromCortexStatus(
  status: { available: boolean; message: string } | null,
): ResolveMemoryRouteOptions {
  if (!status) {
    return {
      vectorStoreAvailable: undefined,
      vectorStoreName:
        "local-archive+cortex-vector (assumed; live probe deferred)",
    };
  }

  const initializing = /initializing memory/i.test(status.message);
  const vectorStoreAvailable = status.available && !initializing;
  return {
    vectorStoreAvailable,
    vectorStoreName: vectorStoreAvailable
      ? "cortex-vector (online)"
      : `cortex-vector (${sanitizeDiagnosticText(status.message)})`,
  };
}

async function getMemoryVectorStoreOptions(): Promise<ResolveMemoryRouteOptions> {
  try {
    const status = await Promise.race([
      memoryService.getCortexStatus(),
      new Promise<null>((resolve) =>
        setTimeout(resolve, MEMORY_VECTOR_STORE_PROBE_TIMEOUT_MS),
      ),
    ]);

    return memoryVectorStoreOptionsFromCortexStatus(status);
  } catch {
    return memoryVectorStoreOptionsFromCortexStatus(null);
  }
}

const ROUTE_LABEL: Record<RuntimeRouteDiagnostics["capability"], string> = {
  chat: "Brain / chat",
  embedding: "Embedding / memory",
  stt: "Speech-to-text",
  tts: "Text-to-speech",
};

const MODE_LABEL: Record<ModelMode, string> = {
  "luca-prime": "Luca Prime",
  local: "Local",
  byok: "BYOK",
};

const ACTION_COPY: Record<
  RuntimeRecommendedActionId,
  RuntimeRecommendedAction
> = {
  open_model_manager: {
    id: "open_model_manager",
    label: "Open Model Manager",
    description: "Review the selected model route and local model inventory.",
  },
  add_byok_key: {
    id: "add_byok_key",
    label: "Add BYOK key",
    description: "Add a provider key in settings or the secure vault.",
  },
  start_ollama: {
    id: "start_ollama",
    label: "Start Ollama",
    description: "Start the local Ollama daemon before using local routes.",
  },
  install_ollama: {
    id: "install_ollama",
    label: "Install Ollama",
    description: "Install the local runtime required by the selected model.",
  },
  switch_to_luca_prime: {
    id: "switch_to_luca_prime",
    label: "Switch to Luca Prime",
    description:
      "Use managed Luca Prime cloud routing if local/BYOK is not ready.",
  },
  retry_route_check: {
    id: "retry_route_check",
    label: "Retry status check",
    description: "Refresh route readiness after setup changes.",
  },
  none: {
    id: "none",
    label: "No action needed",
    description: "All visible runtime routes are ready.",
  },
};

const BLOCKED_STATES: ModelReadinessState[] = [
  "missing_key",
  "missing_runtime",
  "missing_model",
  "unsupported_hardware",
  "planned",
  "error",
];

const WARNING_STATES: ModelReadinessState[] = ["downloading", "unknown"];

const MEMORY_BLOCKED_STATES: MemoryReadinessState[] = [
  "missing_embedding_model",
  "missing_runtime",
  "missing_vector_store",
  "missing_key",
  "disabled",
  "error",
];

const MEMORY_WARNING_STATES: MemoryReadinessState[] = ["degraded", "unknown"];

export function severityFromReadiness(
  readiness: ModelReadinessState,
): RuntimeReadinessSeverity {
  if (readiness === "ready") return "ready";
  if (BLOCKED_STATES.includes(readiness)) return "blocked";
  if (WARNING_STATES.includes(readiness)) return "warning";
  return "unknown";
}

export function severityFromMemoryReadiness(
  readiness: MemoryReadinessState,
): RuntimeReadinessSeverity {
  if (readiness === "ready") return "ready";
  if (MEMORY_BLOCKED_STATES.includes(readiness)) return "blocked";
  if (MEMORY_WARNING_STATES.includes(readiness)) return "warning";
  return "unknown";
}

function aggregateSeverity(
  routes: RuntimeRouteDiagnostics[],
  onboardingWarnings: RuntimeOnboardingWarning[],
  memory?: RuntimeMemoryDiagnostics,
): RuntimeReadinessSeverity {
  if (routes.some((route) => route.severity === "blocked") || memory?.severity === "blocked") return "blocked";
  if (
    onboardingWarnings.length > 0 ||
    routes.some((route) => route.severity === "warning") ||
    memory?.severity === "warning"
  ) {
    return "warning";
  }
  if (routes.every((route) => route.severity === "ready") && (!memory || memory.severity === "ready")) return "ready";
  return "unknown";
}

function activeModeLabel(mode: ModelMode): string {
  return MODE_LABEL[mode] || mode;
}

export function sanitizeDiagnosticText(value: string): string {
  return value
    .replace(/\[SECURED\]/gi, "[redacted]")
    .replace(/\bsk-[A-Za-z0-9_-]{8,}\b/g, "[redacted]")
    .replace(/\bsk-ant-[A-Za-z0-9_-]{8,}\b/g, "[redacted]")
    .replace(/\bAIza[A-Za-z0-9_-]{12,}\b/g, "[redacted]")
    .replace(/\bgh[pousr]_[A-Za-z0-9_]{12,}\b/g, "[redacted]");
}

export function normalizeRuntimeRoute(
  route: ModelRouteDecision,
): RuntimeRouteDiagnostics {
  const capability = route.capability === "brain" ? "chat" : route.capability;
  const safeCapability = ["chat", "embedding", "stt", "tts"].includes(
    capability,
  )
    ? (capability as RuntimeRouteDiagnostics["capability"])
    : "chat";

  return {
    capability: safeCapability,
    label: ROUTE_LABEL[safeCapability],
    mode: route.mode,
    provider: route.provider,
    model: sanitizeDiagnosticText(route.model),
    readiness: route.readiness,
    severity: severityFromReadiness(route.readiness),
    reason: sanitizeDiagnosticText(route.reason),
    warnings: route.warnings.map(sanitizeDiagnosticText),
    privacy: route.privacy,
    networkAllowed: route.networkAllowed,
    fallbackPolicy: route.fallbackPolicy,
    keySource: route.keySource || "none",
    runtime: route.runtime || "unknown",
  };
}


export function normalizeRuntimeMemory(
  route: MemoryRouteDecision,
): RuntimeMemoryDiagnostics {
  return {
    label: "Memory / RAG",
    mode: route.mode,
    provider: sanitizeDiagnosticText(route.provider),
    embeddingModel: sanitizeDiagnosticText(route.embeddingModel),
    vectorStore: sanitizeDiagnosticText(route.vectorStore),
    readiness: route.readiness,
    severity: severityFromMemoryReadiness(route.readiness),
    reason: sanitizeDiagnosticText(route.reason),
    warnings: route.warnings.map(sanitizeDiagnosticText),
    privacy: route.privacy,
    networkAllowed: route.networkAllowed,
    fallbackPolicy: route.fallbackPolicy,
    localEmbeddingModelInstalled: route.localEmbeddingModelInstalled,
    localRuntimeAvailable: route.localRuntimeAvailable,
  };
}
export function buildRuntimeDiagnosticsSummary(input: {
  activeMode: ModelMode;
  routes: RuntimeRouteDiagnostics[];
  onboardingWarnings: RuntimeOnboardingWarning[];
  memory?: RuntimeMemoryDiagnostics;
}): RuntimeDiagnosticsSummary {
  const severity = aggregateSeverity(input.routes, input.onboardingWarnings, input.memory);
  const activeLabel = activeModeLabel(input.activeMode);
  const firstBlocked = input.routes.find((route) => route.severity === "blocked");
  const firstWarning = input.routes.find((route) => route.severity === "warning");

  if (!firstBlocked && input.memory?.severity === "blocked") {
    return {
      activeMode: input.activeMode,
      activeModeLabel: activeLabel,
      headline: `${activeLabel} · Memory blocked`,
      severity,
      description: input.memory.reason,
    };
  }

  if (!firstWarning && input.memory?.severity === "warning") {
    return {
      activeMode: input.activeMode,
      activeModeLabel: activeLabel,
      headline: `${activeLabel} · Memory warning`,
      severity,
      description: input.memory.reason,
    };
  }

  if (firstBlocked) {
    return {
      activeMode: input.activeMode,
      activeModeLabel: activeLabel,
      headline: `${activeLabel} · ${friendlyBlockedHeadline(firstBlocked)}`,
      severity,
      description: firstBlocked.reason,
    };
  }

  if (firstWarning) {
    return {
      activeMode: input.activeMode,
      activeModeLabel: activeLabel,
      headline: `${activeLabel} · ${firstWarning.label} warning`,
      severity,
      description: firstWarning.reason,
    };
  }

  if (input.onboardingWarnings.length > 0) {
    return {
      activeMode: input.activeMode,
      activeModeLabel: activeLabel,
      headline: `${activeLabel} · Setup warning saved`,
      severity,
      description:
        "Luca saved setup warnings from onboarding. Review runtime status when convenient.",
    };
  }

  return {
    activeMode: input.activeMode,
    activeModeLabel: activeLabel,
    headline: `${activeLabel} · Ready`,
    severity,
    description: "Luca's visible model routes are ready.",
  };
}

function friendlyBlockedHeadline(route: RuntimeRouteDiagnostics): string {
  if (route.readiness === "missing_key") return "Missing key";
  if (route.readiness === "missing_runtime") {
    return route.runtime === "ollama" ? "Ollama offline" : "Runtime offline";
  }
  if (route.readiness === "missing_model") return "Model not installed";
  if (route.readiness === "unsupported_hardware") return "Hardware unsupported";
  if (route.readiness === "planned") return "Model not verified";
  if (route.readiness === "error") return "Route blocked";
  return `${route.label} blocked`;
}

export function getVisibleRuntimeRoutesForAudience(
  routes: RuntimeRouteDiagnostics[],
  audience: RuntimeDiagnosticsAudience,
): RuntimeRouteDiagnostics[] {
  if (audience !== "normal") return routes;
  return routes.filter((route) => route.severity !== "ready");
}

export function getVisibleMemoryDiagnosticsForAudience(
  memory: RuntimeMemoryDiagnostics,
  audience: RuntimeDiagnosticsAudience,
): RuntimeMemoryDiagnostics | null {
  if (audience !== "normal") return memory;
  if (memory.severity === "ready") return null;
  return {
    ...memory,
    provider: "memory",
    embeddingModel: "hidden",
    vectorStore: "hidden",
    fallbackPolicy: "no_fallback",
    networkAllowed: memory.networkAllowed,
    warnings: memory.warnings.slice(0, 2),
  };
}

export function buildGovernanceDiagnosticsForAudience(input: {
  audience: RuntimeDiagnosticsAudience;
  runtimeContinuity: RuntimeContinuitySummary;
  scheduler: SchedulerDiagnosticsSummary;
  provenance: ProvenanceDiagnosticsSummary;
  skills: SkillRegistryDiagnosticsSummary;
  memoryGovernance: MemoryGovernanceDiagnosticsSummary;
  reminders?: ReminderDeliveryDiagnosticsSummary;
  inbox?: RuntimeInboxDiagnosticsSummary;
  sessions?: AgentSessionContinuityDiagnosticsSummary;
  approvalCenter?: ApprovalRequestDiagnosticsSummary;
  governedRequests?: GovernedActionRequestDiagnosticsSummary;
  governedExecutions?: GovernedToolExecutionDiagnosticsSummary;
  memoryProposals?: MemoryProposalDiagnosticsSummary;
  memoryWrites?: MemoryWriteDiagnosticsSummary;
  skillGovernance?: SkillGovernanceDiagnosticsSummary;
  gateway?: GatewayDiagnosticsSummary;
  planningCheckpoints?: AgentPlanningCheckpointDiagnosticsSummary;
  runtimePlans?: RuntimePlanDiagnosticsSummary;
  intentRouting?: IntentRoutingDiagnosticsSummary;
}): RuntimeGovernanceDiagnostics {
  const reminders = input.reminders ?? { totalDeliveries: 0, deliveredCount: 0, blockedCount: 0, failedCount: 0, pendingCount: 0, safeLoopDeliveryEnabled: true };
  const inbox = input.inbox ?? { totalEvents: 0, unreadEvents: 0, archivedEvents: 0, externalInertEvents: 0, approvalEvents: 0 };
  const sessions = input.sessions ?? { totalSessions: 0, activeSessions: 0, resumableSessions: 0, pausedSessions: 0, quarantinedSessions: 0, safeToResumeSessions: 0 };
  const approvalCenter = input.approvalCenter ?? { totalRequests: 0, pendingRequests: 0, approvedOnceRequests: 0, rejectedRequests: 0, expiredRequests: 0, revokedRequests: 0 };
  const governedRequests = input.governedRequests ?? { totalRequests: 0, proposedRequests: 0, approvalRequiredRequests: 0, approvedWaitingExecutionRequests: 0, rejectedRequests: 0, blockedRequests: 0, dryRunOnly: true as const };
  const governedExecutions = input.governedExecutions ?? { totalExecutions: 0, succeededExecutions: 0, blockedExecutions: 0, failedExecutions: 0, queuedExecutions: 0, safeExecutionEnabled: true as const, riskyExecutionEnabled: false as const };
  const memoryProposals = input.memoryProposals ?? { totalProposals: 0, proposedProposals: 0, approvalRequiredProposals: 0, approvedWaitingWriteProposals: 0, writtenProposals: 0, rejectedProposals: 0, blockedProposals: 0, revokedProposals: 0, expiredProposals: 0 };
  const memoryWrites = input.memoryWrites ?? { totalWrites: 0, succeededWrites: 0, blockedWrites: 0, failedWrites: 0 };
  const skillGovernance = input.skillGovernance ?? { totalRequests: 0, proposedRequests: 0, approvalRequiredRequests: 0, approvedWaitingRequests: 0, rejectedRequests: 0, blockedRequests: 0, revokedRequests: 0, expiredRequests: 0, canAutoExecute: false as const };
  const gateway = input.gateway ?? { totalRequests: 0, dryRunRequests: 0, blockedRequests: 0, waitingUserRequests: 0, highRiskRequests: 0, criticalRiskRequests: 0, executionEnabled: false as const, dryRunOnly: true as const };
  const planningCheckpoints = input.planningCheckpoints ?? { totalCheckpoints: 0, proposedCheckpoints: 0, approvedCheckpoints: 0, rejectedCheckpoints: 0, blockedCheckpoints: 0, completedCheckpoints: 0, archivedCheckpoints: 0, canAutoExecute: false as const };
  const runtimePlans = input.runtimePlans ?? { totalPlans: 0, activePlans: 0, proposedPlans: 0, waitingPlans: 0, blockedPlans: 0, completedPlans: 0, totalPlanSteps: 0, blockedRiskySteps: 0, pendingPlanApprovals: 0, planArtifactsCreated: 0, orchestrationEnabled: true as const, riskyExecutionEnabled: false as const };
  const intentRouting: IntentRoutingDiagnosticsSummary = input.intentRouting ?? { currentRoutingMode: "auto", totalRoutingDecisions: 0, fastResponses: 0, plannedRoutes: 0, memoryProposalRoutes: 0, governedRequestRoutes: 0, skillRequestRoutes: 0, blockedRoutes: 0, askUserRoutes: 0, lastRouteAt: null, routingEnabled: true as const, autoExecutionEnabled: false as const, riskyExecutionEnabled: false as const };
  const pendingMemoryProposals = memoryProposals.proposedProposals + memoryProposals.approvalRequiredProposals;
  const approvedMemoryWritesWaiting = memoryProposals.approvedWaitingWriteProposals;
  const completedMemoryWrites = memoryWrites.succeededWrites;
  const pendingSkillRequests = skillGovernance.proposedRequests + skillGovernance.approvalRequiredRequests;
  const approvedSkillRequestsWaiting = skillGovernance.approvedWaitingRequests;
  const pendingPlanningCheckpoints = planningCheckpoints.proposedCheckpoints;
  const blockedGovernanceItems = memoryProposals.blockedProposals + memoryWrites.blockedWrites + skillGovernance.blockedRequests + gateway.blockedRequests + planningCheckpoints.blockedCheckpoints;
  const pendingApprovals =
    input.runtimeContinuity.pendingApprovalCount +
    input.scheduler.pendingApprovals +
    input.provenance.pendingApprovals +
    approvalCenter.pendingRequests;
  const quarantinedItems =
    input.runtimeContinuity.quarantinedItemCount +
    input.scheduler.quarantinedJobs +
    input.skills.quarantinedSkills +
    input.memoryGovernance.quarantinedRecords +
    input.provenance.quarantinedRecords;
  const visibility = input.audience === "origin" ? "full" : input.audience === "tactical" ? "compact" : "friendly";
  const safeSummary = quarantinedItems > 0
    ? `${quarantinedItems} governed item(s) need review before autonomous continuity can expand.`
    : pendingApprovals > 0
      ? `${pendingApprovals} approval(s) are waiting before risky actions can proceed.`
      : `You have ${reminders.deliveredCount} reminder(s), ${approvalCenter.pendingRequests} pending approval(s), and ${sessions.safeToResumeSessions} resumable session(s).`;

  return {
    runtimeContinuity: input.runtimeContinuity,
    scheduler: input.scheduler,
    provenance: input.audience === "normal"
      ? { pendingApprovals: input.provenance.pendingApprovals }
      : input.provenance,
    skills: input.skills,
    memoryGovernance: input.memoryGovernance,
    reminders,
    inbox,
    sessions,
    approvalCenter,
    governedRequests,
    governedExecutions,
    memoryProposals,
    memoryWrites,
    skillGovernance,
    gateway,
    planningCheckpoints,
    runtimePlans,
    intentRouting,
    pendingMemoryProposals,
    approvedMemoryWritesWaiting,
    completedMemoryWrites,
    pendingSkillRequests,
    approvedSkillRequestsWaiting,
    pendingPlanningCheckpoints,
    blockedGovernanceItems,
    visibility,
    safeSummary: sanitizeDiagnosticText(safeSummary),
  };
}

export function selectRecommendedActions(input: {
  routes: RuntimeRouteDiagnostics[];
  localRuntime: RuntimeLocalRuntimeDiagnostics;
  memory?: RuntimeMemoryDiagnostics;
}): RuntimeRecommendedAction[] {
  const ids: RuntimeRecommendedActionId[] = [];

  if (input.memory?.readiness === "missing_key") ids.push("add_byok_key");
  if (
    input.memory?.readiness === "missing_embedding_model" ||
    input.memory?.readiness === "missing_vector_store"
  ) {
    ids.push("open_model_manager");
  }
  if (input.memory?.readiness === "missing_runtime") ids.push("open_model_manager");
  if (input.memory?.readiness === "unknown" || input.memory?.readiness === "degraded") {
    ids.push("retry_route_check");
  }

  for (const route of input.routes) {
    if (route.readiness === "missing_key") ids.push("add_byok_key");
    if (route.readiness === "missing_runtime") {
      if (route.runtime === "ollama") {
        ids.push(
          input.localRuntime.ollama.installed === false
            ? "install_ollama"
            : "start_ollama",
        );
      } else {
        ids.push("open_model_manager");
      }
    }
    if (route.readiness === "missing_model" || route.readiness === "planned") {
      ids.push("open_model_manager");
    }
    if (
      route.readiness === "unsupported_hardware" ||
      route.readiness === "error"
    ) {
      ids.push("switch_to_luca_prime");
      ids.push("open_model_manager");
    }
    if (route.readiness === "downloading" || route.readiness === "unknown") {
      ids.push("retry_route_check");
    }
  }

  ids.push("retry_route_check");
  const unique = Array.from(new Set(ids));
  if (unique.length === 1 && unique[0] === "retry_route_check") {
    return [ACTION_COPY.none];
  }
  return unique.slice(0, 4).map((id) => ACTION_COPY[id]);
}

export function summarizeKeyReadiness(
  routes: RuntimeRouteDiagnostics[],
): RuntimeKeyReadinessSummary {
  const cloudRoutes = routes.filter(
    (route) => route.mode === "byok" || route.mode === "luca-prime",
  );
  const missingProviders = cloudRoutes
    .filter((route) => route.readiness === "missing_key")
    .map((route) => route.provider);
  const sources = Array.from(
    new Set(cloudRoutes.map((route) => route.keySource)),
  );

  return {
    required: cloudRoutes.length > 0,
    ready: missingProviders.length === 0,
    sources: sources.length > 0 ? sources : ["none"],
    missingProviders,
  };
}

export function detectRuntimeDiagnosticsAudience(
  settings: LucaSettings,
): RuntimeDiagnosticsAudience {
  const rawTier =
    (settings.general as any)?.userTier ||
    (settings.general as any)?.lucaTier ||
    (settings as any)?.userTier ||
    (settings as any)?.lucaTier;
  const tier: LucaUserTier = normalizeLucaUserTier(rawTier);

  if (tier === "origin") return "origin";
  if (tier === "tactical") return "tactical";
  if (settings.general.experimentalMode) return "origin";
  if (settings.general.debugMode) return "tactical";
  return "normal";
}

async function getLocalRuntimeDiagnostics(
  routes: RuntimeRouteDiagnostics[],
): Promise<RuntimeLocalRuntimeDiagnostics> {
  let ollama = { available: false, models: [] as any[] };
  try {
    ollama = await modelManagerService.getOllamaModels();
  } catch (error) {
    console.warn("[RuntimeDiagnostics] Ollama status unavailable", error);
  }

  let installed: boolean | undefined;
  try {
    installed = await modelManagerService.isOllamaInstalled();
  } catch {
    installed = undefined;
  }

  // Prefer live Cortex facade probe (product path). Fall back to route matrix.
  let cortexAvailable: boolean | "unknown" = "unknown";
  try {
    const { probeCortexViaRuntimeFacade } = await import(
      "../local-models/cortexRuntimeProbe"
    );
    const probe = await probeCortexViaRuntimeFacade();
    cortexAvailable = probe.available;
  } catch {
    const cortexRouteSelected = routes.some((route) => route.runtime === "cortex");
    cortexAvailable = cortexRouteSelected
      ? !routes.some(
          (route) =>
            route.runtime === "cortex" && route.readiness === "missing_runtime",
        )
      : "unknown";
  }

  // Local model runtime facade snapshot (registered adapters + admission /
  // lease pressure). Degrades to undefined — the legacy probes above remain
  // the baseline signal.
  let facade: RuntimeLocalRuntimeFacadeDiagnostics | undefined;
  try {
    const snapshot = await localRuntimeDiagnostics.snapshot();
    facade = {
      generatedAt: snapshot.generatedAt,
      registeredRuntimes: snapshot.registeredRuntimes,
      runtimes: snapshot.registeredRuntimes.map((runtime) => {
        const entry = snapshot.healthByRuntime[runtime];
        return {
          runtime,
          status:
            entry?.health?.status ?? (entry?.error ? "error" : "unknown"),
          reachable: entry?.health?.reachable,
          modelCount: entry?.health?.modelIds.length,
          message: sanitizeDiagnosticText(
            entry?.error ?? entry?.health?.message ?? "",
          ),
        };
      }),
      activeRequests: snapshot.admission.globalActive,
      activeLeases: Object.values(snapshot.leases.activeByModel).reduce(
        (sum, count) => sum + count,
        0,
      ),
      leaseUnderflows: snapshot.leases.releaseUnderflows,
    };
  } catch (error) {
    console.warn(
      "[RuntimeDiagnostics] Local runtime facade snapshot unavailable",
      error,
    );
  }

  return {
    ollama: {
      available: ollama.available,
      installed,
      installedModelCount: ollama.models.length,
    },
    cortex: { available: cortexAvailable },
    facade,
  };
}

function getOnboardingWarnings(
  settings: LucaSettings,
): RuntimeOnboardingWarning[] {
  return (settings.onboarding?.modelRouteWarnings || []).map((warning) => ({
    capability: warning.capability,
    mode: warning.mode,
    provider: warning.provider,
    readiness: warning.readiness,
    reason: sanitizeDiagnosticText(warning.reason),
    warnings: (warning.warnings || []).map(sanitizeDiagnosticText),
  }));
}

export async function buildRuntimeDiagnostics(): Promise<RuntimeDiagnostics> {
  const settings = settingsService.getSettings();
  const activeMode = normalizeModelMode(settings.brain.provider);

  const [chatRoute, embeddingRoute, voiceRoutes, vectorStoreOptions] = await Promise.all([
    llmService.resolveRouteForDiagnostics(),
    modelReadinessResolver.resolveRoute({ capability: "embedding" }),
    modelReadinessResolver.resolveVoiceRoutes(),
    getMemoryVectorStoreOptions(),
  ]);
  const memoryRoute = await memoryReadinessResolver.resolveMemoryRoute(
    vectorStoreOptions,
  );

  const routes = {
    chat: normalizeRuntimeRoute(chatRoute),
    embedding: normalizeRuntimeRoute(embeddingRoute),
    stt: normalizeRuntimeRoute(voiceRoutes.stt),
    tts: normalizeRuntimeRoute(voiceRoutes.tts),
  };
  const routeList = Object.values(routes);
  const memory = normalizeRuntimeMemory(memoryRoute);
  const onboardingWarnings = getOnboardingWarnings(settings);
  const localRuntime = await getLocalRuntimeDiagnostics(routeList);
  const audience = detectRuntimeDiagnosticsAudience(settings);
  const runtimeContinuity = {
    ...runtimeContinuityService.getDiagnosticsSummary(),
    loopStatus: runtimeContinuityLoopService.getLoopStatus(),
  };
  const governance = buildGovernanceDiagnosticsForAudience({
    audience,
    runtimeContinuity,
    scheduler: schedulerRegistryService.getDiagnosticsSummary(),
    provenance: provenanceGateService.getDiagnosticsSummary(),
    skills: skillRegistryService.getDiagnosticsSummary(),
    memoryGovernance: memoryGovernanceService.getDiagnosticsSummary(),
    reminders: reminderDeliveryService.getDiagnosticsSummary(),
    inbox: runtimeInboxService.getDiagnosticsSummary(),
    sessions: agentSessionContinuityService.getDiagnosticsSummary(),
    approvalCenter: approvalRequestCenterService.getDiagnosticsSummary(),
    governedRequests: governedActionRequestService.getDiagnosticsSummary(),
    governedExecutions: governedToolExecutionService.getDiagnosticsSummary(),
    memoryProposals: memoryProposalService.getDiagnosticsSummary(),
    memoryWrites: governedMemoryWriteService.getDiagnosticsSummary(),
    skillGovernance: skillGovernanceService.getDiagnosticsSummary(),
    gateway: browserDesktopGatewayService.getDiagnosticsSummary(),
    planningCheckpoints: agentPlanningCheckpointService.getDiagnosticsSummary(),
    runtimePlans: runtimePlanService.getDiagnosticsSummary(),
    intentRouting: intentRoutingService.getDiagnosticsSummary(),
  });

  return {
    summary: buildRuntimeDiagnosticsSummary({
      activeMode,
      routes: routeList,
      onboardingWarnings,
      memory,
    }),
    audience,
    routes,
    memory,
    localRuntime,
    keyReadiness: summarizeKeyReadiness(routeList),
    onboardingWarnings,
    recommendedActions: selectRecommendedActions({
      routes: routeList,
      localRuntime,
      memory,
    }),
    governance,
    generatedAt: Date.now(),
  };
}

class RuntimeDiagnosticsService {
  async getDiagnostics(): Promise<RuntimeDiagnostics> {
    return buildRuntimeDiagnostics();
  }

  getAudience(
    settings: LucaSettings = settingsService.getSettings(),
  ): RuntimeDiagnosticsAudience {
    return detectRuntimeDiagnosticsAudience(settings);
  }

  getLocalInstalledModelCount(): number {
    return modelManager
      .getAllModels()
      .filter((model: LocalModel) => model.status === "ready").length;
  }
}

export const runtimeDiagnosticsService = new RuntimeDiagnosticsService();
