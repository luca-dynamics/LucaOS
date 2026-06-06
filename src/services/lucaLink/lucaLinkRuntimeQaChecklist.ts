/**
 * Pure LucaLink runtime QA checklist model.
 *
 * This module records verification work only. It never opens a transport,
 * reads browser state, persists data, probes a host, or executes an action.
 */

export type LucaLinkRuntimeQaArea =
  | "primary-host-pairing"
  | "companion-join"
  | "qr-pairing"
  | "relay-connection"
  | "local-lan-connection"
  | "vpn-connection"
  | "reconnect-disconnect"
  | "guest-session"
  | "guest-pin-auth"
  | "guest-chat"
  | "guest-webrtc-signaling"
  | "message-send-receive"
  | "secure-beam-packet"
  | "mission-sync"
  | "sensor-pulse"
  | "runtime-enforcement"
  | "approval-queue"
  | "continuation-records"
  | "device-trust"
  | "handoff-records"
  | "host-connection-model"
  | "host-adaptation-blueprints"
  | "multi-host-approval-surface"
  | "bridge-review"
  | "embodied-policy"
  | "adapter-drafts"
  | "device-center-ui"
  | "security-invariants";

export type LucaLinkRuntimeQaStatus =
  | "not-started"
  | "manual-required"
  | "automated-covered"
  | "passed"
  | "failed"
  | "blocked"
  | "not-applicable";

export interface LucaLinkRuntimeQaCheck {
  id: string;
  area: LucaLinkRuntimeQaArea;
  title: string;
  description: string;
  status: LucaLinkRuntimeQaStatus;
  manualSteps: string[];
  expectedResult: string;
  failureSignals: string[];
  automationAvailable: boolean;
  requiredBeforeRealImplementation: boolean;
  warnings: string[];
}

export interface LucaLinkRuntimeQaSummary {
  total: number;
  byStatus: Record<LucaLinkRuntimeQaStatus, number>;
  passed: number;
  failed: number;
  blocked: number;
  automatedCovered: number;
  manualRequired: number;
  required: number;
  requiredPassed: number;
  requiredOpen: number;
  readyForRealImplementation: boolean;
}

export interface LucaLinkRuntimeQaStatusOptions {
  warning?: string;
  warnings?: string[];
  replaceWarnings?: boolean;
}

type CheckInput = Omit<LucaLinkRuntimeQaCheck, "status" | "warnings"> & {
  status?: LucaLinkRuntimeQaStatus;
  warnings?: string[];
};

const ALL_STATUSES: LucaLinkRuntimeQaStatus[] = [
  "not-started",
  "manual-required",
  "automated-covered",
  "passed",
  "failed",
  "blocked",
  "not-applicable",
];

function check(input: CheckInput): LucaLinkRuntimeQaCheck {
  return {
    ...input,
    status:
      input.status ??
      (input.automationAvailable ? "automated-covered" : "manual-required"),
    manualSteps: [...input.manualSteps],
    failureSignals: [...input.failureSignals],
    warnings: [...(input.warnings ?? [])],
  };
}

const manual = (
  id: string,
  area: LucaLinkRuntimeQaArea,
  title: string,
  description: string,
  manualSteps: string[],
  expectedResult: string,
  failureSignals: string[],
  requiredBeforeRealImplementation = true,
  warnings: string[] = [],
): LucaLinkRuntimeQaCheck =>
  check({
    id,
    area,
    title,
    description,
    manualSteps,
    expectedResult,
    failureSignals,
    automationAvailable: false,
    requiredBeforeRealImplementation,
    warnings,
  });

const automated = (
  id: string,
  area: LucaLinkRuntimeQaArea,
  title: string,
  description: string,
  expectedResult: string,
  failureSignals: string[],
  requiredBeforeRealImplementation = true,
  manualSteps: string[] = [],
): LucaLinkRuntimeQaCheck =>
  check({
    id,
    area,
    title,
    description,
    manualSteps,
    expectedResult,
    failureSignals,
    automationAvailable: true,
    requiredBeforeRealImplementation,
  });

