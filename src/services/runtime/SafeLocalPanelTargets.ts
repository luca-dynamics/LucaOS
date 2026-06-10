// SafeLocalPanelTargets — PR #126: Safe App/Panel Launcher Governance
// Allowlist of safe local LucaOS UI panel/view targets.
// No external URLs. No shell. No filesystem. No browser. No device control.

import type { GovernedExecutionCapability } from "../../types/governedToolExecution";

// ---------------------------------------------------------------------------
// Allowed panel/view/ui targets
// ---------------------------------------------------------------------------

export const SAFE_LOCAL_PANEL_TARGETS = [
  "panel:control",
  "panel:activity",
  "panel:memory",
  "panel:logs",
  "panel:model-manager",
  "view:runtime-diagnostics",
  "view:memory-proposals",
  "view:skill-requests",
  "view:current-plan",
  "view:routing-decisions",
  "ui:notify",
] as const;

export type SafeLocalPanelTarget = typeof SAFE_LOCAL_PANEL_TARGETS[number];

const TARGET_SET = new Set<string>(SAFE_LOCAL_PANEL_TARGETS);

// ---------------------------------------------------------------------------
// Blocked prefixes — anything matching these is never a safe local target
// ---------------------------------------------------------------------------

const BLOCKED_PREFIXES = [
  "app:", "os:", "file:", "browser:", "device:", "mcp:",
  "wallet:", "network:", "shell:", "terminal:",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function isSafeLocalPanelTarget(target: string): target is SafeLocalPanelTarget {
  return TARGET_SET.has(target.toLowerCase().trim());
}

export function getSafeLocalPanelLabel(target: string): string {
  const labels: Record<string, string> = {
    "panel:control": "Control Panel",
    "panel:activity": "Activity Panel",
    "panel:memory": "Memory Panel",
    "panel:logs": "Logs Panel",
    "panel:model-manager": "Model Manager",
    "view:runtime-diagnostics": "Runtime Diagnostics",
    "view:memory-proposals": "Memory Proposals",
    "view:skill-requests": "Skill Requests",
    "view:current-plan": "Current Plan",
    "view:routing-decisions": "Routing Decisions",
    "ui:notify": "Notification",
  };
  return labels[target.toLowerCase().trim()] ?? target;
}

export function getSafeLocalPanelEvent(target: string): string | null {
  const normalized = target.toLowerCase().trim();
  if (normalized === "ui:notify") return null;
  if (normalized.startsWith("panel:")) return "luca:open-right-panel";
  if (normalized.startsWith("view:")) return "luca:open-right-panel";
  return null;
}

/**
 * Maps a target to the right-panel tab it should open.
 * Returns null for targets that don't map to a right-panel tab (e.g. ui:notify).
 */
export function getTargetPanelTab(target: string): string | null {
  const map: Record<string, string | null> = {
    "panel:control": "CONTROL",
    "panel:activity": "ACTIVITY",
    "panel:memory": "MEMORY",
    "panel:logs": "LOGS",
    "panel:model-manager": "model-manager",
    "view:runtime-diagnostics": "CONTROL",
    "view:memory-proposals": "MEMORY",
    "view:skill-requests": "ACTIVITY",
    "view:current-plan": "CONTROL",
    "view:routing-decisions": "LOGS",
    "ui:notify": null,
  };
  return map[target.toLowerCase().trim()] ?? null;
}

export function getTargetCapability(target: string): GovernedExecutionCapability {
  const normalized = target.toLowerCase().trim();
  if (normalized === "ui:notify") return "notify";
  if (normalized.startsWith("panel:")) return "open_panel";
  if (normalized === "view:runtime-diagnostics") return "runtime_read";
  if (normalized === "view:memory-proposals") return "memory_read";
  if (normalized === "view:current-plan") return "runtime_read";
  if (normalized === "view:routing-decisions") return "runtime_read";
  if (normalized === "view:skill-requests") return "runtime_read";
  return "open_panel";
}

/**
 * Normalize user input variations to a canonical SafeLocalPanelTarget.
 * Returns null if the input doesn't match any known safe target.
 */
export function normalizeSafeLocalPanelTarget(input: string): SafeLocalPanelTarget | null {
  const trimmed = input.toLowerCase().trim();

  if (TARGET_SET.has(trimmed)) return trimmed as SafeLocalPanelTarget;

  if (BLOCKED_PREFIXES.some((prefix) => trimmed.startsWith(prefix))) return null;

  const PHRASE_MAP: Array<{ patterns: RegExp[]; target: SafeLocalPanelTarget }> = [
    { patterns: [/^open\s+control$/i, /^show\s+control$/i, /^control\s+panel$/i], target: "panel:control" },
    { patterns: [/^open\s+activity$/i, /^show\s+activity$/i, /^activity\s+panel$/i], target: "panel:activity" },
    { patterns: [/^open\s+memory$/i, /^show\s+memory$/i, /^memory\s+panel$/i], target: "panel:memory" },
    { patterns: [/^open\s+logs?$/i, /^show\s+logs?$/i, /^logs?\s+panel$/i], target: "panel:logs" },
    { patterns: [/^open\s+model\s*manager$/i, /^show\s+model\s*manager$/i], target: "panel:model-manager" },
    { patterns: [/^show\s+(runtime\s+)?diagnostics$/i, /^open\s+diagnostics$/i, /^runtime\s+diagnostics$/i], target: "view:runtime-diagnostics" },
    { patterns: [/^show\s+memory\s+proposals?$/i], target: "view:memory-proposals" },
    { patterns: [/^show\s+skill\s+requests?$/i], target: "view:skill-requests" },
    { patterns: [/^show\s+(current\s+)?plan$/i, /^show\s+runtime\s+plan$/i], target: "view:current-plan" },
    { patterns: [/^show\s+routing\s+decisions?$/i], target: "view:routing-decisions" },
  ];

  for (const entry of PHRASE_MAP) {
    if (entry.patterns.some((p) => p.test(trimmed))) return entry.target;
  }

  return null;
}
