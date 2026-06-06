import { describe, expect, it } from "vitest";
import { createSkillManifest, validateSkillManifest } from "./skillManifest";
import { createSkillRegistry } from "./skillRegistry";

const now = () => new Date("2026-06-06T12:00:00.000Z");
const manifest = createSkillManifest({ id: "summarize-project", name: "Summarize Project", description: "Summarizes project context.",
  version: "1.0.0", category: "knowledge", entrypoint: "skills/summarize-project",
  permissions: [{ id: "memory.read", description: "Read project memory", required: true }],
  memoryPolicy: { read: ["project"], write: ["project"], retention: "project" }, requiredModels: ["text"],
  requiredTools: [], workflows: [{ id: "summarize", description: "Create summary", steps: ["read", "summarize"] }],
  tests: [{ id: "summary-present", description: "Produces output", expectedOutcome: "A sourced summary" }] }, now);

describe("skill manifests and registry", () => {
  it("validates and registers manifests", () => {
    expect(validateSkillManifest(manifest).valid).toBe(true);
    const registry = createSkillRegistry();
    registry.register(manifest);
    expect(registry.get(manifest.id)?.name).toBe("Summarize Project");
    expect(registry.list()).toHaveLength(1);
  });

  it("rejects duplicate ids and malformed versions", () => {
    const registry = createSkillRegistry([manifest]);
    expect(() => registry.register(manifest)).toThrow("already registered");
    expect(registry.validate({ ...manifest, version: "one" }).valid).toBe(false);
  });
});