export function createLucaLinkRuntimeQaChecklist(): LucaLinkRuntimeQaCheck[] {
  return [
    manual(
      "primary-host-room-create",
      "primary-host-pairing",
      "Create a Primary Host room",
      "Verify the existing runtime can create and expose a Primary Host room.",
      ["Enable LucaLink on the intended Primary Host.", "Create a room and observe connection state."],
      "The room is created once, the Primary Host remains responsive, and Device Center reflects the state.",
      ["Room creation throws or hangs.", "The host is labeled Origin.", "Device Center crashes."],
    ),
    manual(
      "primary-host-pairing-token",
      "primary-host-pairing",
      "Generate a pairing token",
      "Verify the established pairing-token flow without changing token behavior.",
      ["Create a Primary Host room.", "Request or reveal the pairing token."],
      "A usable token is displayed without exposing unrelated secrets.",
      ["Token is absent, malformed, or regenerates unexpectedly.", "Copy calls the host Origin."],
    ),
    manual(
      "qr-pairing-url",
      "qr-pairing",
      "Generate a QR pairing URL",
      "Verify QR pairing data is derived from the existing room and token flow.",
      ["Open pairing on the Primary Host.", "Generate the QR code and inspect its target URL."],
      "The QR URL contains the expected pairing information and no unsafe authority claims.",
      ["QR generation crashes.", "URL omits required pairing data.", "URL embeds unrelated credentials."],
    ),
    manual(
      "companion-token-join",
      "companion-join",
      "Join a companion host with a token",
      "Exercise the normal companion-host join flow.",
      ["Open LucaLink on a companion host.", "Enter the Primary Host address and valid token.", "Connect."],
      "The companion joins and both hosts show the updated connection state.",
      ["Valid join fails.", "Duplicate or phantom devices appear.", "Pairing semantics change."],
    ),
    manual(
      "companion-qr-join",
      "qr-pairing",
      "Join a companion host with QR pairing",
      "Exercise the existing QR join path on a supported companion host.",
      ["Scan the Primary Host QR code.", "Complete the existing confirmation flow."],
      "The same safe companion relationship is established as token pairing.",
      ["QR joins a different room.", "The join bypasses established confirmation.", "The app crashes."],
    ),
    manual(
      "relay-connect",
      "relay-connection",
      "Connect through the relay",
      "Verify the production relay path remains compatible with the architecture additions.",
      ["Select or use relay mode.", "Connect Primary and companion hosts.", "Exchange a normal message."],
      "Both hosts connect and normal traffic works without new socket events.",
      ["Relay cannot connect.", "Unexpected socket event is required.", "Normal traffic is blocked."],
    ),
    manual(
      "local-lan-connect",
      "local-lan-connection",
      "Connect over local LAN when supported",
      "Verify the existing local connection path in a compatible environment.",
      ["Place hosts on the same LAN.", "Use the existing local/manual connection option.", "Record blocked if the environment cannot expose the host."],
      "The connection succeeds, or the check is explicitly environment-blocked without an app crash.",
      ["Auto mode crashes.", "The app performs new network scanning.", "Failure state is unreadable."],
      false,
      ["Environment-dependent; this QA check does not authorize live probing or scanning."],
    ),
    manual(
      "vpn-manual-connect",
      "vpn-connection",
      "Connect with a VPN or manual host address",
      "Verify an existing reachable manual-address route without adding discovery behavior.",
      ["Provide an already-known reachable host address.", "Connect using the existing manual path.", "Record blocked if no VPN environment is available."],
      "The known address connects, or the check is environment-blocked with a clear error.",
      ["The app scans for addresses.", "Manual mode crashes.", "Relay fallback changes pairing behavior."],
      false,
      ["Environment-dependent; do not probe unknown hosts."],
    ),
    manual(
      "reconnect-disconnect",
      "reconnect-disconnect",
      "Disconnect and reconnect cleanly",
      "Verify connection state survives ordinary disconnect/reconnect cycles.",
      ["Connect two hosts.", "Disconnect the companion.", "Reconnect with the established credentials."],
      "Presence and Device Center state converge without duplicate records or a crash.",
      ["Stale connected state remains.", "Reconnect duplicates the host.", "Runtime throws."],
    ),
    manual(
      "guest-url-generation",
      "guest-session",
      "Generate a guest URL",
      "Verify guest access URL generation remains available when LucaLink is enabled.",
      ["Enable LucaLink.", "Generate guest access.", "Open the URL in a separate browser session."],
      "A time-bounded guest URL is shown and opens the existing guest flow.",
      ["URL generation crashes.", "Guest receives owner or Primary Host authority."],
    ),
    manual(
      "guest-pin-challenge",
      "guest-pin-auth",
      "Present a guest PIN challenge",
      "Verify the existing guest PIN challenge appears when configured.",
      ["Open the guest URL.", "Trigger the configured PIN challenge."],
      "The guest is challenged before protected guest access is granted.",
      ["PIN is bypassed.", "Challenge loops or exposes the PIN."],
    ),
    manual(
      "guest-pin-result",
      "guest-pin-auth",
      "Accept valid and reject invalid guest PINs",
      "Exercise both success and failure without changing authentication behavior.",
      ["Submit an incorrect PIN and record the denial.", "Submit the correct PIN and record the accepted state."],
      "Incorrect input is denied and valid input enables only normal guest capabilities.",
      ["Incorrect PIN succeeds.", "Valid PIN fails.", "Guest gains device/runtime authority."],
    ),
    manual(
      "guest-chat",
      "guest-chat",
      "Exchange normal guest chat",
      "Verify guest hardening does not block ordinary conversation.",
      ["Authenticate a guest if required.", "Send messages in both directions.", "Disconnect the guest."],
      "Normal guest chat is delivered and disconnect state is reflected.",
      ["Safe chat is blocked.", "Messages execute tools or actions.", "Disconnect leaves an active session."],
    ),
    manual(
      "guest-webrtc-signaling",
      "guest-webrtc-signaling",
      "Exchange WebRTC offer, answer, and ICE",
      "Verify existing guest signaling remains allowed without signaling changes.",
      ["Start the existing guest voice flow.", "Observe offer, answer, and ICE handling.", "Record browser permission limitations separately."],
      "Signaling completes or is environment-blocked only by browser/device media constraints.",
      ["Guest policy blocks valid signaling.", "New signaling events are required.", "Unhandled exception occurs."],
    ),
    manual(
      "message-round-trip",
      "message-send-receive",
      "Send and receive a normal message",
      "Protect the established bidirectional message flow from architecture regressions.",
      ["Connect two hosts.", "Send a normal message in each direction."],
      "Each safe message arrives once and does not create an approval request.",
      ["Message is lost or duplicated.", "Disabled enforcement blocks it.", "A safe message executes an action."],
    ),
    manual(
      "secure-beam-packet",
      "secure-beam-packet",
      "Verify secure beam handling and safe fallback",
      "Exercise the existing secure-session packet path and missing-session fallback.",
      ["Send a normal beam packet with an established secure session.", "Repeat without a secure session where the current UI permits."],
      "Secure handling works and missing-session behavior fails or falls back safely without dangerous execution.",
      ["Plaintext secrets leak.", "Missing session causes unsafe send or crash.", "Payload executes an action."],
    ),
    manual(
      "mission-sync",
      "mission-sync",
      "Verify existing mission sync",
      "Confirm architecture additions did not alter mission synchronization behavior.",
      ["Connect eligible hosts.", "Create or update a normal mission through the existing flow.", "Observe the receiving host."],
      "Mission state follows the existing contract with no new behavior.",
      ["Mission is lost, duplicated, or unexpectedly executed.", "Sync semantics changed."],
    ),
    manual(
      "sensor-pulse",
      "sensor-pulse",
      "Verify existing sensor pulse handling",
      "Confirm a supported fake or second-host sensor pulse remains observable.",
      ["Use an existing fake sensor input or supported second host.", "Send one ordinary sensor pulse.", "Record blocked if no source exists."],
      "The pulse is handled under the existing transport contract without actuation.",
      ["Pulse triggers physical action.", "Transport behavior changes.", "Runtime crashes."],
      false,
      ["May be environment-blocked when no existing sensor source is available."],
    ),
    automated(
      "runtime-enforcement-modes",
      "runtime-enforcement",
      "Verify runtime enforcement modes",
      "Cover disabled, observe-only, high-risk-only, and full-outbound decisions with model/service tests.",
      "Disabled and observe-only preserve safe traffic; blocking modes gate dangerous outbound actions and require fresh confirmation where applicable.",
      ["Default mode is enabled.", "Observe-only blocks.", "Dangerous full-outbound action is allowed."],
      true,
      ["Manually confirm normal messaging while enforcement is disabled."],
    ),
    automated(
      "approval-queue-state",
      "approval-queue",
      "Verify approval queue decisions are state-only",
      "Cover approve, deny, and cancel transitions without transport side effects.",
      "Queue status changes in memory and no blocked action is emitted, retried, replayed, or executed.",
      ["Decision sends traffic.", "Deny/cancel creates continuation execution.", "Queue summary diverges."],
    ),
    automated(
      "continuation-record-state",
      "continuation-records",
      "Verify continuation record visibility without execution",
      "Cover creation, validation, consumption, expiry, and Device Center visibility.",
      "Continuation records remain model state and consuming one does not run the original action.",
      ["Consumption emits or retries.", "Expired token validates.", "Record is hidden from Device Center."],
    ),
    automated(
      "device-trust-local-only",
      "device-trust",
      "Verify device trust management is local-only",
      "Cover rename, trust, revoke, block, and unblock registry transitions.",
      "Trust records change locally while owner and Primary Host protections remain intact.",
      ["Trust mutation emits traffic.", "Owner transfer is possible.", "Blocked device remains trusted."],
    ),
    automated(
      "handoff-preview-only",
      "handoff-records",
      "Verify handoff previews exclude raw memory",
      "Cover handoff lifecycle and redacted payload previews.",
      "Only bounded intent/conversation previews are modeled; raw memory databases, files, hidden prompts, and private reasoning are absent.",
      ["Raw memory or files appear.", "Handoff mutation sends data.", "Approval causes execution."],
    ),
    automated(
      "host-connection-classification",
      "host-connection-model",
      "Verify host connection classification",
      "Classify Primary Host, companion, display, guest, sensor, embodied, electronics, and future host surfaces.",
      "Host-aware records classify connection and runtime surfaces without desktop/mobile assumptions.",
      ["Unknown hosts crash classification.", "Primary Host is called Origin.", "Body/kernel metadata is discarded."],
    ),
    automated(
      "host-adaptation-model-only",
      "host-adaptation-blueprints",
      "Verify adaptation blueprints remain non-executing",
      "Exercise blueprint planning and safety evaluation as pure model transformations.",
      "Blueprints deny generated execution and require review/sandbox controls without probing or installation.",
      ["Blueprint opens a transport.", "Generated program is allowed to run.", "Unsafe capability is granted."],
    ),
    automated(
      "approval-surface-derivation",
      "multi-host-approval-surface",
      "Verify multi-host approval surface derivation",
      "Derive eligible approval displays from fake host records.",
      "Surfaces remain visibility/eligibility models and do not push approvals or transfer authority.",
      ["Surface auto-approves.", "Guest becomes approval authority.", "Primary Host or owner transfer appears."],
    ),
    automated(
      "bridge-review-sandbox-only",
      "bridge-review",
      "Verify bridge review is sandbox approval only",
      "Cover review creation, approval-for-sandbox, rejection, cancellation, and summaries.",
      "Approval mutates review state only and explicitly does not execute or install a bridge.",
      ["Review opens sockets or writes files.", "Approval executes/installs.", "Unsafe review is approvable."],
    ),
    automated(
      "embodied-policy-envelope",
      "embodied-policy",
      "Verify embodied host safety envelopes",
      "Evaluate fake sensor, robot, drone, humanoid, and electronics host capabilities.",
      "Physical, payment, and safety-critical actions are denied or require fresh Primary Host confirmation and are never auto-approved.",
      ["Motion or payment auto-approves.", "Guest can actuate.", "Stale approval authorizes action."],
    ),
    automated(
      "adapter-draft-text-only",
      "adapter-drafts",
      "Verify adapter drafts are text-only",
      "Cover draft creation, sanitization, review linkage, cancellation, clearing, and summaries.",
      "Every draft is generatedTextOnly and cannot write, execute, install, connect, probe, or control a device.",
      ["Draft canWriteToDisk/canExecute/canInstall is true.", "Draft creation performs I/O.", "Unsafe text survives."],
    ),
    automated(
      "device-center-empty-populated",
      "device-center-ui",
      "Render Device Center empty and populated states",
      "Verify snapshot reads and all tabs remain no-crash with empty and representative model state.",
      "Devices, Hosts, Approvals, Guests, Sync, Bridge Review, and Advanced render readable safe state.",
      ["Any tab crashes.", "Missing arrays are dereferenced.", "Unsafe action control appears."],
      true,
      ["Manually inspect responsive layouts and real connected state."],
    ),
    automated(
      "model-only-no-side-effects",
      "security-invariants",
      "Verify model-only features have no side effects",
      "Assert architecture modules do not fetch, store, write, install, execute, probe, or add socket events.",
      "Model-only features remain pure/state-only and the audited socket event surface is unchanged.",
      ["Network/storage/browser API appears.", "Adapter or bridge action executes.", "New socket event appears."],
    ),
    automated(
      "origin-boundary",
      "security-invariants",
      "Protect the Origin authority boundary",
      "Assert Origin remains reserved for Creator/source-code and self-evolution authority.",
      "Normal mesh roles, approvals, trust, devices, and fallbacks use Primary Host/owner terminology only.",
      ["Origin is used as a host role.", "UI requests Origin approval.", "A device receives Origin trust."],
    ),
    automated(
      "primary-host-terminology",
      "security-invariants",
      "Protect Primary Host terminology",
      "Assert pairing and Device Center copy use Primary Host for normal mesh authority.",
      "User-facing mesh authority copy consistently says Primary Host and remains host/body aware.",
      ["Pairing says Origin.", "Copy is desktop/mobile-only.", "Owner is replaced by Origin."],
    ),
  ];
}

