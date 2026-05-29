// Browser/Desktop/Device Gateway research types.
// These records describe future gateway control requests; they do not execute.

export type GatewaySurface =
  | "browser"
  | "desktop"
  | "device"
  | "screen"
  | "app"
  | "file"
  | "network"
  | "wallet"
  | "mcp"
  | "unknown";

export type GatewayCapability =
  | "observe_screen"
  | "read_dom"
  | "browser_open_url"
  | "browser_click"
  | "browser_type"
  | "browser_submit"
  | "browser_scrape"
  | "browser_login"
  | "desktop_click"
  | "desktop_type"
  | "desktop_open_app"
  | "desktop_close_app"
  | "device_read_status"
  | "device_control"
  | "file_read"
  | "file_write"
  | "file_delete"
  | "network_request"
  | "wallet_read"
  | "wallet_transaction"
  | "mcp_call"
  | "unknown";

export type GatewayRequestStatus =
  | "proposed"
  | "dry_run_only"
  | "blocked"
  | "waiting_user"
  | "archived";

export type GatewayRiskLevel = "safe" | "low" | "elevated" | "high" | "critical";

export interface GatewayPolicyDecision {
  allowedForDryRun: boolean;
  allowedForExecution: false;
  riskLevel: GatewayRiskLevel;
  surface: GatewaySurface;
  capability: GatewayCapability;
  blockedBy: string[];
  userSafeReason: string;
  requiresApproval: boolean;
  requiresSandbox: boolean;
  requiresHumanConfirmation: boolean;
  requiresCredentialBoundary: boolean;
  requiresAuditLog: boolean;
}

export interface GatewayRequestRecord {
  gatewayRequestId: string;
  title: string;
  summary: string;
  source: string;
  sourceId?: string;
  surface: GatewaySurface;
  capability: GatewayCapability;
  target?: string;
  status: GatewayRequestStatus;
  riskLevel: GatewayRiskLevel;
  policyDecision: GatewayPolicyDecision;
  provenanceIds: string[];
  createdAt: string;
  updatedAt: string;
  blockedBy?: string[];
  metadata: Record<string, unknown>;
}

export interface GatewayDiagnosticsSummary {
  totalRequests: number;
  dryRunRequests: number;
  blockedRequests: number;
  waitingUserRequests: number;
  highRiskRequests: number;
  criticalRiskRequests: number;
  executionEnabled: false;
  dryRunOnly: true;
  lastRequestAt?: string;
}
