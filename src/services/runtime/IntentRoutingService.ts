// IntentRoutingService — PR #123: Intent Routing Layer
// Routes user intent to existing safe governance systems.
// Does NOT execute anything. Does NOT write memory automatically.

import { eventBus } from "../eventBus";
import { runtimeInboxService, type RuntimeInboxService, sanitizeRuntimeMetadata } from "./RuntimeInboxService";
import { runtimeOrchestrationService, type RuntimeOrchestrationService } from "./RuntimeOrchestrationService";
import { memoryProposalService, type MemoryProposalService } from "../memory/MemoryProposalService";
import { governedActionRequestService, type GovernedActionRequestService } from "./GovernedActionRequestService";
import { skillGovernanceService, type SkillGovernanceService } from "../skills/SkillGovernanceService";
import { agentPlanningCheckpointService, type AgentPlanningCheckpointService } from "./AgentPlanningCheckpointService";
import { intentRoutingModeService, type IntentRoutingModeService } from "./IntentRoutingModeService";
import { browserDesktopGatewayService, type BrowserDesktopGatewayService } from "./BrowserDesktopGatewayService";
import {
  classifyIntent,
  sanitizeIntentInput,
  detectLocalPanelTarget,
} from "./IntentRoutingPolicy";
import { getTargetCapability, getSafeLocalPanelLabel } from "./SafeLocalPanelTargets";
import type {
  LucaRoutingMode,
  LucaIntentRoutingDecision,
  LucaIntentRoutingInput,
  LucaIntentRoutingResult,
  IntentRoutingDiagnosticsSummary,
} from "../../types/intentRouting";
import { INTENT_ROUTING_MAX_DECISIONS } from "../../types/intentRouting";

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const STORAGE_KEY = "LUCA_INTENT_ROUTING_DECISIONS_V1";

function nowIso(): string {
  return new Date().toISOString();
}

function getStorage(): StorageLike | undefined {
  if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  if (typeof localStorage !== "undefined") return localStorage;
  return undefined;
}

