import { describe, expect, it } from "vitest";
import { classifyPersonalIntelligenceRuntimeAuthority } from "./runtimeAuthorityPolicy";
const blocked = ["shell_command", "install_package", "credential_access", "private_reasoning_access", "device_control", "payment_or_trading", "generated_code_execution"] as const;
const dry = ["skill_execution", "tool_invocation", "mcp_invocation", "workflow_execution", "model_call", "browser_action", "network_access", "file_read", "file_write", "connector_access", "lucalink_handoff", "memory_write"] as const;
describe("runtime authority policy", () => {
  it.each(blocked)("permanently blocks %s", (capabilityKind: typeof blocked[number]) => expect(classifyPersonalIntelligenceRuntimeAuthority({ capabilityKind, source: "fixture", riskLevel: "critical" }).authorityClass).toBe("permanently_blocked"));
  it("keeps memory proposals review only", () => expect(classifyPersonalIntelligenceRuntimeAuthority({ capabilityKind: "memory_proposal", source: "memory_proposal", riskLevel: "low" }).authorityClass).toBe("review_only"));
  it.each(dry)("keeps %s dry-run only", (capabilityKind: typeof dry[number]) => expect(classifyPersonalIntelligenceRuntimeAuthority({ capabilityKind, source: "fixture", riskLevel: "medium" }).authorityClass).toBe("dry_run_only"));
  it("requires every item of pilot evidence and still denies execution", () => {
    const result = classifyPersonalIntelligenceRuntimeAuthority({ capabilityKind: "skill_execution", source: "fixture", riskLevel: "low", dryRunSuccessful: true, requiredGatesGrantedForReview: true, hasBlockedDeniedOrExpiredGates: false, missionAlignment: "aligned", rollbackExpectationExists: true, runtimeTracePreviewExists: true, permanentBlockedCapabilityPresent: false, authorityGranted: true });
    expect(result.authorityClass).toBe("future_pilot_candidate"); expect(result.authorityGranted).toBe(false); expect(result.canExecute).toBe(false); expect(result.blockers).toContain("Runtime authority flags cannot be enabled by authority-boundary input.");
  });
  it("does not treat dry-run success or grant-for-review as authority", () => {
    const result = classifyPersonalIntelligenceRuntimeAuthority({ capabilityKind: "tool_invocation", source: "fixture", riskLevel: "low", dryRunSuccessful: true, requiredGatesGrantedForReview: true });
    expect(result.authorityClass).toBe("dry_run_only");
    expect(result.authorityGranted).toBe(false);
    expect(result.readyForExecution).toBe(false);
  });
  it("permanently blocks unknown critical and prohibited surveillance declarations", () => {
    expect(classifyPersonalIntelligenceRuntimeAuthority({ capabilityKind: "unknown", source: "fixture", riskLevel: "critical" }).authorityClass).toBe("permanently_blocked");
    expect(classifyPersonalIntelligenceRuntimeAuthority({ capabilityKind: "background_surveillance", source: "fixture", riskLevel: "high" }).authorityClass).toBe("permanently_blocked");
  });
  it("does not allow critical pilot candidates", () => expect(classifyPersonalIntelligenceRuntimeAuthority({ capabilityKind: "skill_execution", source: "fixture", riskLevel: "critical", dryRunSuccessful: true, requiredGatesGrantedForReview: true, hasBlockedDeniedOrExpiredGates: false, missionAlignment: "reviewed", rollbackExpectationExists: true, runtimeTracePreviewExists: true, permanentBlockedCapabilityPresent: false }).authorityClass).toBe("unsupported"));
});
