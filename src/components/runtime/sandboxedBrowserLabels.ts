// sandboxedBrowserLabels — PR #133: Sandboxed Browser Prototype, research/design only.
// Pure helper functions for labels, tones, safeguard checklists, a permission
// matrix, and no-launch / future-readiness copy.
//
// No service imports. No localStorage. No execution. No side effects.
// Nothing here enables browser launch, automation, DOM reading, or networking.

import type {
  SandboxedBrowserCapability,
  SandboxedBrowserCredentialBoundary,
  SandboxedBrowserNavigationRisk,
  SandboxedBrowserPolicyDecision,
  SandboxedBrowserRequestRecord,
  SandboxedBrowserRequestStatus,
  SandboxedBrowserRiskLevel,
  SandboxedBrowserSessionRecord,
  SandboxedBrowserSessionStatus,
  SandboxedBrowserSurface,
} from "../../types/sandboxedBrowser";

export type SandboxedBrowserTone = "good" | "warn" | "danger" | "neutral" | "info";

export type SandboxedBrowserStatus = SandboxedBrowserRequestStatus | SandboxedBrowserSessionStatus;

type SandboxedBrowserRecord = SandboxedBrowserRequestRecord | SandboxedBrowserSessionRecord;

// ---------------------------------------------------------------------------
// Surface labels
// ---------------------------------------------------------------------------

export function getSandboxedBrowserSurfaceLabel(surface: SandboxedBrowserSurface): string {
  switch (surface) {
    case "sandboxed_browser": return "Sandboxed browser";
    case "browser_tab": return "Browser tab";
    case "browser_page": return "Browser page";
    case "browser_form": return "Browser form";
    case "browser_download": return "Browser download";
    case "browser_upload": return "Browser upload";
    case "browser_payment": return "Browser payment";
    case "browser_wallet": return "Browser wallet";
    case "unknown": return "Unknown surface";
  }
}

// ---------------------------------------------------------------------------
// Capability labels
// ---------------------------------------------------------------------------

export function getSandboxedBrowserCapabilityLabel(capability: SandboxedBrowserCapability): string {
  switch (capability) {
    case "open_url": return "Open URL";
    case "navigate": return "Navigate";
    case "read_page_metadata": return "Read page metadata";
    case "read_dom": return "Read DOM (disabled)";
    case "click": return "Click";
    case "type": return "Type";
    case "submit_form": return "Submit form";
    case "login": return "Login (blocked)";
    case "scrape": return "Scrape (disabled)";
    case "download_file": return "Download file (blocked)";
    case "upload_file": return "Upload file (blocked)";
    case "payment": return "Payment (blocked)";
    case "wallet_connect": return "Wallet connect (blocked)";
    case "wallet_transaction": return "Wallet transaction (blocked)";
    case "unknown": return "Unknown capability";
  }
}

// ---------------------------------------------------------------------------
// Status labels and tones
// ---------------------------------------------------------------------------

export function getSandboxedBrowserStatusLabel(status: SandboxedBrowserStatus): string {
  switch (status) {
    case "proposed": return "Proposed";
    case "dry_run_only": return "Dry-run only";
    case "blocked": return "Blocked for safety";
    case "waiting_user": return "Waiting for user";
    case "revoked": return "Revoked";
    case "expired": return "Expired";
    case "archived": return "Archived";
  }
}

export function getSandboxedBrowserStatusTone(status: SandboxedBrowserStatus): SandboxedBrowserTone {
  switch (status) {
    case "proposed": return "info";
    case "dry_run_only": return "warn";
    case "blocked": return "danger";
    case "waiting_user": return "warn";
    case "revoked": return "neutral";
    case "expired": return "neutral";
    case "archived": return "neutral";
  }
}

// ---------------------------------------------------------------------------
// Risk labels
// ---------------------------------------------------------------------------

