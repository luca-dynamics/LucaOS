// IntentRoutingPolicy — PR #123: Intent Routing Layer
// Classifies user messages into routing decisions.
// Does NOT execute anything. Does NOT write memory. Does NOT run tools.

import type {
  LucaRoutingMode,
  LucaIntentRoute,
  LucaIntentRiskLevel,
  LucaIntentSignal,
  LucaIntentRoutingDecision,
  LucaIntentRoutingInput,
} from "../../types/intentRouting";
import {
  INTENT_ROUTING_MAX_MESSAGE_LENGTH,
  INTENT_ROUTING_MAX_REASON_LENGTH,
  INTENT_ROUTING_MAX_SUMMARY_LENGTH,
  INTENT_ROUTING_MAX_METADATA_KEYS,
  INTENT_ROUTING_MAX_METADATA_VALUE_LENGTH,
} from "../../types/intentRouting";

// ---------------------------------------------------------------------------
// Secret / forbidden patterns (aligned with RuntimePlanPolicy)
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

const RISKY_SYSTEM_PATTERNS: Array<{ pattern: RegExp; signal: LucaIntentSignal; reason: string }> = [
  { pattern: /\bshell\b/i, signal: "risky_system_action", reason: "shell_execution" },
  { pattern: /\bterminal\b/i, signal: "risky_system_action", reason: "shell_execution" },
  { pattern: /\bcommand\b/i, signal: "risky_system_action", reason: "shell_execution" },
  { pattern: /\bsudo\b/i, signal: "risky_system_action", reason: "shell_execution" },
  { pattern: /\brm\s/i, signal: "risky_system_action", reason: "shell_execution" },
  { pattern: /\bchmod\b/i, signal: "risky_system_action", reason: "shell_execution" },
];

const RISKY_FILE_PATTERNS: Array<{ pattern: RegExp; signal: LucaIntentSignal; reason: string }> = [
  { pattern: /\bfile\s*write\b/i, signal: "risky_file_action", reason: "filesystem_mutation" },
  { pattern: /\bfile\s*delete\b/i, signal: "risky_file_action", reason: "filesystem_mutation" },
  { pattern: /\bfile\s*modify\b/i, signal: "risky_file_action", reason: "filesystem_mutation" },
];

const RISKY_NETWORK_PATTERNS: Array<{ pattern: RegExp; signal: LucaIntentSignal; reason: string }> = [
  { pattern: /\bnetwork\s*request\b/i, signal: "risky_network_action", reason: "network_automation" },
  { pattern: /\bfetch\b/i, signal: "risky_network_action", reason: "network_automation" },
  { pattern: /\bpost\b/i, signal: "risky_network_action", reason: "network_automation" },
  { pattern: /\bapi\s*call\b/i, signal: "risky_network_action", reason: "network_automation" },
];

const RISKY_WALLET_PATTERNS: Array<{ pattern: RegExp; signal: LucaIntentSignal; reason: string }> = [
  { pattern: /\bwallet\b/i, signal: "risky_wallet_finance", reason: "wallet_finance" },
  { pattern: /\btransfer\b/i, signal: "risky_wallet_finance", reason: "wallet_finance" },
  { pattern: /\bswap\b/i, signal: "risky_wallet_finance", reason: "wallet_finance" },
  { pattern: /\btrade\b/i, signal: "risky_wallet_finance", reason: "wallet_finance" },
  { pattern: /\bstake\b/i, signal: "risky_wallet_finance", reason: "wallet_finance" },
  { pattern: /\bbridge\b/i, signal: "risky_wallet_finance", reason: "wallet_finance" },
];

const RISKY_BROWSER_PATTERNS: Array<{ pattern: RegExp; signal: LucaIntentSignal; reason: string }> = [
  { pattern: /\bbrowser\s*automat/i, signal: "risky_browser_action", reason: "browser_automation" },
  { pattern: /\bclick\b/i, signal: "risky_browser_action", reason: "browser_automation" },
  { pattern: /\bscrape\b/i, signal: "risky_browser_action", reason: "browser_automation" },
  { pattern: /\blogin\b/i, signal: "risky_browser_action", reason: "browser_automation" },
];

const RISKY_DEVICE_PATTERNS: Array<{ pattern: RegExp; signal: LucaIntentSignal; reason: string }> = [
  { pattern: /\bdevice\s*control\b/i, signal: "risky_device_action", reason: "device_control" },
  { pattern: /\bdesktop\s*control\b/i, signal: "risky_device_action", reason: "device_control" },
  { pattern: /\brobot\s*control\b/i, signal: "risky_device_action", reason: "device_control" },
  { pattern: /\bmcp\s*execut/i, signal: "risky_device_action", reason: "mcp_execution" },
];

