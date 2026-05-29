// SafeLocalPanelTargets tests — PR #126: Safe App/Panel Launcher Governance
import { describe, it, expect } from "vitest";
import {
  isSafeLocalPanelTarget,
  getSafeLocalPanelLabel,
  getSafeLocalPanelEvent,
  getTargetPanelTab,
  normalizeSafeLocalPanelTarget,
} from "./SafeLocalPanelTargets";
import { evaluate, isAllowedTarget } from "./GovernedToolExecutionPolicy";
import { detectSignals, chooseRoute, detectLocalPanelTarget } from "./IntentRoutingPolicy";
import type { GovernedActionRequest } from "../../types/governedActionRequest";

function makeRequest(overrides: Partial<GovernedActionRequest> = {}): GovernedActionRequest {
  return {
    requestId: "governed-request:test:2026-01-01T00:00:00.000Z",
    kind: "tool",
    title: "Test action",
    description: "A test governed action request",
    requestedCapability: "open_panel",
    target: "panel:memory",
    parametersPreview: {},
    provenanceIds: ["prov:test:2026-01-01T00:00:00.000Z"],
    actionDigest: "fnv1a:12345678",
    approvalRequestId: "approval-request:test:2026-01-01T00:00:00.000Z",
    status: "approved_waiting_execution",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    riskLevel: "low",
    dryRunOnly: true,
    ...overrides,
  };
}

describe("SafeLocalPanelTargets", () => {
  describe("isSafeLocalPanelTarget", () => {
    it("allows all defined panel targets", () => {
      expect(isSafeLocalPanelTarget("panel:control")).toBe(true);
      expect(isSafeLocalPanelTarget("panel:activity")).toBe(true);
      expect(isSafeLocalPanelTarget("panel:memory")).toBe(true);
      expect(isSafeLocalPanelTarget("panel:logs")).toBe(true);
      expect(isSafeLocalPanelTarget("panel:model-manager")).toBe(true);
    });

    it("allows all defined view targets", () => {
      expect(isSafeLocalPanelTarget("view:runtime-diagnostics")).toBe(true);
      expect(isSafeLocalPanelTarget("view:memory-proposals")).toBe(true);
      expect(isSafeLocalPanelTarget("view:skill-requests")).toBe(true);
      expect(isSafeLocalPanelTarget("view:current-plan")).toBe(true);
      expect(isSafeLocalPanelTarget("view:routing-decisions")).toBe(true);
    });

    it("allows ui:notify", () => {
      expect(isSafeLocalPanelTarget("ui:notify")).toBe(true);
    });

    it("blocks unsafe targets", () => {
      expect(isSafeLocalPanelTarget("app:chrome")).toBe(false);
      expect(isSafeLocalPanelTarget("app:terminal")).toBe(false);
      expect(isSafeLocalPanelTarget("os:settings")).toBe(false);
      expect(isSafeLocalPanelTarget("file:write")).toBe(false);
      expect(isSafeLocalPanelTarget("browser:open")).toBe(false);
      expect(isSafeLocalPanelTarget("device:control")).toBe(false);
      expect(isSafeLocalPanelTarget("mcp:execute")).toBe(false);
      expect(isSafeLocalPanelTarget("wallet:transfer")).toBe(false);
      expect(isSafeLocalPanelTarget("network:request")).toBe(false);
      expect(isSafeLocalPanelTarget("shell:exec")).toBe(false);
    });
  });

  describe("getSafeLocalPanelLabel", () => {
    it("returns human-readable labels", () => {
      expect(getSafeLocalPanelLabel("panel:memory")).toBe("Memory Panel");
      expect(getSafeLocalPanelLabel("panel:control")).toBe("Control Panel");
      expect(getSafeLocalPanelLabel("view:runtime-diagnostics")).toBe("Runtime Diagnostics");
      expect(getSafeLocalPanelLabel("view:current-plan")).toBe("Current Plan");
    });
  });

  describe("getSafeLocalPanelEvent", () => {
    it("returns luca:open-right-panel for panel/view targets", () => {
      expect(getSafeLocalPanelEvent("panel:control")).toBe("luca:open-right-panel");
      expect(getSafeLocalPanelEvent("view:runtime-diagnostics")).toBe("luca:open-right-panel");
    });

    it("returns null for ui:notify", () => {
      expect(getSafeLocalPanelEvent("ui:notify")).toBeNull();
    });
  });

  describe("getTargetPanelTab", () => {
    it("maps panel targets to right-panel tabs", () => {
      expect(getTargetPanelTab("panel:control")).toBe("CONTROL");
      expect(getTargetPanelTab("panel:activity")).toBe("ACTIVITY");
      expect(getTargetPanelTab("panel:memory")).toBe("MEMORY");
      expect(getTargetPanelTab("panel:logs")).toBe("LOGS");
    });

    it("maps view targets to correct panels", () => {
      expect(getTargetPanelTab("view:runtime-diagnostics")).toBe("CONTROL");
      expect(getTargetPanelTab("view:memory-proposals")).toBe("MEMORY");
      expect(getTargetPanelTab("view:skill-requests")).toBe("ACTIVITY");
      expect(getTargetPanelTab("view:current-plan")).toBe("CONTROL");
      expect(getTargetPanelTab("view:routing-decisions")).toBe("LOGS");
    });
  });

  describe("normalizeSafeLocalPanelTarget", () => {
    it("normalizes 'open memory' to panel:memory", () => {
      expect(normalizeSafeLocalPanelTarget("open memory")).toBe("panel:memory");
    });

    it("normalizes 'show diagnostics' to view:runtime-diagnostics", () => {
      expect(normalizeSafeLocalPanelTarget("show diagnostics")).toBe("view:runtime-diagnostics");
    });

    it("normalizes 'show runtime diagnostics' to view:runtime-diagnostics", () => {
      expect(normalizeSafeLocalPanelTarget("show runtime diagnostics")).toBe("view:runtime-diagnostics");
    });

    it("normalizes 'show current plan' to view:current-plan", () => {
      expect(normalizeSafeLocalPanelTarget("show current plan")).toBe("view:current-plan");
    });

    it("normalizes 'show routing decisions' to view:routing-decisions", () => {
      expect(normalizeSafeLocalPanelTarget("show routing decisions")).toBe("view:routing-decisions");
    });

    it("normalizes 'show skill requests' to view:skill-requests", () => {
      expect(normalizeSafeLocalPanelTarget("show skill requests")).toBe("view:skill-requests");
    });

    it("returns null for blocked prefixes", () => {
      expect(normalizeSafeLocalPanelTarget("app:chrome")).toBeNull();
      expect(normalizeSafeLocalPanelTarget("shell:exec")).toBeNull();
    });

    it("returns null for unrecognized input", () => {
      expect(normalizeSafeLocalPanelTarget("do something random")).toBeNull();
    });
  });
});

