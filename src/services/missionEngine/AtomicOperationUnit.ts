/**
 * Absorb Phase 1 — atomic operation unit (MISSION_ENGINE_SPEC contract).
 *
 * Each step MUST define: step_id, goal, tool_or_runtime, expected_output,
 * verification, rollback, risk_level. This module validates and projects
 * those units into execution steps for pre-step verification.
 */

import {
  createExecutionStep,
  type LucaExecutionRiskLevel,
  type LucaExecutionStep,
  type LucaExecutionStepKind,
} from "../execution/LucaDeterministicExecution";
import type { MissionRiskLevel, MissionStep } from "./types";

export type AtomicOperationRisk = MissionRiskLevel;

export interface AtomicOperationUnit {
  step_id: string;
  goal: string;
  tool_or_runtime: string;
  expected_output: string;
  verification: string;
  rollback: string;
  risk_level: AtomicOperationRisk;
  /** Optional execution-kind override for verification gates. */
  kind?: LucaExecutionStepKind;
}

export interface AtomicOperationValidationIssue {
  field: string;
  message: string;
}

export interface AtomicOperationValidationResult {
  ok: boolean;
  issues: AtomicOperationValidationIssue[];
  unit?: AtomicOperationUnit;
}

const REQUIRED_FIELDS: Array<keyof AtomicOperationUnit> = [
  "step_id",
  "goal",
  "tool_or_runtime",
  "expected_output",
  "verification",
  "rollback",
  "risk_level",
];

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRisk(value: unknown): value is AtomicOperationRisk {
  return value === "safe" || value === "sensitive" || value === "dangerous";
}

/**
 * Validate a raw object as an atomic operation unit (strict contract).
 */
export function validateAtomicOperationUnit(
  input: unknown,
): AtomicOperationValidationResult {
  if (!input || typeof input !== "object") {
    return {
      ok: false,
      issues: [{ field: "unit", message: "Atomic operation unit must be an object." }],
    };
  }
  const raw = input as Record<string, unknown>;
  const issues: AtomicOperationValidationIssue[] = [];

  for (const field of REQUIRED_FIELDS) {
    if (field === "risk_level") {
      if (!isRisk(raw.risk_level)) {
        issues.push({
          field: "risk_level",
          message: 'risk_level must be "safe" | "sensitive" | "dangerous".',
        });
      }
      continue;
    }
    if (!isNonEmptyString(raw[field])) {
      issues.push({
        field,
        message: `${field} is required and must be a non-empty string.`,
      });
    }
  }

  if (issues.length > 0) return { ok: false, issues };

  const unit: AtomicOperationUnit = {
    step_id: String(raw.step_id).trim(),
    goal: String(raw.goal).trim(),
    tool_or_runtime: String(raw.tool_or_runtime).trim(),
    expected_output: String(raw.expected_output).trim(),
    verification: String(raw.verification).trim(),
    rollback: String(raw.rollback).trim(),
    risk_level: raw.risk_level as AtomicOperationRisk,
    kind:
      typeof raw.kind === "string"
        ? (raw.kind as LucaExecutionStepKind)
        : undefined,
  };
  return { ok: true, issues: [], unit };
}

export function validateAtomicOperationUnits(
  inputs: unknown[],
): { ok: boolean; units: AtomicOperationUnit[]; issues: AtomicOperationValidationIssue[] } {
  const units: AtomicOperationUnit[] = [];
  const issues: AtomicOperationValidationIssue[] = [];
  inputs.forEach((input, index) => {
    const result = validateAtomicOperationUnit(input);
    if (!result.ok || !result.unit) {
      for (const issue of result.issues) {
        issues.push({
          field: `[${index}].${issue.field}`,
          message: issue.message,
        });
      }
      return;
    }
    units.push(result.unit);
  });
  return { ok: issues.length === 0, units, issues };
}

export function atomicRiskToExecutionRisk(
  risk: AtomicOperationRisk,
): LucaExecutionRiskLevel {
  if (risk === "dangerous") return "high";
  if (risk === "sensitive") return "medium";
  return "low";
}

function inferKind(unit: AtomicOperationUnit): LucaExecutionStepKind {
  if (unit.kind) return unit.kind;
  const hay = `${unit.tool_or_runtime} ${unit.goal}`.toLowerCase();
  if (/computer|browser|sandbox|click/.test(hay)) return "computer_use";
  if (/file|fs|path|write|delete/.test(hay)) return "filesystem";
  if (/network|http|fetch|api/.test(hay)) return "network";
  if (/skill|mcp|plugin/.test(hay)) return "skill";
  if (/memory|remember/.test(hay)) return "memory";
  if (/voice|stt|tts/.test(hay)) return "voice_command";
  if (/evolut/.test(hay)) return "self_evolution";
  return "tool_call";
}

/** Project atomic unit into MissionStep (mission engine types). */
export function atomicUnitToMissionStep(unit: AtomicOperationUnit): MissionStep {
  return {
    stepId: unit.step_id,
    goal: unit.goal,
    toolOrRuntime: unit.tool_or_runtime,
    expectedOutput: unit.expected_output,
    verification: unit.verification,
    rollback: unit.rollback,
    riskLevel: unit.risk_level,
  };
}

/** Project atomic unit into LucaExecutionStep for verification gates. */
export function atomicUnitToExecutionStep(
  unit: AtomicOperationUnit,
  options?: {
    receiptAvailable?: boolean;
    rollbackAvailable?: boolean;
  },
): LucaExecutionStep {
  const riskLevel = atomicRiskToExecutionRisk(unit.risk_level);
  return createExecutionStep({
    id: unit.step_id,
    summary: unit.goal,
    kind: inferKind(unit),
    riskLevel,
    requiresRollback: riskLevel === "high" || riskLevel === "critical",
    rollbackAvailable:
      options?.rollbackAvailable ?? Boolean(unit.rollback?.trim()),
    receiptRequired: riskLevel !== "low",
    receiptAvailable: options?.receiptAvailable ?? false,
    metadata: {
      toolOrRuntime: unit.tool_or_runtime,
      expectedOutput: unit.expected_output,
      verification: unit.verification,
      rollback: unit.rollback,
      atomic: true,
    },
  });
}