const RISKY_CODE_PATTERNS: Array<{ pattern: RegExp; signal: LucaIntentSignal; reason: string }> = [
  { pattern: /\bcode\s*write\b/i, signal: "risky_code_mutation", reason: "code_mutation" },
  { pattern: /\bcode\s*edit\b/i, signal: "risky_code_mutation", reason: "code_mutation" },
  { pattern: /\bpush\b/i, signal: "risky_code_mutation", reason: "code_mutation" },
  { pattern: /\bcommit\b/i, signal: "risky_code_mutation", reason: "code_mutation" },
];

const RISKY_SELF_PATTERNS: Array<{ pattern: RegExp; signal: LucaIntentSignal; reason: string }> = [
  { pattern: /\bself[_-]?evolv/i, signal: "risky_self_evolution", reason: "self_evolution" },
  { pattern: /\bmodify\s*own\s*code\b/i, signal: "risky_self_evolution", reason: "self_evolution" },
];

const ALL_RISKY_PATTERNS = [
  ...RISKY_SYSTEM_PATTERNS,
  ...RISKY_FILE_PATTERNS,
  ...RISKY_NETWORK_PATTERNS,
  ...RISKY_WALLET_PATTERNS,
  ...RISKY_BROWSER_PATTERNS,
  ...RISKY_DEVICE_PATTERNS,
  ...RISKY_CODE_PATTERNS,
  ...RISKY_SELF_PATTERNS,
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

const SKILL_PATTERNS = [
  /\bskill\b/i,
  /\bplugin\b/i,
  /\bextension\b/i,
];

const MULTI_STEP_PATTERNS = [
  /\bhelp\s*me\s*(build|organize|set\s*up|prepare|create|design|develop)\b/i,
  /\bstep\s*by\s*step\b/i,
  /\bmultiple\s*steps\b/i,
  /\bproject\b/i,
  /\bworkflow\b/i,
  /\bplan\b/i,
  /\bset\s*up\b/i,
  /\bprepare\b/i,
  /\borganize\b/i,
];

const FUTURE_CONTINUITY_PATTERNS = [
  /\bremind\s*me\b/i,
  /\btomorrow\b/i,
  /\blater\b/i,
  /\bnext\s*(week|month|time)\b/i,
  /\bfollow\s*up\b/i,
  /\bcontinue\b/i,
  /\bresume\b/i,
  /\bschedule\b/i,
  /\btrack\b/i,
];

const SIMPLE_CHAT_PATTERNS = [
  /^(hi|hello|hey|yo|sup|thanks|thank you|ok|okay|cool|great|nice|good|bye|goodbye|gn|gm)\b/i,
  /\?$/,
  /\bwhat\s*(is|are|was|were|do|does|did|can|could|would|should)\b/i,
  /\bhow\s*(do|does|can|could|would|should|to)\b/i,
  /\bwhy\s*(is|are|was|were|do|does|did|can|could|would|should)\b/i,
  /\bexplain\b/i,
  /\btell\s*me\b/i,
];

const WRITING_PATTERNS = [
  /\brewrite\b/i,
  /\bedit\s*(this|my|the)\b/i,
  /\bsummarize\b/i,
  /\bbrainstorm\b/i,
  /\bdraft\b/i,
  /\bwrite\s*(a|an|me|the)\b/i,
  /\btranslate\b/i,
  /\bparaphrase\b/i,
];

// ---------------------------------------------------------------------------
// Sanitization
// ---------------------------------------------------------------------------

function sanitizeText(value: string, maxLength: number): string {
  return SECRET_PATTERNS.reduce(
    (current, pattern) => current.replace(pattern, "[redacted]"),
    value,
  ).slice(0, maxLength);
}

export function sanitizeIntentInput(input: LucaIntentRoutingInput): LucaIntentRoutingInput {
  return {
    ...input,
    message: sanitizeText(input.message, INTENT_ROUTING_MAX_MESSAGE_LENGTH),
    source: input.source.slice(0, 80),
    sourceId: input.sourceId?.slice(0, 120),
    sessionId: input.sessionId?.slice(0, 120),
    userTier: input.userTier?.slice(0, 40),
    metadata: sanitizeMetadata(input.metadata),
  };
}

function sanitizeMetadata(input: Record<string, unknown> = {}): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(input)
      .slice(0, INTENT_ROUTING_MAX_METADATA_KEYS)
      .map(([k, v]) => {
        const safeKey = k.slice(0, 80);
        if (/secret|token|password|api[_-]?key|credential/i.test(k)) return [safeKey, "[redacted]"];
        if (typeof v === "string") return [safeKey, v.slice(0, INTENT_ROUTING_MAX_METADATA_VALUE_LENGTH)];
        if (typeof v === "number" || typeof v === "boolean" || v === null) return [safeKey, v];
        return [safeKey, "[object]"];
      }),
  );
}

