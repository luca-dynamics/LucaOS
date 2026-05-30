import { describe, expect, it } from "vitest";
import {
  getGatewayCapabilityLabel,
  getGatewayCredentialBoundaryText,
  getGatewayFutureReadinessText,
  getGatewayNextAction,
  getGatewayNoExecutionText,
  getGatewayPermissionMatrix,
  getGatewayPermissionSummary,
  getGatewayRiskLabel,
  getGatewayRiskTone,
  getGatewaySafeguardLabels,
  getGatewayStatusLabel,
  getGatewayStatusTone,
  getGatewaySurfaceLabel,
} from "./gatewayPermissionLabels";
import type {
  GatewayPolicyDecision,
  GatewayRequestRecord,
} from "../../types/browserDesktopGateway";

const buildPolicyDecision = (overrides: Partial<GatewayPolicyDecision> = {}): GatewayPolicyDecision => ({
  allowedForDryRun: true,
  allowedForExecution: false,
  riskLevel: "elevated",
  surface: "browser",
  capability: "browser_click",
  blockedBy: [],
  userSafeReason: "test reason",
  requiresApproval: true,
  requiresSandbox: true,
  requiresHumanConfirmation: true,
  requiresCredentialBoundary: false,
  requiresAuditLog: true,
  ...overrides,
});

const buildRecord = (overrides: Partial<GatewayRequestRecord> = {}): GatewayRequestRecord => {
  const policyDecision = overrides.policyDecision ?? buildPolicyDecision();
  return {
    gatewayRequestId: "gateway-request:test",
    title: "Test gateway",
    summary: "Test summary",
    source: "test",
    surface: policyDecision.surface,
    capability: policyDecision.capability,
    status: "dry_run_only",
    riskLevel: policyDecision.riskLevel,
    policyDecision,
    provenanceIds: [],
    createdAt: "2026-05-29T00:00:00.000Z",
    updatedAt: "2026-05-29T00:00:00.000Z",
    metadata: {},
    ...overrides,
  };
};

