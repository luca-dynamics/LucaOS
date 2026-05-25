export type BrowserRuntimeAction =
  | "navigate"
  | "click"
  | "type"
  | "extract"
  | "screenshot";

export type BrowserTrustTier = "trusted" | "untrusted";

export type BrowserRiskLevel = "safe" | "sensitive" | "dangerous";

export type BrowserRuntimeLane =
  | "ghost_browser"
  | "sandbox_browser"
  | "authenticated_direct_host"
  | "remote_linked_browser"
  | "unknown";

export interface BrowserRuntimeRequest {
  requestId: string;
  missionId: string;
  action: BrowserRuntimeAction;
  target?: string;
  payload?: Record<string, unknown>;
  issuedAt: string;
  riskLevel: BrowserRiskLevel;
  trustTier: BrowserTrustTier;
  preferredLane?: BrowserRuntimeLane;
  hasGuardApproval?: boolean;
  linkedDeviceTrusted?: boolean;
  linkedDeviceAvailable?: boolean;
}

export interface BrowserRouteContext {
  request: BrowserRuntimeRequest;
  requiresApproval: boolean;
  guardApproved: boolean;
  shouldSandbox: boolean;
}

export interface BrowserRuntimeRouteResult {
  accepted: boolean;
  lane: BrowserRuntimeLane;
  runtime: "playwright" | "bidi" | "unknown";
  reason?: string;
  requiresApproval?: boolean;
}

export interface BrowserRuntimeAdapter {
  lane: BrowserRuntimeLane;
  canHandle(request: BrowserRuntimeRequest): boolean;
  execute(request: BrowserRuntimeRequest): Promise<BrowserRuntimeRouteResult>;
}

export interface BrowserRuntimeLaneProvider {
  canProvide(request: BrowserRuntimeRequest, context: BrowserRouteContext): boolean;
  lane: BrowserRuntimeLane;
}
