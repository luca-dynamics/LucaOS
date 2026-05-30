// SandboxedBrowserShell types — PR #134: Gated Browser Shell Prototype.
// Records describe a single, user-approved safe-URL open inside the Luca
// sandbox browser shell. No automation, DOM read, credential, download/upload,
// or wallet/payment state is ever represented here.

import type { SandboxedBrowserUrlRiskLevel } from "../services/runtime/SandboxedBrowserUrlPolicy";

export type SandboxedBrowserShellStatus =
  | "proposed"
  | "open_requested"
  | "open"
  | "blocked"
  | "closed"
  | "revoked"
  | "adapter_unavailable";

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
  blockedSessions: number;
  closedSessions: number;
  revokedSessions: number;
  adapterUnavailableSessions: number;
  launchMode: "approved_safe_url_only";
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
