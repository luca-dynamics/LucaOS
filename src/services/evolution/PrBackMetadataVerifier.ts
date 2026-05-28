export type PrBackMetadataSeverity = "info" | "warning" | "blocked";

export interface PrBackMetadataInput {
  repo?: string;
  sourceRepo?: string;
  targetBranch?: string;
  pullRequestUrl?: string;
  pullRequestNumber?: number;
  commitSha?: string;
  finalized?: boolean;
  state?: string;
  requiresOriginReview?: boolean;
  knownLucaRepos?: string[];
  allowedRepo?: string;
  metadata?: Record<string, unknown>;
}

export interface PrBackMetadataVerificationResult {
  ok: boolean;
  severity: PrBackMetadataSeverity;
  trustedRepo: boolean;
  requiredOriginReview: true;
  canAutoMerge: false;
  blockingReasons: string[];
  warnings: string[];
  metadata: Record<string, unknown>;
}

const DEFAULT_ALLOWED_REPOS = ["luca-dynamics/LucaOS", "LucaOS", "lucaos"];
const UNTRUSTED_REPO_SIGNALS = ["fork", "external", "unknown", "untrusted"];

function hasFinalizedState(input: PrBackMetadataInput): boolean {
  return input.finalized === true || ["finalized", "ready", "merged", "complete", "completed"].includes((input.state ?? "").toLowerCase());
}

function normalizeRepoValue(repo?: string): string {
  return (repo ?? "").trim().toLowerCase();
}

function buildAllowedRepos(input: PrBackMetadataInput): string[] {
  const candidates = [input.allowedRepo, ...(input.knownLucaRepos ?? []), ...DEFAULT_ALLOWED_REPOS]
    .map((entry) => entry?.trim())
    .filter((entry): entry is string => Boolean(entry && entry.length > 0));

  return Array.from(new Set(candidates.map((entry) => entry.toLowerCase())));
}

export function verifyPrBackMetadata(input: PrBackMetadataInput): PrBackMetadataVerificationResult {
  const blockingReasons: string[] = [];
  const warnings: string[] = [];
  const allowedRepos = buildAllowedRepos(input);

  const normalizedRepo = normalizeRepoValue(input.repo);
  const normalizedSourceRepo = normalizeRepoValue(input.sourceRepo);

  const trustedRepo = Boolean(normalizedRepo) && allowedRepos.includes(normalizedRepo);

  if (!trustedRepo) {
    if (!normalizedRepo) {
      blockingReasons.push("missing_repo_metadata");
    } else {
      warnings.push("unknown_repo_metadata");
    }
  }

  if (!input.pullRequestUrl && !input.pullRequestNumber) {
    blockingReasons.push("missing_pull_request_reference");
  }

  if (hasFinalizedState(input) && !input.commitSha) {
    warnings.push("missing_commit_sha_for_finalized_state");
  }

  if (input.requiresOriginReview !== true) {
    blockingReasons.push("origin_review_required");
  }

  if (normalizedSourceRepo) {
    const sourceTrusted = allowedRepos.includes(normalizedSourceRepo);
    const sourceHasUntrustedSignal = UNTRUSTED_REPO_SIGNALS.some((signal) => normalizedSourceRepo.includes(signal));
    if (!sourceTrusted || sourceHasUntrustedSignal) {
      warnings.push("untrusted_source_repo");
      blockingReasons.push("untrusted_source_repo_requires_origin_block");
    }
  }

  warnings.push("external_lab_pr_cannot_auto_merge");

  const severity: PrBackMetadataSeverity = blockingReasons.length > 0 ? "blocked" : warnings.length > 0 ? "warning" : "info";

  return {
    ok: blockingReasons.length === 0,
    severity,
    trustedRepo,
    requiredOriginReview: true,
    canAutoMerge: false,
    blockingReasons,
    warnings,
    metadata: {
      repo: input.repo,
      sourceRepo: input.sourceRepo,
      targetBranch: input.targetBranch,
      pullRequestUrl: input.pullRequestUrl,
      pullRequestNumber: input.pullRequestNumber,
      commitShaPresent: Boolean(input.commitSha),
      finalized: hasFinalizedState(input),
      allowedRepos,
      runtimeAutoApplyEnabled: false,
      networkVerificationAttempted: false,
      ...input.metadata,
    },
  };
}

export function getPrBackMetadataVerifierSnapshot(input?: Record<string, unknown>) {
  return {
    contractKind: "luca_pr_back_metadata_verifier",
    requiredOriginReview: true,
    canAutoMerge: false,
    networkVerificationAttempted: false,
    runtimeAutoApplyEnabled: false,
    ...input,
  };
}
