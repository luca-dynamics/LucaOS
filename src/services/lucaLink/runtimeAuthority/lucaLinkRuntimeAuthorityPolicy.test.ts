import { describe, expect, it } from "vitest";
import { classifyLucaLinkRuntimeAuthority } from "./lucaLinkRuntimeAuthorityPolicy";

const scoped = { requestedByHostId: "host:source", targetHostId: "host:target" };
const candidateEvidence = {
  ...scoped,
  dryRunHandoffSimulationExists: true,
  transportDecision: "allowed_preview" as const,
  transportEvidenceExists: true,
  approvalPathExists: true,
  fileInstallDecision: "not_required" as const,
  liveSensorCollectionRequired: false,
  permanentBlockedCapabilityPresent: false,
  expiryRequirementExists: true,
  redactionRequirementExists: true,
  operationCenterVisibilityExists: true,
};

const assertFlagsFalse = (result: ReturnType<typeof classifyLucaLinkRuntimeAuthority>) => {
  expect(result).toMatchObject({
    authorityGranted: false, handoffEnabled: false, transportSendEnabled: false, adapterExecutionEnabled: false,
    displayOpenEnabled: false, sensorCollectionEnabled: false, fileWriteEnabled: false, installEnabled: false,
    sideEffectsPerformed: false,
  });
};

describe("LucaLink runtime authority policy", () => {
  it.each(["shell_command", "credential_access", "raw_host_data_access", "device_control"] as const)("permanently blocks %s", (capabilityKind) => {
    const result = classifyLucaLinkRuntimeAuthority({ source: "fixture", capabilityKind, riskLevel: "critical" });
    expect(result.authorityClass).toBe("permanently_blocked");
    assertFlagsFalse(result);
  });

  it.each(["sensor_snapshot_review", "approval_notification_review"] as const)("makes %s review-only", (capabilityKind) => {
    expect(classifyLucaLinkRuntimeAuthority({ source: "fixture", capabilityKind, riskLevel: "low" }).authorityClass).toBe("review_only");
  });

  it.each(["handoff", "transport_send", "adapter_execution", "display_open", "file_write", "package_install"] as const)("keeps %s dry-run-only without candidate evidence", (capabilityKind) => {
    const result = classifyLucaLinkRuntimeAuthority({ source: "fixture", capabilityKind, riskLevel: "medium", ...scoped });
    expect(result.authorityClass).toBe("dry_run_only");
    assertFlagsFalse(result);
  });

  it("classifies a fully evidenced low-risk handoff as a non-enabled future candidate", () => {
    const result = classifyLucaLinkRuntimeAuthority({ source: "dry_run_handoff", capabilityKind: "handoff", riskLevel: "low", ...candidateEvidence });
    expect(result.authorityClass).toBe("future_bounded_handoff_candidate");
    assertFlagsFalse(result);
  });

  it("does not promote critical risk or dry-run success alone", () => {
    expect(classifyLucaLinkRuntimeAuthority({ source: "dry_run_handoff", capabilityKind: "handoff", riskLevel: "critical", ...candidateEvidence }).authorityClass).toBe("dry_run_only");
    expect(classifyLucaLinkRuntimeAuthority({ source: "dry_run_handoff", capabilityKind: "handoff", riskLevel: "low", ...scoped, dryRunHandoffSuccessful: true }).authorityClass).toBe("dry_run_only");
  });

  it("blocks attempted runtime authority flags", () => {
    const result = classifyLucaLinkRuntimeAuthority({ source: "fixture", capabilityKind: "handoff", riskLevel: "low", ...scoped, authorityGranted: true, transportSendEnabled: true });
    expect(result.authorityClass).toBe("permanently_blocked");
    expect(result.blockers.join(" ")).toContain("rejected");
    assertFlagsFalse(result);
  });
});
