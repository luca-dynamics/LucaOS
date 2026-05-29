import { describe, expect, it, vi } from "vitest";
import { ProvenanceGateService } from "../provenance/ProvenanceGateService";
import { ApprovalRequestCenterService } from "../provenance/ApprovalRequestCenterService";
import { GovernedActionRequestService } from "./GovernedActionRequestService";
import { GovernedToolExecutionService } from "./GovernedToolExecutionService";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

function createTestStack() {
  const storage = new MemoryStorage();
  const provenance = new ProvenanceGateService(storage);
  const inboxEvents: unknown[] = [];
  const inbox = {
    ingestEvent: vi.fn((event: unknown) => { inboxEvents.push(event); return { inboxEventId: `inbox:test:${Date.now()}`, ...(event as Record<string, unknown>) } as any; }),
    getUnreadCount: vi.fn(() => 0),
    getDiagnosticsSummary: vi.fn(() => ({ totalEvents: 0, unreadEvents: 0, archivedEvents: 0, externalInertEvents: 0, approvalEvents: 0 })),
  };
  const approvals = new ApprovalRequestCenterService({ storage, provenance, inbox });
  const requests = new GovernedActionRequestService({ storage, provenance, approvals, inbox });
  const busEvents: unknown[] = [];
  const bus = {
    emitEvent: vi.fn((event: unknown) => busEvents.push(event)),
    emit: vi.fn(),
  };
  const diagnostics = { getAudience: vi.fn(() => "normal") };
  const memoryGovernance = { getDiagnosticsSummary: vi.fn(() => ({ totalRecords: 5, quarantinedRecords: 0, pendingReviewRecords: 1 })) };
  const sessions = { getDiagnosticsSummary: vi.fn(() => ({ totalSessions: 2, activeSessions: 1, resumableSessions: 1 })) };
  const executionService = new GovernedToolExecutionService({
    storage,
    requests,
    approvals,
    provenance,
    inbox,
    bus,
    diagnostics,
    memoryGovernance,
    sessions,
  });
  return { storage, provenance, inbox, approvals, requests, bus, executionService, inboxEvents, busEvents };
}

function createSafeApprovedRequest(stack: ReturnType<typeof createTestStack>) {
  const prov = stack.provenance.createProvenanceRecord({
    sourceType: "tool_action",
    sourceId: "test-tool",
    sourceTrustLevel: "local",
    createdBy: "test",
  });
  const request = stack.requests.createRequest({
    kind: "tool",
    title: "Show notification",
    description: "Display a safe notification",
    requestedCapability: "notify",
    target: "notification",
    provenanceIds: [prov.provenanceId],
    riskLevel: "low",
    createApprovalRequest: true,
  });
  stack.approvals.approveOnce(request.approvalRequestId!);
  stack.requests.markApprovedWaitingExecution(request.requestId);
  return { request, prov };
}

