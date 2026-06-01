import { describe, expect, it } from "vitest";
import * as bootCopyModel from "./lucaBootCopyModel";
import {
  LUCA_BOOT_COPY_BY_SEQUENCE,
  LUCA_BOOT_DIAGNOSTIC_COPY,
  getLucaBootDiagnosticCopy,
  getLucaBootSequenceCopy,
  getLucaBootStatusCopy,
} from "./lucaBootCopyModel";
import { LUCA_BOOT_SEQUENCE_STATES } from "./lucaBootExperienceMap";

describe("lucaBootCopyModel", () => {
  it("provides product-facing copy for every known BootSequence", () => {
    expect(Object.keys(LUCA_BOOT_COPY_BY_SEQUENCE)).toEqual(
      LUCA_BOOT_SEQUENCE_STATES,
    );

    for (const bootSequence of LUCA_BOOT_SEQUENCE_STATES) {
      const copy = getLucaBootSequenceCopy(bootSequence);
      expect(copy.bootSequence).toBe(bootSequence);
      expect(copy.standardLabel).toBeTruthy();
      expect(copy.audience).toContain("standard");
    }
  });

  it("keeps tactical diagnostic labels mapped beside standard labels", () => {
    expect(getLucaBootDiagnosticCopy("cortexCore")).toMatchObject({
      standardLabel: "Local brain",
      tacticalLabel: "CORTEX CORE (RAG)",
    });
    expect(getLucaBootDiagnosticCopy("kernelAwakening")).toMatchObject({
      standardLabel: "Luca is waking up",
      tacticalLabel: "KERNEL AWAKENING IN PROGRESS",
    });
  });

  it("only exposes copy data and formatting helpers, not execution surfaces", () => {
    const exportedNames = Object.keys(bootCopyModel);

    expect(exportedNames.join(" ")).not.toMatch(
      /execute|run|invoke|tool|browser|file|message/i,
    );
    expect(
      Object.values(LUCA_BOOT_DIAGNOSTIC_COPY).every(
        (copy) => copy.standardLabel.length > 0,
      ),
    ).toBe(true);
  });

  it("formats readiness status without changing status keys", () => {
    expect(getLucaBootStatusCopy("OK")).toBe("Ready");
    expect(getLucaBootStatusCopy("FAIL")).toBe("Needs attention");
    expect(getLucaBootStatusCopy("PENDING")).toBe("Checking…");
  });
});
