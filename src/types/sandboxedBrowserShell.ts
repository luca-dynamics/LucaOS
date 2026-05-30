// SandboxedBrowserShell types — PR #134: Gated Browser Shell Prototype.
// Records describe a single, user-approved safe-URL open inside the Luca
// sandbox browser shell. No automation, DOM read, credential, download/upload,
// or wallet/payment state is ever represented here.

import type { SandboxedBrowserUrlRiskLevel } from "../services/runtime/SandboxedBrowserUrlPolicy";

export type SandboxedBrowserShellStatus =
  | "proposed"
  | "open_requested"
  | "open"
  | "navigating"
  | "navigation_blocked"
  | "paused"
  | "blocked"
  | "closed"
  | "revoked"
  | "adapter_unavailable";

// PR #136: governed navigation events. Records describe a single attempted
// navigation inside an already-open governed browser session. Only redacted
// audit URLs are stored — never page content, DOM, cookies, or session data.
export type SandboxedBrowserShellNavigationStatus =
  | "requested"
  | "allowed"
  | "blocked"
  | "redacted"
  | "ignored";

export type SandboxedBrowserShellNavigationSource =
  | "luca_browser_webview"
  | "iframe_fallback"
  | "manual_user_navigation"
  | "system";

export interface SandboxedBrowserShellNavigationRecord {
  navigationId: string;
  shellSessionId: string;
  fromAuditUrl?: string;
  toAuditUrl: string;
  normalizedUrl?: string;
  status: SandboxedBrowserShellNavigationStatus;
  riskLevel: SandboxedBrowserUrlRiskLevel;
  blockedBy?: string[];
  userSafeReason: string;
  createdAt: string;
  source: SandboxedBrowserShellNavigationSource;
  metadata?: Record<string, unknown>;
}

export interface SandboxedBrowserShellSessionRecord {
  shellSessionId: string;
  sourceRequestId?: string;
  title: string;
  normalizedUrl: string;
  auditUrl: string;
  status: SandboxedBrowserShellStatus;
  riskLevel: SandboxedBrowserUrlRiskLevel;
  blockedBy?: string[];
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  revokedAt?: string;
  provenanceIds: string[];
  metadata: Record<string, unknown>;
}

export interface SandboxedBrowserShellDiagnosticsSummary {
  totalSessions: number;
  proposedSessions: number;
  openRequestedSessions: number;
  openSessions: number;
  navigatingSessions: number;
  navigationBlockedSessions: number;
  pausedSessions: number;
  blockedSessions: number;
  closedSessions: number;
  revokedSessions: number;
  adapterUnavailableSessions: number;
  navigationEvents: number;
  allowedNavigations: number;
  blockedNavigations: number;
  lastNavigationAt: string | null;
  launchMode: "approved_safe_url_only";
  navigationGovernanceEnabled: true;
  automationEnabled: false;
  domReadEnabled: false;
  credentialsEnabled: false;
  downloadUploadEnabled: false;
  walletPaymentEnabled: false;
  lastSessionAt: string | null;
}

// Local DOM event dispatched when an approved safe URL should be surfaced in the
// visible browser shell. Carries only a redactable URL + audit URL; no secrets.
export const SANDBOXED_BROWSER_SHELL_OPEN_EVENT = "luca:open-sandboxed-browser-shell";

export interface SandboxedBrowserShellOpenEventDetail {
  shellSessionId: string;
  url: string;
  auditUrl: string;
  source: string;
}

export const MAX_SANDBOXED_BROWSER_SHELL_SESSIONS = 50;

// PR #136: bounded navigation-event history across all shell sessions.
export const MAX_SANDBOXED_BROWSER_SHELL_NAVIGATIONS = 300;
