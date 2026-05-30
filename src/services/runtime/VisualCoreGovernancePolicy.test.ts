import { describe, expect, it } from "vitest";
import {
  VISUAL_CORE_SURFACE_MODES,
  type VisualCoreSurfaceMode,
} from "../../types/visualCoreGovernance";
import {
  VISUAL_CORE_SURFACE_POLICIES,
  getVisualCoreArchitectureAuditSummary,
  getVisualCoreGovernanceRecommendation,
  getVisualCoreReadyForDisplayGovernanceModes,
  getVisualCoreSurfacePolicy,
  getVisualCoreUnsafeOrSensitiveModes,
  listVisualCoreSurfacePolicies,
} from "./VisualCoreGovernancePolicy";

// Modes that must be flagged sensitive per the audit spec.
const REQUIRED_SENSITIVE_MODES: VisualCoreSurfaceMode[] = [
  "VISION",
  "RECORDER",
  "FILES",
  "TELEGRAM",
  "WHATSAPP",
  "WIRELESS",
  "HACKING",
  "CODE_EDITOR",
  "INGESTION",
  "AUTONOMY",
  "SKILLS",
];

describe("VisualCoreGovernancePolicy", () => {
  it("has a policy for every VisualCore mode", () => {
    expect(VISUAL_CORE_SURFACE_MODES).toHaveLength(29);
    for (const mode of VISUAL_CORE_SURFACE_MODES) {
      const policy = getVisualCoreSurfacePolicy(mode);
      expect(policy).toBeDefined();
      expect(policy.mode).toBe(mode);
    }
    expect(Object.keys(VISUAL_CORE_SURFACE_POLICIES)).toHaveLength(
      VISUAL_CORE_SURFACE_MODES.length,
    );
    expect(listVisualCoreSurfacePolicies()).toHaveLength(
      VISUAL_CORE_SURFACE_MODES.length,
    );
  });

  it("flags every sensitive operational mode as sensitive", () => {
    for (const mode of REQUIRED_SENSITIVE_MODES) {
      const policy = getVisualCoreSurfacePolicy(mode);
      expect(policy.sensitive, `${mode} should be sensitive`).toBe(true);
      expect(["high", "critical"]).toContain(policy.riskLevel);
    }
  });

  it("classifies BROWSER as opening a browser and needing governed LucaBrowser later", () => {
    const browser = getVisualCoreSurfacePolicy("BROWSER");
    expect(browser.category).toBe("browser_surface");
    expect(browser.capabilities.opensBrowser).toBe(true);
    expect(browser.capabilities.remoteControlCapable).toBe(true);
    expect(browser.readiness).toBe("needs_runtime_adapter");
    const notes = (browser.notes ?? []).join(" ");
    expect(notes).toMatch(/EMBEDDED/);
    expect(notes).toMatch(/governed LucaBrowser/i);
  });

  it("lists low-risk display modes via the ready-for-display helper", () => {
    const ready = getVisualCoreReadyForDisplayGovernanceModes();
    for (const mode of ["IDLE", "DATA", "DATA_ROOM", "REPORTS", "SUBSYSTEMS", "SOVEREIGNTY"] as const) {
      expect(ready).toContain(mode);
    }
    // Sensitive modes must never be listed as ready for display governance.
    for (const mode of REQUIRED_SENSITIVE_MODES) {
      expect(ready).not.toContain(mode);
    }
    for (const mode of ready) {
      expect(getVisualCoreSurfacePolicy(mode).sensitive).toBe(false);
    }
  });

  it("returns only high/critical modes from the unsafe/sensitive helper", () => {
    const unsafe = getVisualCoreUnsafeOrSensitiveModes();
    expect(unsafe.length).toBeGreaterThan(0);
    for (const mode of unsafe) {
      expect(["high", "critical"]).toContain(
        getVisualCoreSurfacePolicy(mode).riskLevel,
      );
    }
    for (const mode of REQUIRED_SENSITIVE_MODES) {
      expect(unsafe).toContain(mode);
    }
  });

  it("summarizes total modes and sensitive modes", () => {
    const summary = getVisualCoreArchitectureAuditSummary();
    expect(summary.totalModes).toBe(VISUAL_CORE_SURFACE_MODES.length);
    expect(summary.governanceApplied).toBe(false);
    expect(summary.sensitiveModeCount).toBe(summary.sensitiveModes.length);
    expect(summary.sensitiveModeCount).toBeGreaterThanOrEqual(
      REQUIRED_SENSITIVE_MODES.length,
    );
    expect(summary.criticalModeCount).toBe(summary.criticalModes.length);
    expect(summary.criticalModes).toContain("RECORDER");
    expect(summary.criticalModes).toContain("VISION");
    // Category/risk/readiness buckets sum to the total mode count.
    const sum = (record: Record<string, number>) =>
      Object.values(record).reduce((a, b) => a + b, 0);
    expect(sum(summary.byCategory)).toBe(summary.totalModes);
    expect(sum(summary.byRiskLevel)).toBe(summary.totalModes);
    expect(sum(summary.byReadiness)).toBe(summary.totalModes);
  });

  it("provides a conservative recommendation for every mode", () => {
    for (const mode of VISUAL_CORE_SURFACE_MODES) {
      expect(getVisualCoreGovernanceRecommendation(mode).length).toBeGreaterThan(0);
    }
    expect(getVisualCoreGovernanceRecommendation("BROWSER")).toMatch(
      /adapter/i,
    );
  });
});