// ---------------------------------------------------------------------------
// Secret / forbidden blocking
// ---------------------------------------------------------------------------

export function blockIfSecretLike(input: string): string | null {
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(input)) {
      return "Input contains secret-like content and was blocked.";
    }
  }
  return null;
}

export function blockIfForbiddenCapability(input: string): { blocked: boolean; reason: string } {
  for (const entry of ALL_RISKY_PATTERNS) {
    if (entry.pattern.test(input)) {
      return { blocked: true, reason: entry.reason };
    }
  }
  return { blocked: false, reason: "" };
}

// ---------------------------------------------------------------------------
// Signal detection
// ---------------------------------------------------------------------------

export function detectSignals(message: string): LucaIntentSignal[] {
  const signals: LucaIntentSignal[] = [];

  for (const entry of ALL_RISKY_PATTERNS) {
    if (entry.pattern.test(message) && !signals.includes(entry.signal)) {
      signals.push(entry.signal);
    }
  }

  if (MEMORY_PATTERNS.some((p) => p.test(message))) signals.push("memory_candidate");
  if (SAFE_ACTION_PATTERNS.some((p) => p.test(message))) signals.push("safe_local_action");
  if (SKILL_PATTERNS.some((p) => p.test(message))) signals.push("skill_or_plugin");
  if (MULTI_STEP_PATTERNS.some((p) => p.test(message))) signals.push("multi_step_task");
  if (FUTURE_CONTINUITY_PATTERNS.some((p) => p.test(message))) signals.push("future_continuity");
  if (WRITING_PATTERNS.some((p) => p.test(message))) signals.push("writing_or_rewrite");
  if (SIMPLE_CHAT_PATTERNS.some((p) => p.test(message))) signals.push("simple_chat");
  if (/\bexplain\b/i.test(message) || /\btell\s*me\b/i.test(message)) {
    if (!signals.includes("explanation")) signals.push("explanation");
  }
  if (/\bremind\s*me\b/i.test(message) || /\bschedule\b/i.test(message)) {
    if (!signals.includes("reminder_or_schedule")) signals.push("reminder_or_schedule");
  }
  if (/\bresume\b/i.test(message) || /\bcontinue\s*(session|from|where)\b/i.test(message)) {
    if (!signals.includes("session_resume")) signals.push("session_resume");
  }

  if (signals.length === 0) signals.push("simple_chat");

  return signals;
}

// ---------------------------------------------------------------------------
// Risk detection
// ---------------------------------------------------------------------------

export function detectRisk(message: string): LucaIntentRiskLevel {
  if (blockIfSecretLike(message)) return "critical";

  const riskySignals = ALL_RISKY_PATTERNS.filter((entry) => entry.pattern.test(message));
  if (riskySignals.length > 0) {
    const hasWallet = riskySignals.some((s) => s.signal === "risky_wallet_finance");
    const hasSelfEvolution = riskySignals.some((s) => s.signal === "risky_self_evolution");
    if (hasWallet || hasSelfEvolution) return "critical";
    return "high";
  }

  if (SKILL_PATTERNS.some((p) => p.test(message))) return "elevated";
  if (MULTI_STEP_PATTERNS.some((p) => p.test(message))) return "low";
  return "safe";
}

// ---------------------------------------------------------------------------
// Route choice
// ---------------------------------------------------------------------------

function hasRiskySignals(signals: LucaIntentSignal[]): boolean {
  return signals.some((s) =>
    s === "risky_system_action" ||
    s === "risky_file_action" ||
    s === "risky_network_action" ||
    s === "risky_wallet_finance" ||
    s === "risky_browser_action" ||
    s === "risky_device_action" ||
    s === "risky_code_mutation" ||
    s === "risky_self_evolution",
  );
}

export function chooseRoute(
  mode: LucaRoutingMode,
  signals: LucaIntentSignal[],
  risk: LucaIntentRiskLevel,
): LucaIntentRoute {
  if (risk === "critical") return "blocked_risky_action";
  if (risk === "high" && hasRiskySignals(signals)) return "blocked_risky_action";

  if (signals.includes("unclear_consequential")) return "ask_user";

  if (signals.includes("skill_or_plugin")) return "skill_request";

  if (signals.includes("safe_local_action") && !hasRiskySignals(signals)) {
    return "safe_execution_request";
  }

  if (signals.includes("memory_candidate") && !hasRiskySignals(signals)) {
    return "memory_proposal";
  }

  switch (mode) {
    case "fast": {
      if (hasRiskySignals(signals)) return "blocked_risky_action";
      return "fast_response";
    }
    case "plan": {
      if (hasRiskySignals(signals)) return "blocked_risky_action";
      if (
        signals.includes("multi_step_task") ||
        signals.includes("project_workflow") ||
        signals.includes("future_continuity")
      ) {
        return "runtime_plan";
      }
      return "fast_response";
    }
    case "agent": {
      if (hasRiskySignals(signals)) return "blocked_risky_action";
      if (
        signals.includes("multi_step_task") ||
        signals.includes("project_workflow") ||
        signals.includes("future_continuity") ||
        signals.includes("reminder_or_schedule") ||
        signals.includes("session_resume")
      ) {
        return "runtime_plan";
      }
      return "fast_response";
    }
    case "auto":
    default: {
      if (hasRiskySignals(signals)) return "blocked_risky_action";

      if (
        signals.includes("multi_step_task") ||
        signals.includes("project_workflow")
      ) {
        return "runtime_plan";
      }

      if (signals.includes("future_continuity")) return "runtime_plan";

      return "fast_response";
    }
  }
}

