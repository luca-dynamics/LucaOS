import { isPrivacyZone } from "../privacy/privacyZones";
import { INTEGRATION_TARGET_IDS } from "./integrationTypes";
import type {
  IntegrationReadinessSummary,
  IntegrationTarget,
  IntegrationTargetInput,
  IntegrationValidationResult,
} from "./integrationTypes";

const SENSITIVE_ZONES = new Set(["credential", "financial", "health", "enterprise"]);
const RISKS = new Set(["none", "low", "medium", "high", "critical"]);
const STATUSES = new Set(["not_started", "audited", "boundary_defined", "ready_for_future_pr", "blocked"]);

export const READINESS_BLOCKERS = {
  execution: "Requires a separate governed runtime execution PR.",
  network: "Requires a separate transport/network permission PR.",
  persistence: "Requires a governed persistence adapter PR.",
  sensitivePrivacy: "Requires an explicit approval policy for sensitive privacy zones.",
} as const;

export function validateIntegrationTarget(target: IntegrationTarget): IntegrationValidationResult {
  const errors: string[] = [];
  if (!INTEGRATION_TARGET_IDS.includes(target.id)) errors.push("id is not a supported integration target");
  if (!target.title.trim()) errors.push("title is required");
  if (!target.description.trim()) errors.push("description is required");
  if (!STATUSES.has(target.currentStatus)) errors.push("currentStatus is invalid");
  if (!RISKS.has(target.runtimeRisk)) errors.push("runtimeRisk is invalid");
  if (!target.privacyZones.every(isPrivacyZone)) errors.push("privacyZones contains an invalid zone");
  if (!target.futurePrRecommendation.trim()) errors.push("futurePrRecommendation is required");
  return { valid: errors.length === 0, errors };
}

export function createIntegrationTarget(input: IntegrationTargetInput): IntegrationTarget {
  const target: IntegrationTarget = {
    ...input,
    currentStatus: input.currentStatus ?? "not_started",
    privacyZones: [...input.privacyZones],
    blockers: [...(input.blockers ?? [])],
  };
  const validation = validateIntegrationTarget(target);
  if (!validation.valid) throw new Error(`Invalid integration target: ${validation.errors.join(", ")}`);
  return target;
}

export function evaluateIntegrationReadiness(target: IntegrationTarget): IntegrationTarget {
  const validation = validateIntegrationTarget(target);
  if (!validation.valid) throw new Error(`Invalid integration target: ${validation.errors.join(", ")}`);

  const blockers = [...target.blockers];
  if (target.touchesExecution) blockers.push(READINESS_BLOCKERS.execution);
  if (target.touchesNetwork) blockers.push(READINESS_BLOCKERS.network);
  if (target.touchesPersistence) blockers.push(READINESS_BLOCKERS.persistence);
  if (target.privacyZones.some((zone) => SENSITIVE_ZONES.has(zone))) blockers.push(READINESS_BLOCKERS.sensitivePrivacy);
  const uniqueBlockers = Array.from(new Set(blockers));

  let currentStatus: IntegrationTarget["currentStatus"] = target.currentStatus;
  if (uniqueBlockers.length > 0) currentStatus = "blocked";
  else if (!target.touchesRuntime && (target.runtimeRisk === "none" || target.runtimeRisk === "low")) currentStatus = "ready_for_future_pr";
  else if (target.currentStatus === "not_started" || target.currentStatus === "ready_for_future_pr") currentStatus = "boundary_defined";

  return { ...target, privacyZones: [...target.privacyZones], blockers: uniqueBlockers, currentStatus };
}

export function summarizeIntegrationReadiness(targets: IntegrationTarget[]): IntegrationReadinessSummary {
  const evaluated = targets.map(evaluateIntegrationReadiness);
  return {
    total: evaluated.length,
    ready: evaluated.filter((target) => target.currentStatus === "ready_for_future_pr").length,
    blocked: evaluated.filter((target) => target.currentStatus === "blocked").length,
    boundaryDefined: evaluated.filter((target) => target.currentStatus === "boundary_defined").length,
    audited: evaluated.filter((target) => target.currentStatus === "audited").length,
    notStarted: evaluated.filter((target) => target.currentStatus === "not_started").length,
    blockers: Array.from(new Set(evaluated.flatMap((target) => target.blockers))),
  };
}