function readDecisions(store: StorageLike | undefined): LucaIntentRoutingDecision[] {
  try {
    const raw = store?.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Dependencies
// ---------------------------------------------------------------------------

export interface IntentRoutingServiceDependencies {
  storage?: StorageLike;
  modeService: Pick<IntentRoutingModeService, "getMode" | "setMode">;
  orchestration: Pick<RuntimeOrchestrationService, "proposePlanFromIntent">;
  memoryProposals: Pick<MemoryProposalService, "createProposal">;
  governedRequests: Pick<GovernedActionRequestService, "createRequest">;
  skillGovernance: Pick<SkillGovernanceService, "createSkillRequest">;
  gatewayRequests: Pick<BrowserDesktopGatewayService, "createGatewayRequest">;
  checkpoints: Pick<AgentPlanningCheckpointService, "createCheckpoint">;
  inbox: Pick<RuntimeInboxService, "ingestEvent">;
  bus: Pick<typeof eventBus, "emitEvent" | "emit">;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class IntentRoutingService {
  private decisions: LucaIntentRoutingDecision[];

  constructor(
    private readonly deps: IntentRoutingServiceDependencies = {
      storage: getStorage(),
      modeService: intentRoutingModeService,
      orchestration: runtimeOrchestrationService,
      memoryProposals: memoryProposalService,
      governedRequests: governedActionRequestService,
      skillGovernance: skillGovernanceService,
      gatewayRequests: browserDesktopGatewayService,
      checkpoints: agentPlanningCheckpointService,
      inbox: runtimeInboxService,
      bus: eventBus,
    },
  ) {
    this.decisions = readDecisions(this.deps.storage);
  }

  // -----------------------------------------------------------------------
  // Main routing entry points
  // -----------------------------------------------------------------------

  routeIntent(input: LucaIntentRoutingInput): LucaIntentRoutingResult {
    return this.routeUserMessage(input);
  }

  routeUserMessage(input: LucaIntentRoutingInput): LucaIntentRoutingResult {
    const sanitized = sanitizeIntentInput(input);
    const draft = classifyIntent(sanitized);
    const timestamp = nowIso();
    const decisionId = `intent-route:${timestamp}:${Math.random().toString(36).slice(2, 8)}`;

    const decision: LucaIntentRoutingDecision = {
      ...draft,
      decisionId,
      createdAt: timestamp,
      metadata: { ...draft.metadata, source: sanitized.source, sourceId: sanitized.sourceId },
    };

    this.createArtifactsForRoute(decision, sanitized);

    this.upsert(decision);
    this.emitRouteEvent(decision);

    const userFacingSummary = this.buildUserFacingSummary(decision);
    const assistantResponseHint = this.buildAssistantResponseHint(decision);
    const createdArtifactsSummary = this.buildArtifactsSummary(decision);

    return {
      decision,
      userFacingSummary,
      assistantResponseHint,
      createdArtifactsSummary,
      noExecutionPerformed: true,
    };
  }

  // -----------------------------------------------------------------------
  // Decision storage
  // -----------------------------------------------------------------------

  listRoutingDecisions(): LucaIntentRoutingDecision[] {
    return [...this.decisions];
  }

  getDecision(decisionId: string): LucaIntentRoutingDecision | undefined {
    return this.decisions.find((d) => d.decisionId === decisionId);
  }

  getLastDecision(): LucaIntentRoutingDecision | undefined {
    return this.decisions[0];
  }

  // -----------------------------------------------------------------------
  // Mode delegation
  // -----------------------------------------------------------------------

  setDefaultMode(mode: LucaRoutingMode): void {
    this.deps.modeService.setMode(mode);
    this.emitModeChanged(mode);
  }

  getDefaultMode(): LucaRoutingMode {
    return this.deps.modeService.getMode();
  }

  // -----------------------------------------------------------------------
  // Diagnostics
  // -----------------------------------------------------------------------

  getDiagnosticsSummary(): IntentRoutingDiagnosticsSummary {
    const last = this.decisions[0];
    return {
      currentRoutingMode: this.deps.modeService.getMode(),
      totalRoutingDecisions: this.decisions.length,
      fastResponses: this.decisions.filter((d) => d.route === "fast_response").length,
      plannedRoutes: this.decisions.filter((d) => d.route === "runtime_plan").length,
      memoryProposalRoutes: this.decisions.filter((d) => d.route === "memory_proposal").length,
      governedRequestRoutes: this.decisions.filter((d) => d.route === "governed_action_request" || d.route === "safe_execution_request").length,
      skillRequestRoutes: this.decisions.filter((d) => d.route === "skill_request").length,
      blockedRoutes: this.decisions.filter((d) => d.route === "blocked_risky_action").length,
      askUserRoutes: this.decisions.filter((d) => d.route === "ask_user").length,
      lastRouteAt: last?.createdAt ?? null,
      routingEnabled: true,
      autoExecutionEnabled: false,
      riskyExecutionEnabled: false,
    };
  }

  clearOldDecisions(): void {
    if (this.decisions.length > INTENT_ROUTING_MAX_DECISIONS) {
      this.decisions = this.decisions.slice(0, INTENT_ROUTING_MAX_DECISIONS);
      this.persist();
    }
  }

  // -----------------------------------------------------------------------
  // Private: artifact creation per route
  // -----------------------------------------------------------------------

  // -----------------------------------------------------------------------
  // Private: routes that require real provenance to create artifacts
  // -----------------------------------------------------------------------

  private static readonly ARTIFACT_CREATING_ROUTES: ReadonlySet<string> = new Set([
    "memory_proposal",
    "runtime_plan",
    "governed_action_request",
    "safe_execution_request",
    "skill_request",
    "planning_checkpoint",
  ]);

  private hasRealProvenance(input: LucaIntentRoutingInput): boolean {
    return Array.isArray(input.provenanceIds) && input.provenanceIds.length > 0;
  }

  private degradeToAskUserForMissingProvenance(
    decision: LucaIntentRoutingDecision,
  ): void {
    decision.route = "ask_user";
    decision.reason = `missing_provenance_for_governed_artifact — original route was ${decision.route}. ${decision.reason}`;
    decision.shouldCreatePlan = false;
    decision.shouldCreateMemoryProposal = false;
    decision.shouldCreateGovernedRequest = false;
    decision.shouldCreateSkillRequest = false;
    decision.shouldCreateCheckpoint = false;
    decision.shouldAskUser = true;

    try {
      const event = this.deps.inbox.ingestEvent({
        source: "intent_routing",
        sourceTrustLevel: "local",
        title: "Governed artifact blocked — missing provenance",
        body: `Cannot create governed artifact without valid provenance IDs. Original intent: ${decision.userIntentSummary.slice(0, 200)}.`,
        eventType: "intent_routed_ask_user",
        requiresApproval: false,
        metadata: sanitizeRuntimeMetadata({ route: decision.route, riskLevel: decision.riskLevel, degradedFrom: "missing_provenance" }),
        provenance: {
          provenanceId: decision.decisionId,
          sourceType: "intent_routing",
          sourceId: decision.decisionId,
          sourceTrustLevel: "local",
          createdBy: "intent-routing-service",
          createdAt: decision.createdAt,
          digest: decision.decisionId,
          parentProvenanceIds: [],
          quarantineState: "clear",
          approvalState: "not_required",
          revocationState: "active",
        },
      });
      decision.inboxEventIds = [event.inboxEventId];
    } catch { /* swallow */ }
  }

  // -----------------------------------------------------------------------
  // Private: artifact creation per route
  // -----------------------------------------------------------------------

  private createArtifactsForRoute(
    decision: LucaIntentRoutingDecision,
    input: LucaIntentRoutingInput,
  ): void {
    // Artifact-creating routes require real provenance. If missing, degrade.
    if (
      IntentRoutingService.ARTIFACT_CREATING_ROUTES.has(decision.route) &&
      !this.hasRealProvenance(input)
    ) {
      this.degradeToAskUserForMissingProvenance(decision);
      return;
    }

    const provenanceIds = input.provenanceIds;

    switch (decision.route) {
      case "fast_response":
        break;

      case "memory_proposal": {
        try {
          const proposal = this.deps.memoryProposals.createProposal({
            title: `Memory from intent: ${decision.userIntentSummary.slice(0, 100)}`,
            summary: decision.userIntentSummary,
            proposedMemory: input.message.slice(0, 2_000),
            kind: "other",
            source: "intent_routing",
            sourceId: decision.decisionId,
            provenanceIds,
            riskLevel: "low",
            reason: decision.reason,
          });
          decision.createdMemoryProposalIds = [proposal.proposalId];
        } catch { /* swallow — routing continues */ }
        break;
      }

      case "runtime_plan": {
        try {
          const plan = this.deps.orchestration.proposePlanFromIntent({
            userIntent: decision.userIntentSummary,
            source: "intent_routing",
            sourceId: decision.decisionId,
            provenanceIds,
          });
          decision.createdPlanId = plan.planId;
        } catch { /* swallow */ }
        break;
      }

      case "governed_action_request":
      case "safe_execution_request": {
        try {
          const panelTarget = detectLocalPanelTarget(input.message);
          const capability = panelTarget ? getTargetCapability(panelTarget) : (decision.route === "safe_execution_request" ? "runtime_read" : "notify");
          const target = panelTarget ?? (decision.route === "safe_execution_request" ? "runtime:diagnostics" : "notification");
          const title = panelTarget
            ? `Open ${getSafeLocalPanelLabel(panelTarget)}`
            : `Action from intent: ${decision.userIntentSummary.slice(0, 100)}`;
          const request = this.deps.governedRequests.createRequest({
            kind: "tool",
            title,
            description: decision.reason,
            requestedCapability: capability,
            target,
            provenanceIds,
            riskLevel: decision.riskLevel === "safe" || decision.riskLevel === "low" ? "low" : "high",
          });
          decision.createdGovernedRequestIds = [request.requestId];
        } catch { /* swallow */ }
        break;
      }

      case "skill_request": {
        try {
          const request = this.deps.skillGovernance.createSkillRequest({
            skillId: `intent-skill-${decision.decisionId}`,
            skillName: decision.userIntentSummary.slice(0, 80),
            requestType: "install",
            title: `Skill request: ${decision.userIntentSummary.slice(0, 100)}`,
            description: decision.reason,
            provenanceIds,
            riskLevel: "high",
          });
          decision.createdSkillRequestIds = [request.skillRequestId];
        } catch { /* swallow */ }
        break;
      }

      case "planning_checkpoint": {
        try {
          const checkpoint = this.deps.checkpoints.createCheckpoint({
            title: `Checkpoint: ${decision.userIntentSummary.slice(0, 100)}`,
            summary: decision.reason,
            provenanceIds,
          });
          decision.createdCheckpointIds = [checkpoint.checkpointId];
        } catch { /* swallow */ }
        break;
      }

      case "blocked_risky_action": {
        const localProv = provenanceIds.length > 0 ? provenanceIds : [];
        try {
          this.deps.gatewayRequests.createGatewayRequest({
            title: `Gateway research record: ${decision.userIntentSummary.slice(0, 100)}`,
            summary: decision.reason,
            source: "intent_routing",
            sourceId: decision.decisionId,
            provenanceIds: localProv,
            metadata: { route: decision.route, riskLevel: decision.riskLevel, signals: decision.signals.join(",") },
          });
        } catch { /* gateway research record is best-effort and never executes */ }
        try {
          const event = this.deps.inbox.ingestEvent({
            source: "intent_routing",
            sourceTrustLevel: "local",
            title: `Blocked risky intent`,
            body: `Risky intent blocked: ${decision.userIntentSummary.slice(0, 200)}. Reason: ${decision.reason}`,
            eventType: "intent_routed_blocked",
            requiresApproval: false,
            metadata: sanitizeRuntimeMetadata({ route: decision.route, riskLevel: decision.riskLevel, signals: decision.signals.join(",") }),
            provenance: {
              provenanceId: decision.decisionId,
              sourceType: "intent_routing",
              sourceId: decision.decisionId,
              sourceTrustLevel: "local",
              createdBy: "intent-routing-service",
              createdAt: decision.createdAt,
              digest: decision.decisionId,
              parentProvenanceIds: localProv,
              quarantineState: "clear",
              approvalState: "not_required",
              revocationState: "active",
            },
          });
          decision.inboxEventIds = [event.inboxEventId];
        } catch { /* swallow */ }
        break;
      }

      case "ask_user": {
        const localProv = provenanceIds.length > 0 ? provenanceIds : [];
        try {
          const event = this.deps.inbox.ingestEvent({
            source: "intent_routing",
            sourceTrustLevel: "local",
            title: `Clarification needed`,
            body: `Intent unclear or consequential: ${decision.userIntentSummary.slice(0, 200)}. Asking user.`,
            eventType: "intent_routed_ask_user",
            requiresApproval: false,
            metadata: sanitizeRuntimeMetadata({ route: decision.route, riskLevel: decision.riskLevel }),
            provenance: {
              provenanceId: decision.decisionId,
              sourceType: "intent_routing",
              sourceId: decision.decisionId,
              sourceTrustLevel: "local",
              createdBy: "intent-routing-service",
              createdAt: decision.createdAt,
              digest: decision.decisionId,
              parentProvenanceIds: localProv,
              quarantineState: "clear",
              approvalState: "not_required",
              revocationState: "active",
            },
          });
          decision.inboxEventIds = [event.inboxEventId];
        } catch { /* swallow */ }
        break;
      }
    }
  }

  // -----------------------------------------------------------------------
  // Private: user-facing response hints
  // -----------------------------------------------------------------------

  private buildUserFacingSummary(decision: LucaIntentRoutingDecision): string {
    switch (decision.route) {
      case "fast_response":
        return "";
      case "memory_proposal":
        return "I created a memory proposal for this. You can approve it in ACTIVITY or MEMORY. It has not been saved yet.";
      case "runtime_plan":
        return "I created a governed plan for this. Review it in ACTIVITY \u2192 Runtime Plans. No action has been executed.";
      case "governed_action_request":
      case "safe_execution_request":
        return "I created a governed action request. It requires approval before anything can happen.";
      case "skill_request":
        return "I created a skill request. It is state-only and will not install or run anything.";
      case "planning_checkpoint":
        return "I created a planning checkpoint. No execution has occurred.";
      case "blocked_risky_action":
        return "I can't execute that directly. I recorded it as blocked for safety.";
      case "ask_user":
        return "I need one clarification before creating a plan or request.";
      default:
        return "";
    }
  }

  private buildAssistantResponseHint(decision: LucaIntentRoutingDecision): string {
    if (decision.route === "fast_response") return "respond_normally";
    if (decision.route === "blocked_risky_action") return "explain_blocked";
    if (decision.route === "ask_user") return "ask_clarification";
    return "acknowledge_route_created";
  }

  private buildArtifactsSummary(decision: LucaIntentRoutingDecision): string {
    const parts: string[] = [];
    if (decision.createdPlanId) parts.push(`plan: ${decision.createdPlanId}`);
    if (decision.createdMemoryProposalIds?.length) parts.push(`memory proposals: ${decision.createdMemoryProposalIds.length}`);
    if (decision.createdGovernedRequestIds?.length) parts.push(`governed requests: ${decision.createdGovernedRequestIds.length}`);
    if (decision.createdSkillRequestIds?.length) parts.push(`skill requests: ${decision.createdSkillRequestIds.length}`);
    if (decision.createdCheckpointIds?.length) parts.push(`checkpoints: ${decision.createdCheckpointIds.length}`);
    if (decision.inboxEventIds?.length) parts.push(`inbox events: ${decision.inboxEventIds.length}`);
    return parts.length > 0 ? parts.join("; ") : "none";
  }

  // -----------------------------------------------------------------------
  // Private: event emission
  // -----------------------------------------------------------------------

  private emitRouteEvent(decision: LucaIntentRoutingDecision): void {
    const base = {
      type: "intent_routed",
      message: `Intent routed: ${decision.route}`,
      priority: "LOW" as const,
      context: { timestamp: Date.now(), route: decision.route, mode: decision.mode, risk: decision.riskLevel },
    };
    this.deps.bus.emitEvent(base);

    const specificType = `intent_routed_${decision.route.replace(/^(governed_action_request|safe_execution_request)$/, "governed_request")}`;
    const typeMap: Record<string, string> = {
      fast_response: "intent_routed_fast",
      runtime_plan: "intent_routed_plan",
      memory_proposal: "intent_routed_memory",
      governed_action_request: "intent_routed_governed_request",
      safe_execution_request: "intent_routed_governed_request",
      skill_request: "intent_routed_skill",
      blocked_risky_action: "intent_routed_blocked",
      ask_user: "intent_routed_ask_user",
      planning_checkpoint: "intent_routed",
    };
    const type = typeMap[decision.route] ?? specificType;
    if (type !== base.type) {
      this.deps.bus.emitEvent({ ...base, type });
    }
  }

  private emitModeChanged(mode: LucaRoutingMode): void {
    this.deps.bus.emitEvent({
      type: "intent_routing_mode_changed",
      message: `Intent routing mode changed to ${mode}`,
      priority: "LOW",
      context: { timestamp: Date.now(), mode },
    });
  }

  // -----------------------------------------------------------------------
  // Private: persistence
  // -----------------------------------------------------------------------

  private upsert(decision: LucaIntentRoutingDecision): void {
    this.decisions = [decision, ...this.decisions.filter((d) => d.decisionId !== decision.decisionId)];
    this.persist();
  }

  private persist(): void {
    if (this.decisions.length > INTENT_ROUTING_MAX_DECISIONS) {
      this.decisions = this.decisions.slice(0, INTENT_ROUTING_MAX_DECISIONS);
    }
    try {
      this.deps.storage?.setItem(STORAGE_KEY, JSON.stringify(this.decisions));
    } catch { /* ignore */ }
  }
}

export const intentRoutingService = new IntentRoutingService();
