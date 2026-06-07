import { describe, expect, it } from "vitest";
import { evaluateSkillPermissionPolicy } from "./skillPermissionPolicy";
import { personalIntelligenceSkillRegistryFixtures } from "./skillRegistryFixtures";

const base = personalIntelligenceSkillRegistryFixtures[0];

describe("skill permission policy", () => {
  it("classifies local read-only formatting as low risk", () => {
    expect(evaluateSkillPermissionPolicy(base)).toMatchObject({
      riskLevel: "low",
      requiresApproval: false,
      sideEffectsPerformed: false,
    });
  });

  it.each(["memory.proposal", "model.requirement", "tool.requirement", "dashboard.presentation"])(
    "classifies %s as medium risk",
    (capability) => expect(evaluateSkillPermissionPolicy({ ...base, capabilities: [capability] }).riskLevel).toBe("medium"),
  );

  it.each(["network.request", "file.read", "file.write", "connector.access", "browser.action", "lucalink.handoff"])(
    "classifies %s as high risk",
    (capability) => expect(evaluateSkillPermissionPolicy({ ...base, capabilities: [capability] }).riskLevel).toBe("high"),
  );

  it.each(["shell.execution", "package.install", "credential.access", "payment.execute", "trading.execute", "device.control", "raw.file.exfiltration", "background.surveillance"])(
    "classifies %s as critical risk and blocks it",
    (capability) => {
      const result = evaluateSkillPermissionPolicy({ ...base, capabilities: [capability] });
      expect(result.riskLevel).toBe("critical");
      expect(result.blockers.length).toBeGreaterThan(0);
    },
  );
});
