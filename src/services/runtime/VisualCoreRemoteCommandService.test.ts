import { beforeEach, describe, expect, it, vi } from "vitest";
import { VisualCoreRemoteCommandService } from "./VisualCoreRemoteCommandService";
import { MAX_VISUAL_CORE_REMOTE_COMMAND_RECORDS } from "../../types/visualCoreRemoteCommands";

function makeService() {
  const map = new Map<string, string>();
  const storage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => map.set(k, v),
  };
  const bus = { emit: vi.fn(), emitEvent: vi.fn() };
  return { service: new VisualCoreRemoteCommandService({ storage, bus }), bus };
}

describe("VisualCoreRemoteCommandService", () => {
  let service: VisualCoreRemoteCommandService;
  let bus: { emit: ReturnType<typeof vi.fn>; emitEvent: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    ({ service, bus } = makeService());
  });

  it("records an allowed (record-only) telemetry command", () => {
    const record = service.recordRemoteCommand({ kind: "SYNC_APP_STATE", source: "app_state_sync" });
    expect(record.status).toBe("allowed_record_only");
    expect(record.kind).toBe("SYNC_APP_STATE");
    expect(record.governanceApplied).toBe(true);
    expect(record.recordOnly).toBe(true);
    expect(record.executionChanged).toBe(false);
    expect(record.browserGoverned).toBe(false);
    expect(bus.emitEvent).toHaveBeenCalled();
  });

  it("sets browserGoverned true for BROWSER_NAVIGATE records", () => {
    const record = service.recordRemoteCommand({
      type: "BROWSER_NAVIGATE",
      value: "https://gov.test/page",
      source: "ipc_remote_control",
    });
    expect(record.browserGoverned).toBe(true);
    expect(record.kind).toBe("BROWSER_NAVIGATE");
    expect(record.captureEnabled).toBe(false);
    expect(record.automationEnabled).toBe(false);
  });

  it("records a blocked command", () => {
    const record = service.recordRemoteCommand({ type: "CAST_SELECT", source: "ipc_remote_control" });
    expect(record.status).toBe("blocked");
    expect(record.blockedBy && record.blockedBy.length).toBeGreaterThan(0);
  });

  it("records an allowed_record_only BROWSER_NAVIGATE without storing a raw token URL", () => {
    const record = service.recordRemoteCommand({
      type: "BROWSER_NAVIGATE",
      value: "https://x.test/p?token=abc123secret",
      source: "ipc_remote_control",
    });
    expect(record.status).toBe("allowed_record_only");
    expect(record.kind).toBe("BROWSER_NAVIGATE");
    expect(record.targetAuditUrl).toBeDefined();
    expect(record.targetAuditUrl).not.toMatch(/abc123secret/);
  });

  it("explicitly blocks a command via blockRemoteCommand", () => {
    const record = service.blockRemoteCommand({
      kind: "SET_MODE",
      value: "DATA",
      reason: "manual_block",
      source: "system",
    });
    expect(record.status).toBe("blocked");
    expect(record.blockedBy?.[0]).toBe("manual_block");
  });

  it("caps storage at the bounded maximum", () => {
    for (let i = 0; i < MAX_VISUAL_CORE_REMOTE_COMMAND_RECORDS + 25; i += 1) {
      service.recordRemoteCommand({ kind: "WIDGET_VOICE_DATA", source: "voice_widget" });
    }
    expect(service.listRemoteCommandRecords().length).toBe(
      MAX_VISUAL_CORE_REMOTE_COMMAND_RECORDS,
    );
  });

  it("looks up and filters records", () => {
    const a = service.recordRemoteCommand({ kind: "SYNC_APP_STATE", source: "app_state_sync" });
    service.recordRemoteCommand({ type: "BROWSER_NAVIGATE", value: "https://y.test", source: "ipc_remote_control" });
    expect(service.getRemoteCommandRecord(a.commandRecordId)?.commandRecordId).toBe(a.commandRecordId);
    expect(service.listRemoteCommandRecords("BROWSER_NAVIGATE").length).toBe(1);
  });

  it("diagnostics counts statuses and keeps all dangerous flags false", () => {
    service.recordRemoteCommand({ kind: "SYNC_APP_STATE", source: "app_state_sync" });
    service.recordRemoteCommand({ type: "BROWSER_NAVIGATE", value: "https://z.test", source: "ipc_remote_control" });
    service.recordRemoteCommand({ type: "CAST_SELECT", source: "ipc_remote_control" });
    const diag = service.getDiagnosticsSummary();
    expect(diag.totalCommands).toBe(3);
    expect(diag.allowedRecordOnlyCommands).toBe(2);
    expect(diag.needsApprovalCommands).toBe(0);
    expect(diag.blockedCommands).toBe(1);
    expect(diag.browserNavigateCommands).toBe(1);
    expect(diag.governanceApplied).toBe(true);
    expect(diag.recordOnly).toBe(true);
    expect(diag.executionChanged).toBe(false);
    expect(diag.browserGovernanceAvailable).toBe(true);
    expect(diag.browserGovernedCommandSeen).toBe(true);
    expect(diag.browserGovernedCommandCount).toBe(1);
    expect(diag.captureEnabled).toBe(false);
    expect(diag.automationEnabled).toBe(false);
    expect(diag.externalActionEnabled).toBe(false);
    expect(diag.fileAccessEnabled).toBe(false);
    expect(diag.messagingEnabled).toBe(false);
    expect(diag.wirelessControlEnabled).toBe(false);
    expect(diag.walletPaymentEnabled).toBe(false);
  });

  it("exposes no execute/navigate/capture/file/messaging/wireless methods", () => {
    const forbidden = [
      "execute",
      "executeCommand",
      "navigate",
      "openBrowser",
      "switchMode",
      "setMode",
      "capture",
      "captureScreen",
      "readFile",
      "sendMessage",
      "controlWireless",
      "castToDevice",
    ];
    const proto = service as unknown as Record<string, unknown>;
    for (const method of forbidden) {
      expect(typeof proto[method]).not.toBe("function");
    }
  });
});
