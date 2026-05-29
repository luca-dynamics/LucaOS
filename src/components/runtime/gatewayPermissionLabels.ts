// gatewayPermissionLabels — PR #130: Gateway Permission UX + Future Control Readiness
// Pure helper functions for gateway permission labels, tones, safeguard checklists,
// and future-readiness copy.
//
// No service imports. No localStorage. No execution. No side effects.
//
// Gateway control stages (current research roadmap, spec only — not enabled):
//   Stage 0: research-only records, no execution
//   Stage 1: future observation permission model, no action
//   Stage 2: future sandboxed browser prototype, human confirmation required
//   Stage 3: future desktop/device prototype behind hard gates
//
// Every helper here describes future requirements as safeguards, not as enabled
// capabilities. Nothing in this module enables browser, desktop, device, screen,
// app, file, network, wallet, or MCP control.
//
// PR #130 scope reminder for safeguards/permission matrix copy:
//   - Gateway execution is disabled. allowedForExecution is always false.
//   - Records are blocked, dry-run-only, waiting-user, or archived.
//   - No browser automation, no DOM read, no screen capture, no file mutation,
//     no network calls, no wallet, no MCP execution, no credential handling.

import type {
  GatewayCapability,
  GatewayPolicyDecision,
  GatewayRequestRecord,
  GatewayRequestStatus,
  GatewayRiskLevel,
  GatewaySurface,
} from "../../types/browserDesktopGateway";

// ---------------------------------------------------------------------------
// Tone
// ---------------------------------------------------------------------------

export type GatewayTone = "good" | "warn" | "danger" | "neutral" | "info";

// ---------------------------------------------------------------------------
// Surface labels
// ---------------------------------------------------------------------------

export function getGatewaySurfaceLabel(surface: GatewaySurface): string {
  switch (surface) {
    case "browser": return "Browser";
    case "desktop": return "Desktop";
    case "device": return "Device";
    case "screen": return "Screen";
    case "app": return "App";
    case "file": return "File";
    case "network": return "Network";
    case "wallet": return "Wallet";
    case "mcp": return "MCP";
    case "unknown": return "Unknown surface";
  }
}

// ---------------------------------------------------------------------------
// Capability labels
// ---------------------------------------------------------------------------

export function getGatewayCapabilityLabel(capability: GatewayCapability): string {
  switch (capability) {
    case "observe_screen": return "Observe screen";
    case "read_dom": return "Read DOM";
    case "browser_open_url": return "Open browser URL";
    case "browser_click": return "Browser click";
    case "browser_type": return "Browser type";
    case "browser_submit": return "Browser submit";
    case "browser_scrape": return "Browser scrape";
    case "browser_login": return "Browser login";
    case "desktop_click": return "Desktop click";
    case "desktop_type": return "Desktop type";
    case "desktop_open_app": return "Open desktop app";
    case "desktop_close_app": return "Close desktop app";
    case "device_read_status": return "Read device status";
    case "device_control": return "Device control";
    case "file_read": return "Read file";
    case "file_write": return "Write file";
    case "file_delete": return "Delete file";
    case "network_request": return "Network request";
    case "wallet_read": return "Read wallet";
    case "wallet_transaction": return "Wallet transaction";
    case "mcp_call": return "MCP call";
    case "unknown": return "Unknown capability";
  }
}

// ---------------------------------------------------------------------------
// Status labels and tones
// ---------------------------------------------------------------------------

export function getGatewayStatusLabel(status: GatewayRequestStatus): string {
  switch (status) {
    case "proposed": return "Proposed";
    case "dry_run_only": return "Dry-run only";
    case "blocked": return "Blocked for safety";
    case "waiting_user": return "Waiting for clarification";
    case "archived": return "Archived";
  }
}

export function getGatewayStatusTone(status: GatewayRequestStatus): GatewayTone {
  switch (status) {
    case "proposed": return "info";
    case "dry_run_only": return "warn";
    case "blocked": return "danger";
    case "waiting_user": return "warn";
    case "archived": return "neutral";
  }
}

// ---------------------------------------------------------------------------
// Risk labels and tones
// ---------------------------------------------------------------------------

export function getGatewayRiskLabel(riskLevel: GatewayRiskLevel): string {
  switch (riskLevel) {
    case "safe": return "Safe";
    case "low": return "Low risk";
    case "elevated": return "Elevated risk";
    case "high": return "High risk";
    case "critical": return "Critical risk";
  }
}

export function getGatewayRiskTone(riskLevel: GatewayRiskLevel): GatewayTone {
  switch (riskLevel) {
    case "safe": return "good";
    case "low": return "good";
    case "elevated": return "warn";
    case "high": return "danger";
    case "critical": return "danger";
  }
}

// ---------------------------------------------------------------------------
// Safeguard checklist
// ---------------------------------------------------------------------------

export interface GatewaySafeguardLabel {
  key:
    | "requiresApproval"
    | "requiresSandbox"
    | "requiresHumanConfirmation"
    | "requiresCredentialBoundary"
    | "requiresAuditLog";
  label: string;
  required: boolean;
}

