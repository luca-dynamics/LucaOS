import { describe, expect, it } from "vitest";
import {
  canShowRightPanelMode,
  getDashboardDisclosure,
  getDefaultRightPanelModeForExperience,
  getRightPanelLabelForMode,
  getVisibleLeftPanelGroups,
  getVisibleRightPanelModes,
  isAdvancedLeftPanelGroup,
  shouldCollapseLeftPanelGroup,
  shouldShowLeftPanelGroup,
} from "./dashboardDisclosure";

describe("dashboard disclosure", () => {
  it("keeps Trace out of the Basic first impression", () => {
    expect(getVisibleRightPanelModes("basic")).toEqual([
      "CONTROL",
      "ACTIVITY",
      "MEMORY",
    ]);
    expect(canShowRightPanelMode("basic", "LOGS")).toBe(false);
    expect(getDashboardDisclosure("basic")).toMatchObject({
      showAdvancedDiagnostics: false,
      showAdvancedTools: true,
      showTraceByDefault: false,
      collapseAdvancedLeftPanelGroups: true,
    });
  });

  it("keeps Trace and governance diagnostics out of public modes", () => {
    for (const mode of ["basic", "pro"] as const) {
      expect(getVisibleRightPanelModes(mode)).toEqual([
        "CONTROL",
        "ACTIVITY",
        "MEMORY",
      ]);
      expect(canShowRightPanelMode(mode, "LOGS")).toBe(false);
      expect(getDashboardDisclosure(mode)).toMatchObject({
        showAdvancedDiagnostics: false,
        showCreatorDiagnostics: false,
        showTraceByDefault: false,
      });
    }
  });

  it("keeps Trace and governance diagnostics available in Creator mode", () => {
    expect(getVisibleRightPanelModes("creator")).toEqual([
      "CONTROL",
      "ACTIVITY",
      "MEMORY",
      "LOGS",
    ]);
    expect(canShowRightPanelMode("creator", "LOGS")).toBe(true);
    expect(getDashboardDisclosure("creator")).toMatchObject({
      showAdvancedDiagnostics: true,
      showCreatorDiagnostics: true,
      showTraceByDefault: true,
    });
  });

  it("falls back to Overview when a requested mode is unavailable", () => {
    expect(getDefaultRightPanelModeForExperience("basic", "LOGS")).toBe(
      "CONTROL",
    );
    expect(getDefaultRightPanelModeForExperience("pro", "LOGS")).toBe(
      "CONTROL",
    );
    expect(getDefaultRightPanelModeForExperience("creator", "LOGS")).toBe(
      "LOGS",
    );
  });

  it("uses display labels without changing internal panel enums", () => {
    expect(getRightPanelLabelForMode("basic", "CONTROL")).toBe("Overview");
    expect(getRightPanelLabelForMode("creator", "LOGS")).toBe("Trace");
  });

  it("keeps common left-panel groups prominent and available in Basic", () => {
    expect(getVisibleLeftPanelGroups("basic")).toEqual([
      "quick-actions",
      "devices",
      "apps",
      "skills",
      "system-health",
      "advanced-tools",
    ]);

    for (const group of [
      "quick-actions",
      "devices",
      "apps",
      "skills",
    ] as const) {
      expect(shouldShowLeftPanelGroup("basic", group)).toBe(true);
      expect(shouldCollapseLeftPanelGroup("basic", group)).toBe(false);
    }
  });

  it("de-emphasizes only advanced operational groups in Basic", () => {
    expect(isAdvancedLeftPanelGroup("advanced-tools")).toBe(true);
    expect(isAdvancedLeftPanelGroup("runtime-diagnostics")).toBe(true);
    expect(isAdvancedLeftPanelGroup("apps")).toBe(false);
    expect(shouldShowLeftPanelGroup("basic", "advanced-tools")).toBe(true);
    expect(shouldCollapseLeftPanelGroup("basic", "advanced-tools")).toBe(true);
    expect(shouldShowLeftPanelGroup("basic", "runtime-diagnostics")).toBe(
      false,
    );
    expect(shouldCollapseLeftPanelGroup("basic", "runtime-diagnostics")).toBe(
      false,
    );
  });

  it("keeps Pro public while leaving advanced tools expanded", () => {
    expect(getVisibleLeftPanelGroups("pro")).toEqual([
      "quick-actions",
      "devices",
      "apps",
      "skills",
      "system-health",
      "advanced-tools",
    ]);
    expect(shouldShowLeftPanelGroup("pro", "runtime-diagnostics")).toBe(false);
    expect(shouldCollapseLeftPanelGroup("pro", "advanced-tools")).toBe(false);
  });

  it("exposes every left-panel diagnostic group in Creator mode", () => {
    expect(getVisibleLeftPanelGroups("creator")).toEqual([
      "system-health",
      "runtime-diagnostics",
      "quick-actions",
      "devices",
      "apps",
      "skills",
      "advanced-tools",
    ]);
    for (const group of getVisibleLeftPanelGroups("creator")) {
      expect(shouldShowLeftPanelGroup("creator", group)).toBe(true);
      expect(shouldCollapseLeftPanelGroup("creator", group)).toBe(false);
    }
  });
});
