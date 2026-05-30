// VisualCore remote command governance types — PR #142: VisualCore Remote
// Command Governance.
//
// This is an AUDIT/GOVERNANCE-RECORD layer for the remote commands that arrive
// over Electron IPC and can drive the VisualCore surface (the channels PR #140
// audited: `visual-core-remote-control`, `sync-app-state`, `widget-voice-data`,
// `visual-core-interaction`). Today `visual-core-remote-control` can receive a
// `BROWSER_NAVIGATE` command and switch VisualCore into BROWSER mode (which
// still renders embedded LucaBrowser, NOT the governed adapter).
//
// Hard guarantees — these types and the systems built on them NEVER:
//   - move VisualCore BROWSER mode onto governed LucaBrowser
//   - navigate, fetch, or open a browser
//   - change VisualCore mode switching or IPC behavior from policy/service
//   - capture screen / camera / audio, read files, or use OCR/vision
//   - touch messaging / wireless / device / external-action execution
//
// Every record stores only audit-safe metadata. URLs are reduced to an
// audit-safe form (origin + path) with token-like query/hash params redacted —
// raw token-bearing URLs are never stored.

/** The kinds of remote command VisualCore governance classifies. */
export type VisualCoreRemoteCommandKind =
  | "BROWSER_NAVIGATE"
  | "SET_MODE"
  | "SHOW_DISPLAY"
  | "CAST_SELECT"
  | "SYNC_APP_STATE"
  | "WIDGET_VOICE_DATA"
  | "VISUAL_CORE_INTERACTION"
  | "UNKNOWN";

/** Governance status assigned to a remote command record. */
export type VisualCoreRemoteCommandStatus =
  | "received"
  | "allowed_record_only"
  | "blocked"
  | "needs_approval"
  | "ignored";

/** Conservative risk classification for a remote command. */
export type VisualCoreRemoteCommandRiskLevel =
  | "low"
  | "elevated"
  | "high"
  | "critical";

/** Where the remote command originated. */
export type VisualCoreRemoteCommandSource =
  | "ipc_remote_control"
  | "app_state_sync"
  | "voice_widget"
  | "visual_interaction"
  | "system"
  | "unknown";

/**
 * A governance/audit record for a single remote command. Every capability flag
 * is hard-`false`; `governanceApplied`, `recordOnly` are hard-`true`;
 * `executionChanged` and `browserGoverned` are hard-`false`.
 */
export interface VisualCoreRemoteCommandRecord {
  commandRecordId: string;
  kind: VisualCoreRemoteCommandKind;
  status: VisualCoreRemoteCommandStatus;
  riskLevel: VisualCoreRemoteCommandRiskLevel;
  source: VisualCoreRemoteCommandSource;
  /** Target VisualCore mode, when the command requests one. */
  targetMode?: string;
  /** Audit-safe URL (origin + path, token-like params redacted), if any. */
  targetAuditUrl?: string;
  /** Governance reasons a command was blocked / held for approval. */
  blockedBy?: string[];
  /** User-facing, non-sensitive explanation of the decision. */
  userSafeReason: string;
  receivedAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
  // Hard guarantees — remote-command audit only, every capability disabled.
  governanceApplied: true;
  recordOnly: true;
  executionChanged: false;
  /** PR #143 — true for BROWSER_NAVIGATE when the governed adapter is connected. */
  browserGoverned: boolean;
  captureEnabled: false;
  automationEnabled: false;
  externalActionEnabled: false;
  credentialSensitive: false;
  fileAccessEnabled: false;
  messagingEnabled: false;
  wirelessControlEnabled: false;
  walletPaymentEnabled: false;
}

/** Aggregate diagnostics across all recorded remote commands. */
export interface VisualCoreRemoteCommandDiagnosticsSummary {
  totalCommands: number;
  receivedCommands: number;
  allowedRecordOnlyCommands: number;
  blockedCommands: number;
  needsApprovalCommands: number;
  ignoredCommands: number;
  browserNavigateCommands: number;
  lastCommandAt: string | null;
  // Remote-command governance posture.
  governanceApplied: true;
  recordOnly: true;
  executionChanged: false;
  /** PR #143 — true now that the governed LucaBrowser adapter is connected. */
  browserGoverned: true;
  captureEnabled: false;
  automationEnabled: false;
  externalActionEnabled: false;
  fileAccessEnabled: false;
  messagingEnabled: false;
  wirelessControlEnabled: false;
  walletPaymentEnabled: false;
}

/** eventBus + trace channel for remote command audit events. */
export const VISUAL_CORE_REMOTE_COMMAND_EVENT = "visual_core_remote_command";

/** Maximum number of remote command records retained. */
export const MAX_VISUAL_CORE_REMOTE_COMMAND_RECORDS = 150;

/** All remote command kinds. */
export const VISUAL_CORE_REMOTE_COMMAND_KINDS: VisualCoreRemoteCommandKind[] = [
  "BROWSER_NAVIGATE",
  "SET_MODE",
  "SHOW_DISPLAY",
  "CAST_SELECT",
  "SYNC_APP_STATE",
  "WIDGET_VOICE_DATA",
  "VISUAL_CORE_INTERACTION",
  "UNKNOWN",
];

/** All remote command statuses. */
export const VISUAL_CORE_REMOTE_COMMAND_STATUSES: VisualCoreRemoteCommandStatus[] =
  ["received", "allowed_record_only", "blocked", "needs_approval", "ignored"];

/** All remote command risk levels. */
export const VISUAL_CORE_REMOTE_COMMAND_RISK_LEVELS: VisualCoreRemoteCommandRiskLevel[] =
  ["low", "elevated", "high", "critical"];

/** All remote command sources. */
export const VISUAL_CORE_REMOTE_COMMAND_SOURCES: VisualCoreRemoteCommandSource[] =
  [
    "ipc_remote_control",
    "app_state_sync",
    "voice_widget",
    "visual_interaction",
    "system",
    "unknown",
  ];
