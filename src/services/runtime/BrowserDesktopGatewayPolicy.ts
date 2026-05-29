// BrowserDesktopGatewayPolicy — PR #129: research/spec-only gateway foundation.
// Classifies future browser/desktop/device control requests without executing.
// No browser APIs. No DOM APIs. No filesystem APIs. No network APIs. No OS APIs.

import type {
  GatewayCapability,
  GatewayPolicyDecision,
  GatewayRiskLevel,
  GatewaySurface,
} from "../../types/browserDesktopGateway";

const SECRET_PATTERNS = [
  /\btoken\b/i,
  /\bsecret\b/i,
  /\bapi[_-]?key\b/i,
  /\bprivate[_-]?key\b/i,
  /\bpassword\b/i,
  /\bcredential\b/i,
  /\bmnemonic\b/i,
  /\bseed phrase\b/i,
  /sk-[A-Za-z0-9_-]{8,}/,
  /gh[pousr]_[A-Za-z0-9_]{12,}/,
  /AIza[A-Za-z0-9_-]{12,}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
];

const TOKENIZED_URL_PATTERN = /https?:\/\/[^\s]*(token|api[_-]?key|password|secret|access_token)=/i;
const HIGH_RISK_CAPABILITIES = new Set<GatewayCapability>([
  "browser_open_url",
  "browser_click",
  "browser_type",
  "browser_submit",
  "browser_scrape",
  "desktop_click",
  "desktop_type",
  "desktop_open_app",
  "desktop_close_app",
  "file_read",
  "network_request",
  "mcp_call",
]);
const BLOCKED_CAPABILITIES = new Set<GatewayCapability>([
  "browser_login",
  "file_write",
  "file_delete",
  "wallet_transaction",
  "device_control",
]);
const SANDBOX_SURFACES = new Set<GatewaySurface>(["browser", "desktop", "device", "screen", "app", "file", "network", "mcp"]);
const CREDENTIAL_BOUNDARY_CAPABILITIES = new Set<GatewayCapability>([
  "browser_login",
  "wallet_read",
  "wallet_transaction",
  "file_read",
  "file_write",
  "file_delete",
  "network_request",
  "desktop_open_app",
  "desktop_close_app",
  "device_read_status",
  "device_control",
]);

export interface GatewayIntentInput {
  message: string;
  source?: string;
  sourceId?: string;
  target?: string;
  metadata?: Record<string, unknown>;
}

export interface GatewayRequestEvaluationInput extends GatewayIntentInput {
  surface?: GatewaySurface;
  capability?: GatewayCapability;
}

export interface SanitizedGatewayInput {
  message: string;
  source: string;
  sourceId?: string;
  target?: string;
  metadata: Record<string, unknown>;
  secretLike: boolean;
}

function scrubSecretLikeText(value: string): string {
  return SECRET_PATTERNS.reduce((current, pattern) => current.replace(pattern, "[redacted]"), value.replace(TOKENIZED_URL_PATTERN, "[redacted-url]"))
    .slice(0, 1_000);
}

export function blockIfSecretLike(input: string): boolean {
  return SECRET_PATTERNS.some((pattern) => pattern.test(input)) || TOKENIZED_URL_PATTERN.test(input);
}

export function sanitizeGatewayInput(input: GatewayIntentInput): SanitizedGatewayInput {
  const message = scrubSecretLikeText(input.message ?? "");
  const target = input.target ? scrubSecretLikeText(input.target).slice(0, 160) : undefined;
  const metadata = Object.fromEntries(
    Object.entries(input.metadata ?? {}).slice(0, 30).map(([key, value]) => {
      const safeKey = scrubSecretLikeText(key).slice(0, 80);
      if (/secret|token|password|api[_-]?key|credential|private[_-]?key/i.test(key)) return [safeKey, "[redacted]"];
      if (typeof value === "string") return [safeKey, scrubSecretLikeText(value).slice(0, 300)];
      if (typeof value === "number" || typeof value === "boolean" || value === null) return [safeKey, value];
      return [safeKey, "[object]"];
    }),
  );

  return {
    message,
    source: scrubSecretLikeText(input.source ?? "gateway_research").slice(0, 80),
    sourceId: input.sourceId ? scrubSecretLikeText(input.sourceId).slice(0, 120) : undefined,
    target,
    metadata,
    secretLike: blockIfSecretLike(input.message ?? "") || Boolean(input.target && blockIfSecretLike(input.target)),
  };
}

export function detectGatewaySurface(message: string): GatewaySurface {
  if (/\bwallet\b|\btransfer\b|\bswap\b|\btrade\b|\bstake\b|\bbridge\b/i.test(message)) return "wallet";
  if (/\bmcp\b/i.test(message)) return "mcp";
  if (/\bnetwork request\b|\bapi call\b|\bfetch\b|\bpost\b|\bhttp\b/i.test(message)) return "network";
  if (/\bfile\b|\bdelete\b|\bwrite\b|\bmodify\b/i.test(message)) return "file";
  if (/\bopen app\b|\blaunch app\b|\bclose app\b|\bchrome\b|\bapplication\b/i.test(message)) return "app";
  if (/\bdesktop\b|\bclick on desktop\b|\btype on desktop\b/i.test(message)) return "desktop";
  if (/\bdevice\b|\brobot\b|\bphone\b|\bcamera\b/i.test(message)) return "device";
  if (/\bscreen\b|\blook at my screen\b|\bread screen\b|\bobserve screen\b/i.test(message)) return "screen";
  if (/\bbrowser\b|\bwebsite\b|\burl\b|\bread dom\b|\bpage\b|\blogin\b|\bscrape\b|\bsubmit\b|\bclick\b|\btype\b/i.test(message)) return "browser";
  return "unknown";
}