export function summarizeLucaLinkRuntimeQaChecklist(
  checks: readonly LucaLinkRuntimeQaCheck[],
): LucaLinkRuntimeQaSummary {
  const byStatus = Object.fromEntries(
    ALL_STATUSES.map((status) => [status, 0]),
  ) as Record<LucaLinkRuntimeQaStatus, number>;
  for (const item of checks) byStatus[item.status] += 1;

  const required = checks.filter((item) => item.requiredBeforeRealImplementation);
  const requiredPassed = required.filter(
    (item) => item.status === "passed" || item.status === "not-applicable",
  ).length;

  return {
    total: checks.length,
    byStatus,
    passed: byStatus.passed,
    failed: byStatus.failed,
    blocked: byStatus.blocked,
    automatedCovered: byStatus["automated-covered"],
    manualRequired: byStatus["manual-required"],
    required: required.length,
    requiredPassed,
    requiredOpen: required.length - requiredPassed,
    readyForRealImplementation:
      required.length > 0 && requiredPassed === required.length,
  };
}

export function markLucaLinkRuntimeQaCheckStatus(
  checks: readonly LucaLinkRuntimeQaCheck[],
  id: string,
  status: LucaLinkRuntimeQaStatus,
  options: LucaLinkRuntimeQaStatusOptions = {},
): LucaLinkRuntimeQaCheck[] {
  const extraWarnings = [
    ...(options.warning ? [options.warning] : []),
    ...(options.warnings ?? []),
  ];
  return checks.map((item) =>
    item.id === id
      ? {
          ...item,
          status,
          warnings: options.replaceWarnings
            ? extraWarnings
            : [...item.warnings, ...extraWarnings],
        }
      : item,
  );
}

export function listBlockingRuntimeQaChecks(
  checks: readonly LucaLinkRuntimeQaCheck[],
): LucaLinkRuntimeQaCheck[] {
  return checks.filter(
    (item) =>
      item.requiredBeforeRealImplementation &&
      !["passed", "not-applicable"].includes(item.status),
  );
}

export function listManualRuntimeQaChecks(
  checks: readonly LucaLinkRuntimeQaCheck[],
): LucaLinkRuntimeQaCheck[] {
  return checks.filter(
    (item) => !item.automationAvailable || item.status === "manual-required",
  );
}

export function listRealImplementationReadinessChecks(
  checks: readonly LucaLinkRuntimeQaCheck[],
): LucaLinkRuntimeQaCheck[] {
  return checks.filter((item) => item.requiredBeforeRealImplementation);
}
