import type { PrivacyZone } from "../privacy/privacyZones";

export const INTEGRATION_TARGET_IDS = [
  "onboarding",
  "settings",
  "model_manager",
  "mission_runtime",
  "memory_panel",
  "skills_panel",
  "lucalink_handoff",
  "lucalink_device_center",
  "voice_runtime",
  "visualcore",
  "browser_runtime",
  "runtime_audit",
] as const;

export type IntegrationTargetId = (typeof INTEGRATION_TARGET_IDS)[number];
export type IntegrationStatus = "not_started" | "audited" | "boundary_defined" | "ready_for_future_pr" | "blocked";
export type RuntimeRisk = "none" | "low" | "medium" | "high" | "critical";

export interface IntegrationTarget {
  id: IntegrationTargetId;
  title: string;
  description: string;
  currentStatus: IntegrationStatus;
  runtimeRisk: RuntimeRisk;
  touchesRuntime: boolean;
  touchesPersistence: boolean;
  touchesNetwork: boolean;
  touchesExecution: boolean;
  privacyZones: PrivacyZone[];
  futurePrRecommendation: string;
  blockers: string[];
}

export type IntegrationTargetInput = Omit<IntegrationTarget, "currentStatus" | "blockers"> &
  Partial<Pick<IntegrationTarget, "currentStatus" | "blockers">>;

export interface IntegrationValidationResult {
  valid: boolean;
  errors: string[];
}

export interface IntegrationReadinessSummary {
  total: number;
  ready: number;
  blocked: number;
  boundaryDefined: number;
  audited: number;
  notStarted: number;
  blockers: string[];
}

export interface IntegrationMappingDescription {
  source: string;
  destination: string;
  previewFields: string[];
  forbiddenEffects: string[];
  notes: string[];
}
