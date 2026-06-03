/** Pure model-only embodied, sensor, electronics safety policy. */
import type { LucaLinkHostConnectionRecord } from "./lucaLinkHostConnectionModel";
export type LucaLinkEmbodiedLane =
  | "sensor-read"
  | "camera-read"
  | "microphone-read"
  | "location-read"
  | "electronics-status"
  | "smart-home-status"
  | "robotics-status"
  | "motion-plan"
  | "motion-execute"
  | "actuator-control"
  | "smart-home-control"
  | "payment"
  | "safety-critical"
  | "unknown";
export type LucaLinkEmbodiedPolicyDecision =
  | "allow-read-only"
  | "require-primary-host-approval"
  | "fresh-confirmation-required"
  | "deny"
  | "blocked"
  | "invalid";
export interface LucaLinkEmbodiedPolicyInput {
  lane?: LucaLinkEmbodiedLane | string;
  hostClass?: string;
  trustLevel?: string;
  status?: string;
  requestedByHostId?: string;
  targetHostId?: string;
  publicSurface?: boolean;
  guest?: boolean;
  capability?: string;
  action?: string;
}
export interface LucaLinkEmbodiedPolicyRecord {
  id: string;
  lane: LucaLinkEmbodiedLane;
  decision: LucaLinkEmbodiedPolicyDecision;
  readOnly: boolean;
  modelOnly: boolean;
  requiresPrimaryHostApproval: boolean;
  requiresFreshConfirmation: boolean;
  deniedCapabilities: string[];
  warnings: string[];
  errors: string[];
}
export interface LucaLinkEmbodiedCapabilityEnvelope {
  id: string;
  hostId: string;
  displayName: string;
  hostClass: string;
  trustLevel?: string;
  readOnlyLanes: LucaLinkEmbodiedLane[];
  approvalLanes: LucaLinkEmbodiedLane[];
  freshConfirmationLanes: LucaLinkEmbodiedLane[];
  deniedLanes: LucaLinkEmbodiedLane[];
  blockedLanes: LucaLinkEmbodiedLane[];
  warnings: string[];
  errors: string[];
}
export interface LucaLinkEmbodiedPolicySummary {
  total: number;
  readOnly: number;
  approvalRequired: number;
  freshConfirmation: number;
  denied: number;
  blocked: number;
  warnings: string[];
  errors: string[];
}
function n(v?: string | null): string {
  return (v ?? "").trim().toLowerCase();
}
function trusted(v?: string): boolean {
  return ["trusted", "admin", "owner"].includes(n(v));
}
function blockedStatus(v?: string): boolean {
  return ["blocked", "revoked", "disabled"].includes(n(v));
}
export function classifyEmbodiedHostLane(
  input: LucaLinkEmbodiedPolicyInput | string,
): LucaLinkEmbodiedLane {
  const text =
    typeof input === "string"
      ? n(input)
      : JSON.stringify(input ?? {}).toLowerCase();
  if (text.includes("camera")) return "camera-read";
  if (text.includes("microphone") || text.includes("mic"))
    return "microphone-read";
  if (text.includes("location") || text.includes("gps")) return "location-read";
  if (text.includes("electronics") && text.includes("status"))
    return "electronics-status";
  if (text.includes("smart-home") && text.includes("status"))
    return "smart-home-status";
  if (text.includes("robot") && text.includes("status"))
    return "robotics-status";
  if (text.includes("motion") && text.includes("plan")) return "motion-plan";
  if (text.includes("motion") || text.includes("move")) return "motion-execute";
  if (text.includes("actuator")) return "actuator-control";
  if (
    text.includes("smart-home") ||
    text.includes("smart home") ||
    text.includes("device-control")
  )
    return "smart-home-control";
  if (text.includes("payment")) return "payment";
  if (text.includes("safety-critical") || text.includes("critical safety"))
    return "safety-critical";
  if (text.includes("sensor") || text.includes("read")) return "sensor-read";
  return "unknown";
}
export function evaluateEmbodiedHostPolicy(
  input: LucaLinkEmbodiedPolicyInput,
  options: { now?: number } = {},
): LucaLinkEmbodiedPolicyRecord {
  void options;
  const lane =
    (input.lane as LucaLinkEmbodiedLane) ?? classifyEmbodiedHostLane(input);
  const warnings: string[] = [];
  const errors: string[] = [];
  const hostClass = n(input.hostClass);
  const isGuestOrPublic =
    input.guest ||
    input.publicSurface ||
    hostClass === "guest-host" ||
    hostClass === "web-display-host" ||
    hostClass === "display-host";
  const selfPhysical =
    input.requestedByHostId &&
    input.targetHostId &&
    input.requestedByHostId === input.targetHostId &&
    [
      "motion-execute",
      "actuator-control",
      "smart-home-control",
      "payment",
      "safety-critical",
    ].includes(lane);
  if (blockedStatus(input.status))
    errors.push(
      "Blocked or revoked hosts cannot use embodied/electronics policy lanes.",
    );
  if (
    isGuestOrPublic &&
    !["sensor-read", "electronics-status", "smart-home-status"].includes(lane)
  )
    errors.push(
      "Guest and public display hosts cannot control embodied/electronics hosts.",
    );
  if (selfPhysical)
    errors.push(
      "Embodied hosts cannot approve or control their own physical action.",
    );
  let decision: LucaLinkEmbodiedPolicyDecision = "deny";
  if (errors.length) decision = "blocked";
  else if (lane === "sensor-read")
    decision = trusted(input.trustLevel) ? "allow-read-only" : "deny";
  else if (["camera-read", "microphone-read", "location-read"].includes(lane))
    decision = "require-primary-host-approval";
  else if (
    [
      "electronics-status",
      "smart-home-status",
      "robotics-status",
      "motion-plan",
    ].includes(lane)
  )
    decision = "allow-read-only";
  else if (
    [
      "smart-home-control",
      "motion-execute",
      "actuator-control",
      "payment",
    ].includes(lane)
  )
    decision = "fresh-confirmation-required";
  else if (lane === "safety-critical") decision = "blocked";
  else decision = "deny";
  if (lane === "motion-plan")
    warnings.push(
      "Motion plan is reviewable as text/model only; execution is not allowed.",
    );
  if (
    [
      "motion-execute",
      "actuator-control",
      "smart-home-control",
      "payment",
    ].includes(lane)
  )
    warnings.push(
      "Physical, smart-home, actuator, and payment actions are never auto-approved.",
    );
  return {
    id: `embodied-policy-${lane}`,
    lane,
    decision,
    readOnly: decision === "allow-read-only",
    modelOnly: true,
    requiresPrimaryHostApproval:
      decision === "require-primary-host-approval" ||
      decision === "fresh-confirmation-required",
    requiresFreshConfirmation: decision === "fresh-confirmation-required",
    deniedCapabilities:
      decision === "allow-read-only"
        ? ["write", "execute", "actuate", "payment"]
        : ["auto-approve", "self-approval", "physical-execution"],
    warnings,
    errors,
  };
}
export function deriveEmbodiedHostCapabilityEnvelope(
  hostConnection: LucaLinkHostConnectionRecord,
): LucaLinkEmbodiedCapabilityEnvelope {
  const lanes: LucaLinkEmbodiedLane[] = [
    "sensor-read",
    "camera-read",
    "microphone-read",
    "location-read",
    "electronics-status",
    "smart-home-status",
    "robotics-status",
    "motion-plan",
    "motion-execute",
    "actuator-control",
    "smart-home-control",
    "payment",
    "safety-critical",
  ];
  const records = lanes.map((lane) =>
    evaluateEmbodiedHostPolicy({
      lane,
      hostClass: hostConnection.hostClass,
      trustLevel: hostConnection.trustLevel,
      status: hostConnection.status,
      publicSurface: hostConnection.presenceCapability === "public-surface",
      targetHostId: hostConnection.id,
    }),
  );
  return {
    id: `embodied-envelope-${hostConnection.id}`,
    hostId: hostConnection.id,
    displayName: hostConnection.displayName,
    hostClass: hostConnection.hostClass,
    trustLevel: hostConnection.trustLevel,
    readOnlyLanes: records
      .filter((r) => r.decision === "allow-read-only")
      .map((r) => r.lane),
    approvalLanes: records
      .filter((r) => r.decision === "require-primary-host-approval")
      .map((r) => r.lane),
    freshConfirmationLanes: records
      .filter((r) => r.decision === "fresh-confirmation-required")
      .map((r) => r.lane),
    deniedLanes: records
      .filter((r) => r.decision === "deny")
      .map((r) => r.lane),
    blockedLanes: records
      .filter((r) => r.decision === "blocked")
      .map((r) => r.lane),
    warnings: records.flatMap((r) => r.warnings),
    errors: records.flatMap((r) => r.errors),
  };
}
export function summarizeEmbodiedHostPolicies(
  records: LucaLinkEmbodiedPolicyRecord[],
): LucaLinkEmbodiedPolicySummary {
  return {
    total: records.length,
    readOnly: records.filter((r) => r.decision === "allow-read-only").length,
    approvalRequired: records.filter(
      (r) => r.decision === "require-primary-host-approval",
    ).length,
    freshConfirmation: records.filter(
      (r) => r.decision === "fresh-confirmation-required",
    ).length,
    denied: records.filter((r) => r.decision === "deny").length,
    blocked: records.filter((r) => r.decision === "blocked").length,
    warnings: records.flatMap((r) => r.warnings),
    errors: records.flatMap((r) => r.errors),
  };
}
