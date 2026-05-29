// RuntimePlanService — PR #122: Runtime Orchestration & Planning Loop Foundation
// Creates structured plans, classifies steps, creates governance artifacts.
// Does NOT execute anything. Does NOT write memory automatically.

import { eventBus } from "../eventBus";
import { runtimeInboxService, type RuntimeInboxService, sanitizeRuntimeMetadata } from "./RuntimeInboxService";
import { agentPlanningCheckpointService, type AgentPlanningCheckpointService } from "./AgentPlanningCheckpointService";
import { governedActionRequestService, type GovernedActionRequestService } from "./GovernedActionRequestService";
import { memoryProposalService, type MemoryProposalService } from "../memory/MemoryProposalService";
import { skillGovernanceService, type SkillGovernanceService } from "../skills/SkillGovernanceService";
import { classifyStep, sanitizePlanInput, blockIfSecretLike, type StepDraft } from "./RuntimePlanPolicy";
import type {
  RuntimePlanRecord,
  RuntimePlanStep,
  RuntimePlanStatus,
  RuntimePlanStepStatus,
  RuntimePlanRiskLevel,
  RuntimePlanDiagnosticsSummary,
} from "../../types/runtimePlan";
import {
  RUNTIME_PLAN_MAX_TITLE_LENGTH,
  RUNTIME_PLAN_MAX_SUMMARY_LENGTH,
  RUNTIME_PLAN_MAX_STEPS,
  RUNTIME_PLAN_MAX_METADATA_KEYS,
  RUNTIME_PLAN_MAX_METADATA_VALUE_LENGTH,
} from "../../types/runtimePlan";

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const STORAGE_KEY = "LUCA_RUNTIME_PLANS_V1";
const MAX_PLANS = 200;

function nowIso(): string {
  return new Date().toISOString();
}

function getStorage(): StorageLike | undefined {
  if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  if (typeof localStorage !== "undefined") return localStorage;
  return undefined;
}

