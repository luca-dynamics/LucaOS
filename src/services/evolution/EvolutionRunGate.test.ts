import { describe, expect, it } from "vitest";
import { evaluateEvolutionRunGate } from "./EvolutionRunGate";
import type { LucaEvolutionRun } from "./EvolutionRun";

const baseRun: LucaEvolutionRun = {
  id: "run_1",
  kind: "runtime_policy_analysis",
  status: "created",
  title: "Runtime policy analysis",
  createdByTier: "origin",
  source: "external_lab",
  startedAt: "2026-01-01T00:00:00.000Z",
  optimizerEngine: {
    kind: "external_lab",
    name: "External Lab",
    localExecutionAllowed: false,
    networkAllowed: false,
  },
};

describe("EvolutionRunGate", () => {
  it("normal cannot create/start runs", () => {
    expect(evaluateEvolutionRunGate({ run: baseRun, requestedAction: "create", actorTier: "normal" }).allowed).toBe(false);
    expect(evaluateEvolutionRunGate({ run: baseRun, requestedAction: "start", actorTier: "normal" }).allowed).toBe(false);
  });

  it("tactical cannot start local execution or select candidates", () => {
    const localRun = { ...baseRun, optimizerEngine: { ...baseRun.optimizerEngine!, localExecutionAllowed: false as false } };
    const startResult = evaluateEvolutionRunGate({ run: localRun, requestedAction: "start", actorTier: "tactical" });
    expect(startResult.allowed).toBe(true);

    const selectResult = evaluateEvolutionRunGate({ run: localRun, requestedAction: "select_candidate", actorTier: "tactical" });
    expect(selectResult.allowed).toBe(false);
  });

  it("origin blocked by failed constraints/regression", () => {
    const result = evaluateEvolutionRunGate({
      run: baseRun,
      requestedAction: "select_candidate",
      actorTier: "origin",
      constraintResults: [
        { id: "c1", kind: "regression", passed: false, severity: "high", createdAt: "2026-01-01T00:00:00.000Z" },
      ],
    });

    expect(result.allowed).toBe(false);
    expect(result.blockedBy).toContain("failed_constraint_gate");
    expect(result.blockedBy).toContain("regression_detected");
  });
});
