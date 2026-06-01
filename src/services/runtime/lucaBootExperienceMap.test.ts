import { describe, expect, it } from "vitest";
import {
  LUCA_BOOT_SEQUENCE_STATES,
  getLucaBootExperienceDiagnosticPhases,
  getLucaBootExperiencePhaseByBootSequence,
  getLucaBootExperienceProductPhases,
  getLucaBootExperienceSummary,
  lucaBootExperiencePhases,
  lucaBootExperienceStates,
} from "./lucaBootExperienceMap";

describe("lucaBootExperienceMap", () => {
  it("represents every known BootSequence phase", () => {
    expect(LUCA_BOOT_SEQUENCE_STATES).toEqual([
      "INIT",
      "BIOS",
      "KERNEL",
      "ONBOARDING",
      "READY",
    ]);

    for (const bootSequence of LUCA_BOOT_SEQUENCE_STATES) {
      expect(getLucaBootExperiencePhaseByBootSequence(bootSequence).length).toBeGreaterThan(0);
    }
  });

  it("assigns classification labels to every mapped boot phase and state", () => {
    for (const phase of lucaBootExperiencePhases) {
      expect(phase.classifications.length).toBeGreaterThan(0);
      expect(phase.followUpNotes.length).toBeGreaterThan(0);
    }

    for (const state of lucaBootExperienceStates) {
      expect(state.classifications.length).toBeGreaterThan(0);
      expect(state.representedBy.length).toBeGreaterThan(0);
    }
  });

  it("identifies product-facing and diagnostic-facing boot surfaces", () => {
    const productPhases = getLucaBootExperienceProductPhases();
    const diagnosticPhases = getLucaBootExperienceDiagnosticPhases();

    expect(productPhases.map((phase) => phase.id)).toContain("app_start");
    expect(productPhases.map((phase) => phase.id)).toContain("ready_dashboard");
    expect(diagnosticPhases.map((phase) => phase.id)).toContain("bios_diagnostics");
    expect(diagnosticPhases.map((phase) => phase.id)).toContain("cloud_only_degraded");
  });

  it("represents degraded, offline, and error fallback states without changing behavior", () => {
    const summary = getLucaBootExperienceSummary();
    expect(summary.auditOnly).toBe(true);
    expect(summary.behaviorChanged).toBe(false);
    expect(summary.degradedOrOfflineStateIds).toEqual(
      expect.arrayContaining(["degraded", "offline"]),
    );

    const errorFallback = lucaBootExperienceStates.find((state) => state.id === "error_fallback");
    expect(errorFallback?.diagnosticOnly).toBe(true);
    expect(errorFallback?.classifications).toContain("error-fallback-state");
  });
});