describe("GovernedToolExecutionService", () => {
  it("safe notify request can execute after approved_once and consumes approval exactly once", () => {
    const stack = createTestStack();
    const { request } = createSafeApprovedRequest(stack);

    const canExec = stack.executionService.canExecuteRequest(request.requestId);
    expect(canExec.allowed).toBe(true);
    expect(canExec.capability).toBe("notify");

    const result = stack.executionService.executeApprovedRequest(request.requestId);
    expect(result.status).toBe("succeeded");
    expect(result.consumedApproval).toBe(true);
    expect(result.resultSummary).toContain("Notification delivered");

    const secondResult = stack.executionService.executeApprovedRequest(request.requestId);
    expect(secondResult.status).toBe("failed");
    expect(secondResult.errorMessage).toContain("already been executed");
  });

  it("safe runtime_read returns sanitized diagnostics summary", () => {
    const stack = createTestStack();
    const prov = stack.provenance.createProvenanceRecord({
      sourceType: "tool_action",
      sourceId: "test-tool",
      sourceTrustLevel: "local",
      createdBy: "test",
    });
    const request = stack.requests.createRequest({
      kind: "tool",
      title: "Read runtime diagnostics",
      description: "Get runtime status",
      requestedCapability: "runtime_read",
      target: "runtime:diagnostics",
      provenanceIds: [prov.provenanceId],
      riskLevel: "low",
    });
    stack.approvals.approveOnce(request.approvalRequestId!);
    stack.requests.markApprovedWaitingExecution(request.requestId);

    const result = stack.executionService.executeApprovedRequest(request.requestId);
    expect(result.status).toBe("succeeded");
    expect(result.resultSummary).toContain("Runtime diagnostics");
  });

  it("safe open_panel dispatches only allowlisted local event", () => {
    const stack = createTestStack();
    const prov = stack.provenance.createProvenanceRecord({
      sourceType: "tool_action",
      sourceId: "test-tool",
      sourceTrustLevel: "local",
      createdBy: "test",
    });
    const request = stack.requests.createRequest({
      kind: "tool",
      title: "Open activity panel",
      description: "Open the activity panel",
      requestedCapability: "open_panel",
      target: "panel:activity",
      provenanceIds: [prov.provenanceId],
      riskLevel: "low",
    });
    stack.approvals.approveOnce(request.approvalRequestId!);
    stack.requests.markApprovedWaitingExecution(request.requestId);

    const result = stack.executionService.executeApprovedRequest(request.requestId);
    expect(result.status).toBe("succeeded");
    expect(result.resultSummary).toContain("Panel opened");
  });

  it("risky shell request blocked even if approved", () => {
    const stack = createTestStack();
    const prov = stack.provenance.createProvenanceRecord({
      sourceType: "tool_action",
      sourceId: "test-tool",
      sourceTrustLevel: "local",
      createdBy: "test",
    });
    const request = stack.requests.createRequest({
      kind: "shell",
      title: "Execute shell command",
      description: "Run a dangerous shell command",
      requestedCapability: "shell",
      target: "shell:exec",
      provenanceIds: [prov.provenanceId],
      riskLevel: "high",
    });
    stack.approvals.approveOnce(request.approvalRequestId!);
    stack.requests.markApprovedWaitingExecution(request.requestId);

    const result = stack.executionService.executeApprovedRequest(request.requestId);
    expect(result.status).toBe("blocked");
    expect(result.consumedApproval).toBe(false);
  });

  it("network/filesystem/wallet/trade/delete targets blocked", () => {
    const stack = createTestStack();
    const targets = ["wallet:send", "trade:buy", "delete:all", "file:write", "network:api"];
    for (const target of targets) {
      const prov = stack.provenance.createProvenanceRecord({
        sourceType: "tool_action",
        sourceId: `test-${target}`,
        sourceTrustLevel: "local",
        createdBy: "test",
      });
      const request = stack.requests.createRequest({
        kind: "tool",
        title: `Action targeting ${target}`,
        description: `Dangerous action targeting ${target}`,
        requestedCapability: "notify",
        target,
        provenanceIds: [prov.provenanceId],
        riskLevel: "low",
      });
      stack.approvals.approveOnce(request.approvalRequestId!);
      stack.requests.markApprovedWaitingExecution(request.requestId);

      const result = stack.executionService.executeApprovedRequest(request.requestId);
      expect(result.status).toBe("blocked");
    }
  });

  it("missing provenance blocks execution", () => {
    const stack = createTestStack();
    const prov = stack.provenance.createProvenanceRecord({
      sourceType: "tool_action",
      sourceId: "test-tool",
      sourceTrustLevel: "local",
      createdBy: "test",
    });
    const request = stack.requests.createRequest({
      kind: "tool",
      title: "Test action",
      description: "Test",
      requestedCapability: "notify",
      target: "notification",
      provenanceIds: [prov.provenanceId],
      riskLevel: "low",
    });
    stack.approvals.approveOnce(request.approvalRequestId!);
    stack.requests.markApprovedWaitingExecution(request.requestId);

    // Revoke provenance
    stack.provenance.revoke(prov.provenanceId);

    const result = stack.executionService.executeApprovedRequest(request.requestId);
    expect(result.status).toBe("blocked");
    expect(result.blockedBy).toBeDefined();
  });

  it("quarantined provenance blocks execution", () => {
    const stack = createTestStack();
    const prov = stack.provenance.createProvenanceRecord({
      sourceType: "tool_action",
      sourceId: "test-tool",
      sourceTrustLevel: "local",
      createdBy: "test",
    });
    const request = stack.requests.createRequest({
      kind: "tool",
      title: "Test action",
      description: "Test",
      requestedCapability: "notify",
      target: "notification",
      provenanceIds: [prov.provenanceId],
      riskLevel: "low",
    });
    stack.approvals.approveOnce(request.approvalRequestId!);
    stack.requests.markApprovedWaitingExecution(request.requestId);

    stack.provenance.quarantine(prov.provenanceId);

    const result = stack.executionService.executeApprovedRequest(request.requestId);
    expect(result.status).toBe("blocked");
  });

  it("approval and execution are separate: approving does not execute", () => {
    const stack = createTestStack();
    const prov = stack.provenance.createProvenanceRecord({
      sourceType: "tool_action",
      sourceId: "test-tool",
      sourceTrustLevel: "local",
      createdBy: "test",
    });
    const request = stack.requests.createRequest({
      kind: "tool",
      title: "Test action",
      description: "Test",
      requestedCapability: "notify",
      target: "notification",
      provenanceIds: [prov.provenanceId],
      riskLevel: "low",
    });

    stack.approvals.approveOnce(request.approvalRequestId!);
    const executions = stack.executionService.listExecutions();
    expect(executions.length).toBe(0);
  });

  it("result creates inbox event", () => {
    const stack = createTestStack();
    const { request } = createSafeApprovedRequest(stack);

    const inboxCallsBefore = stack.inbox.ingestEvent.mock.calls.length;
    stack.executionService.executeApprovedRequest(request.requestId);
    const inboxCallsAfter = stack.inbox.ingestEvent.mock.calls.length;
    expect(inboxCallsAfter).toBeGreaterThan(inboxCallsBefore);
  });

  it("succeeded execution emits bus event", () => {
    const stack = createTestStack();
    const { request } = createSafeApprovedRequest(stack);

    stack.executionService.executeApprovedRequest(request.requestId);
    const succeededEvents = stack.busEvents.filter((e: any) => e.type === "governed_execution_succeeded");
    expect(succeededEvents.length).toBeGreaterThan(0);
  });

  it("blocked execution emits bus event", () => {
    const stack = createTestStack();
    const prov = stack.provenance.createProvenanceRecord({
      sourceType: "tool_action",
      sourceId: "test-tool",
      sourceTrustLevel: "local",
      createdBy: "test",
    });
    const request = stack.requests.createRequest({
      kind: "shell",
      title: "Shell action",
      description: "Dangerous",
      requestedCapability: "shell",
      target: "shell:exec",
      provenanceIds: [prov.provenanceId],
      riskLevel: "high",
    });
    stack.approvals.approveOnce(request.approvalRequestId!);
    stack.requests.markApprovedWaitingExecution(request.requestId);

    stack.executionService.executeApprovedRequest(request.requestId);
    const blockedEvents = stack.busEvents.filter((e: any) => e.type === "governed_execution_blocked");
    expect(blockedEvents.length).toBeGreaterThan(0);
  });

  it("secrets in parametersPreview are redacted in execution request", () => {
    const stack = createTestStack();
    const prov = stack.provenance.createProvenanceRecord({
      sourceType: "tool_action",
      sourceId: "test-tool",
      sourceTrustLevel: "local",
      createdBy: "test",
    });
    const request = stack.requests.createRequest({
      kind: "tool",
      title: "Action with secrets",
      description: "Has secret params",
      requestedCapability: "notify",
      target: "notification",
      parametersPreview: { apiKey: "sk-secret123", name: "test" },
      provenanceIds: [prov.provenanceId],
      riskLevel: "low",
    });
    stack.approvals.approveOnce(request.approvalRequestId!);
    stack.requests.markApprovedWaitingExecution(request.requestId);

    const result = stack.executionService.executeApprovedRequest(request.requestId);
    expect(result.status).toBe("blocked");
    expect(result.blockedBy).toContain("secret_in_parameters");
  });

  it("diagnostics summary reflects execution counts", () => {
    const stack = createTestStack();
    const { request } = createSafeApprovedRequest(stack);
    stack.executionService.executeApprovedRequest(request.requestId);

    const summary = stack.executionService.getDiagnosticsSummary();
    expect(summary.totalExecutions).toBeGreaterThan(0);
    expect(summary.safeExecutionEnabled).toBe(true);
    expect(summary.riskyExecutionEnabled).toBe(false);
  });

  it("localStorage max-size trimming works", () => {
    const stack = createTestStack();
    for (let i = 0; i < 5; i++) {
      const { request } = createSafeApprovedRequest(stack);
      stack.executionService.executeApprovedRequest(request.requestId);
    }
    stack.executionService.clearOldExecutions(2);
    expect(stack.executionService.listExecutions().length).toBeLessThanOrEqual(2);
  });

  it("canExecuteRequest returns false for non-existent request", () => {
    const stack = createTestStack();
    const result = stack.executionService.canExecuteRequest("nonexistent");
    expect(result.allowed).toBe(false);
  });

  it("dry_run_confirm capability works", () => {
    const stack = createTestStack();
    const prov = stack.provenance.createProvenanceRecord({
      sourceType: "tool_action",
      sourceId: "test-tool",
      sourceTrustLevel: "local",
      createdBy: "test",
    });
    const request = stack.requests.createRequest({
      kind: "tool",
      title: "Dry run confirm",
      description: "Confirm dry run",
      requestedCapability: "dry_run_confirm",
      target: "dry-run:confirm",
      provenanceIds: [prov.provenanceId],
      riskLevel: "low",
    });
    stack.approvals.approveOnce(request.approvalRequestId!);
    stack.requests.markApprovedWaitingExecution(request.requestId);

    const result = stack.executionService.executeApprovedRequest(request.requestId);
    expect(result.status).toBe("succeeded");
    expect(result.resultSummary).toContain("Dry-run confirmed");
  });

  it("inbox_read capability works", () => {
    const stack = createTestStack();
    const prov = stack.provenance.createProvenanceRecord({
      sourceType: "tool_action",
      sourceId: "test-tool",
      sourceTrustLevel: "local",
      createdBy: "test",
    });
    const request = stack.requests.createRequest({
      kind: "tool",
      title: "Read inbox",
      description: "Read inbox summary",
      requestedCapability: "inbox_read",
      target: "inbox:summary",
      provenanceIds: [prov.provenanceId],
      riskLevel: "low",
    });
    stack.approvals.approveOnce(request.approvalRequestId!);
    stack.requests.markApprovedWaitingExecution(request.requestId);

    const result = stack.executionService.executeApprovedRequest(request.requestId);
    expect(result.status).toBe("succeeded");
    expect(result.resultSummary).toContain("Inbox summary");
  });

  it("approval consumption failure blocks execution and does not dispatch", () => {
    const stack = createTestStack();
    const { request } = createSafeApprovedRequest(stack);

    const result1 = stack.executionService.executeApprovedRequest(request.requestId);
    expect(result1.status).toBe("succeeded");
    expect(result1.consumedApproval).toBe(true);

    const prov2 = stack.provenance.createProvenanceRecord({
      sourceType: "tool_action",
      sourceId: "test-tool-2",
      sourceTrustLevel: "local",
      createdBy: "test",
    });
    const request2 = stack.requests.createRequest({
      kind: "tool",
      title: "Second notify",
      description: "Another notification",
      requestedCapability: "notify",
      target: "notification",
      provenanceIds: [prov2.provenanceId],
      riskLevel: "low",
    });
    stack.approvals.approveOnce(request2.approvalRequestId!);
    stack.requests.markApprovedWaitingExecution(request2.requestId);

    stack.approvals.revoke(request2.approvalRequestId!);

    const result2 = stack.executionService.executeApprovedRequest(request2.requestId);
    expect(result2.status).toBe("blocked");
    expect(result2.consumedApproval).toBe(false);
  });

  it("approved_waiting_execution request that fails policy does not qualify as executable", () => {
    const stack = createTestStack();
    const prov = stack.provenance.createProvenanceRecord({
      sourceType: "tool_action",
      sourceId: "test-tool",
      sourceTrustLevel: "local",
      createdBy: "test",
    });
    const request = stack.requests.createRequest({
      kind: "tool",
      title: "Action with secrets",
      description: "Has secret params",
      requestedCapability: "notify",
      target: "notification",
      parametersPreview: { token: "secret-value" },
      provenanceIds: [prov.provenanceId],
      riskLevel: "low",
    });
    stack.approvals.approveOnce(request.approvalRequestId!);
    stack.requests.markApprovedWaitingExecution(request.requestId);

    const canExec = stack.executionService.canExecuteRequest(request.requestId);
    expect(canExec.allowed).toBe(false);
  });

  it("approval sync marks governed request approved_waiting_execution", () => {
    const stack = createTestStack();
    const prov = stack.provenance.createProvenanceRecord({
      sourceType: "tool_action",
      sourceId: "test-tool",
      sourceTrustLevel: "local",
      createdBy: "test",
    });
    const request = stack.requests.createRequest({
      kind: "tool",
      title: "Notify action",
      description: "Send notification",
      requestedCapability: "notify",
      target: "notification",
      provenanceIds: [prov.provenanceId],
      riskLevel: "low",
    });

    expect(request.status).toBe("approval_required");
    stack.approvals.approveOnce(request.approvalRequestId!);

    const approval = stack.approvals.getRequest(request.approvalRequestId!);
    expect(approval).toBeDefined();
    expect(approval!.sourceType).toBe("tool");

    if (approval!.sourceType === "tool" && approval!.sourceId) {
      const governed = stack.requests.getRequest(approval!.sourceId);
      if (governed && governed.status === "approval_required") {
        stack.requests.markApprovedWaitingExecution(approval!.sourceId);
      }
    }

    const updated = stack.requests.getRequest(request.requestId);
    expect(updated?.status).toBe("approved_waiting_execution");

    const executions = stack.executionService.listExecutions();
    expect(executions.length).toBe(0);
  });

  it("approval still does not execute automatically after sync", () => {
    const stack = createTestStack();
    const { request } = createSafeApprovedRequest(stack);

    const executionsBefore = stack.executionService.listExecutions();
    expect(executionsBefore.length).toBe(0);

    const updatedRequest = stack.requests.getRequest(request.requestId);
    expect(updatedRequest?.status).toBe("approved_waiting_execution");
  });
});