export function detectGatewayCapability(message: string): GatewayCapability {
  if (/\b(wallet|transfer|swap|trade|stake|bridge)\b/i.test(message)) return "wallet_transaction";
  if (/\bmcp\b/i.test(message)) return "mcp_call";
  if (/\bdelete\b|\bremove file\b/i.test(message)) return "file_delete";
  if (/\bwrite file\b|\bmodify file\b|\bsave file\b/i.test(message)) return "file_write";
  if (/\bread file\b/i.test(message)) return "file_read";
  if (/\bnetwork request\b|\bapi call\b|\bfetch\b|\bpost\b|\bhttp\b/i.test(message)) return "network_request";
  if (/\blogin\b|\bsign in\b|\bpassword\b|\bcredential\b/i.test(message)) return "browser_login";
  if (/\bscrape\b/i.test(message)) return "browser_scrape";
  if (/\bsubmit\b/i.test(message)) return "browser_submit";
  if (/\bopen (website|url)\b|\bgo to\b|\bnavigate\b/i.test(message)) return "browser_open_url";
  if (/\bopen app\b|\blaunch app\b|\bopen chrome\b|\blaunch chrome\b/i.test(message)) return "desktop_open_app";
  if (/\bclose app\b|\bquit app\b/i.test(message)) return "desktop_close_app";
  if (/\bdevice status\b|\bread device\b/i.test(message)) return "device_read_status";
  if (/\bdevice control\b|\bcontrol device\b|\brobot control\b/i.test(message)) return "device_control";
  if (/\bclick on desktop\b|\bdesktop click\b/i.test(message)) return "desktop_click";
  if (/\btype on desktop\b|\bdesktop type\b/i.test(message)) return "desktop_type";
  if (/\bread dom\b|\bread browser page\b|\bread page\b/i.test(message)) return "read_dom";
  if (/\blook at my screen\b|\bread screen\b|\bobserve screen\b/i.test(message)) return "observe_screen";
  if (/\bclick\b/i.test(message)) return "browser_click";
  if (/\btype\b/i.test(message)) return "browser_type";
  return "unknown";
}

function riskForCapability(capability: GatewayCapability): GatewayRiskLevel {
  if (capability === "observe_screen" || capability === "read_dom" || capability === "device_read_status") return "elevated";
  if (capability === "file_write" || capability === "file_delete" || capability === "wallet_transaction") return "critical";
  if (capability === "browser_login" || capability === "device_control") return "critical";
  if (HIGH_RISK_CAPABILITIES.has(capability)) return "high";
  return "elevated";
}

export function evaluateGatewayRequest(input: GatewayRequestEvaluationInput): GatewayPolicyDecision {
  const sanitized = sanitizeGatewayInput(input);
  const surface = input.surface ?? detectGatewaySurface(sanitized.message);
  const capability = input.capability ?? detectGatewayCapability(sanitized.message);
  const blockedBy: string[] = [];
  const riskLevel = sanitized.secretLike ? "critical" : riskForCapability(capability);
  const requiresCredentialBoundary = sanitized.secretLike || CREDENTIAL_BOUNDARY_CAPABILITIES.has(capability);
  const allowReadOnlyDryRun = capability === "observe_screen" || capability === "read_dom" || capability === "device_read_status";
  const allowHighRiskDryRun = HIGH_RISK_CAPABILITIES.has(capability);

  if (sanitized.secretLike) blockedBy.push("secret_like_input");
  if (BLOCKED_CAPABILITIES.has(capability)) blockedBy.push(`blocked_capability:${capability}`);
  if (capability === "unknown") blockedBy.push("unknown_gateway_capability");
  if (surface === "unknown") blockedBy.push("unknown_gateway_surface");

  const allowedForDryRun = blockedBy.length === 0 && (allowReadOnlyDryRun || allowHighRiskDryRun);
  const userSafeReason = getGatewayUserSafeReason({
    allowedForDryRun,
    allowedForExecution: false,
    riskLevel,
    surface,
    capability,
    blockedBy,
    requiresApproval: true,
    requiresSandbox: SANDBOX_SURFACES.has(surface),
    requiresHumanConfirmation: true,
    requiresCredentialBoundary,
    requiresAuditLog: true,
    userSafeReason: "",
  });

  return {
    allowedForDryRun,
    allowedForExecution: false,
    riskLevel,
    surface,
    capability,
    blockedBy,
    userSafeReason,
    requiresApproval: true,
    requiresSandbox: SANDBOX_SURFACES.has(surface),
    requiresHumanConfirmation: true,
    requiresCredentialBoundary,
    requiresAuditLog: true,
  };
}

export function classifyGatewayIntent(input: GatewayIntentInput): GatewayPolicyDecision {
  return evaluateGatewayRequest(input);
}

export function getGatewayUserSafeReason(decision: GatewayPolicyDecision): string {
  if (decision.blockedBy.length > 0) {
    return `Gateway request blocked for safety: ${decision.blockedBy.join(", ")}. No browser, desktop, device, file, network, wallet, or MCP execution is enabled.`;
  }
  if (decision.allowedForDryRun) {
    return `Gateway request recorded as dry-run only for ${decision.surface}/${decision.capability}. Future execution would require approval, sandboxing, human confirmation, credential boundaries, and audit logging.`;
  }
  return "Gateway request needs clarification before even a dry-run record is safe. Execution is disabled.";
}