export function getSandboxedBrowserRiskLabel(riskLevel: SandboxedBrowserRiskLevel): string {
  switch (riskLevel) {
    case "low": return "Low risk";
    case "elevated": return "Elevated risk";
    case "high": return "High risk";
    case "critical": return "Critical risk";
  }
}

// ---------------------------------------------------------------------------
// Navigation risk labels
// ---------------------------------------------------------------------------

export function getSandboxedBrowserNavigationRiskLabel(navigationRisk: SandboxedBrowserNavigationRisk): string {
  switch (navigationRisk) {
    case "internal_safe": return "Internal / safe";
    case "external_unknown": return "External / unknown site";
    case "auth_required": return "Auth required";
    case "payment_or_wallet": return "Payment or wallet";
    case "download_or_upload": return "Download or upload";
    case "credential_or_secret": return "Credential or secret";
    case "unknown": return "Unknown navigation risk";
  }
}

// ---------------------------------------------------------------------------
// Credential boundary labels
// ---------------------------------------------------------------------------

export function getSandboxedBrowserCredentialBoundaryLabel(boundary: SandboxedBrowserCredentialBoundary): string {
  switch (boundary) {
    case "no_credentials": return "No credentials handled";
    case "credential_like_blocked": return "Credential-like content blocked";
    case "session_cookie_blocked": return "Session cookie blocked";
    case "wallet_blocked": return "Wallet blocked";
    case "payment_blocked": return "Payment blocked";
  }
}

// ---------------------------------------------------------------------------
// Safeguard checklist
// ---------------------------------------------------------------------------

export interface SandboxedBrowserSafeguardLabel {
  key:
    | "requiresExplicitApproval"
    | "requiresVisibleBrowserBoundary"
    | "requiresSandbox"
    | "requiresHumanConfirmation"
    | "requiresCredentialBoundary"
    | "requiresAuditLog"
    | "requiresDownloadUploadBlock"
    | "requiresWalletPaymentBlock"
    | "revocable";
  label: string;
  required: boolean;
}