describe("gatewayPermissionLabels", () => {
  it("maps surfaces to labels", () => {
    expect(getGatewaySurfaceLabel("browser")).toBe("Browser");
    expect(getGatewaySurfaceLabel("desktop")).toBe("Desktop");
    expect(getGatewaySurfaceLabel("device")).toBe("Device");
    expect(getGatewaySurfaceLabel("screen")).toBe("Screen");
    expect(getGatewaySurfaceLabel("app")).toBe("App");
    expect(getGatewaySurfaceLabel("file")).toBe("File");
    expect(getGatewaySurfaceLabel("network")).toBe("Network");
    expect(getGatewaySurfaceLabel("wallet")).toBe("Wallet");
    expect(getGatewaySurfaceLabel("mcp")).toBe("MCP");
    expect(getGatewaySurfaceLabel("unknown")).toBe("Unknown surface");
  });

  it("maps capabilities to labels", () => {
    expect(getGatewayCapabilityLabel("observe_screen")).toBe("Observe screen");
    expect(getGatewayCapabilityLabel("read_dom")).toBe("Read DOM");
    expect(getGatewayCapabilityLabel("browser_click")).toBe("Browser click");
    expect(getGatewayCapabilityLabel("desktop_open_app")).toBe("Open desktop app");
    expect(getGatewayCapabilityLabel("file_delete")).toBe("Delete file");
    expect(getGatewayCapabilityLabel("wallet_transaction")).toBe("Wallet transaction");
    expect(getGatewayCapabilityLabel("mcp_call")).toBe("MCP call");
    expect(getGatewayCapabilityLabel("unknown")).toBe("Unknown capability");
  });

  it("maps statuses to labels and tones", () => {
    expect(getGatewayStatusLabel("dry_run_only")).toBe("Dry-run only");
    expect(getGatewayStatusLabel("blocked")).toBe("Blocked for safety");
    expect(getGatewayStatusLabel("waiting_user")).toBe("Waiting for clarification");
    expect(getGatewayStatusLabel("proposed")).toBe("Proposed");
    expect(getGatewayStatusLabel("archived")).toBe("Archived");

    expect(getGatewayStatusTone("dry_run_only")).toBe("warn");
    expect(getGatewayStatusTone("blocked")).toBe("danger");
    expect(getGatewayStatusTone("waiting_user")).toBe("warn");
    expect(getGatewayStatusTone("proposed")).toBe("info");
    expect(getGatewayStatusTone("archived")).toBe("neutral");
  });

  it("maps risk levels to labels and tones", () => {
    expect(getGatewayRiskLabel("safe")).toBe("Safe");
    expect(getGatewayRiskLabel("low")).toBe("Low risk");
    expect(getGatewayRiskLabel("elevated")).toBe("Elevated risk");
    expect(getGatewayRiskLabel("high")).toBe("High risk");
    expect(getGatewayRiskLabel("critical")).toBe("Critical risk");

    expect(getGatewayRiskTone("safe")).toBe("good");
    expect(getGatewayRiskTone("low")).toBe("good");
    expect(getGatewayRiskTone("elevated")).toBe("warn");
    expect(getGatewayRiskTone("high")).toBe("danger");
    expect(getGatewayRiskTone("critical")).toBe("danger");
  });

  it("returns the full safeguard checklist with the policy's required flags", () => {
    const labels = getGatewaySafeguardLabels(buildPolicyDecision({
      requiresApproval: true,
      requiresSandbox: true,
      requiresHumanConfirmation: true,
      requiresCredentialBoundary: false,
      requiresAuditLog: true,
    }));
    const byKey = Object.fromEntries(labels.map((entry) => [entry.key, entry]));
    expect(labels.map((entry) => entry.key)).toEqual([
      "requiresApproval",
      "requiresSandbox",
      "requiresHumanConfirmation",
      "requiresCredentialBoundary",
      "requiresAuditLog",
    ]);
    expect(byKey.requiresApproval.label).toBe("Approval required");
    expect(byKey.requiresSandbox.label).toBe("Sandbox required");
    expect(byKey.requiresHumanConfirmation.label).toBe("Human confirmation required");
    expect(byKey.requiresCredentialBoundary.label).toBe("Credential boundary required");
    expect(byKey.requiresAuditLog.label).toBe("Audit log required");
    expect(byKey.requiresCredentialBoundary.required).toBe(false);
    expect(byKey.requiresApproval.required).toBe(true);
  });

  it("renders a permission summary that combines surface, capability, and status", () => {
    const record = buildRecord({ surface: "browser", capability: "browser_click", status: "dry_run_only" });
    expect(getGatewayPermissionSummary(record)).toBe("Browser · Browser click · Dry-run only");
  });

  it("keeps no-execution copy explicit about gateway control being disabled", () => {
    const copy = getGatewayNoExecutionText();
    expect(copy).toContain("gateway control is disabled");
    expect(copy).toContain("approval");
    expect(copy).toContain("sandbox");
    expect(copy).toContain("human confirmation");
    expect(copy).toContain("credential boundaries");
    expect(copy).toContain("audit logging");
  });

  it("future-readiness copy reflects record status", () => {
    expect(
      getGatewayFutureReadinessText(buildRecord({ status: "blocked" })),
    ).toContain("not eligible");
    expect(
      getGatewayFutureReadinessText(buildRecord({ status: "archived" })),
    ).toContain("not applicable");
    expect(
      getGatewayFutureReadinessText(buildRecord({ status: "dry_run_only", surface: "browser" })),
    ).toContain("browser control would require");
  });

  it("credential boundary copy never claims credentials would be captured", () => {
    const required = getGatewayCredentialBoundaryText(
      buildRecord({ policyDecision: buildPolicyDecision({ requiresCredentialBoundary: true }) }),
    );
    const notRequired = getGatewayCredentialBoundaryText(
      buildRecord({ policyDecision: buildPolicyDecision({ requiresCredentialBoundary: false }) }),
    );
    expect(required).toContain("Credential boundary: required");
    expect(required.toLowerCase()).toMatch(/never|ever be captured|no credentials/);
    expect(notRequired).toContain("Credential boundary");
    expect(notRequired).toContain("never captured by Luca");
  });

  it("permission matrix: screen observation is dry-run-only and requires the full safeguard stack", () => {
    const entry = getGatewayPermissionMatrix("screen", "observe_screen");
    expect(entry.permissionName).toBe("Screen observation");
    expect(entry.currentState).toBe("dry_run_only");
    expect(entry.futureRequirements).toContain("Explicit user approval");
    expect(entry.futureRequirements).toContain("Sandboxed surface boundary");
    expect(entry.futureRequirements).toContain("Human confirmation per action");
    expect(entry.futureRequirements).toContain("No credential capture");
    expect(entry.futureRequirements).toContain("Full audit log");
  });

  it("permission matrix: browser click requires approval/sandbox/human confirmation", () => {
    const entry = getGatewayPermissionMatrix("browser", "browser_click");
    expect(entry.permissionName).toBe("Browser interaction");
    expect(entry.currentState).toBe("dry_run_only");
    expect(entry.futureRequirements).toContain("Explicit user approval");
    expect(entry.futureRequirements).toContain("Sandboxed surface boundary");
    expect(entry.futureRequirements).toContain("Human confirmation per action");
    expect(entry.futureRequirements).toContain("Visible browser boundary");
  });

  it("permission matrix: wallet transaction is blocked and unavailable", () => {
    const entry = getGatewayPermissionMatrix("wallet", "wallet_transaction");
    expect(entry.permissionName).toBe("Wallet transaction");
    expect(entry.currentState).toBe("blocked");
    expect(entry.futureRequirements.join(" ")).toContain("Unavailable");
    expect(entry.blockedReason).toBeDefined();
    expect(entry.blockedReason).toContain("never automatically");
  });

  it("permission matrix: file delete is blocked until a dedicated file safety model exists", () => {
    const entry = getGatewayPermissionMatrix("file", "file_delete");
    expect(entry.permissionName).toBe("File deletion");
    expect(entry.currentState).toBe("blocked");
    expect(entry.futureRequirements.join(" ")).toContain("dedicated file safety model");
    expect(entry.blockedReason).toContain("file-safety model");
  });

  it("permission matrix: browser login is blocked because credentials are never handled", () => {
    const entry = getGatewayPermissionMatrix("browser", "browser_login");
    expect(entry.currentState).toBe("blocked");
    expect(entry.blockedReason?.toLowerCase()).toContain("never");
    expect((entry.blockedReason ?? "").toLowerCase()).toMatch(/passwords|credentials|tokens/);
  });

  it("next action for blocked records points to archive/review only", () => {
    const text = getGatewayNextAction(buildRecord({ status: "blocked" }));
    expect(text.toLowerCase()).toContain("archive");
    expect(text.toLowerCase()).toContain("review");
    expect(text.toLowerCase()).toContain("disabled");
  });

  it("next action for dry-run-only records says a future permission model is needed", () => {
    const text = getGatewayNextAction(buildRecord({ status: "dry_run_only" }));
    expect(text.toLowerCase()).toContain("future permission model");
  });
});
