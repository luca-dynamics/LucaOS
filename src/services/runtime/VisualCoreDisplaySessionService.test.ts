import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  VisualCoreDisplaySessionService,
} from "./VisualCoreDisplaySessionService";
import { MAX_VISUAL_CORE_DISPLAY_SESSIONS } from "../../types/visualCoreSessions";
import {
  VISUAL_CORE_SURFACE_MODES,
  type VisualCoreSurfaceMode,
} from "../../types/visualCoreGovernance";

const READY_MODES: VisualCoreSurfaceMode[] = [
  "IDLE",
  "DATA",
  "DATA_ROOM",
  "REPORTS",
  "SUBSYSTEMS",
  "SOVEREIGNTY",
];

const SENSITIVE_BLOCKED_MODES: VisualCoreSurfaceMode[] = [
  "VISION",
  "RECORDER",
  "FILES",
  "TELEGRAM",
  "WHATSAPP",
  "WIRELESS",
  "HACKING",
];

function makeService() {
  const map = new Map<string, string>();
  const storage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => map.set(k, v),
  };
  const bus = { emit: vi.fn(), emitEvent: vi.fn() };
  return new VisualCoreDisplaySessionService({ storage, bus });
}

describe("VisualCoreDisplaySessionService", () => {
  let service: VisualCoreDisplaySessionService;

  beforeEach(() => {
    service = makeService();
  });

  it("creates an open_requested display session for every ready low-risk mode", () => {
    for (const mode of READY_MODES) {
      const record = service.createDisplaySession({ mode, source: "prop_update" });
      expect(record.status).toBe("open_requested");
      expect(record.mode).toBe(mode);
      expect(record.readiness).toBe("ready_for_display_governance");
      expect(record.blockedBy).toBeUndefined();
      expect(record.governanceApplied).toBe(true);
      expect(record.displayOnly).toBe(true);
    }
  });

  it("blocks BROWSER because it needs a runtime adapter", () => {
    const record = service.createDisplaySession({ mode: "BROWSER", source: "ipc_remote_control" });
    expect(record.status).toBe("blocked");
    expect(record.blockedBy?.[0]).toMatch(/needs_runtime_adapter/);
    // A blocked record never transitions to open.
    const opened = service.markDisplaySessionOpen(record.visualSessionId);
    expect(opened?.status).toBe("blocked");
  });

  it("blocks every sensitive mode (never opens them)", () => {
    for (const mode of SENSITIVE_BLOCKED_MODES) {
      const record = service.createDisplaySession({ mode, source: "visual_data" });
      expect(record.status, `${mode} must be blocked`).toBe("blocked");
      expect(record.blockedBy?.length).toBeGreaterThan(0);
    }
  });

  it("pause/resume/close/revoke update record status only", () => {
    const created = service.createDisplaySession({ mode: "DATA", source: "prop_update" });
    const id = created.visualSessionId;

    expect(service.markDisplaySessionOpen(id)?.status).toBe("open");
    expect(service.pauseDisplaySession(id, "user")?.status).toBe("paused");
    expect(service.resumeDisplaySession(id)?.status).toBe("open");

    const closed = service.closeDisplaySession(id);
    expect(closed?.status).toBe("closed");
    expect(closed?.closedAt).toBeDefined();

    const revoked = service.revokeDisplaySession(id, "cleanup");
    expect(revoked?.status).toBe("revoked");
    expect(revoked?.revokedAt).toBeDefined();

    // Still exactly one record for this session id (status mutated in place).
    expect(service.listDisplaySessions("DATA")).toHaveLength(1);
  });

  it("counts sessions in the diagnostics summary", () => {
    service.createDisplaySession({ mode: "IDLE", source: "system" });
    const open = service.createDisplaySession({ mode: "DATA", source: "prop_update" });
    service.markDisplaySessionOpen(open.visualSessionId);
    service.createDisplaySession({ mode: "VISION", source: "visual_data" }); // blocked

    const summary = service.getDiagnosticsSummary();
    expect(summary.totalSessions).toBe(3);
    expect(summary.openSessions).toBe(1);
    expect(summary.blockedSessions).toBe(1);
    expect(summary.openRequestedSessions).toBe(1);
    expect(summary.readyDisplayModeCount).toBe(READY_MODES.length);
    expect(summary.sensitiveModeCount).toBeGreaterThanOrEqual(SENSITIVE_BLOCKED_MODES.length);
    expect(summary.governanceApplied).toBe(true);
  });

  it("bounds stored records to the max", () => {
    for (let i = 0; i < MAX_VISUAL_CORE_DISPLAY_SESSIONS + 25; i += 1) {
      service.createDisplaySession({ mode: "DATA", source: "prop_update" });
    }
    expect(service.listDisplaySessions().length).toBe(MAX_VISUAL_CORE_DISPLAY_SESSIONS);
  });

  it("keeps every sensitive capability flag false on records and diagnostics", () => {
    const record = service.createDisplaySession({ mode: "REPORTS", source: "prop_update" });
    expect(record.captureEnabled).toBe(false);
    expect(record.automationEnabled).toBe(false);
    expect(record.externalActionEnabled).toBe(false);
    expect(record.fileAccessEnabled).toBe(false);
    expect(record.messagingEnabled).toBe(false);
    expect(record.wirelessControlEnabled).toBe(false);
    expect(record.walletPaymentEnabled).toBe(false);
    expect(record.credentialSensitive).toBe(false);

    const summary = service.getDiagnosticsSummary();
    expect(summary.captureEnabled).toBe(false);
    expect(summary.automationEnabled).toBe(false);
    expect(summary.externalActionEnabled).toBe(false);
    expect(summary.fileAccessEnabled).toBe(false);
    expect(summary.messagingEnabled).toBe(false);
    expect(summary.wirelessControlEnabled).toBe(false);
    expect(summary.walletPaymentEnabled).toBe(false);
  });

  it("only ever opens modes that are ready for display governance", () => {
    for (const mode of VISUAL_CORE_SURFACE_MODES) {
      const record = service.createDisplaySession({ mode, source: "system" });
      if (READY_MODES.includes(mode)) {
        expect(record.status).toBe("open_requested");
      } else {
        expect(record.status).toBe("blocked");
      }
    }
  });
});