export function getGatewaySafeguardLabels(policyDecision: GatewayPolicyDecision): GatewaySafeguardLabel[] {
  return [
    { key: "requiresApproval", label: "Approval required", required: policyDecision.requiresApproval },
    { key: "requiresSandbox", label: "Sandbox required", required: policyDecision.requiresSandbox },
    { key: "requiresHumanConfirmation", label: "Human confirmation required", required: policyDecision.requiresHumanConfirmation },
    { key: "requiresCredentialBoundary", label: "Credential boundary required", required: policyDecision.requiresCredentialBoundary },
    { key: "requiresAuditLog", label: "Audit log required", required: policyDecision.requiresAuditLog },
  ];
}

// ---------------------------------------------------------------------------
// Permission summary
// ---------------------------------------------------------------------------

export function getGatewayPermissionSummary(record: GatewayRequestRecord): string {
  const surface = getGatewaySurfaceLabel(record.surface);
  const capability = getGatewayCapabilityLabel(record.capability);
  const status = getGatewayStatusLabel(record.status);
  return `${surface} · ${capability} · ${status}`;
}

// ---------------------------------------------------------------------------
// Next action (what the user can do — no execution available)
// ---------------------------------------------------------------------------

export function getGatewayNextAction(record: GatewayRequestRecord): string {
  switch (record.status) {
    case "blocked":
      return "Archive or review only — gateway execution remains disabled.";
    case "dry_run_only":
      return "No action available — future permission model is required before any execution.";
    case "waiting_user":
      return "Clarify later — gateway execution remains disabled.";
    case "proposed":
      return "No action available — gateway execution remains disabled.";
    case "archived":
      return "No action needed — record archived.";
  }
}

// ---------------------------------------------------------------------------
// No-execution copy
// ---------------------------------------------------------------------------

export function getGatewayNoExecutionText(): string {
  return "Research-only — gateway control is disabled. No browser, desktop, device, file, network, wallet, or MCP control is enabled. Future control would require explicit approval, sandboxing, human confirmation, credential boundaries, and audit logging.";
}

// ---------------------------------------------------------------------------
// Future-readiness copy (per-record)
// ---------------------------------------------------------------------------

export function getGatewayFutureReadinessText(record: GatewayRequestRecord): string {
  if (record.status === "blocked") {
    return "Future readiness: not eligible — blocked by gateway research policy.";
  }
  if (record.status === "archived") {
    return "Future readiness: not applicable — record archived.";
  }
  const surface = getGatewaySurfaceLabel(record.surface);
  return `Future readiness: ${surface.toLowerCase()} control would require approval, sandboxing, human confirmation, credential boundaries, and audit logging before any execution could be considered.`;
}

// ---------------------------------------------------------------------------
// Credential boundary copy (per-record)
// ---------------------------------------------------------------------------

export function getGatewayCredentialBoundaryText(record: GatewayRequestRecord): string {
  if (record.policyDecision.requiresCredentialBoundary) {
    return "Credential boundary: required. No credentials, passwords, tokens, wallet keys, or session cookies would ever be captured, displayed, or stored.";
  }
  return "Credential boundary: not flagged for this surface/capability, but credentials are never captured by Luca regardless.";
}

// ---------------------------------------------------------------------------
// Permission matrix (surface + capability → permission spec)
// ---------------------------------------------------------------------------

export type GatewayPermissionCurrentState =
  | "disabled"
  | "blocked"
  | "dry_run_only";

export interface GatewayPermissionMatrixEntry {
  permissionName: string;
  permissionDescription: string;
  currentState: GatewayPermissionCurrentState;
  futureRequirements: string[];
  blockedReason?: string;
}

const APPROVAL_REQ = "Explicit user approval";
const SANDBOX_REQ = "Sandboxed surface boundary";
const HUMAN_REQ = "Human confirmation per action";
const CREDENTIAL_REQ = "No credential capture";
const AUDIT_REQ = "Full audit log";

