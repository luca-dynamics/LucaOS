import { describe, expect, it } from "vitest";
import {
  getVisualCoreDisplayGovernanceBoundaryLabels,
  getVisualCoreDisplaySessionReason,
  isVisualCoreModeReadyForDisplayGovernance,
  shouldRecordVisualCoreDisplaySession,
} from "./VisualCoreDisplayGovernance";
import {
  VISUAL_CORE_SURFACE_MODES,
  type VisualCoreSurfaceMode,
} from "../../types/visualCoreGovernance";

const READY_MODES: VisualCoreSurfaceMode[] = [
  "IDLE",
  "DATA",
  "DATA_ROOM",
  "REPORTS",
  "SUBSYSTEMS",
  "SOVEREIGNTY",
];

describe("VisualCoreDisplayGovernance", () => {
  it("returns true only for PR #140 ready display modes", () => {
    for (const mode of VISUAL_CORE_SURFACE_MODES) {
      const ready = isVisualCoreModeReadyForDisplayGovernance(mode);
      expect(ready).toBe(READY_MODES.includes(mode));
      expect(shouldRecordVisualCoreDisplaySession(mode)).toBe(ready);
    }
  });

  it("never marks a sensitive mode as ready", () => {
    for (const mode of ["VISION", "RECORDER", "FILES", "TELEGRAM", "WHATSAPP", "WIRELESS", "HACKING", "CODE_EDITOR", "BROWSER"] as const) {
      expect(isVisualCoreModeReadyForDisplayGovernance(mode)).toBe(false);
    }
  });

  it("explains the decision via a user-safe reason", () => {
    expect(getVisualCoreDisplaySessionReason("DATA")).toMatch(/display-only governed session/i);
    expect(getVisualCoreDisplaySessionReason("VISION")).toMatch(/dedicated policy/i);
  });

  it("lists the display governance boundary labels", () => {
    const labels = getVisualCoreDisplayGovernanceBoundaryLabels();
    expect(labels).toContain("Display session only");
    expect(labels).toContain("No capture");
    expect(labels).toContain("No automation");
    expect(labels).toContain("No external action");
    expect(labels).toContain("No file access");
    expect(labels).toContain("Sensitive modes require dedicated policy");
  });
});
