import { describe, expect, it } from "vitest";
import {
  approveBridgeReviewForSandbox,
  createLucaLinkBridgeReviewRecord,
} from "./lucaLinkBridgeReview";
import {
  createAdapterDraftFromBlueprint,
  createAdapterDraftFromBridgeReview,
  evaluateAdapterDraftSafety,
  sanitizeAdapterDraftText,
  summarizeAdapterDrafts,
} from "./lucaLinkAdapterDrafts";
const bp = (strategyKind: string, extra = {}) =>
  Object.freeze({
    id: strategyKind,
    strategyKind: strategyKind as never,
    title: strategyKind,
    summary: "summary",
    risk: "medium" as const,
    requiresPrimaryHostApproval: true,
    requiresSandbox: false,
    generatedProgramAllowed: false,
    allowedCapabilities: [],
    deniedCapabilities: [],
    safetyBoundaries: [],
    sandboxTestPlan: [],
    approvalChecklist: [],
    warnings: [],
    errors: [],
    ...extra,
  });
describe("LucaLink adapter drafts", () => {
  it("creates web display draft as text/config only", () => {
    const d = createAdapterDraftFromBlueprint(bp("web-display-bridge"));
    expect(d.kind).toBe("web-display-config");
    expect(d.generatedTextOnly).toBe(true);
    expect(d.canWriteToDisk).toBe(false);
    expect(d.canExecute).toBe(false);
    expect(d.canInstall).toBe(false);
  });
  it("requires review/sandbox for Python, Node, and Electron", () => {
    for (const k of [
      "python-host-agent",
      "node-host-adapter",
      "electron-host-adapter",
    ]) {
      const d = createAdapterDraftFromBlueprint(bp(k));
      expect(d.requiresSandbox).toBe(true);
      expect(d.status).toBe("requires-review");
    }
  });
  it("creates read-only IoT/MQTT/Matter config drafts", () => {
    for (const k of ["iot-api-bridge", "mqtt-bridge", "matter-like-bridge"])
      expect(
        createAdapterDraftFromBlueprint(bp(k)).deniedCapabilities,
      ).toContain("device-control");
  });
  it("keeps ROS sensor-only with motion denied", () => {
    const d = createAdapterDraftFromBlueprint(bp("ros-sensor-bridge"));
    expect(d.kind).toBe("ros-sensor-draft");
    expect(d.deniedCapabilities).toContain("motion");
  });
  it("blocks or converts shell and unsafe terms", () => {
    expect(
      createAdapterDraftFromBlueprint(
        bp("python-host-agent", { generatedProgramLanguage: "shell" }),
      ).status,
    ).toBe("blocked");
    expect(
      createAdapterDraftFromBlueprint(
        bp("node-host-adapter", {
          pseudoCode: "credential bypass exploit stealth persistence",
        }),
      ).status,
    ).toBe("blocked");
    expect(sanitizeAdapterDraftText("exploit")).toContain("blocked");
  });
  it("creates draft from bridge review and preserves source immutability", () => {
    const blueprint = bp("python-host-agent");
    const before = JSON.stringify(blueprint);
    const review = approveBridgeReviewForSandbox(
      createLucaLinkBridgeReviewRecord(blueprint),
    );
    const d = createAdapterDraftFromBridgeReview(review);
    expect(d.sourceReviewId).toBe(review.id);
    expect(d.status).toBe("approved-for-sandbox");
    expect(JSON.stringify(blueprint)).toBe(before);
  });
  it("evaluates safety and summarizes counts", () => {
    const d = evaluateAdapterDraftSafety(
      createAdapterDraftFromBlueprint(bp("web-display-bridge")),
    );
    const s = summarizeAdapterDrafts([d]);
    expect(s.total).toBe(1);
    expect(d.generatedTextOnly).toBe(true);
  });
});