export function getGatewayPermissionMatrix(
  surface: GatewaySurface,
  capability: GatewayCapability,
): GatewayPermissionMatrixEntry {
  // Hard-blocked capabilities (never automatic).
  if (capability === "wallet_transaction") {
    return {
      permissionName: "Wallet transaction",
      permissionDescription: "Send, swap, stake, bridge, or otherwise move funds from a wallet.",
      currentState: "blocked",
      futureRequirements: ["Unavailable — never automatic"],
      blockedReason: "Wallet transactions are blocked by gateway research policy. Luca will never automatically move funds.",
    };
  }
  if (capability === "file_delete") {
    return {
      permissionName: "File deletion",
      permissionDescription: "Delete or remove a file from the user's machine.",
      currentState: "blocked",
      futureRequirements: ["Unavailable until a dedicated file safety model exists"],
      blockedReason: "File deletion is blocked by gateway research policy. A dedicated file-safety model would be required first.",
    };
  }
  if (capability === "file_write") {
    return {
      permissionName: "File write",
      permissionDescription: "Create or modify a file on the user's machine.",
      currentState: "blocked",
      futureRequirements: ["Unavailable until a dedicated file safety model exists"],
      blockedReason: "File write is blocked by gateway research policy. A dedicated file-safety model would be required first.",
    };
  }
  if (capability === "browser_login") {
    return {
      permissionName: "Browser login",
      permissionDescription: "Log into a website using user credentials.",
      currentState: "blocked",
      futureRequirements: ["Unavailable — credentials are never handled by Luca"],
      blockedReason: "Browser login is blocked. Luca never captures, displays, or stores passwords, tokens, or session cookies.",
    };
  }
  if (capability === "device_control") {
    return {
      permissionName: "Device control",
      permissionDescription: "Send control commands to a physical device, robot, or peripheral.",
      currentState: "blocked",
      futureRequirements: ["Unavailable until a dedicated device safety model exists"],
      blockedReason: "Device control is blocked by gateway research policy. A dedicated device safety model would be required first.",
    };
  }

  // Read-only observation capabilities — dry-run records only.
  if (capability === "observe_screen") {
    return {
      permissionName: "Screen observation",
      permissionDescription: "Observe a region of the user's screen for context.",
      currentState: "dry_run_only",
      futureRequirements: [APPROVAL_REQ, SANDBOX_REQ, HUMAN_REQ, CREDENTIAL_REQ, AUDIT_REQ],
    };
  }
  if (capability === "read_dom") {
    return {
      permissionName: "Read DOM",
      permissionDescription: "Read the DOM of a browser page Luca is observing.",
      currentState: "dry_run_only",
      futureRequirements: [APPROVAL_REQ, SANDBOX_REQ, "Visible browser boundary", HUMAN_REQ, CREDENTIAL_REQ, AUDIT_REQ],
    };
  }
  if (capability === "device_read_status") {
    return {
      permissionName: "Read device status",
      permissionDescription: "Read read-only status information from a paired device.",
      currentState: "dry_run_only",
      futureRequirements: [APPROVAL_REQ, SANDBOX_REQ, HUMAN_REQ, CREDENTIAL_REQ, AUDIT_REQ],
    };
  }

  // Browser interaction.
  if (
    capability === "browser_open_url" ||
    capability === "browser_click" ||
    capability === "browser_type" ||
    capability === "browser_submit" ||
    capability === "browser_scrape"
  ) {
    return {
      permissionName: "Browser interaction",
      permissionDescription: "Open, click, type, submit, or scrape inside a browser surface.",
      currentState: "dry_run_only",
      futureRequirements: [APPROVAL_REQ, SANDBOX_REQ, "Visible browser boundary", HUMAN_REQ, AUDIT_REQ],
    };
  }

  // Desktop interaction.
  if (
    capability === "desktop_click" ||
    capability === "desktop_type" ||
    capability === "desktop_open_app" ||
    capability === "desktop_close_app"
  ) {
    return {
      permissionName: "Desktop interaction",
      permissionDescription: "Click, type, or launch/close an application on the user's desktop.",
      currentState: "dry_run_only",
      futureRequirements: [APPROVAL_REQ, SANDBOX_REQ, HUMAN_REQ, "Visible desktop boundary", AUDIT_REQ],
    };
  }

  // File read.
  if (capability === "file_read") {
    return {
      permissionName: "File read",
      permissionDescription: "Read the contents of a file from the user's machine.",
      currentState: "dry_run_only",
      futureRequirements: [APPROVAL_REQ, SANDBOX_REQ, HUMAN_REQ, CREDENTIAL_REQ, AUDIT_REQ],
    };
  }

  // Network request.
  if (capability === "network_request") {
    return {
      permissionName: "Network request",
      permissionDescription: "Make an outbound network request from the user's machine.",
      currentState: "dry_run_only",
      futureRequirements: [APPROVAL_REQ, SANDBOX_REQ, HUMAN_REQ, CREDENTIAL_REQ, AUDIT_REQ],
    };
  }

  // Wallet read (read-only).
  if (capability === "wallet_read") {
    return {
      permissionName: "Wallet read",
      permissionDescription: "Read read-only wallet balance or activity information.",
      currentState: "dry_run_only",
      futureRequirements: [APPROVAL_REQ, SANDBOX_REQ, HUMAN_REQ, CREDENTIAL_REQ, AUDIT_REQ],
    };
  }

  // MCP call.
  if (capability === "mcp_call") {
    return {
      permissionName: "MCP call",
      permissionDescription: "Invoke an external Model Context Protocol tool.",
      currentState: "dry_run_only",
      futureRequirements: [APPROVAL_REQ, SANDBOX_REQ, HUMAN_REQ, CREDENTIAL_REQ, AUDIT_REQ],
    };
  }

  // Unknown / fallthrough.
  return {
    permissionName: `${getGatewaySurfaceLabel(surface)} permission`,
    permissionDescription: `Future ${getGatewaySurfaceLabel(surface).toLowerCase()} control permission. Currently disabled.`,
    currentState: "disabled",
    futureRequirements: [APPROVAL_REQ, SANDBOX_REQ, HUMAN_REQ, CREDENTIAL_REQ, AUDIT_REQ],
  };
}
