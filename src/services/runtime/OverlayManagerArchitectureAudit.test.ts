import { describe, expect, it } from "vitest";
import {
  buildOverlayManagerArchitectureReport,
  getOverlayManagerArchitectureFindings,
  getOverlayManagerGovernanceGaps,
  getOverlayManagerRecommendedNextSteps,
} from "./OverlayManagerArchitectureAudit";

describe("OverlayManagerArchitectureAudit", () => {
  it("reports OverlayManager as a flat fragment, not a stacking/priority manager", () => {
    const findings = getOverlayManagerArchitectureFindings().join(" ");
    expect(findings).toMatch(/flat React fragment/i);
    expect(findings).toMatch(/NOT a stacking\/priority manager/i);
    expect(findings).toMatch(/z-index is hard-coded/i);
    expect(findings).toMatch(/show\* boolean props/i);
    expect(findings).toMatch(/SYSTEM_ALERT_WINDOW/);
  });

  it("lists the key governance gaps including the voice approval bypass", () => {
    const gaps = getOverlayManagerGovernanceGaps().join(" ");
    expect(gaps).toMatch(/session record/i);
    expect(gaps).toMatch(/approval bypass/i);
    expect(gaps).toMatch(/capture/i);
    expect(gaps).toMatch(/tool execution/i);
    expect(gaps).toMatch(/ROOT|admin/i);
  });

  it("recommends governing display-only surfaces first and not wrapping blindly", () => {
    const steps = getOverlayManagerRecommendedNextSteps().join(" ");
    expect(steps).toMatch(/display-only/i);
    expect(steps).toMatch(/session record/i);
    expect(steps).toMatch(/blindly/i);
    expect(steps).toMatch(/native overlay/i);
  });

  it("builds a full report with the no-blind-wrap warning and ungoverned summary", () => {
    const report = buildOverlayManagerArchitectureReport();
    expect(report.overview).toMatch(/audit map only/i);
    expect(report.findings.length).toBeGreaterThan(0);
    expect(report.governanceGaps.length).toBeGreaterThan(0);
    expect(report.recommendedNextSteps.length).toBeGreaterThan(0);
    expect(report.summary.governanceApplied).toBe(false);
    expect(report.summary.totalSurfaces).toBe(18);

    const allText = [
      report.overview,
      ...report.findings,
      ...report.governanceGaps,
      ...report.recommendedNextSteps,
    ].join(" ");
    expect(allText).toMatch(/VoiceHud/);
    expect(allText).toMatch(/SYSTEM_ALERT_WINDOW/);
    expect(allText).toMatch(/blindly/i);
  });
});