// ---------------------------------------------------------------------------
// Escalation helpers
// ---------------------------------------------------------------------------

export function shouldEscalateToPlan(
  mode: LucaRoutingMode,
  signals: LucaIntentSignal[],
  risk: LucaIntentRiskLevel,
): boolean {
  if (risk === "critical" || risk === "high") return false;
  const route = chooseRoute(mode, signals, risk);
  return route === "runtime_plan";
}

export function shouldStayFast(
  mode: LucaRoutingMode,
  signals: LucaIntentSignal[],
  risk: LucaIntentRiskLevel,
): boolean {
  const route = chooseRoute(mode, signals, risk);
  return route === "fast_response";
}

// ---------------------------------------------------------------------------
// Full classification
// ---------------------------------------------------------------------------

export function classifyIntent(input: LucaIntentRoutingInput): Omit<LucaIntentRoutingDecision, "decisionId" | "createdAt" | "createdPlanId" | "createdMemoryProposalIds" | "createdGovernedRequestIds" | "createdSkillRequestIds" | "createdCheckpointIds" | "inboxEventIds"> {
  const risk = detectRisk(input.message);
  const sanitized = sanitizeIntentInput(input);
  const message = sanitized.message;
  const mode = sanitized.mode;
  const signals = detectSignals(message);
  const route = chooseRoute(mode, signals, risk);

  const shouldCreatePlan = route === "runtime_plan";
  const shouldCreateMemoryProposal = route === "memory_proposal";
  const shouldCreateGovernedRequest = route === "governed_action_request" || route === "safe_execution_request";
  const shouldCreateSkillRequest = route === "skill_request";
  const shouldCreateCheckpoint = route === "planning_checkpoint";
  const shouldAskUser = route === "ask_user";
  const shouldBlock = route === "blocked_risky_action";

  const confidence = risk === "safe" ? 0.9 : risk === "low" ? 0.8 : risk === "elevated" ? 0.6 : 0.4;
  const reason = buildReason(route, signals, risk, mode);

  return {
    mode,
    route,
    riskLevel: risk,
    confidence,
    userIntentSummary: message.slice(0, INTENT_ROUTING_MAX_SUMMARY_LENGTH),
    reason: reason.slice(0, INTENT_ROUTING_MAX_REASON_LENGTH),
    signals,
    shouldCreatePlan,
    shouldCreateMemoryProposal,
    shouldCreateGovernedRequest,
    shouldCreateSkillRequest,
    shouldCreateCheckpoint,
    shouldAskUser,
    shouldBlock,
    metadata: sanitizeMetadata(sanitized.metadata),
  };
}

function buildReason(
  route: LucaIntentRoute,
  signals: LucaIntentSignal[],
  risk: LucaIntentRiskLevel,
  mode: LucaRoutingMode,
): string {
  switch (route) {
    case "fast_response":
      return `Routed fast in ${mode} mode. Signals: ${signals.join(", ")}.`;
    case "memory_proposal":
      return `Memory-related intent detected. Creating proposal only (no write).`;
    case "runtime_plan":
      return `Multi-step/workflow/continuity intent. Creating plan only (no execution).`;
    case "governed_action_request":
      return `Actionable intent detected. Creating governed request only (no execution).`;
    case "safe_execution_request":
      return `Safe local action. Creating governed request only (no execution).`;
    case "skill_request":
      return `Skill/plugin intent. Creating state-only skill request (no install/run).`;
    case "planning_checkpoint":
      return `Checkpoint creation warranted. No execution.`;
    case "blocked_risky_action":
      return `Blocked: risky intent (${risk}). Signals: ${signals.filter((s) => s.startsWith("risky_")).join(", ")}.`;
    case "ask_user":
      return `Unclear or consequential intent. Asking user for clarification.`;
    default:
      return `Routed to ${route} in ${mode} mode.`;
  }
}
