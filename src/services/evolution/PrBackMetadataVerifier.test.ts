import { describe, expect, it } from "vitest";
import { getPrBackMetadataVerifierSnapshot, verifyPrBackMetadata } from "./PrBackMetadataVerifier";

describe("PrBackMetadataVerifier", () => {
  it("valid PR metadata passes as review-only", () => {
    const result = verifyPrBackMetadata({
      repo: "luca-dynamics/LucaOS",
      sourceRepo: "luca-dynamics/LucaOS",
      pullRequestUrl: "https://github.com/luca-dynamics/LucaOS/pull/123",
      pullRequestNumber: 123,
      commitSha: "abc123",
      finalized: true,
      requiresOriginReview: true,
    });

    expect(result.ok).toBe(true);
    expect(result.requiredOriginReview).toBe(true);
    expect(result.canAutoMerge).toBe(false);
    expect(result.warnings).toContain("external_lab_pr_cannot_auto_merge");
  });

  it("missing PR URL/number blocked", () => {
    const result = verifyPrBackMetadata({ repo: "luca-dynamics/LucaOS", requiresOriginReview: true });
    expect(result.ok).toBe(false);
    expect(result.blockingReasons).toContain("missing_pull_request_reference");
  });

  it("missing commitSha warns for finalized", () => {
    const result = verifyPrBackMetadata({
      repo: "luca-dynamics/LucaOS",
      pullRequestNumber: 1,
      finalized: true,
      requiresOriginReview: true,
    });

    expect(result.ok).toBe(true);
    expect(result.warnings).toContain("missing_commit_sha_for_finalized_state");
  });

  it("requiresOriginReview false blocked", () => {
    const result = verifyPrBackMetadata({
      repo: "luca-dynamics/LucaOS",
      pullRequestNumber: 1,
      requiresOriginReview: false,
    });

    expect(result.ok).toBe(false);
    expect(result.blockingReasons).toContain("origin_review_required");
  });

  it("unknown or untrusted repo warns/blocks", () => {
    const unknownRepo = verifyPrBackMetadata({
      repo: "acme/custom-repo",
      pullRequestNumber: 1,
      requiresOriginReview: true,
    });

    expect(unknownRepo.warnings).toContain("unknown_repo_metadata");

    const untrustedSource = verifyPrBackMetadata({
      repo: "luca-dynamics/LucaOS",
      sourceRepo: "external/forked-unknown",
      pullRequestNumber: 1,
      requiresOriginReview: true,
    });

    expect(untrustedSource.ok).toBe(false);
    expect(untrustedSource.blockingReasons).toContain("untrusted_source_repo_requires_origin_block");
  });

  it("canAutoMerge always false and no network calls", () => {
    const result = verifyPrBackMetadata({
      repo: "luca-dynamics/LucaOS",
      pullRequestNumber: 1,
      requiresOriginReview: true,
    });
    const snapshot = getPrBackMetadataVerifierSnapshot();

    expect(result.canAutoMerge).toBe(false);
    expect(snapshot.canAutoMerge).toBe(false);
    expect(result.metadata.networkVerificationAttempted).toBe(false);
    expect(snapshot.networkVerificationAttempted).toBe(false);
  });
});
