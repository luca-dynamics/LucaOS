// RuntimeOrchestrationService — PR #122: Runtime Orchestration & Planning Loop Foundation
// High-level facade for future agent runtime to call without knowing all services.
// Does NOT execute anything. Only creates plan/checkpoint/proposal/request records.

import { runtimePlanService, type RuntimePlanService, type CreatePlanInput } from "./RuntimePlanService";
import { sanitizePlanInput, classifyIntent, type StepDraft } from "./RuntimePlanPolicy";
import type { RuntimePlanRecord, RuntimePlanDiagnosticsSummary } from "../../types/runtimePlan";

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

export interface ProposeFromIntentInput {
  userIntent: string;
  source: string;
  sourceId?: string;
  provenanceIds: string[];
  suggestedSteps?: StepDraft[];
  metadata?: Record<string, unknown>;
}

export interface ProposeFromObservationInput {
  observationSummary: string;
  source: string;
  sourceId?: string;
  provenanceIds: string[];
  suggestedSteps?: StepDraft[];
  metadata?: Record<string, unknown>;
}

export interface OrchestrationDiagnostics {
  plans: RuntimePlanDiagnosticsSummary;
  orchestrationEnabled: true;
  riskyExecutionEnabled: false;
}

// ---------------------------------------------------------------------------
// Dependencies
// ---------------------------------------------------------------------------

export interface RuntimeOrchestrationServiceDependencies {
  planService: Pick<
    RuntimePlanService,
    "createPlan" | "listPlans" | "getPlan" | "getActivePlan" | "createArtifactsForPlan" | "getDiagnosticsSummary"
  >;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class RuntimeOrchestrationService {
  constructor(
    private readonly deps: RuntimeOrchestrationServiceDependencies = {
      planService: runtimePlanService,
    },
  ) {}

  proposePlanFromIntent(input: ProposeFromIntentInput): RuntimePlanRecord {
    const sanitizedIntent = sanitizePlanInput(input.userIntent);
    const steps: StepDraft[] = input.suggestedSteps && input.suggestedSteps.length > 0
      ? input.suggestedSteps
      : [this.inferStepFromText(sanitizedIntent)];

    const createInput: CreatePlanInput = {
      title: `Plan: ${sanitizedIntent.slice(0, 120)}`,
      summary: sanitizedIntent,
      source: input.source,
      sourceId: input.sourceId,
      userIntentSummary: sanitizedIntent,
      stepDrafts: steps,
      provenanceIds: input.provenanceIds,
      metadata: input.metadata,
    };

    return this.deps.planService.createPlan(createInput);
  }

  proposePlanFromObservation(input: ProposeFromObservationInput): RuntimePlanRecord {
    const sanitizedObservation = sanitizePlanInput(input.observationSummary);
    const steps: StepDraft[] = input.suggestedSteps && input.suggestedSteps.length > 0
      ? input.suggestedSteps
      : [this.inferStepFromText(sanitizedObservation)];

    const createInput: CreatePlanInput = {
      title: `Observation: ${sanitizedObservation.slice(0, 120)}`,
      summary: sanitizedObservation,
      source: input.source,
      sourceId: input.sourceId,
      userIntentSummary: sanitizedObservation,
      stepDrafts: steps,
      provenanceIds: input.provenanceIds,
      metadata: { ...input.metadata, observationType: "runtime_observation" },
    };

    return this.deps.planService.createPlan(createInput);
  }

  listActiveOrWaitingPlans(): RuntimePlanRecord[] {
    return this.deps.planService
      .listPlans()
      .filter((p) => p.status === "active" || p.status === "waiting_approval" || p.status === "waiting_user" || p.status === "proposed");
  }

  getOrchestrationDiagnostics(): OrchestrationDiagnostics {
    return {
      plans: this.deps.planService.getDiagnosticsSummary(),
      orchestrationEnabled: true,
      riskyExecutionEnabled: false,
    };
  }

  createGovernedItemsForPlan(planId: string): RuntimePlanRecord | undefined {
    return this.deps.planService.createArtifactsForPlan(planId);
  }

  private inferStepFromText(text: string): StepDraft {
    const classification = classifyIntent(text);
    return {
      title: text.slice(0, 160),
      summary: text,
      suggestedKind: classification.kind,
      suggestedRiskLevel: classification.riskLevel,
    };
  }
}

export const runtimeOrchestrationService = new RuntimeOrchestrationService();
