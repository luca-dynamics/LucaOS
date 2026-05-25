export type BrowserRuntimeAction =
  | "navigate"
  | "click"
  | "type"
  | "extract"
  | "screenshot";

export type BrowserTrustTier = "trusted" | "verified" | "untrusted";

export type BrowserRiskLevel = "safe" | "sensitive" | "dangerous";

export type BrowserRuntimeLane =
  | "direct_host_browser"
  | "sandbox_browser"
  | "ghost_browser"
  | "remote_linked_browser"
  | "custom"
  | "unknown";

export interface BrowserRuntimeRequest {
  requestId: string;
  missionId: string;
  action: BrowserRuntimeAction;
  target?: string;
  payload?: Record<string, unknown>;
  issuedAt: string;
  trustTier?: BrowserTrustTier;
  riskLevel?: BrowserRiskLevel;
  requiresAuthentication?: boolean;
  hasGuardApproval?: boolean;
  linkedDeviceTrusted?: boolean;
  linkedDeviceAvailable?: boolean;
  preferredLane?: BrowserRuntimeLane;
}

export interface BrowserRouteContext {
  trustTier: BrowserTrustTier;
  riskLevel: BrowserRiskLevel;
  requiresAuthentication: boolean;
  hasGuardApproval: boolean;
  linkedDeviceTrusted: boolean;
  linkedDeviceAvailable: boolean;
  preferredLane?: BrowserRuntimeLane;
}

export interface BrowserRuntimeRouteResult {
  accepted: boolean;
  lane: BrowserRuntimeLane;
  runtime: BrowserRuntimeLane;
  requiresApproval?: boolean;
  reason?: string;
}

export interface BrowserRuntimeAdapter {
  canHandle(request: BrowserRuntimeRequest): boolean;
  execute(request: BrowserRuntimeRequest): Promise<BrowserRuntimeRouteResult>;
}

export interface BrowserRuntimeLaneProvider {
  lane: Exclude<BrowserRuntimeLane, "unknown">;
  isAvailable(request: BrowserRuntimeRequest, context: BrowserRouteContext): boolean;
  route(request: BrowserRuntimeRequest, context: BrowserRouteContext): Promise<BrowserRuntimeRouteResult>;
}
