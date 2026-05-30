// Sandboxed Browser Prototype — PR #133: research / design / dry-run only.
// These records describe how a FUTURE sandboxed browser surface would be
// permissioned. Nothing here launches a browser, creates a webview/BrowserWindow,
// automates anything, reads the DOM, scrapes, clicks, types, submits, logs in,
// downloads/uploads, or touches the network.
//
// Hard guarantees encoded by these types:
//   - allowedForLaunch is always false.
//   - allowedForAutomation is always false.
//   - allowedForDomRead is always false.
//   - allowedForNetworkRequest is always false.
//   - No credentials, cookies, session tokens, DOM content, page content,
//     screenshots, or downloaded/uploaded files are ever stored on a record.

export type SandboxedBrowserSurface =
  | "sandboxed_browser"
  | "browser_tab"
  | "browser_page"
  | "browser_form"
  | "browser_download"
  | "browser_upload"
  | "browser_payment"
  | "browser_wallet"
  | "unknown";

export type SandboxedBrowserCapability =
  | "open_url"
  | "navigate"
  | "read_page_metadata"
  | "read_dom"
  | "click"
  | "type"
  | "submit_form"
  | "login"
  | "scrape"
  | "download_file"
  | "upload_file"
  | "payment"
  | "wallet_connect"
  | "wallet_transaction"
  | "unknown";

export type SandboxedBrowserRequestStatus =
  | "proposed"
  | "dry_run_only"
  | "blocked"
  | "waiting_user"
  | "archived";

export type SandboxedBrowserSessionStatus =
  | "proposed"
  | "dry_run_only"
  | "blocked"
  | "waiting_user"
  | "revoked"
  | "expired"
  | "archived";

export type SandboxedBrowserRiskLevel = "low" | "elevated" | "high" | "critical";

export type SandboxedBrowserCredentialBoundary =
  | "no_credentials"
  | "credential_like_blocked"
  | "session_cookie_blocked"
  | "wallet_blocked"
  | "payment_blocked";

export type SandboxedBrowserNavigationRisk =
  | "internal_safe"
  | "external_unknown"
  | "auth_required"
  | "payment_or_wallet"
  | "download_or_upload"
  | "credential_or_secret"
  | "unknown";

export interface SandboxedBrowserPolicyDecision {
  allowedForLaunch: false;
  allowedForAutomation: false;
  allowedForDomRead: false;
  allowedForNetworkRequest: false;
  allowedForDryRun: boolean;
  riskLevel: SandboxedBrowserRiskLevel;
  surface: SandboxedBrowserSurface;
  capability: SandboxedBrowserCapability;
  navigationRisk: SandboxedBrowserNavigationRisk;
  credentialBoundary: SandboxedBrowserCredentialBoundary;
  blockedBy: string[];
  userSafeReason: string;
  requiresExplicitApproval: boolean;
  requiresVisibleBrowserBoundary: boolean;
  requiresSandbox: boolean;
  requiresHumanConfirmation: boolean;
  requiresCredentialBoundary: boolean;
  requiresAuditLog: boolean;
  requiresDownloadUploadBlock: boolean;
  requiresWalletPaymentBlock: boolean;
  revocable: true;
}

export interface SandboxedBrowserRequestRecord {
  browserRequestId: string;
  title: string;
  summary: string;
  source: string;
  sourceId?: string;
  surface: SandboxedBrowserSurface;
  capability: SandboxedBrowserCapability;
  targetDescriptor?: string;
  status: SandboxedBrowserRequestStatus;
  riskLevel: SandboxedBrowserRiskLevel;
  navigationRisk: SandboxedBrowserNavigationRisk;
  credentialBoundary: SandboxedBrowserCredentialBoundary;
  policyDecision: SandboxedBrowserPolicyDecision;
  provenanceIds: string[];
  createdAt: string;
  updatedAt: string;
  blockedBy?: string[];
  metadata: Record<string, unknown>;
}

export interface SandboxedBrowserSessionRecord {
  browserSessionId: string;
  requestId?: string;
  title: string;
  summary: string;
  surface: SandboxedBrowserSurface;
  capability: SandboxedBrowserCapability;
  targetDescriptor?: string;
  status: SandboxedBrowserSessionStatus;
  riskLevel: SandboxedBrowserRiskLevel;
  navigationRisk: SandboxedBrowserNavigationRisk;
  credentialBoundary: SandboxedBrowserCredentialBoundary;
  policyDecision: SandboxedBrowserPolicyDecision;
  provenanceIds: string[];
  createdAt: string;
  updatedAt: string;
  revokedAt?: string;
  metadata: Record<string, unknown>;
}

export interface SandboxedBrowserDiagnosticsSummary {
  totalRequests: number;
  dryRunRequests: number;
  blockedRequests: number;
  waitingUserRequests: number;
  totalSessions: number;
  dryRunSessions: number;
  revokedSessions: number;
  launchEnabled: false;
  automationEnabled: false;
  domReadEnabled: false;
  networkRequestEnabled: false;
  dryRunOnly: true;
  lastRequestAt?: string;
}
