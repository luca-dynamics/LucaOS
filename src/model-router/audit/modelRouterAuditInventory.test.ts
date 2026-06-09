import { describe, expect, it } from "vitest";
import { createStaticLucaModelRouteDecision } from "../modelRouterContract";
import {
  MODEL_ROUTER_AUDIT_INVENTORY,
  classifyModelFallbackFinding,
  isRuntimeFallbackRisk,
  summarizeModelRouterAudit,
} from "./modelRouterAuditInventory";

describe("model router audit inventory", () => {
  it("contains hardcoded fallback findings with severity and recommendations", () => {
    const fallbackFindings = MODEL_ROUTER_AUDIT_INVENTORY.filter(
      (finding) => finding.findingType === "hardcoded_fallback",
    );

    expect(fallbackFindings.length).toBeGreaterThan(0);
    for (const finding of fallbackFindings) {
      expect(finding.severity).toMatch(/low|medium|high|critical/);
      expect(finding.recommendation.length).toBeGreaterThan(10);
    }
  });

  it("classifies hardcoded runtime fallback as high risk", () => {
    const classification = classifyModelFallbackFinding({
      runtimePath: true,
      context: "runtime",
    });

    expect(classification).toEqual({
      classification: "unsafe_hardcoded_runtime_fallback",
      severity: "high",
    });
    expect(
      isRuntimeFallbackRisk({
        classification: classification.classification,
        runtimePath: true,
        hardwareChecked: false,
      }),
    ).toBe(true);
  });

  it("keeps UI-only and test fixture fallback references low risk", () => {
    expect(
      classifyModelFallbackFinding({ runtimePath: false, context: "ui" }),
    ).toEqual({ classification: "ui_only_label", severity: "low" });
    expect(
      classifyModelFallbackFinding({ runtimePath: false, context: "test" }),
    ).toEqual({ classification: "test_fixture", severity: "low" });
  });

  it("classifies missing BYOK path as medium when used at runtime", () => {
    expect(
      classifyModelFallbackFinding({
        runtimePath: true,
        context: "legacy",
        missingByokPath: true,
      }),
    ).toEqual({ classification: "legacy_constant", severity: "medium" });
  });

  it("classifies local model fallback without hardware check as high risk", () => {
    expect(
      classifyModelFallbackFinding({
        runtimePath: true,
        context: "runtime",
        localModelWithoutHardwareCheck: true,
      }),
    ).toEqual({
      classification: "unsafe_hardcoded_runtime_fallback",
      severity: "high",
    });
  });

  it("produces deterministic summary counts", () => {
    const summary = summarizeModelRouterAudit(MODEL_ROUTER_AUDIT_INVENTORY);
    const repeated = summarizeModelRouterAudit(MODEL_ROUTER_AUDIT_INVENTORY);

    expect(summary).toEqual(repeated);
    expect(summary.totalFindings).toBe(MODEL_ROUTER_AUDIT_INVENTORY.length);
    expect(summary.byFindingType.hardcoded_fallback).toBeGreaterThan(0);
    expect(summary.runtimeFallbackRiskCount).toBeGreaterThan(0);
  });

  it("creates side-effect-free static route decisions", () => {
    const decision = createStaticLucaModelRouteDecision({
      selectedModelId: "gemini-example",
      providerType: "luca_cloud",
      routeMode: "luca_prime",
      taskType: "chat",
      capabilities: ["text_generation"],
    });

    expect(decision.sideEffectsPerformed).toBe(false);
    expect(decision.trace.sideEffectsPerformed).toBe(false);
    expect(decision.trace.requestedTaskType).toBe("chat");
  });

  it("does not import network or provider implementations in audit helpers", async () => {
    const module = await import("./modelRouterAuditInventory");
    expect(Object.keys(module).sort()).toEqual([
      "MODEL_ROUTER_AUDIT_INVENTORY",
      "MODEL_ROUTER_MIGRATION_STEPS",
      "classifyModelFallbackFinding",
      "isRuntimeFallbackRisk",
      "summarizeModelRouterAudit",
    ]);
  });
});
