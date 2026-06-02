import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("socket.io-client", () => ({
  io: vi.fn(),
}));

import { lucaLink } from "./lucaLinkService";

describe("LucaLinkService soft enforcement controls", () => {
  afterEach(() => {
    lucaLink.disableSoftEnforcement();
  });

  it("keeps soft enforcement disabled by default and restores disabled mode", () => {
    expect(lucaLink.getSoftEnforcementMode()).toBe("disabled");

    lucaLink.enableSoftEnforcement({ mode: "high-risk-only" });
    expect(lucaLink.getSoftEnforcementMode()).toBe("high-risk-only");

    lucaLink.disableSoftEnforcement();
    expect(lucaLink.getSoftEnforcementMode()).toBe("disabled");
  });

  it("uses observe-only for no-argument enable so blocking is not activated accidentally", () => {
    lucaLink.enableSoftEnforcement();

    expect(lucaLink.getSoftEnforcementMode()).toBe("observe-only");
    const result = lucaLink.evaluateRuntimeEventForSoftEnforcement({
      eventName: "message",
      payload: {
        type: "tool-request",
        source: "exec-1",
        target: "primary",
        payload: { kind: "tool-request", permission: "shell.execute" },
      },
    });

    expect(result.decision).toBe("observe-only");
    expect(result.blocked).toBe(false);
  });

  it("keeps explicit observe-only non-blocking for outbound send-like evaluations", () => {
    lucaLink.enableSoftEnforcement({ mode: "observe-only" });

    const result = lucaLink.evaluateRuntimeEventForSoftEnforcement({
      eventName: "message",
      payload: {
        type: "tool-request",
        source: "exec-1",
        target: "primary",
        payload: { kind: "tool-request", permission: "files.write" },
      },
    });

    expect(lucaLink.getSoftEnforcementMode()).toBe("observe-only");
    expect(result.blocked).toBe(false);
    expect(result.explain).toContain("no runtime block");
  });

  it("requires explicit high-risk-only mode for blocking-capable dangerous outbound evaluations", () => {
    lucaLink.enableSoftEnforcement({ mode: "high-risk-only" });

    const sendLike = lucaLink.evaluateRuntimeEventForSoftEnforcement({
      eventName: "message",
      payload: {
        type: "tool-request",
        source: "exec-1",
        target: "primary",
        payload: { kind: "tool-request", permission: "shell.execute" },
      },
    });
    const beamLike = lucaLink.evaluateRuntimeEventForSoftEnforcement({
      eventName: "message",
      payload: {
        type: "tool-request",
        source: "body-1",
        target: "primary",
        payload: { kind: "tool-request", permission: "robotics.motion" },
      },
    });

    expect(lucaLink.getSoftEnforcementMode()).toBe("high-risk-only");
    expect(sendLike.blocked).toBe(true);
    expect(beamLike.blocked).toBe(true);
  });
});
