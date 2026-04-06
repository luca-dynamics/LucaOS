import { describe, it, expect } from "vitest";
import { sovereignGuard } from "./SovereignGuard";

describe("SovereignGuard (Fast-Path Safety)", () => {
  it("should flag dangerous shell commands", () => {
    const verdict = sovereignGuard.classifyCommand("rm -rf /");
    expect(verdict.status).toBe("DANGEROUS");
    expect(verdict.reason).toContain("critical threat pattern");
  });

  it("should flag suspicious state changes", () => {
    const verdict = sovereignGuard.classifyCommand("git push --force");
    expect(verdict.status).toBe("SUSPICIOUS");
    expect(verdict.reason).toContain("suspicious state-change");
  });

  it("should allow safe commands", () => {
    const verdict = sovereignGuard.classifyCommand("ls -la");
    expect(verdict.status).toBe("SAFE");
  });

  it("should throw error on dangerous action validation", () => {
    expect(() => sovereignGuard.validateShellAction("rm -rf /")).toThrow("[SOVEREIGN_GUARD] BLOCKED");
  });
});
