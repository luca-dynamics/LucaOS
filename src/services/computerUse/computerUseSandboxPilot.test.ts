import { describe, expect, it } from "vitest";
import { getComputerUseSandboxPilotStatus } from "./computerUseSandboxPilot";

describe("getComputerUseSandboxPilotStatus", () => {
  it("reports off by default with no real stack", () => {
    const status = getComputerUseSandboxPilotStatus({ computerUse: {} });
    expect(status.enabled).toBe(false);
    expect(status.canCreateRealStack).toBe(false);
    expect(status.dryRunRequired).toBe(true);
    expect(status.sideEffectsPerformed).toBe(false);
    expect(status.readinessNotes.join(" ")).toMatch(/off/i);
  });

  it("reports enabled when realSandboxEnabled is true", () => {
    const status = getComputerUseSandboxPilotStatus({
      computerUse: {
        realSandboxEnabled: true,
        driverKind: "playwright",
        headless: true,
      },
    });
    expect(status.enabled).toBe(true);
    expect(status.canCreateRealStack).toBe(true);
    expect(status.driverKindResolved).toBe("playwright");
    expect(status.readinessNotes.join(" ")).toMatch(/enabled/i);
  });
});
