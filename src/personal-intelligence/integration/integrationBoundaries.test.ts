import { describe, expect, it } from "vitest";
import type { IdentityCoreInput, MemoryItemInput, MissionProfileInput, SkillManifestInput } from "../index";
import {
  appendExecutionTraceEventPreview,
  createExecutionTracePreview,
  createIdentityProfilePreview,
  createLearningEventPreview,
  createMemoryPreview,
  createMissionProfilePreview,
  createSkillManifestPreview,
  describeMissionModes,
  serializeMemoryPreviewOnly,
  validateManifestOnly,
  validateMemoryPrivacy,
} from "./index";

const now = () => new Date("2026-06-06T12:00:00.000Z");

const identityInput: IdentityCoreInput = {
  userId: "user-1", displayName: "Alex Rivera", preferredName: "Alex", communicationStyle: "technical",
  lucaPersonality: { tone: "calm", traits: ["direct"], boundaries: ["user-agency"] },
  activeProjects: ["luca"], preferredModels: ["local-default"],
  devicePreferences: [{ deviceId: "desktop", preferences: { voice: false } }], privacyDefaults: { private: "deny" },
};

const missionInput: MissionProfileInput = {
  missionId: "mission-1", title: "Plan safely", description: "Prepare an inspectable plan.", goals: ["plan"],
  constraints: ["no execution"], successCriteria: ["reviewed"], activeProjectRefs: ["luca"], operatingMode: "collaborative",
  priority: "normal", status: "draft",
};

const memoryInput: MemoryItemInput = {
  id: "memory-1", kind: "preference", title: "Response style", content: "Prefer concise answers.", source: "settings-preview",
  confidence: 0.9, privacyZone: "private", tags: ["communication"],
};

const skillInput: SkillManifestInput = {
  id: "skill.preview", name: "Preview Skill", description: "Declarative metadata only.", version: "1.0.0", category: "planning",
  entrypoint: "disabled/preview.ts", permissions: [{ id: "none", description: "No runtime grant", required: false }],
  memoryPolicy: { read: ["project"], write: [] }, requiredModels: [], requiredTools: [],
  workflows: [{ id: "preview", description: "Describe only", steps: ["render metadata"] }],
  tests: [{ id: "manifest", description: "Validate metadata", expectedOutcome: "valid" }],
};

describe("personal intelligence integration boundaries", () => {
  it("creates a defensive identity preview without mutating onboarding state", () => {
    const preview = createIdentityProfilePreview(identityInput, now);
    preview.activeProjects.push("preview-only");
    preview.lucaPersonality.traits.push("preview-only");
    expect(identityInput.activeProjects).toEqual(["luca"]);
    expect(identityInput.lucaPersonality.traits).toEqual(["direct"]);
  });

  it("keeps every mission mode non-executing and supervised execution future-only", () => {
    const preview = createMissionProfilePreview(missionInput, now);
    expect(preview.operatingMode).toBe("collaborative");
    expect(describeMissionModes().every((mode) => mode.planningOnly)).toBe(true);
    expect(describeMissionModes().find((mode) => mode.mode === "supervised_execution")?.futureOnly).toBe(true);
  });

  it("serializes memory to a returned description without disk I/O and preserves metadata", () => {
    const preview = createMemoryPreview(memoryInput, now);
    const serialized = serializeMemoryPreviewOnly(preview);
    expect(serialized.path).toBe("private/preference/memory-1.json");
    expect(JSON.parse(serialized.content)).toMatchObject({ privacyZone: "private", confidence: 0.9 });
    expect(validateMemoryPrivacy(preview, { policyId: "preview", zones: { private: { read: true, write: false } } }).valid).toBe(false);
  });

  it("requires explicit policy approval for sensitive memory previews", () => {
    const preview = createMemoryPreview({ ...memoryInput, privacyZone: "health" }, now);
    const validation = validateMemoryPrivacy(preview, { policyId: "health", zones: { health: { read: true, write: true } } });
    expect(validation.requiresExplicitApproval).toBe(true);
    expect(validation.valid).toBe(false);
  });

  it("defensively creates learning previews without updating any other core", () => {
    const relatedMemoryItemIds = ["memory-1"];
    const preview = createLearningEventPreview({
      eventId: "learn-1", timestamp: now().toISOString(), inputSummary: "Preview feedback", actionTaken: "Recorded preview only",
      outcome: "success", verificationStatus: "verified", relatedMissionId: "mission-1", relatedMemoryItemIds,
      privacyZone: "project", source: "feedback-preview", confidence: 0.8,
    });
    relatedMemoryItemIds.push("memory-2");
    expect(preview.relatedMemoryItemIds).toEqual(["memory-1"]);
  });

  it("validates a skill manifest without loading its entrypoint or granting permissions", () => {
    const preview = createSkillManifestPreview(skillInput, now);
    expect(validateManifestOnly(preview)).toEqual({ valid: true, errors: [] });
    expect(preview.entrypoint).toBe("disabled/preview.ts");
  });

  it("records trace evidence immutably without approving or acting", () => {
    const trace = createExecutionTracePreview({ traceId: "trace-1", missionId: "mission-1", startedAt: now().toISOString() });
    const appended = appendExecutionTraceEventPreview(trace, {
      traceId: "trace-1", eventId: "event-1", stage: "act", status: "pending", timestamp: now().toISOString(), summary: "Action remains pending.",
    });
    expect(trace.events).toEqual([]);
    expect(appended.events).toHaveLength(1);
    expect(() => appendExecutionTraceEventPreview(trace, {
      traceId: "trace-1", eventId: "event-2", stage: "approve", status: "approved", timestamp: now().toISOString(), summary: "Not allowed.",
    })).toThrow("cannot grant approval");
  });
});
