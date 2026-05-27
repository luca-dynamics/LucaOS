import type { BrowserRuntimeAction, BrowserRuntimeRequest } from "../browserRuntime/types";
import {
  COMPUTER_USE_BROWSER_RUNTIME_ACTION_MAPPING,
  type ComputerUseBrowserRuntimeConformanceEntry,
} from "./BrowserRuntimeConformance";
import type { ComputerUseBrowserRuntimeAdapterRequest } from "./types";

const SANDBOX_LANE = "sandbox_browser" as const;

export type BrowserRuntimeRouterBridgeMetadata = {
  bridgeKind: "browser_runtime_router_bridge_scaffold";
  realBrowserExecutionEnabled: false;
  browserRuntimeRouterImported: false;
  playwrightCalled: false;
  browserApisCalled: false;
  systemApisCalled: false;
  directHostAllowed: false;
  requiresExplicitOptIn: true;
};

export type BrowserRuntimeRouterBridgeRoute = Exclude<BrowserRuntimeAction, "navigate" | "screenshot">;

export type BrowserRuntimeRouterBridgeRequest = BrowserRuntimeRequest & {
  action: BrowserRuntimeRouterBridgeRoute;
  metadata: BrowserRuntimeRouterBridgeMetadata & {
    sourceActionType: string;
    sourceDisposition: "mapped" | "noop" | "rejected";
    sourceConformanceReason: string;
    stepId?: string;
    traceId?: string;
    source?: string;
  };
};

export const mapComputerUseActionToBrowserRuntimeRoute = (
  actionType?: string,
): { ok: true; route: BrowserRuntimeRouterBridgeRoute; conformance: ComputerUseBrowserRuntimeConformanceEntry } | { ok: false; reason: string } => {
  if (!actionType) return { ok: false, reason: "Missing action type for BrowserRuntime router bridge mapping." };
  const conformance = COMPUTER_USE_BROWSER_RUNTIME_ACTION_MAPPING[actionType as keyof typeof COMPUTER_USE_BROWSER_RUNTIME_ACTION_MAPPING];
  if (!conformance) return { ok: false, reason: `Unsupported computer-use browser action for BrowserRuntime router bridge: ${actionType}.` };
  if (conformance.disposition === "rejected") return { ok: false, reason: conformance.reason };
  if (conformance.disposition === "mapped" && conformance.targetAction) {
    return { ok: true, route: conformance.targetAction as BrowserRuntimeRouterBridgeRoute, conformance };
  }
  if (conformance.sourceAction === "wait" || conformance.sourceAction === "scroll") {
    return { ok: true, route: "extract", conformance };
  }
  return { ok: false, reason: `Action ${actionType} has no BrowserRuntime router bridge mapping.` };
};

export const createBrowserRuntimeRouterBridgeRequest = (
  request: ComputerUseBrowserRuntimeAdapterRequest,
): { ok: true; request: BrowserRuntimeRouterBridgeRequest } | { ok: false; reason: string } => {
  const mapped = mapComputerUseActionToBrowserRuntimeRoute(request?.action?.type);
  if (!mapped.ok) return mapped;

  return {
    ok: true,
    request: {
      requestId: `router-bridge-${request.context?.traceId ?? request.context?.stepId ?? "unknown"}`,
      missionId: request.context?.missionId ?? "unknown",
      action: mapped.route,
      target: request.action?.target?.selectorHint ?? request.action?.target?.description,
      payload: {
        text: request.action?.text,
        sourceLane: request.lane,
      },
      issuedAt: new Date().toISOString(),
      riskLevel: request.action.requiresGuardApproval ? "sensitive" : "safe",
      trustTier: "untrusted",
      preferredLane: SANDBOX_LANE,
      hasGuardApproval: !request.action.requiresGuardApproval,
      metadata: {
        bridgeKind: "browser_runtime_router_bridge_scaffold",
        realBrowserExecutionEnabled: false,
        browserRuntimeRouterImported: false,
        playwrightCalled: false,
        browserApisCalled: false,
        systemApisCalled: false,
        directHostAllowed: false,
        requiresExplicitOptIn: true,
        sourceActionType: request.action.type,
        sourceDisposition: mapped.conformance.disposition,
        sourceConformanceReason: mapped.conformance.reason,
        stepId: request.context?.stepId,
        traceId: request.context?.traceId,
        source: request.context?.source,
      },
    },
  };
};

export const validateBrowserRuntimeRouterBridgeRequest = (
  request?: Partial<BrowserRuntimeRouterBridgeRequest>,
): { ok: true } | { ok: false; reason: string } => {
  if (!request) return { ok: false, reason: "Missing BrowserRuntime router bridge request." };
  if (!request.action) return { ok: false, reason: "Missing BrowserRuntime router bridge action." };
  if (!request.target) return { ok: false, reason: "Missing BrowserRuntime router bridge target." };
  return { ok: true };
};
