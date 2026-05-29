// RuntimePlanPolicy — PR #122: Runtime Orchestration & Planning Loop Foundation
// Classifies plan steps and decides what governance artifact should be created.
// Conservative by default: anything unclear → ask_user, anything risky → blocked_risky_action.

import type {
  RuntimePlanRiskLevel,
  RuntimePlanStepKind,
} from "../../types/runtimePlan";

// ---------------------------------------------------------------------------
// Secret / forbidden patterns
// ---------------------------------------------------------------------------

const SECRET_PATTERNS = [
  /\btoken\b/i,
  /\bsecret\b/i,
  /\bapi[_-]?key\b/i,
  /\bprivate[_-]?key\b/i,
  /\bpassword\b/i,
  /\bseed\b/i,
  /\bmnemonic\b/i,
  /\bcredential\b/i,
  /sk-[A-Za-z0-9_-]{8,}/,
  /gh[pousr]_[A-Za-z0-9_]{12,}/,
  /AIza[A-Za-z0-9_-]{12,}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
];

const FORBIDDEN_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\bshell\b/i, reason: "shell_execution" },
  { pattern: /\bterminal\b/i, reason: "shell_execution" },
  { pattern: /\bcommand\b/i, reason: "shell_execution" },
  { pattern: /\bsudo\b/i, reason: "shell_execution" },
  { pattern: /\brm\s/i, reason: "shell_execution" },
  { pattern: /\bchmod\b/i, reason: "shell_execution" },
  { pattern: /\bfile\s*write\b/i, reason: "filesystem_mutation" },
  { pattern: /\bfile\s*delete\b/i, reason: "filesystem_mutation" },
  { pattern: /\bfile\s*modify\b/i, reason: "filesystem_mutation" },
  { pattern: /\bnetwork\s*request\b/i, reason: "network_automation" },
  { pattern: /\bfetch\b/i, reason: "network_automation" },
  { pattern: /\bpost\b/i, reason: "network_automation" },
  { pattern: /\bapi\s*call\b/i, reason: "network_automation" },
  { pattern: /\bwallet\b/i, reason: "wallet_finance" },
  { pattern: /\btransfer\b/i, reason: "wallet_finance" },
  { pattern: /\bswap\b/i, reason: "wallet_finance" },
  { pattern: /\btrade\b/i, reason: "wallet_finance" },
  { pattern: /\bstake\b/i, reason: "wallet_finance" },
  { pattern: /\bbridge\b/i, reason: "wallet_finance" },
  { pattern: /\bbrowser\s*automat/i, reason: "browser_automation" },
  { pattern: /\bclick\b/i, reason: "browser_automation" },
  { pattern: /\bscrape\b/i, reason: "browser_automation" },
  { pattern: /\blogin\b/i, reason: "browser_automation" },
  { pattern: /\bdevice\s*control\b/i, reason: "device_control" },
  { pattern: /\bdesktop\s*control\b/i, reason: "device_control" },
  { pattern: /\brobot\s*control\b/i, reason: "device_control" },
  { pattern: /\bmcp\s*execut/i, reason: "mcp_execution" },
  { pattern: /\binstall\s+skill\b/i, reason: "skill_execution" },
  { pattern: /\brun\s+skill\b/i, reason: "skill_execution" },
  { pattern: /\bcode\s*write\b/i, reason: "code_mutation" },
  { pattern: /\bcode\s*edit\b/i, reason: "code_mutation" },
  { pattern: /\bpush\b/i, reason: "code_mutation" },
  { pattern: /\bcommit\b/i, reason: "code_mutation" },
  { pattern: /\bself[_-]?evolv/i, reason: "self_evolution" },
  { pattern: /\bmodify\s*own\s*code\b/i, reason: "self_evolution" },
];

const MEMORY_PATTERNS = [
  /\bremember\b/i,
  /\bsave\s*(this|that|fact|preference|note)\b/i,
  /\buser\s*(fact|preference|likes?|dislikes?|name|birthday|location)\b/i,
  /\bproject\s*(context|note|summary)\b/i,
  /\bsession\s*summary\b/i,
  /\bagent\s*state\b/i,
  /\bcorrection\b/i,
  /\bnote\s*to\s*self\b/i,
];

const SAFE_ACTION_PATTERNS = [
  /\bnotif(y|ication)\b/i,
  /\bopen\s*panel\b/i,
  /\bshow\s*(status|diagnostics|summary)\b/i,
  /\bread\s*(memory|inbox|session|runtime)\b/i,
  /\bdisplay\b/i,
];

