import { describe, expect, it } from "vitest";
import { evaluate, mapCapability, isAllowedTarget, sanitizePreview } from "./GovernedToolExecutionPolicy";
import type { GovernedActionRequest } from "../../types/governedActionRequest";

function makeRequest(overrides: Partial<GovernedActionRequest> = {}): GovernedActionRequest {
  return {
    requestId: "governed-request:test:2026-01-01T00:00:00.000Z",
    kind: "tool",
    title: "Test action",
    description: "A test governed action request",
    requestedCapability: "notify",
    target: "notification",
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

describe("GovernedToolExecutionPolicy", () => {
  describe("evaluate", () => {
    it("allows safe notify request in approved_waiting_execution state", () => {
      const request = makeRequest();
      const decision = evaluate(request);
      expect(decision.allowed).toBe(true);
      expect(decision.capability).toBe("notify");
      expect(decision.riskLevel).toBe("low");
      expect(decision.blockedBy).toEqual([]);
    });

    it("allows safe runtime_read request", () => {
      const request = makeRequest({ requestedCapability: "runtime_read", target: "runtime:diagnostics" });
      const decision = evaluate(request);
      expect(decision.allowed).toBe(true);
      expect(decision.capability).toBe("runtime_read");
    });

    it("allows safe open_panel request", () => {
      const request = makeRequest({ requestedCapability: "open_panel", target: "panel:activity" });
      const decision = evaluate(request);
      expect(decision.allowed).toBe(true);
      expect(decision.capability).toBe("open_panel");
    });

    it("allows safe memory_read request", () => {
      const request = makeRequest({ requestedCapability: "memory_read", target: "memory:summary" });
      const decision = evaluate(request);
      expect(decision.allowed).toBe(true);
      expect(decision.capability).toBe("memory_read");
    });

    it("allows safe inbox_read request", () => {
      const request = makeRequest({ requestedCapability: "inbox_read", target: "inbox:unread" });
      const decision = evaluate(request);
      expect(decision.allowed).toBe(true);
      expect(decision.capability).toBe("inbox_read");
    });

    it("allows safe session_read request", () => {
      const request = makeRequest({ requestedCapability: "session_read", target: "session:summary" });
      const decision = evaluate(request);
      expect(decision.allowed).toBe(true);
      expect(decision.capability).toBe("session_read");
    });

    it("allows dry_run_confirm request", () => {
      const request = makeRequest({ requestedCapability: "dry_run_confirm", target: "dry-run:confirm" });
      const decision = evaluate(request);
      expect(decision.allowed).toBe(true);
      expect(decision.capability).toBe("dry_run_confirm");
    });

    it("blocks risky shell request even if approved", () => {
      const request = makeRequest({ kind: "shell", requestedCapability: "shell", target: "shell:exec" });
      const decision = evaluate(request);
      expect(decision.allowed).toBe(false);
      expect(decision.blockedBy).toContain("unmapped_capability");
    });

    it("blocks network request", () => {
      const request = makeRequest({ kind: "network", requestedCapability: "network", target: "network:api" });
      const decision = evaluate(request);
      expect(decision.allowed).toBe(false);
    });

    it("blocks filesystem request", () => {
      const request = makeRequest({ kind: "filesystem", requestedCapability: "filesystem", target: "file:/tmp/test" });
      const decision = evaluate(request);
      expect(decision.allowed).toBe(false);
    });

    it("blocks wallet/trade/transfer targets", () => {
      for (const target of ["wallet:send", "trade:buy", "transfer:funds"]) {
        const request = makeRequest({ target });
        const decision = evaluate(request);
        expect(decision.allowed).toBe(false);
        expect(decision.blockedBy).toContain("disallowed_target");
      }
    });

    it("blocks delete/write/browser/device targets", () => {
      for (const target of ["delete:all", "write:file", "browser:navigate", "device:control"]) {
        const request = makeRequest({ target });
        const decision = evaluate(request);
        expect(decision.allowed).toBe(false);
        expect(decision.blockedBy).toContain("disallowed_target");
      }
    });

    it("blocks elevated/high/critical risk", () => {
      for (const riskLevel of ["medium", "high", "critical"] as const) {
        const request = makeRequest({ riskLevel });
        const decision = evaluate(request);
        expect(decision.allowed).toBe(false);
        expect(decision.blockedBy).toContain("elevated_risk");
      }
    });

    it("blocks missing provenance", () => {
      const request = makeRequest({ provenanceIds: [] });
      const decision = evaluate(request);
      expect(decision.allowed).toBe(false);
      expect(decision.blockedBy).toContain("missing_provenance");
    });

    it("blocks rejected requests", () => {
      const request = makeRequest({ status: "rejected" });
      const decision = evaluate(request);
      expect(decision.allowed).toBe(false);
      expect(decision.blockedBy).toContain("request_terminal_state");
    });

    it("blocks expired requests", () => {
      const request = makeRequest({ status: "expired" });
      const decision = evaluate(request);
      expect(decision.allowed).toBe(false);
      expect(decision.blockedBy).toContain("request_terminal_state");
    });

    it("blocks approval_required requests that are not approved_waiting_execution", () => {
      const request = makeRequest({ status: "approval_required" });
      const decision = evaluate(request);
      expect(decision.allowed).toBe(false);
      expect(decision.blockedBy).toContain("approval_not_granted");
    });

    it("blocks parameters containing secret-like keys", () => {
      const request = makeRequest({ parametersPreview: { apiKey: "sk-test123" } });
      const decision = evaluate(request);
      expect(decision.allowed).toBe(false);
      expect(decision.blockedBy).toContain("secret_in_parameters");
    });

    it("blocks parameters containing token keys", () => {
      const request = makeRequest({ parametersPreview: { token: "abc" } });
      const decision = evaluate(request);
      expect(decision.allowed).toBe(false);
      expect(decision.blockedBy).toContain("secret_in_parameters");
    });

    it("blocks MCP target", () => {
      const request = makeRequest({ target: "mcp:server" });
      const decision = evaluate(request);
      expect(decision.allowed).toBe(false);
      expect(decision.blockedBy).toContain("disallowed_target");
    });
  });

  describe("mapCapability", () => {
    it("maps notify capability", () => {
      expect(mapCapability(makeRequest({ requestedCapability: "notify" }))).toBe("notify");
    });

    it("maps notification to notify", () => {
      expect(mapCapability(makeRequest({ requestedCapability: "notification" }))).toBe("notify");
    });

    it("maps panel target to open_panel", () => {
      expect(mapCapability(makeRequest({ requestedCapability: "unknown", target: "panel:control" }))).toBe("open_panel");
    });

    it("maps runtime target to runtime_read", () => {
      expect(mapCapability(makeRequest({ requestedCapability: "unknown", target: "runtime:diagnostics" }))).toBe("runtime_read");
    });

    it("maps memory target to memory_read", () => {
      expect(mapCapability(makeRequest({ requestedCapability: "unknown", target: "memory:summary" }))).toBe("memory_read");
    });

    it("returns null for unmapped capability", () => {
      expect(mapCapability(makeRequest({ requestedCapability: "execute_shell", target: "shell:bash" }))).toBeNull();
    });
  });

  describe("isAllowedTarget", () => {
    it("allows known safe targets", () => {
      expect(isAllowedTarget("notification")).toBe(true);
      expect(isAllowedTarget("inbox")).toBe(true);
      expect(isAllowedTarget("panel:control")).toBe(true);
      expect(isAllowedTarget("panel:activity")).toBe(true);
      expect(isAllowedTarget("panel:memory")).toBe(true);
      expect(isAllowedTarget("panel:logs")).toBe(true);
      expect(isAllowedTarget("panel:model-manager")).toBe(true);
      expect(isAllowedTarget("runtime:diagnostics")).toBe(true);
      expect(isAllowedTarget("memory:summary")).toBe(true);
      expect(isAllowedTarget("dry-run:confirm")).toBe(true);
    });

    it("blocks dangerous targets", () => {
      expect(isAllowedTarget("wallet:send")).toBe(false);
      expect(isAllowedTarget("shell:exec")).toBe(false);
      expect(isAllowedTarget("file:write")).toBe(false);
      expect(isAllowedTarget("browser:navigate")).toBe(false);
      expect(isAllowedTarget("device:control")).toBe(false);
    });
  });

  describe("sanitizePreview", () => {
    it("redacts secret-like keys", () => {
      const result = sanitizePreview({ apiKey: "sk-abc123", name: "test" });
      expect(result.apiKey).toBe("[redacted]");
      expect(result.name).toBe("test");
    });

    it("redacts token/password/mnemonic keys", () => {
      const result = sanitizePreview({ token: "x", password: "y", mnemonic: "z" });
      expect(result.token).toBe("[redacted]");
      expect(result.password).toBe("[redacted]");
      expect(result.mnemonic).toBe("[redacted]");
    });

    it("truncates long strings", () => {
      const longString = "a".repeat(1000);
      const result = sanitizePreview({ value: longString });
      expect((result.value as string).length).toBeLessThanOrEqual(500);
    });

    it("limits entries to 30", () => {
      const input: Record<string, unknown> = {};
      for (let i = 0; i < 50; i++) {
        input[`key${i}`] = `value${i}`;
      }
      const result = sanitizePreview(input);
      expect(Object.keys(result).length).toBeLessThanOrEqual(30);
    });
  });
});
