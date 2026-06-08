import { describe, expect, it } from "vitest";
import { classifyLucaLinkRuntimeAuthority } from "./lucaLinkRuntimeAuthorityPolicy";
import type { LucaLinkRuntimeAuthorityClassificationInput } from "./lucaLinkRuntimeAuthorityTypes";

const classify = (
  capabilityKind: string,
  extra: Partial<LucaLinkRuntimeAuthorityClassificationInput> = {},
) => {
  const {
    source = "fixture",
    riskLevel = "medium",
    requestedByHostId = "primary-fixture",
    targetHostId = "companion-fixture",
    ...rest
  } = extra;
  return classifyLucaLinkRuntimeAuthority({
    ...rest,
    source,
    capabilityKind,
    riskLevel,
    requestedByHostId,
    targetHostId,
  });
};

describe("LucaLink runtime authority policy", () => {
  it.each(["shell_command", "credential_access", "raw_host_data_access", "device_control"])(
    "permanently blocks %s",
    (capabilityKind) => expect(classify(capabilityKind).authorityClass).toBe("permanently_blocked"),
  );

  it("keeps review models review-only", () => {
    expect(classify("sensor_snapshot_review", { source: "sensor_snapshot" }).authorityClass).toBe("review_only");
    expect(classify("approval_notification_review", { source: "approval_notification" }).authorityClass).toBe("review_only");
  });

  it.each(["handoff", "transport_send", "adapter_execution", "display_open", "file_write", "package_install"])(
    "keeps %s dry-run-only without candidate evidence",
    (capabilityKind) => expect(classify(capabilityKind).authorityClass).toBe("dry_run_only"),
  );

  it("recognizes a complete future bounded candidate while preserving every disabled flag", () => {
    const record = classify("handoff", {
      source: "dry_run_handoff",
      candidateRequested: true,
      candidateEvidence: {
        dryRunHandoffSimulationExists: true,
        dryRunHandoffSucceeded: true,
        transportDecision: "allowed_preview",
        transportEvidencePresent: true,
        approvalPathExists: true,
        fileInstallDecision: "clear",
        liveSensorCollectionRequired: false,
        permanentBlockedCapabilityPresent: false,
        expiryRequirementExists: true,
        redactionRequirementExists: true,
        operationCenterVisibilityExists: true,
      },
    });
    expect(record.authorityClass).toBe("future_bounded_handoff_candidate");
    expect(record).toMatchObject({
      authorityGranted: false, handoffEnabled: false, transportSendEnabled: false,
      adapterExecutionEnabled: false, displayOpenEnabled: false, sensorCollectionEnabled: false,
      fileWriteEnabled: false, installEnabled: false, sideEffectsPerformed: false,
    });
  });

  it("does not promote critical risk or treat dry-run success as authority", () => {
    const record = classify("handoff", {
      source: "dry_run_handoff",
      riskLevel: "critical",
      candidateRequested: true,
      candidateEvidence: { dryRunHandoffSimulationExists: true, dryRunHandoffSucceeded: true },
    });
    expect(record.authorityClass).toBe("dry_run_only");
    expect(record.authorityGranted).toBe(false);
    expect(record.blockers.join(" ")).toContain("Critical-risk");
  });

  it("blocks attempted authority or runtime enablement", () => {
    const record = classify("handoff", { authorityGranted: true, transportSendEnabled: true });
    expect(record.authorityClass).toBe("permanently_blocked");
    expect(record.authorityGranted).toBe(false);
    expect(record.transportSendEnabled).toBe(false);
  });
});
