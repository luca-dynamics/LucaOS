import type {
  PersonalIntelligenceRuntimeTrace,
  RuntimeTracePolicyEvaluation,
  RuntimeTracePolicyOptions,
} from "./runtimeTraceTypes";

const SENSITIVE_ZONES = new Set(["credential", "financial", "health", "enterprise"]);
const UNSAFE_CONTENT_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /hidden\s+(?:system\s+)?prompt/i, reason: "Hidden prompts are not allowed in runtime evidence." },
  { pattern: /private\s+(?:chain[- ]of[- ]thought|reasoning)/i, reason: "Private reasoning is not allowed in runtime evidence." },
  { pattern: /raw\s+(?:user\s+)?files?/i, reason: "Raw files are not allowed in runtime evidence." },
  { pattern: /(?:password|credential|client_secret|private_key)\s*[:=]/i, reason: "Credential or secret material is not allowed in runtime evidence." },
  { pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/, reason: "Private key material is not allowed in runtime evidence." },
  { pattern: /\b(?:sk|pk|ghp|github_pat)_[A-Za-z0-9_-]{16,}\b/, reason: "Token-like material is not allowed in runtime evidence." },
  { pattern: /\bBearer\s+[A-Za-z0-9._~+/-]{16,}/i, reason: "Token-like material is not allowed in runtime evidence." },
];
const EXECUTION_AUTHORITY_PATTERN = /\b(?:execute now|invoked? (?:a )?tool|dispatched? (?:a )?workflow|authority to act|permission to execute|ran (?:a )?shell command|performed the action)\b/i;
const RAW_DUMP_PATTERN = /(?:\{[\s\S]{1200,}\}|\[[\s\S]{1200,}\]|data:[^;]+;base64,)/i;

export function findUnsafeRuntimeEvidence(content: string): string[] {
  const blockers = UNSAFE_CONTENT_PATTERNS
    .filter(({ pattern }) => pattern.test(content))
    .map(({ reason }) => reason);
  if (RAW_DUMP_PATTERN.test(content)) {
    blockers.push("Runtime traces must contain bounded summaries and evidence references, not raw payload dumps.");
  }
  return Array.from(new Set(blockers));
}

export function evaluateRuntimeTracePolicy(
  trace: PersonalIntelligenceRuntimeTrace,
  options: RuntimeTracePolicyOptions = {},
): RuntimeTracePolicyEvaluation {
  const evaluatedTrace = cloneTrace(trace);
  const blockers = [...evaluatedTrace.blockers];
  const warnings = [...evaluatedTrace.warnings];
  const content = [
    evaluatedTrace.title,
    evaluatedTrace.source,
    ...evaluatedTrace.stages.flatMap((stage) => [stage.summary, stage.evidenceRef ?? ""]),
  ].join("\n");

  blockers.push(...findUnsafeRuntimeEvidence(content));

  if ((trace as { sideEffectsPerformed?: boolean }).sideEffectsPerformed !== false) {
    blockers.push("Runtime traces cannot claim side effects or execution authority.");
  }
  for (let index = 0; index < evaluatedTrace.stages.length; index += 1) {
    const stage = evaluatedTrace.stages[index];
    if ((trace.stages[index] as { sideEffectsPerformed?: boolean } | undefined)?.sideEffectsPerformed !== false) {
      blockers.push(`${stage.stage} stage cannot claim side effects.`);
    }
    if (EXECUTION_AUTHORITY_PATTERN.test(stage.summary) && stage.stage === "act") {
      stage.status = "blocked";
      blockers.push("Act stage may record only proposed, blocked, skipped, or externally completed outcomes; it cannot claim execution authority.");
    }
    if (stage.stage === "act" && stage.status === "completed") {
      const approvalContext = Boolean(
        options.explicitApproval &&
          (options.approvalId || evaluatedTrace.relatedApprovalId) &&
          stage.approvalSatisfied,
      );
      if (!approvalContext) {
        stage.status = "blocked";
        blockers.push("Completed act evidence requires explicit approval metadata and must describe an external outcome.");
      }
    }
  }

  if (SENSITIVE_ZONES.has(evaluatedTrace.privacyZone) && !(options.explicitApproval && options.approvalId)) {
    blockers.push(`Privacy Zone ${evaluatedTrace.privacyZone} requires explicit approval metadata for trace review.`);
  }
  if (
    evaluatedTrace.privacyZone === "private" &&
    !options.allowPrivateTraceReview &&
    !(options.explicitApproval && options.approvalId)
  ) {
    blockers.push("Private-zone trace review requires explicit approval or an allowed private-review policy.");
  }

  evaluatedTrace.blockers = Array.from(new Set(blockers));
  evaluatedTrace.warnings = Array.from(new Set(warnings));
  evaluatedTrace.sideEffectsPerformed = false;
  if (evaluatedTrace.blockers.length > 0) {
    evaluatedTrace.status = "blocked";
  }

  return {
    allowed: evaluatedTrace.blockers.length === 0,
    trace: cloneTrace(evaluatedTrace),
    warnings: [...evaluatedTrace.warnings],
    blockers: [...evaluatedTrace.blockers],
  };
}

function cloneTrace(trace: PersonalIntelligenceRuntimeTrace): PersonalIntelligenceRuntimeTrace {
  return {
    ...trace,
    stages: trace.stages.map((stage) => ({ ...stage, sideEffectsPerformed: false })),
    warnings: [...trace.warnings],
    blockers: [...trace.blockers],
    sideEffectsPerformed: false,
  };
}
