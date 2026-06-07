import { describe, expect, it } from "vitest";
import { createSkillRegistryEntry } from "../skills/skillRegistry";
import { personalIntelligenceSkillRegistryFixtures } from "../skills/skillRegistryFixtures";
import { classifySkillSandboxPermissionRequirements } from "./skillSandboxPermissions";

const base = personalIntelligenceSkillRegistryFixtures[0];
const classify = (capabilities: string[]) => classifySkillSandboxPermissionRequirements(createSkillRegistryEntry({ ...base, id: `test-${capabilities.join("-")}`, permissions: [], capabilities }));

describe("skill sandbox permission classification", () => {
  it.each(["shell.execution", "package.install", "credential.access", "payment.funds", "device.control"])("blocks %s", (value) => {
    expect(classify([value])[0]).toMatchObject({ blocked: true, approvalRequired: true, sandboxRequired: true });
  });

  it.each(["network.request", "file.read", "browser.preview", "lucalink.handoff"])("requires approval and sandbox for %s", (value) => {
    expect(classify([value])[0]).toMatchObject({ blocked: false, approvalRequired: true, sandboxRequired: true });
  });

  it.each(["model.requirement", "tool.requirement", "memory.proposal", "connector.access"])("requires approval for %s", (value) => {
    expect(classify([value])[0]).toMatchObject({ approvalRequired: true, blocked: false });
  });
});
