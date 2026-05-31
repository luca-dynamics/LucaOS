import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  OverlayManagerSessionService,
  isOverlaySurfaceSessionEligible,
} from "./OverlayManagerSessionService";
import { MAX_OVERLAY_SESSIONS } from "../../types/overlayManagerSessions";
import type { OverlaySurfaceId } from "../../types/overlayManagerGovernance";

// PR #149 only governs these low-risk display-only surfaces.
const ELIGIBLE_SURFACES: OverlaySurfaceId[] = [
  "autonomous_action_banner",
  "app_background",
  "ghost_cursor",
  "reboot_overlay",
];

// Surfaces that must NOT be governed/enabled by this PR. `live_content` is
// included here because PR #148 classified it elevated + needs-governance.
const NON_ELIGIBLE_SURFACES: OverlaySurfaceId[] = [
  "live_content",
  "security_gate",
  "voice_hud",
  "voice_command_confirmation",
  "presence_monitor",
  "screen_share",
  "vision_camera",
  "remote_access",
  "desktop_stream",
  "luca_recorder",
  "human_input",
  "shared_overlay_panels",
  "origin_overlay_panels",
  "android_native_overlay",
];

function makeService() {
  const map = new Map<string, string>();
  const storage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => map.set(k, v),
  };
  const bus = { emit: vi.fn(), emitEvent: vi.fn() };
  return new OverlayManagerSessionService({ storage, bus });
}

describe("OverlayManagerSessionService", () => {
  let service: OverlayManagerSessionService;

  beforeEach(() => {
    service = makeService();
  });

  it("creates an open_requested session for every low-risk display-only surface", () => {
    for (const id of ELIGIBLE_SURFACES) {
      const record = service.createOverlaySession({
        overlaySurfaceId: id,
        source: "prop_toggle",
      });
      expect(record.status).toBe("open_requested");
      expect(record.overlaySurfaceId).toBe(id);
      expect(record.riskLevel).toBe("low");
      expect(record.postures).toContain("display-only");
      expect(record.blockedBy).toBeUndefined();
      expect(isOverlaySurfaceSessionEligible(id)).toBe(true);
    }
  });

  it("runs the open -> close lifecycle for an eligible surface", () => {
    const created = service.createOverlaySession({
      overlaySurfaceId: "reboot_overlay",
      source: "app_state",
    });
    expect(created.status).toBe("open_requested");

    const opened = service.markOverlaySessionOpen(created.overlaySessionId);
    expect(opened?.status).toBe("open");

    const closed = service.markOverlaySessionClosed(created.overlaySessionId);
    expect(closed?.status).toBe("closed");
    expect(closed?.closedAt).toBeTruthy();
    expect(closed?.updatedAt).toBeTruthy();
  });

  it("records every sensitive/ineligible surface as blocked and never opens it", () => {
    for (const id of NON_ELIGIBLE_SURFACES) {
      const record = service.createOverlaySession({
        overlaySurfaceId: id,
        source: "app_state",
      });
      expect(record.status).toBe("blocked");
      expect(record.blockedBy?.length).toBeGreaterThan(0);
      expect(isOverlaySurfaceSessionEligible(id)).toBe(false);
      expect(record.sensitiveSurfaceEnabled).toBe(false);

      // A blocked record never transitions to open or closed.
      const opened = service.markOverlaySessionOpen(record.overlaySessionId);
      expect(opened?.status).toBe("blocked");
      const closed = service.markOverlaySessionClosed(record.overlaySessionId);
      expect(closed?.status).toBe("blocked");
    }
  });

  it("excludes live_content (elevated + needs-governance) from governance", () => {
    expect(isOverlaySurfaceSessionEligible("live_content")).toBe(false);
    const record = service.createOverlaySession({
      overlaySurfaceId: "live_content",
      source: "app_state",
    });
    expect(record.status).toBe("blocked");
  });

  it("bounds the number of retained session records", () => {
    for (let i = 0; i < MAX_OVERLAY_SESSIONS + 25; i += 1) {
      service.createOverlaySession({
        overlaySurfaceId: "ghost_cursor",
        source: "system",
      });
    }
    expect(service.listOverlaySessions().length).toBe(MAX_OVERLAY_SESSIONS);
  });

  it("keeps every danger flag false and governance flags true on records", () => {
    const record = service.createOverlaySession({
      overlaySurfaceId: "app_background",
      source: "prop_toggle",
    });
    expect(record.governanceApplied).toBe(true);
    expect(record.recordOnly).toBe(true);
    expect(record.executionChanged).toBe(false);
    expect(record.captureEnabled).toBe(false);
    expect(record.automationEnabled).toBe(false);
    expect(record.externalActionEnabled).toBe(false);
    expect(record.fileAccessEnabled).toBe(false);
    expect(record.messagingEnabled).toBe(false);
    expect(record.wirelessControlEnabled).toBe(false);
    expect(record.walletPaymentEnabled).toBe(false);
    expect(record.sensitiveSurfaceEnabled).toBe(false);
  });

  it("exposes a diagnostics summary with bounded counts and safe flags", () => {
    service.createOverlaySession({ overlaySurfaceId: "ghost_cursor", source: "system" });
    const opened = service.createOverlaySession({
      overlaySurfaceId: "app_background",
      source: "prop_toggle",
    });
    service.markOverlaySessionOpen(opened.overlaySessionId);
    service.createOverlaySession({ overlaySurfaceId: "voice_hud", source: "app_state" });

    const summary = service.getDiagnosticsSummary();
    expect(summary.totalSessions).toBe(3);
    expect(summary.openSessions).toBe(1);
    expect(summary.openRequestedSessions).toBe(1);
    expect(summary.blockedSessions).toBe(1);
    expect(summary.eligibleSurfaceCount).toBeGreaterThanOrEqual(4);
    expect(summary.sensitiveSurfaceCount).toBeGreaterThan(0);
    expect(summary.governanceApplied).toBe(true);
    expect(summary.recordOnly).toBe(true);
    expect(summary.executionChanged).toBe(false);
    expect(summary.captureEnabled).toBe(false);
    expect(summary.automationEnabled).toBe(false);
    expect(summary.externalActionEnabled).toBe(false);
    expect(summary.fileAccessEnabled).toBe(false);
    expect(summary.messagingEnabled).toBe(false);
    expect(summary.wirelessControlEnabled).toBe(false);
    expect(summary.walletPaymentEnabled).toBe(false);
    expect(summary.sensitiveSurfaceEnabled).toBe(false);
  });

  it("exposes no behavior/action/control methods (record + diagnostics only)", () => {
    const allowed = new Set([
      "createOverlaySession",
      "markOverlaySessionOpen",
      "markOverlaySessionClosed",
      "getOverlaySession",
      "listOverlaySessions",
      "getDiagnosticsSummary",
    ]);
    const methods = Object.getOwnPropertyNames(
      OverlayManagerSessionService.prototype,
    ).filter((name) => name !== "constructor" && !name.startsWith("#"));
    const publicMethods = methods.filter((name) => allowed.has(name));
    // Every public method is a record/diagnostics method — nothing else.
    expect(publicMethods.sort()).toEqual([...allowed].sort());

    const forbidden = [
      "show",
      "hide",
      "open",
      "close",
      "toggle",
      "execute",
      "run",
      "click",
      "type",
      "scroll",
      "capture",
      "screenshot",
      "navigate",
      "sendMessage",
      "readFile",
      "writeFile",
      "invokeTool",
      "setZIndex",
      "focus",
    ];
    for (const name of forbidden) {
      expect(methods).not.toContain(name);
    }
  });
});
