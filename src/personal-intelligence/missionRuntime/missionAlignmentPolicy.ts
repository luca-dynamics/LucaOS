import { findUnsafeMissionContent, sanitizeMissionText } from "./missionContextSnapshot";
import type { MissionAlignmentEvaluation, MissionRiskLevel, PersonalIntelligenceMissionContextSnapshot } from "./missionRuntimeTypes";

interface EvaluateMissionAlignmentInput {
  snapshot: PersonalIntelligenceMissionContextSnapshot;
  proposalTitle: string;
  proposalSummary: string;
  proposedActions?: string[];
  evidenceRefs?: string[];
  now?: () => Date;
}

const EXECUTION_PATTERNS = [
  /\b(write|edit|delete|move|create)\s+(a\s+)?files?\b/i,
  /\b(install|uninstall|execute|run)\b.*\b(command|shell|script|code|package)\b/i,
  /\b(send|post|upload|download)\b.*\b(network|request|data|message|file)\b/i,
  /\b(control|unlock|restart|shutdown)\b.*\b(device|computer|machine)\b/i,
  /\b(trade|buy|sell|payment|pay|transfer funds?)\b/i,
  /\b(browser action|click|navigate|submit form)\b/i,
  /\b(lucalink|device handoff|remote handoff)\b/i,
];

export function evaluateMissionAlignment(input: EvaluateMissionAlignmentInput): MissionAlignmentEvaluation {
  const timestamp = (input.now ?? (() => new Date()))().toISOString();
  const proposalText = [input.proposalTitle, input.proposalSummary, ...(input.proposedActions ?? [])].join(" ");
  const matchedGoals = input.snapshot.goals.filter((goal) => hasMeaningfulOverlap(proposalText, goal));
  const violatedConstraints = input.snapshot.constraints.filter((constraint) => violatesConstraint(proposalText, constraint));
  const matchedCriteria = input.snapshot.successCriteria.filter((criterion) => hasMeaningfulOverlap(proposalText, criterion));
  const unverifiedCriteria = input.snapshot.successCriteria.filter((criterion) => !matchedCriteria.includes(criterion));
  const executionHeavy = (input.proposedActions ?? []).some((action) => EXECUTION_PATTERNS.some((pattern) => pattern.test(action)));
  const blockers = [...input.snapshot.blockers, ...findUnsafeMissionContent([proposalText])];
  const warnings = [...input.snapshot.warnings];
  const hasEvidence = Boolean(input.evidenceRefs?.length);

  if (executionHeavy) warnings.push("Proposal includes execution-oriented actions; alignment does not approve them and explicit user review remains required.");
  if (!hasEvidence) warnings.push("No evidence references were supplied; alignment requires user review.");
  if (matchedGoals.length === 0) warnings.push("Proposal did not deterministically match a mission goal.");

  let alignmentStatus: MissionAlignmentEvaluation["alignmentStatus"];
  if (blockers.length > 0) alignmentStatus = "blocked";
  else if (violatedConstraints.length > 0) alignmentStatus = executionHeavy ? "blocked" : "misaligned";
  else if (!hasEvidence) alignmentStatus = "needs_review";
  else if (matchedGoals.length === input.snapshot.goals.length && matchedCriteria.length === input.snapshot.successCriteria.length) alignmentStatus = "aligned";
  else if (matchedGoals.length > 0) alignmentStatus = "partially_aligned";
  else alignmentStatus = "needs_review";

  return {
    evaluationId: `mission-evaluation:${input.snapshot.missionId}:${timestamp}`,
    missionId: input.snapshot.missionId,
    proposalTitle: sanitizeMissionText(input.proposalTitle),
    proposalSummary: sanitizeMissionText(input.proposalSummary),
    alignmentStatus,
    matchedGoals: [...matchedGoals],
    violatedConstraints: [...violatedConstraints],
    unverifiedAssumptions: hasEvidence ? [] : [...input.snapshot.operatingAssumptions],
    successCriteriaCoverage: {
      matched: [...matchedCriteria],
      unverified: [...unverifiedCriteria],
      coverageRatio: input.snapshot.successCriteria.length === 0 ? 0 : matchedCriteria.length / input.snapshot.successCriteria.length,
    },
    riskLevel: determineRisk(alignmentStatus, executionHeavy, violatedConstraints.length),
    requiresUserReview: true,
    warnings: Array.from(new Set(warnings)),
    blockers: Array.from(new Set(blockers.concat(violatedConstraints.map((constraint) => `Constraint violation: ${constraint}`)))),
    sideEffectsPerformed: false,
  };
}

function tokens(value: string): string[] {
  return value.toLowerCase().match(/[a-z0-9]+/g)?.filter((word) => word.length >= 4 && !["with", "from", "that", "this", "must", "should", "without", "into", "only"].includes(word)) ?? [];
}

function hasMeaningfulOverlap(proposal: string, target: string): boolean {
  const proposalTokens = new Set(tokens(proposal));
  const targetTokens = tokens(target);
  return targetTokens.length > 0 && targetTokens.some((word) => proposalTokens.has(word));
}

function violatesConstraint(proposal: string, constraint: string): boolean {
  const normalized = constraint.toLowerCase();
  const prohibited = normalized.match(/(?:must not|do not|don't|never|no)\s+(.+)/)?.[1] ?? normalized;
  const prohibitedTokens = tokens(prohibited);
  const proposalTokens = new Set(tokens(proposal));
  const overlap = prohibitedTokens.filter((word) => proposalTokens.has(word));
  return prohibitedTokens.length > 0 && proposalTokens.has(prohibitedTokens[0]) && overlap.length >= Math.min(2, prohibitedTokens.length);
}

function determineRisk(status: MissionAlignmentEvaluation["alignmentStatus"], executionHeavy: boolean, violations: number): MissionRiskLevel {
  if (status === "blocked" && violations > 0) return "critical";
  if (status === "blocked" || status === "misaligned" || executionHeavy) return "high";
  if (status === "needs_review" || status === "partially_aligned") return "medium";
  return "low";
}
