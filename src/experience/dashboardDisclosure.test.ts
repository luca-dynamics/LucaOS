import { describe, expect, it } from "vitest";
import {
  canShowRightPanelMode,
  getDashboardDisclosure,
  getDefaultRightPanelModeForExperience,
  getRightPanelLabelForMode,
  getVisibleRightPanelModes,
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
      showAdvancedTools: false,
      showTraceByDefault: false,
      collapseAdvancedLeftPanelGroups: true,
    });
  });

  it.each(["pro", "creator"] as const)(
    "keeps Trace visible in %s mode",
    (mode) => {
      expect(getVisibleRightPanelModes(mode)).toEqual([
        "CONTROL",
        "ACTIVITY",
        "MEMORY",
        "LOGS",
      ]);
      expect(canShowRightPanelMode(mode, "LOGS")).toBe(true);
    },
  );

  it("falls back to Overview when a requested mode is unavailable", () => {
    expect(getDefaultRightPanelModeForExperience("basic", "LOGS")).toBe(
      "CONTROL",
    );
    expect(getDefaultRightPanelModeForExperience("pro", "LOGS")).toBe("LOGS");
  });

  it("uses display labels without changing internal panel enums", () => {
    expect(getRightPanelLabelForMode("basic", "CONTROL")).toBe("Overview");
    expect(getRightPanelLabelForMode("creator", "LOGS")).toBe("Trace");
  });

  it("keeps core left-panel groups available while defining advanced disclosure", () => {
    expect(shouldShowLeftPanelGroup("basic", "apps")).toBe(true);
    expect(shouldShowLeftPanelGroup("basic", "devices")).toBe(true);
    expect(shouldShowLeftPanelGroup("basic", "skills")).toBe(true);
    expect(shouldShowLeftPanelGroup("basic", "advanced-tools")).toBe(false);
    expect(shouldShowLeftPanelGroup("pro", "advanced-tools")).toBe(true);
    expect(shouldShowLeftPanelGroup("creator", "runtime-diagnostics")).toBe(
      true,
    );
  });
});
