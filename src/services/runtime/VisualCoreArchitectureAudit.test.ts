import { describe, expect, it } from "vitest";
import {
  buildVisualCoreArchitectureReport,
  getVisualCoreArchitectureFindings,
  getVisualCoreGovernanceGaps,
  getVisualCoreRecommendedNextSteps,
} from "./VisualCoreArchitectureAudit";

describe("VisualCoreArchitectureAudit", () => {
  it("reports VisualCore as a large HUD router with mixed modes and IPC", () => {
    const findings = getVisualCoreArchitectureFindings().join(" ");
    expect(findings).toMatch(/HUD router|operating surface/i);
    expect(findings).toMatch(/IPC/i);
    expect(findings).toMatch(/BROWSER_NAVIGATE/);
    expect(findings).toMatch(/EMBEDDED/);
    expect(findings).toMatch(/Ghost/i);
  });

  it("lists the key governance gaps", () => {
    const gaps = getVisualCoreGovernanceGaps().join(" ");
    expect(gaps).toMatch(/remote control/i);
    expect(gaps).toMatch(/embedded/i);
    expect(gaps).toMatch(/sensitive/i);
    expect(gaps).toMatch(/session record/i);
    expect(gaps).toMatch(/approval|audit/i);
  });

  it("recommends governing low-risk display modes first and not wrapping blindly", () => {
    const steps = getVisualCoreRecommendedNextSteps().join(" ");
    expect(steps).toMatch(/display/i);
    expect(steps).toMatch(/session record/i);
    expect(steps).toMatch(/blindly/i);
    expect(steps).toMatch(/governed LucaBrowser/i);
  });

  it("builds a full report including the no-blind-wrap warning and audit summary", () => {
    const report = buildVisualCoreArchitectureReport();
    expect(report.overview).toMatch(/audit map only/i);
    expect(report.findings.length).toBeGreaterThan(0);
    expect(report.governanceGaps.length).toBeGreaterThan(0);
    expect(report.recommendedNextSteps.length).toBeGreaterThan(0);
    expect(report.summary.governanceApplied).toBe(false);
    expect(report.summary.totalModes).toBe(29);

    const allText = [
      report.overview,
      ...report.findings,
      ...report.governanceGaps,
      ...report.recommendedNextSteps,
    ].join(" ");
    // Required: remote command, IPC, embedded browser, no-blind-wrap warning.
    expect(allText).toMatch(/BROWSER_NAVIGATE/);
    expect(allText).toMatch(/IPC/i);
    expect(allText).toMatch(/EMBEDDED/);
    expect(allText).toMatch(/blindly/i);
  });
});
