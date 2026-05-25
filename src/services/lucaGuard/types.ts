import type { GuardHook, Mission, MissionStep } from "../missionEngine/types";

export type GuardRiskLevel = "safe" | "sensitive" | "dangerous";
export type GuardTrustTier = "trusted" | "verified" | "untrusted";
export type GuardActionType =
  | "filesystem"
  | "network"
  | "browser"
  | "computer_use"
  | "memory_write"
  | "skill_execute"
  | "evolution_mutation"
  | "system_command"
  | "other";

export type GuardExecutionContext = "direct_host" | "sandbox" | "browser" | "linked_device";
export type GuardMode = "Origin" | "Tactical" | "Core";

export interface GuardPolicyContext {
  actionType: GuardActionType;
  riskLevel: GuardRiskLevel;
  trustTier: GuardTrustTier;
  executionContext: GuardExecutionContext;
  mode: GuardMode;
  hasExplicitApproval?: boolean;
  metadata?: Record<string, unknown>;
}

export interface GuardApprovalRequirement {
  required: boolean;
  reason: string;
}

export interface GuardPolicyRule {
  id: string;
  description: string;
  evaluate(context: GuardPolicyContext): Partial<GuardDecision> | null;
}

export interface GuardDecision {
  allowed: boolean;
  requiresApproval: boolean;
  riskLevel: GuardRiskLevel;
  trustTier: GuardTrustTier;
  preferredExecutionContext: GuardExecutionContext;
  reasons: string[];
}

export interface GuardAuditEvent {
  eventId: string;
  timestamp: string;
  actionType: GuardActionType;
  decision: Pick<GuardDecision, "allowed" | "requiresApproval" | "riskLevel" | "trustTier">;
  executionContext: GuardExecutionContext;
  mode: GuardMode;
  missionId?: string;
  stepId?: string;
  reasons: string[];
}

export interface MissionGuardHook extends GuardHook {
  evaluateMissionStep(mission: Mission, step: MissionStep): Promise<GuardDecision>;
}
