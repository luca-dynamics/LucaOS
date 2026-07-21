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
  /**
   * Present when a real adapter performed (or explicitly refused) browser work.
   * Scaffold / mock adapters may omit this field.
   */
  execution?: BrowserRuntimeExecutionMetadata;
}

/** Honest execution metadata for real or real-capable adapters. */
export interface BrowserRuntimeExecutionMetadata {
  adapterId: string;
  realBrowserExecutionEnabled: boolean;
  playwrightCalled: boolean;
  browserApisCalled: boolean;
  systemApisCalled: false;
  directHostAllowed: false;
  driverKind: "injected" | "playwright" | "electron_sandbox" | "none";
}

export interface BrowserRuntimeAdapter {
  lane: BrowserRuntimeLane;
  canHandle(request: BrowserRuntimeRequest): boolean;
  execute(request: BrowserRuntimeRequest): Promise<BrowserRuntimeRouteResult>;
}

/** Injectable browser driver so CI can mock Playwright / Electron sandbox IPC. */
export type BrowserDriverAction =
  | "navigate"
  | "click"
  | "type"
  | "extract"
  | "screenshot";

export interface BrowserDriverActionResult {
  ok: boolean;
  reason?: string;
  data?: Record<string, unknown>;
}

/**
 * Platform-agnostic browser body. Real Playwright and Electron sandbox IPC
 * implement this; unit tests inject a mock.
 */
export interface BrowserDriver {
  readonly kind: BrowserRuntimeExecutionMetadata["driverKind"];
  navigate(url: string): Promise<BrowserDriverActionResult>;
  click(
    target: string | undefined,
    payload?: Record<string, unknown>,
  ): Promise<BrowserDriverActionResult>;
  type(
    target: string | undefined,
    text: string,
    payload?: Record<string, unknown>,
  ): Promise<BrowserDriverActionResult>;
  extract(target?: string): Promise<BrowserDriverActionResult>;
  screenshot(target?: string): Promise<BrowserDriverActionResult>;
  dispose?(): Promise<void>;
}

export interface SandboxPlaywrightBrowserRuntimeAdapterOptions {
  /** Must be true for execute() to call the driver. Default false. */
  enabled?: boolean;
  adapterId?: string;
  driver?: BrowserDriver;
  allowedUrlProtocols?: string[];
  maxTextChars?: number;
  timeoutMs?: number;
}

export interface BrowserRuntimeLaneProvider {
  canProvide(request: BrowserRuntimeRequest, context: BrowserRouteContext): boolean;
  lane: BrowserRuntimeLane;
}
