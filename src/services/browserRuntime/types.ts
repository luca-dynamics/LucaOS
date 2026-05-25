export type BrowserRuntimeLane =
  | "direct_host_browser"
  | "sandbox_browser"
  | "remote_linked_browser"
  | "ghost_browser"
  | "custom";

export interface BrowserRuntimeContext {
  trustTier: "trusted" | "verified" | "untrusted";
  riskLevel: "safe" | "sensitive" | "dangerous";
  mode: "Origin" | "Tactical" | "Core";
  requiresAuthentication?: boolean;
  hasGuardApproval?: boolean;
  linkedDeviceTrusted?: boolean;
  linkedDeviceAvailable?: boolean;
}

export interface BrowserRuntimeRouteRequest {
  missionId: string;
  action: string;
  preferredLane?: BrowserRuntimeLane;
  context: BrowserRuntimeContext;
}

export interface BrowserRuntimeRouteDecision {
  allowed: boolean;
  lane?: BrowserRuntimeLane;
  providerId?: string;
  requiresApproval: boolean;
  reason: string;
}

export interface BrowserRuntimeProvider {
  id: string;
  lane: BrowserRuntimeLane;
  isAvailable(): Promise<boolean>;
}

export interface BrowserRuntimePolicy {
  name: string;
  evaluate(request: BrowserRuntimeRouteRequest): Partial<BrowserRuntimeRouteDecision> | null;
}
