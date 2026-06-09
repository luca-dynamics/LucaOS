import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  OverlayApprovalResolutionService,
  type PendingOverlayApprovalRequest,
} from "./OverlayApprovalResolutionService";
import { MAX_OVERLAY_APPROVAL_RESOLUTIONS } from "../../types/overlayApprovalResolution";

function makeService() {
  const map = new Map<string, string>();
  const storage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => map.set(k, v),
  };
  const bus = { emit: vi.fn(), emitEvent: vi.fn() };
  return new OverlayApprovalResolutionService({ storage, bus });
}

describe("OverlayApprovalResolutionService", () => {
  let service: OverlayApprovalResolutionService;

  beforeEach(() => {
    service = makeService();
  });

  it("records and resolves VoiceHud approval with a pending request", () => {
    const resolve = vi.fn();
    const approvalRequest: PendingOverlayApprovalRequest = { resolve };
    const clearApprovalRequest = vi.fn();

    const record = service.resolveApproval({
      source: "voice_hud",
      decision: "approve",
      approvalRequest,
      clearApprovalRequest,
    });

    expect(record.status).toBe("resolved");
    expect(record.source).toBe("voice_hud");
    expect(record.decision).toBe("approve");
    expect(resolve).toHaveBeenCalledWith(true);
    expect(clearApprovalRequest).toHaveBeenCalledOnce();
    expect(service.getDiagnosticsSummary().resolvedAttempts).toBe(1);
    expect(service.getDiagnosticsSummary().recordedAttempts).toBe(1);
  });

  it("records and resolves VoiceHud denial with a pending request", () => {
    const resolve = vi.fn();

    const record = service.resolveApproval({
      source: "voice_hud",
      decision: "deny",
      approvalRequest: { resolve },
    });

    expect(record.status).toBe("resolved");
    expect(record.decision).toBe("deny");
    expect(resolve).toHaveBeenCalledWith(false);
  });

  it("records VoiceHud approval with no pending request as blocked no-op", () => {
    const record = service.resolveApproval({
      source: "voice_hud",
      decision: "approve",
      approvalRequest: null,
    });

    expect(record.status).toBe("blocked_no_pending_request");
    expect(record.blockedBy).toContain("no_pending_approval_request");
    expect(service.getDiagnosticsSummary().blockedNoPendingRequestAttempts).toBe(1);
  });

  it("records ambiguous VoiceHud input as blocked and does not resolve", () => {
    const resolve = vi.fn();

    const record = service.resolveApproval({
      source: "voice_hud",
      decision: "maybe",
      approvalRequest: { resolve },
    });

    expect(record.status).toBe("blocked_unrecognized_decision");
    expect(record.decision).toBe("unknown");
    expect(record.blockedBy).toContain("unrecognized_approval_decision");
    expect(resolve).not.toHaveBeenCalled();
  });

  it("keeps SecurityGate visual approve and deny on the governed path", () => {
    const approve = vi.fn();
    const deny = vi.fn();

    service.resolveApproval({
      source: "security_gate",
      decision: "approve",
      approvalRequest: { resolve: approve },
    });
    service.resolveApproval({
      source: "security_gate",
      decision: "deny",
      approvalRequest: { resolve: deny },
    });

    expect(approve).toHaveBeenCalledWith(true);
    expect(deny).toHaveBeenCalledWith(false);
    expect(service.getDiagnosticsSummary().securityGateAttempts).toBe(4);
    expect(service.getDiagnosticsSummary().resolvedAttempts).toBe(2);
  });

  it("bounds retained records", () => {
    for (let i = 0; i < MAX_OVERLAY_APPROVAL_RESOLUTIONS + 25; i += 1) {
      service.resolveApproval({
        source: "voice_hud",
        decision: "approve",
        approvalRequest: null,
      });
    }

    expect(service.listRecords().length).toBe(MAX_OVERLAY_APPROVAL_RESOLUTIONS);
    expect(service.getDiagnosticsSummary().totalRecords).toBe(MAX_OVERLAY_APPROVAL_RESOLUTIONS);
  });

  it("keeps dangerous capability safety flags false", () => {
    const record = service.resolveApproval({
      source: "voice_hud",
      decision: "approve",
      approvalRequest: null,
    });
    const summary = service.getDiagnosticsSummary();

    for (const flags of [record, summary]) {
      expect(flags.governanceApplied).toBe(true);
      expect(flags.approvalResolutionOnly).toBe(true);
      expect(flags.executionChanged).toBe(false);
      expect(flags.toolExecutionEnabled).toBe(false);
      expect(flags.captureEnabled).toBe(false);
      expect(flags.automationEnabled).toBe(false);
      expect(flags.externalActionEnabled).toBe(false);
      expect(flags.fileAccessEnabled).toBe(false);
      expect(flags.messagingEnabled).toBe(false);
      expect(flags.wirelessControlEnabled).toBe(false);
      expect(flags.walletPaymentEnabled).toBe(false);
      expect(flags.sensitiveSurfaceEnabled).toBe(false);
    }
  });

  it("exposes no direct execution methods", () => {
    const methods = Object.getOwnPropertyNames(
      OverlayApprovalResolutionService.prototype,
    ).filter((name) => name !== "constructor" && !name.startsWith("#"));

    const allowed = ["getDiagnosticsSummary", "listRecords", "resolveApproval"];
    const unexpectedMethods = methods.filter((name) => !allowed.includes(name));

    expect(methods.sort()).toEqual([...allowed].sort());
    expect(unexpectedMethods).toEqual([]);
    for (const name of [
      "execute",
      "run",
      "invokeTool",
      "click",
      "type",
      "scroll",
      "capture",
      "screenshot",
      "readDom",
      "readFile",
      "sendMessage",
      "wirelessControl",
    ]) {
      expect(methods).not.toContain(name);
    }
  });
});