export function getSandboxedBrowserSafeguardLabels(
  policyDecision: SandboxedBrowserPolicyDecision,
): SandboxedBrowserSafeguardLabel[] {
  return [
    { key: "requiresExplicitApproval", label: "Explicit approval required", required: policyDecision.requiresExplicitApproval },
    { key: "requiresVisibleBrowserBoundary", label: "Visible browser boundary required", required: policyDecision.requiresVisibleBrowserBoundary },
    { key: "requiresSandbox", label: "Sandbox required", required: policyDecision.requiresSandbox },
    { key: "requiresHumanConfirmation", label: "Human confirmation required", required: policyDecision.requiresHumanConfirmation },
    { key: "requiresCredentialBoundary", label: "Credential boundary required", required: policyDecision.requiresCredentialBoundary },
    { key: "requiresAuditLog", label: "Audit log required", required: policyDecision.requiresAuditLog },
    { key: "requiresDownloadUploadBlock", label: "Downloads/uploads blocked", required: policyDecision.requiresDownloadUploadBlock },
    { key: "requiresWalletPaymentBlock", label: "Wallet/payment blocked", required: policyDecision.requiresWalletPaymentBlock },
    { key: "revocable", label: "Revocable", required: policyDecision.revocable },
  ];
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

export function getSandboxedBrowserSummary(record: SandboxedBrowserRecord): string {
  const surface = getSandboxedBrowserSurfaceLabel(record.surface);
  const capability = getSandboxedBrowserCapabilityLabel(record.capability);
  const status = getSandboxedBrowserStatusLabel(record.status);
  return `${surface} · ${capability} · ${status}`;
}

// ---------------------------------------------------------------------------
// Next action (execution is never available)
// ---------------------------------------------------------------------------

export function getSandboxedBrowserNextAction(record: SandboxedBrowserRecord): string {
  switch (record.status) {
    case "blocked":
      return "Archive or review only — browser launch, automation, DOM read, and network requests remain disabled.";
    case "waiting_user":
      return "Awaiting user — dry-run permission session only. No browser is launched or automated.";
    case "dry_run_only":
      return "Create a dry-run permission session or archive — no browser launch, automation, or DOM read happens.";
    case "revoked":
      return "No action needed — browser permission was revoked.";
    case "expired":
      return "No action needed — browser permission expired.";
    case "proposed":
      return "No action available — browser launch and automation remain disabled.";
    case "archived":
      return "No action needed — record archived.";
  }
}

// ---------------------------------------------------------------------------
// No-launch copy
// ---------------------------------------------------------------------------

export function getSandboxedBrowserNoLaunchText(): string {
  return "Research-only — Luca cannot launch, read, click, type, submit, scrape, download, upload, or automate a browser. No DOM, page content, cookies, credentials, or downloaded/uploaded files are ever read or stored.";
}

// ---------------------------------------------------------------------------
// Future-readiness copy (per-record)
// ---------------------------------------------------------------------------

export function getSandboxedBrowserFutureReadinessText(record: SandboxedBrowserRecord): string {
  if (record.status === "blocked") {
    return "Future readiness: not eligible — blocked by sandboxed browser policy.";
  }
  if (record.status === "revoked" || record.status === "expired" || record.status === "archived") {
    return "Future readiness: not applicable — record is revoked, expired, or archived.";
  }
  const surface = getSandboxedBrowserSurfaceLabel(record.surface).toLowerCase();
  return `Future readiness: controlling the ${surface} would require explicit approval, a visible browser boundary, sandboxing, human confirmation per action, a credential boundary, audit logging, download/upload blocking, and wallet/payment blocking before any launch could be considered.`;
}

// ---------------------------------------------------------------------------
// Permission matrix (current state + future requirements per capability)
// ---------------------------------------------------------------------------

export interface SandboxedBrowserPermissionMatrixEntry {
  surface: SandboxedBrowserSurface;
  capability: SandboxedBrowserCapability;
  currentState: "dry_run_only" | "blocked";
  blockedReason?: string;
  futureRequirements: string[];
}

const FUTURE_REQUIREMENTS = [
  "Explicit approval",
  "Sandbox",
  "Visible browser boundary",
  "Human confirmation",
  "Audit log",
];

export function getSandboxedBrowserPermissionMatrix(
  surface: SandboxedBrowserSurface,
  capability: SandboxedBrowserCapability,
): SandboxedBrowserPermissionMatrixEntry {
  switch (capability) {
    case "open_url":
    case "navigate":
    case "read_page_metadata":
      return { surface, capability, currentState: "dry_run_only", futureRequirements: FUTURE_REQUIREMENTS };
    case "click":
    case "type":
    case "submit_form":
      return {
        surface,
        capability,
        currentState: "dry_run_only",
        futureRequirements: [...FUTURE_REQUIREMENTS, "Human confirmation per action"],
      };
    case "login":
      return {
        surface,
        capability,
        currentState: "blocked",
        blockedReason: "Credentials are never handled by Luca.",
        futureRequirements: FUTURE_REQUIREMENTS,
      };
    case "read_dom":
    case "scrape":
      return {
        surface,
        capability,
        currentState: "blocked",
        blockedReason: "DOM reading / scraping is disabled.",
        futureRequirements: FUTURE_REQUIREMENTS,
      };
    case "download_file":
    case "upload_file":
      return {
        surface,
        capability,
        currentState: "blocked",
        blockedReason: "File transfer disabled until a dedicated safety model exists.",
        futureRequirements: FUTURE_REQUIREMENTS,
      };
    case "payment":
    case "wallet_connect":
    case "wallet_transaction":
      return {
        surface,
        capability,
        currentState: "blocked",
        blockedReason: "Wallet/payment actions are never automatic.",
        futureRequirements: FUTURE_REQUIREMENTS,
      };
    default:
      return { surface, capability, currentState: "blocked", blockedReason: "Unknown capability.", futureRequirements: FUTURE_REQUIREMENTS };
  }
}