describe("GovernedToolExecutionPolicy — safe panel targets", () => {
  it("allows panel:memory with open_panel and low risk", () => {
    const request = makeRequest({ requestedCapability: "open_panel", target: "panel:memory", riskLevel: "low" });
    const decision = evaluate(request);
    expect(decision.allowed).toBe(true);
    expect(decision.capability).toBe("open_panel");
  });

  it("allows view:runtime-diagnostics as open_panel", () => {
    const request = makeRequest({ requestedCapability: "open_panel", target: "view:runtime-diagnostics", riskLevel: "low" });
    const decision = evaluate(request);
    expect(decision.allowed).toBe(true);
    expect(decision.capability).toBe("open_panel");
  });

  it("blocks panel target if risk is high", () => {
    const request = makeRequest({ requestedCapability: "open_panel", target: "panel:memory", riskLevel: "high" });
    const decision = evaluate(request);
    expect(decision.allowed).toBe(false);
    expect(decision.blockedBy).toContain("elevated_risk");
  });

  it("blocks unknown panel targets", () => {
    expect(isAllowedTarget("panel:unknown-panel")).toBe(false);
  });

  it("blocks unsafe targets: shell, file, browser, device, wallet, network, mcp", () => {
    expect(isAllowedTarget("shell:exec")).toBe(false);
    expect(isAllowedTarget("file:write")).toBe(false);
    expect(isAllowedTarget("browser:open")).toBe(false);
    expect(isAllowedTarget("device:control")).toBe(false);
    expect(isAllowedTarget("wallet:transfer")).toBe(false);
    expect(isAllowedTarget("network:request")).toBe(false);
  });

  it("allows view: targets in allowlist", () => {
    expect(isAllowedTarget("view:runtime-diagnostics")).toBe(true);
    expect(isAllowedTarget("view:memory-proposals")).toBe(true);
    expect(isAllowedTarget("view:current-plan")).toBe(true);
  });
});

describe("IntentRoutingPolicy — local panel phrase mapping", () => {
  it("maps 'open memory' to safe_local_action signal", () => {
    const signals = detectSignals("open memory");
    expect(signals).toContain("safe_local_action");
  });

  it("maps 'show diagnostics' to safe_local_action signal", () => {
    const signals = detectSignals("show diagnostics");
    expect(signals).toContain("safe_local_action");
  });

  it("routes 'open memory' to safe_execution_request", () => {
    const signals = detectSignals("open memory");
    const route = chooseRoute("auto", signals, "safe");
    expect(route).toBe("safe_execution_request");
  });

  it("routes 'show runtime diagnostics' to safe_execution_request", () => {
    const signals = detectSignals("show runtime diagnostics");
    const route = chooseRoute("auto", signals, "safe");
    expect(route).toBe("safe_execution_request");
  });

  it("detectLocalPanelTarget returns panel:memory for 'open memory'", () => {
    expect(detectLocalPanelTarget("open memory")).toBe("panel:memory");
  });

  it("detectLocalPanelTarget returns view:runtime-diagnostics for 'show diagnostics'", () => {
    expect(detectLocalPanelTarget("show diagnostics")).toBe("view:runtime-diagnostics");
  });

  it("detectLocalPanelTarget returns null for unrelated message", () => {
    expect(detectLocalPanelTarget("hello how are you")).toBeNull();
  });

  it("does not route normal chat into panel action", () => {
    const signals = detectSignals("what is the weather today?");
    expect(signals).not.toContain("safe_local_action");
  });
});

describe("Governed execution — route without approval does not open panel", () => {
  it("request in approval_required status cannot execute", () => {
    const request = makeRequest({ status: "approval_required", target: "panel:memory" });
    const decision = evaluate(request);
    expect(decision.allowed).toBe(false);
    expect(decision.blockedBy).toContain("approval_not_granted");
  });
});