function readPlans(store: StorageLike | undefined): RuntimePlanRecord[] {
  try {
    const raw = store?.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function sanitizeMetadata(input: Record<string, unknown> = {}): Record<string, unknown> {
  return sanitizeRuntimeMetadata(
    Object.fromEntries(
      Object.entries(input)
        .slice(0, RUNTIME_PLAN_MAX_METADATA_KEYS)
        .map(([k, v]) => [
          k.slice(0, 80),
          typeof v === "string" ? v.slice(0, RUNTIME_PLAN_MAX_METADATA_VALUE_LENGTH) : v,
        ]),
    ),
  );
}

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

export interface CreatePlanInput {
  title: string;
  summary: string;
  source: string;
  sourceId?: string;
  userIntentSummary?: string;
  stepDrafts: StepDraft[];
  provenanceIds: string[];
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Dependencies (injectable for testing)
// ---------------------------------------------------------------------------

export interface RuntimePlanServiceDependencies {
  storage?: StorageLike;
  inbox: Pick<RuntimeInboxService, "ingestEvent">;
  bus: Pick<typeof eventBus, "emitEvent" | "emit">;
  checkpoints: Pick<AgentPlanningCheckpointService, "createCheckpoint">;
  governedRequests: Pick<GovernedActionRequestService, "createRequest">;
  memoryProposals: Pick<MemoryProposalService, "createProposal">;
  skillGovernance: Pick<SkillGovernanceService, "createSkillRequest">;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class RuntimePlanService {
  private plans: RuntimePlanRecord[];

  constructor(
    private readonly deps: RuntimePlanServiceDependencies = {
      storage: getStorage(),
      inbox: runtimeInboxService,
      bus: eventBus,
      checkpoints: agentPlanningCheckpointService,
      governedRequests: governedActionRequestService,
      memoryProposals: memoryProposalService,
      skillGovernance: skillGovernanceService,
    },
  ) {
    this.plans = readPlans(this.deps.storage);
  }

  // -----------------------------------------------------------------------
  // CRUD
  // -----------------------------------------------------------------------

  createPlan(input: CreatePlanInput): RuntimePlanRecord {
    if (!input.provenanceIds || input.provenanceIds.length === 0) {
      throw new Error("Runtime plans require provenance.");
    }

    const secretBlock = blockIfSecretLike(`${input.title} ${input.summary} ${input.userIntentSummary ?? ""}`);
    if (secretBlock) {
      throw new Error(`Plan blocked: ${secretBlock}`);
    }

    const timestamp = nowIso();
    const planId = `runtime-plan:${timestamp}:${Math.random().toString(36).slice(2, 8)}`;

    const steps: RuntimePlanStep[] = input.stepDrafts.slice(0, RUNTIME_PLAN_MAX_STEPS).map((draft, index) => {
      const classification = classifyStep(draft);
      const stepStatus: RuntimePlanStepStatus =
        classification.kind === "blocked_risky_action" ? "blocked" :
        classification.kind === "planning_checkpoint" ? "checkpoint_required" :
        classification.kind === "memory_proposal" || classification.kind === "governed_action_request" || classification.kind === "safe_execution_request" || classification.kind === "skill_request" ? "approval_required" :
        "proposed";

      return {
        stepId: `${planId}:step-${index}`,
        title: sanitizePlanInput(draft.title).slice(0, RUNTIME_PLAN_MAX_TITLE_LENGTH),
        summary: sanitizePlanInput(draft.summary).slice(0, RUNTIME_PLAN_MAX_SUMMARY_LENGTH),
        kind: classification.kind,
        status: stepStatus,
        riskLevel: classification.riskLevel,
        requiredApprovals: [],
        createdAt: timestamp,
        updatedAt: timestamp,
        metadata: sanitizeMetadata({ classificationReason: classification.reason, ...draft.metadata }),
      };
    });

    const overallRisk = this.computeOverallRisk(steps);
    const needsCheckpoint = steps.length > 1 || overallRisk === "elevated" || overallRisk === "high" || overallRisk === "critical" || steps.some((s) => s.status === "approval_required");

    const plan: RuntimePlanRecord = {
      planId,
      title: sanitizePlanInput(input.title).slice(0, RUNTIME_PLAN_MAX_TITLE_LENGTH),
      summary: sanitizePlanInput(input.summary).slice(0, RUNTIME_PLAN_MAX_SUMMARY_LENGTH),
      source: sanitizePlanInput(input.source).slice(0, 80),
      sourceId: input.sourceId?.slice(0, 120),
      userIntentSummary: input.userIntentSummary ? sanitizePlanInput(input.userIntentSummary).slice(0, RUNTIME_PLAN_MAX_SUMMARY_LENGTH) : undefined,
      status: "proposed",
      riskLevel: overallRisk,
      steps,
      currentStepId: steps[0]?.stepId,
      checkpointIds: [],
      governedRequestIds: [],
      memoryProposalIds: [],
      skillRequestIds: [],
      safeExecutionRequestIds: [],
      inboxEventIds: [],
      provenanceIds: [...input.provenanceIds],
      createdAt: timestamp,
      updatedAt: timestamp,
      metadata: sanitizeMetadata(input.metadata),
    };

    if (needsCheckpoint) {
      const checkpoint = this.deps.checkpoints.createCheckpoint({
        title: `Plan checkpoint: ${plan.title}`,
        summary: plan.summary,
        proposedNextSteps: steps.slice(0, 5).map((s) => s.title),
        riskLevel: overallRisk === "safe" ? "low" : overallRisk === "elevated" ? "medium" : overallRisk === "critical" ? "critical" : overallRisk === "high" ? "high" : "low",
        provenanceIds: input.provenanceIds,
        metadata: { planId },
      });
      plan.checkpointIds.push(checkpoint.checkpointId);
    }

    this.upsert(plan);

    this.emitInboxEvent(plan, "runtime_plan_created", "Runtime plan created. No tools or skills run from this plan.");
    this.emitBusEvent("runtime_plan_created", plan);

    return plan;
  }

  listPlans(): RuntimePlanRecord[] {
    return [...this.plans];
  }

  getPlan(planId: string): RuntimePlanRecord | undefined {
    return this.plans.find((p) => p.planId === planId);
  }

  getActivePlan(): RuntimePlanRecord | undefined {
    return this.plans.find((p) => p.status === "active");
  }

  // -----------------------------------------------------------------------
  // State transitions
  // -----------------------------------------------------------------------

  activatePlan(planId: string): RuntimePlanRecord | undefined {
    const updated = this.updatePlan(planId, { status: "active" });
    if (updated) {
      this.emitInboxEvent(updated, "runtime_plan_activated", "Plan activated. Governed items can now be created.");
      this.emitBusEvent("runtime_plan_activated", updated);
    }
    return updated;
  }

  approvePlan(planId: string): RuntimePlanRecord | undefined {
    const plan = this.getPlan(planId);
    if (!plan) return undefined;
    const nextStatus: RuntimePlanStatus = plan.status === "proposed" || plan.status === "waiting_approval" ? "active" : plan.status;
    const updated = this.updatePlan(planId, { status: nextStatus });
    if (updated) {
      this.emitBusEvent("runtime_plan_activated", updated);
    }
    return updated;
  }

  rejectPlan(planId: string): RuntimePlanRecord | undefined {
    const updated = this.updatePlan(planId, { status: "rejected" });
    if (updated) {
      this.emitInboxEvent(updated, "runtime_plan_rejected", "Plan rejected.");
      this.emitBusEvent("runtime_plan_rejected", updated);
    }
    return updated;
  }

  blockPlan(planId: string, reason: string): RuntimePlanRecord | undefined {
    const updated = this.updatePlan(planId, { status: "blocked", blockedBy: [sanitizePlanInput(reason).slice(0, 200)] });
    if (updated) {
      this.emitInboxEvent(updated, "runtime_plan_blocked", `Plan blocked: ${reason}`);
      this.emitBusEvent("runtime_plan_blocked", updated);
    }
    return updated;
  }

  completePlan(planId: string): RuntimePlanRecord | undefined {
    const updated = this.updatePlan(planId, { status: "completed", completedAt: nowIso() });
    if (updated) {
      this.emitInboxEvent(updated, "runtime_plan_completed", "Plan completed.");
      this.emitBusEvent("runtime_plan_completed", updated);
    }
    return updated;
  }

  archivePlan(planId: string): RuntimePlanRecord | undefined {
    const updated = this.updatePlan(planId, { status: "archived" });
    if (updated) {
      this.emitInboxEvent(updated, "runtime_plan_archived", "Plan archived.");
      this.emitBusEvent("runtime_plan_archived", updated);
    }
    return updated;
  }

  advanceStep(planId: string, stepId: string, status: RuntimePlanStepStatus): RuntimePlanRecord | undefined {
    const plan = this.getPlan(planId);
    if (!plan) return undefined;
    const steps = plan.steps.map((s) =>
      s.stepId === stepId ? { ...s, status, updatedAt: nowIso() } : s,
    );
    return this.updatePlan(planId, { steps });
  }

  // -----------------------------------------------------------------------
  // Artifact creation — idempotent, does NOT execute
  // -----------------------------------------------------------------------

  createArtifactsForPlan(planId: string): RuntimePlanRecord | undefined {
    const plan = this.getPlan(planId);
    if (!plan) return undefined;

    let changed = false;
    const steps = [...plan.steps];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];

      switch (step.kind) {
        case "memory_proposal": {
          if (step.relatedMemoryProposalId) break;
          const proposal = this.deps.memoryProposals.createProposal({
            title: step.title,
            summary: step.summary,
            proposedMemory: step.summary,
            kind: "other",
            source: plan.source,
            sourceId: plan.planId,
            provenanceIds: plan.provenanceIds,
            riskLevel: step.riskLevel === "safe" || step.riskLevel === "low" ? "low" : "elevated",
            metadata: { planId: plan.planId, stepId: step.stepId },
          });
          steps[i] = { ...step, relatedMemoryProposalId: proposal.proposalId, status: "waiting_memory_write", updatedAt: nowIso() };
          if (!plan.memoryProposalIds.includes(proposal.proposalId)) {
            plan.memoryProposalIds.push(proposal.proposalId);
          }
          changed = true;
          break;
        }

        case "governed_action_request":
        case "safe_execution_request": {
          if (step.relatedGovernedRequestId) break;
          const request = this.deps.governedRequests.createRequest({
            kind: "tool",
            title: step.title,
            description: step.summary,
            requestedCapability: step.kind === "safe_execution_request" ? "notify" : "runtime_read",
            target: step.kind === "safe_execution_request" ? "notification" : "runtime:diagnostics",
            provenanceIds: plan.provenanceIds,
            riskLevel: step.riskLevel === "safe" || step.riskLevel === "low" ? "low" : "high",
            requestedBy: "luca-runtime-planner",
            parametersPreview: { planId: plan.planId, stepId: step.stepId },
          });
          steps[i] = { ...step, relatedGovernedRequestId: request.requestId, status: "approval_required", updatedAt: nowIso() };
          if (!plan.governedRequestIds.includes(request.requestId)) {
            plan.governedRequestIds.push(request.requestId);
          }
          if (step.kind === "safe_execution_request" && !plan.safeExecutionRequestIds.includes(request.requestId)) {
            plan.safeExecutionRequestIds.push(request.requestId);
          }
          changed = true;
          break;
        }

        case "skill_request": {
          if (step.relatedSkillRequestId) break;
          const skillRequest = this.deps.skillGovernance.createSkillRequest({
            skillId: `plan-skill:${step.stepId}`,
            skillName: step.title,
            requestType: "enable",
            title: step.title,
            description: step.summary,
            provenanceIds: plan.provenanceIds,
            riskLevel: step.riskLevel === "safe" || step.riskLevel === "low" ? "low" : "high",
            requestedBy: "luca-runtime-planner",
            metadata: { planId: plan.planId, stepId: step.stepId },
          });
          steps[i] = { ...step, relatedSkillRequestId: skillRequest.skillRequestId, status: "waiting_skill_bridge", updatedAt: nowIso() };
          if (!plan.skillRequestIds.includes(skillRequest.skillRequestId)) {
            plan.skillRequestIds.push(skillRequest.skillRequestId);
          }
          changed = true;
          break;
        }

        case "planning_checkpoint": {
          if (step.relatedCheckpointId) break;
          const checkpoint = this.deps.checkpoints.createCheckpoint({
            title: step.title,
            summary: step.summary,
            provenanceIds: plan.provenanceIds,
            riskLevel: step.riskLevel === "safe" || step.riskLevel === "low" ? "low" : step.riskLevel === "elevated" ? "medium" : "high",
            metadata: { planId: plan.planId, stepId: step.stepId },
          });
          steps[i] = { ...step, relatedCheckpointId: checkpoint.checkpointId, status: "checkpoint_required", updatedAt: nowIso() };
          if (!plan.checkpointIds.includes(checkpoint.checkpointId)) {
            plan.checkpointIds.push(checkpoint.checkpointId);
          }
          changed = true;
          break;
        }

        case "blocked_risky_action": {
          if (step.status !== "blocked") {
            steps[i] = { ...step, status: "blocked", updatedAt: nowIso() };
            changed = true;
          }
          break;
        }

        case "explain":
        case "ask_user":
        case "inbox_event":
        case "reminder":
        case "other": {
          this.emitInboxEvent(plan, "runtime_plan_step_blocked", `Step: ${step.title} (${step.kind})`);
          break;
        }
      }
    }

    if (changed) {
      const updated = this.updatePlan(planId, {
        steps,
        memoryProposalIds: [...plan.memoryProposalIds],
        governedRequestIds: [...plan.governedRequestIds],
        skillRequestIds: [...plan.skillRequestIds],
        checkpointIds: [...plan.checkpointIds],
        safeExecutionRequestIds: [...plan.safeExecutionRequestIds],
      });
      if (updated) {
        this.emitInboxEvent(updated, "runtime_plan_artifacts_created", "Governed artifacts created for plan. No execution performed.");
        this.emitBusEvent("runtime_plan_artifacts_created", updated);
      }
      return updated;
    }

    return plan;
  }

  // -----------------------------------------------------------------------
  // Diagnostics
  // -----------------------------------------------------------------------

  getDiagnosticsSummary(): RuntimePlanDiagnosticsSummary {
    const allSteps = this.plans.flatMap((p) => p.steps);
    return {
      totalPlans: this.plans.length,
      activePlans: this.plans.filter((p) => p.status === "active").length,
      proposedPlans: this.plans.filter((p) => p.status === "proposed").length,
      waitingPlans: this.plans.filter((p) => p.status === "waiting_approval" || p.status === "waiting_user").length,
      blockedPlans: this.plans.filter((p) => p.status === "blocked").length,
      completedPlans: this.plans.filter((p) => p.status === "completed").length,
      totalPlanSteps: allSteps.length,
      blockedRiskySteps: allSteps.filter((s) => s.kind === "blocked_risky_action" || s.status === "blocked").length,
      pendingPlanApprovals: allSteps.filter((s) => s.status === "approval_required" || s.status === "checkpoint_required").length,
      planArtifactsCreated: this.plans.reduce((count, p) =>
        count + p.memoryProposalIds.length + p.governedRequestIds.length + p.skillRequestIds.length + p.checkpointIds.length + p.safeExecutionRequestIds.length, 0),
      orchestrationEnabled: true,
      riskyExecutionEnabled: false,
    };
  }

  // -----------------------------------------------------------------------
  // Internals
  // -----------------------------------------------------------------------

  private computeOverallRisk(steps: RuntimePlanStep[]): RuntimePlanRiskLevel {
    const levels: RuntimePlanRiskLevel[] = steps.map((s) => s.riskLevel);
    if (levels.includes("critical")) return "critical";
    if (levels.includes("high")) return "high";
    if (levels.includes("elevated")) return "elevated";
    if (levels.includes("low")) return "low";
    return "safe";
  }

  private updatePlan(planId: string, update: Partial<RuntimePlanRecord>): RuntimePlanRecord | undefined {
    const existing = this.plans.find((p) => p.planId === planId);
    if (!existing) return undefined;
    const next: RuntimePlanRecord = { ...existing, ...update, planId: existing.planId, createdAt: existing.createdAt, updatedAt: nowIso() };
    this.upsert(next);
    return next;
  }

  private upsert(plan: RuntimePlanRecord): void {
    this.plans = [plan, ...this.plans.filter((p) => p.planId !== plan.planId)];
    if (this.plans.length > MAX_PLANS) {
      this.plans = this.plans.slice(0, MAX_PLANS);
    }
    this.deps.storage?.setItem(STORAGE_KEY, JSON.stringify(this.plans));
  }

  private emitInboxEvent(plan: RuntimePlanRecord, eventType: string, body: string): void {
    const event = this.deps.inbox.ingestEvent({
      source: "system",
      sourceTrustLevel: "local",
      title: plan.title,
      body: body.slice(0, 2_000),
      eventType,
      provenance: {
        provenanceId: plan.provenanceIds[0] ?? "missing",
        sourceType: "runtime_snapshot",
        sourceId: plan.planId,
        sourceTrustLevel: "local",
        createdBy: "luca-runtime-planner",
        createdAt: plan.updatedAt,
        digest: plan.planId,
        parentProvenanceIds: plan.provenanceIds,
        quarantineState: "clear",
        approvalState: "pending",
        revocationState: "active",
      },
      requiresApproval: false,
      metadata: { planId: plan.planId, eventType },
    });
    if (!plan.inboxEventIds.includes(event.inboxEventId)) {
      plan.inboxEventIds.push(event.inboxEventId);
    }
  }

  private emitBusEvent(type: string, plan: RuntimePlanRecord): void {
    this.deps.bus.emitEvent({
      type,
      message: `${type}: ${plan.title}`,
      priority: "LOW",
      context: { timestamp: Date.now(), planId: plan.planId, status: plan.status },
    });
  }
}

export const runtimePlanService = new RuntimePlanService();
