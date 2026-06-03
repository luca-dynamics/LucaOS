import { describe, expect, it } from "vitest";
import {
  approveBridgeReviewForSandbox,
  createLucaLinkBridgeReviewRecord,
  summarizeBridgeReviews,
} from "./lucaLinkBridgeReview";
const bp = (strategyKind: string, extra = {}) => ({
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
describe("LucaLink bridge review", () => {
  it("creates web display review as config-only sandbox-ready", () => {
    const r = createLucaLinkBridgeReviewRecord(
      bp("web-display-bridge", { risk: "low" }),
    );
    expect(r.status).toBe("sandbox-ready");
    expect(r.sandboxPlan.deniedOperations).toContain("execute adapter");
  });
  it("requires sandbox for Python, Node, and Electron", () => {
    for (const k of [
      "python-host-agent",
      "node-host-adapter",
      "electron-host-adapter",
    ])
      expect(createLucaLinkBridgeReviewRecord(bp(k)).requiresSandbox).toBe(
        true,
      );
  });
  it("keeps IoT/MQTT/Matter read-only", () => {
    for (const k of ["iot-api-bridge", "mqtt-bridge", "matter-like-bridge"])
      expect(
        createLucaLinkBridgeReviewRecord(bp(k)).warnings.join(" "),
      ).toContain("read-only");
  });
  it("blocks ROS motion and unsafe blueprint terms", () => {
    expect(
      createLucaLinkBridgeReviewRecord(
        bp("ros-sensor-bridge", { pseudoCode: "motion command" }),
      ).status,
    ).toBe("blocked");
    for (const term of [
      "credential bypass",
      "exploit",
      "stealth",
      "persistence",
    ])
      expect(
        createLucaLinkBridgeReviewRecord(
          bp("python-host-agent", { summary: term }),
        ).status,
      ).toBe("blocked");
  });
  it("approves for sandbox only without execution", () => {
    const r = approveBridgeReviewForSandbox(
      createLucaLinkBridgeReviewRecord(bp("python-host-agent")),
    );
    expect(r.status).toBe("approved-for-sandbox");
    expect(r.warnings.join(" ")).toContain("does not execute");
  });
  it("summarizes review counts", () => {
    const s = summarizeBridgeReviews([
      createLucaLinkBridgeReviewRecord(
        bp("web-display-bridge", { risk: "low" }),
      ),
      createLucaLinkBridgeReviewRecord(bp("unsupported")),
    ]);
    expect(s.total).toBe(2);
    expect(s.blocked).toBe(1);
  });
});