const SKILL_DESIRE_PATTERNS = [
  /\bskill\b/i,
  /\bplugin\b/i,
  /\bextension\b/i,
  /\benable\b/i,
  /\bupdate\b/i,
  /\bremove\b/i,
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StepDraft {
  title: string;
  summary: string;
  suggestedKind?: RuntimePlanStepKind;
  suggestedRiskLevel?: RuntimePlanRiskLevel;
  metadata?: Record<string, unknown>;
}

export interface ClassifyIntentResult {
  kind: RuntimePlanStepKind;
  riskLevel: RuntimePlanRiskLevel;
  reason: string;
}

// ---------------------------------------------------------------------------
// Sanitization
// ---------------------------------------------------------------------------

const MAX_INPUT_LENGTH = 4_000;

function sanitizeText(value: string, maxLength = MAX_INPUT_LENGTH): string {
  return SECRET_PATTERNS.reduce(
    (current, pattern) => current.replace(pattern, "[redacted]"),
    value,
  ).slice(0, maxLength);
}

export function sanitizePlanInput(input: string): string {
  return sanitizeText(input);
}

export function blockIfSecretLike(input: string): string | null {
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(input)) {
      return "Input contains secret-like content and was blocked.";
    }
  }
  return null;
}

export function blockIfForbiddenCapability(input: string): { blocked: boolean; reason: string } {
  for (const entry of FORBIDDEN_PATTERNS) {
    if (entry.pattern.test(input)) {
      return { blocked: true, reason: entry.reason };
    }
  }
  return { blocked: false, reason: "" };
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

export function classifyIntent(input: string): ClassifyIntentResult {
  const secretBlock = blockIfSecretLike(input);
  if (secretBlock) {
    return { kind: "blocked_risky_action", riskLevel: "critical", reason: secretBlock };
  }

  const forbidden = blockIfForbiddenCapability(input);
  if (forbidden.blocked) {
    return { kind: "blocked_risky_action", riskLevel: "high", reason: `Forbidden capability: ${forbidden.reason}` };
  }

  if (MEMORY_PATTERNS.some((p) => p.test(input))) {
    return { kind: "memory_proposal", riskLevel: "low", reason: "Classified as memory-related intent." };
  }

  if (SAFE_ACTION_PATTERNS.some((p) => p.test(input))) {
    return { kind: "safe_execution_request", riskLevel: "safe", reason: "Classified as safe local action." };
  }

  if (SKILL_DESIRE_PATTERNS.some((p) => p.test(input))) {
    return { kind: "skill_request", riskLevel: "elevated", reason: "Classified as skill governance request (state-only)." };
  }

  return { kind: "ask_user", riskLevel: "low", reason: "Intent unclear; asking user for clarification." };
}

export function classifyStep(stepDraft: StepDraft): ClassifyIntentResult {
  if (stepDraft.suggestedKind && stepDraft.suggestedKind !== "other") {
    const combined = `${stepDraft.title} ${stepDraft.summary}`;
    const secretBlock = blockIfSecretLike(combined);
    if (secretBlock) {
      return { kind: "blocked_risky_action", riskLevel: "critical", reason: secretBlock };
    }
    const forbidden = blockIfForbiddenCapability(combined);
    if (forbidden.blocked) {
      return { kind: "blocked_risky_action", riskLevel: "high", reason: `Forbidden capability: ${forbidden.reason}` };
    }
    return {
      kind: stepDraft.suggestedKind,
      riskLevel: stepDraft.suggestedRiskLevel ?? "low",
      reason: `Accepted suggested kind: ${stepDraft.suggestedKind}`,
    };
  }
  return classifyIntent(`${stepDraft.title} ${stepDraft.summary}`);
}

export function shouldCreateMemoryProposal(stepDraft: StepDraft): boolean {
  const classification = classifyStep(stepDraft);
  return classification.kind === "memory_proposal";
}

export function shouldCreateGovernedActionRequest(stepDraft: StepDraft): boolean {
  const classification = classifyStep(stepDraft);
  return classification.kind === "governed_action_request" || classification.kind === "safe_execution_request";
}

export function shouldCreateSkillRequest(stepDraft: StepDraft): boolean {
  const classification = classifyStep(stepDraft);
  return classification.kind === "skill_request";
}

export function shouldCreateCheckpoint(stepDraft: StepDraft): boolean {
  const classification = classifyStep(stepDraft);
  return classification.kind === "planning_checkpoint";
}
