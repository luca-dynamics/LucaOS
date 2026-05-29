// intentRoutingLabels — PR #125: Plan & Route UX Polish
// Pure helper for route labels, tones, hint copy, and next-action text.
// No side effects. No execution. No state mutation.

import type { LucaIntentRoute } from "../../types/intentRouting";

// ---------------------------------------------------------------------------
// Route tone (for UI coloring)
// ---------------------------------------------------------------------------

export type RouteTone =
  | "neutral"
  | "plan"
  | "memory"
  | "approval"
  | "skill"
  | "blocked"
  | "attention";

export function getRouteTone(route: LucaIntentRoute): RouteTone {
  switch (route) {
    case "fast_response":
      return "neutral";
    case "runtime_plan":
    case "planning_checkpoint":
      return "plan";
    case "memory_proposal":
      return "memory";
    case "governed_action_request":
    case "safe_execution_request":
      return "approval";
    case "skill_request":
      return "skill";
    case "blocked_risky_action":
      return "blocked";
    case "ask_user":
      return "attention";
    default:
      return "neutral";
  }
}

// ---------------------------------------------------------------------------
// Human-readable route label
// ---------------------------------------------------------------------------

export function getRouteLabel(route: LucaIntentRoute): string {
  switch (route) {
    case "fast_response":
      return "Fast response";
    case "runtime_plan":
      return "Runtime plan";
    case "memory_proposal":
      return "Memory proposal";
    case "governed_action_request":
      return "Governed action";
    case "safe_execution_request":
      return "Safe action request";
    case "skill_request":
      return "Skill request";
    case "planning_checkpoint":
      return "Planning checkpoint";
    case "blocked_risky_action":
      return "Blocked";
    case "ask_user":
      return "Clarification needed";
    default:
      return String(route);
  }
}

// ---------------------------------------------------------------------------
// Route hint copy (shown in chat)
// ---------------------------------------------------------------------------

export function getRouteHintText(route: LucaIntentRoute): string {
  switch (route) {
    case "fast_response":
      return "";
    case "runtime_plan":
      return "Plan created. Review it in ACTIVITY → Runtime Plans. No action has been executed.";
    case "memory_proposal":
      return "Memory proposal created. Review it in ACTIVITY or MEMORY. It has not been saved yet.";
    case "governed_action_request":
      return "Governed action request created. It needs approval before anything can run.";
    case "safe_execution_request":
      return "Safe action request created. It still needs approval and Run once.";
    case "skill_request":
      return "Skill request created. It is state-only and will not install or run anything.";
    case "planning_checkpoint":
      return "Planning checkpoint created. No action has been executed.";
    case "blocked_risky_action":
      return "Blocked for safety. Luca recorded the request but did not execute it.";
    case "ask_user":
      return "Clarification needed before Luca creates a governed plan or request.";
    default:
      return "";
  }
}

// ---------------------------------------------------------------------------
// Next action text (what the user should do)
// ---------------------------------------------------------------------------

export function getRouteNextAction(route: LucaIntentRoute): string {
  switch (route) {
    case "fast_response":
      return "";
    case "runtime_plan":
      return "Review and activate in ACTIVITY → Runtime Plans.";
    case "memory_proposal":
      return "Approve and save in ACTIVITY → Memory proposals.";
    case "governed_action_request":
      return "Approve in ACTIVITY → Pending approvals.";
    case "safe_execution_request":
      return "Approve and run once in ACTIVITY → Pending approvals.";
    case "skill_request":
      return "Review in ACTIVITY → Skill requests.";
    case "planning_checkpoint":
      return "Review in ACTIVITY → Planning checkpoints.";
    case "blocked_risky_action":
      return "No action required. Request was blocked for safety.";
    case "ask_user":
      return "Reply to provide the requested clarification.";
    default:
      return "";
  }
}

// ---------------------------------------------------------------------------
// No-execution text
// ---------------------------------------------------------------------------

export function getRouteNoExecutionText(route: LucaIntentRoute): string {
  switch (route) {
    case "fast_response":
      return "";
    case "runtime_plan":
    case "planning_checkpoint":
      return "No execution performed";
    case "memory_proposal":
      return "Not saved yet";
    case "governed_action_request":
    case "safe_execution_request":
      return "Needs approval";
    case "skill_request":
      return "State-only";
    case "blocked_risky_action":
      return "Blocked — no execution";
    case "ask_user":
      return "Waiting for user";
    default:
      return "No execution";
  }
}

// ---------------------------------------------------------------------------
// Tone → CSS color class mapping (for route hint styling)
// ---------------------------------------------------------------------------

export function getRouteToneColor(tone: RouteTone): string {
  switch (tone) {
    case "plan":
      return "text-sky-300";
    case "memory":
      return "text-violet-300";
    case "approval":
      return "text-amber-300";
    case "skill":
      return "text-teal-300";
    case "blocked":
      return "text-red-300";
    case "attention":
      return "text-amber-200";
    case "neutral":
    default:
      return "text-slate-400";
  }
}

export function getRouteToneBorder(tone: RouteTone): string {
  switch (tone) {
    case "plan":
      return "border-sky-500/20";
    case "memory":
      return "border-violet-500/20";
    case "approval":
      return "border-amber-500/20";
    case "skill":
      return "border-teal-500/20";
    case "blocked":
      return "border-red-500/20";
    case "attention":
      return "border-amber-500/20";
    case "neutral":
    default:
      return "border-white/10";
  }
}

export function getRouteToneBg(tone: RouteTone): string {
  switch (tone) {
    case "plan":
      return "bg-sky-500/5";
    case "memory":
      return "bg-violet-500/5";
    case "approval":
      return "bg-amber-500/5";
    case "skill":
      return "bg-teal-500/5";
    case "blocked":
      return "bg-red-500/5";
    case "attention":
      return "bg-amber-500/5";
    case "neutral":
    default:
      return "bg-white/[0.02]";
  }
}

// ---------------------------------------------------------------------------
// Dedupe helper — avoid spamming the same hint within a short window
// ---------------------------------------------------------------------------

const DEDUPE_WINDOW_MS = 5_000;

export function shouldAppendRouteHint(
  prevMessages: Array<{ text?: string; isRouteHint?: boolean; timestamp?: number }>,
  hintText: string,
): boolean {
  if (!hintText) return false;
  const now = Date.now();
  for (let i = prevMessages.length - 1; i >= 0; i--) {
    const msg = prevMessages[i];
    if (!msg.isRouteHint) continue;
    if (msg.timestamp && now - msg.timestamp > DEDUPE_WINDOW_MS) break;
    if (msg.text === hintText) return false;
  }
  return true;
}
