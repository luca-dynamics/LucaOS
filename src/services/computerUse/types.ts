export type ComputerUseExecutionMode =
  | "direct_host"
  | "sandbox"
  | "remote_linked"
  | "browser_body";

export type ComputerUseRiskLevel = "safe" | "sensitive" | "dangerous";

export type ComputerUseTrustTier = "trusted" | "verified" | "untrusted";

export interface CursorPoint {
  x: number;
  y: number;
  timestamp: string;
}

export interface ScreenRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
}

export interface FocusedElement {
  role?: string;
  label?: string;
  text?: string;
  selectorHint?: string;
}

export interface ScreenshotReference {
  id: string;
  uri?: string;
  capturedAt: string;
}

export interface UserPointedTarget {
  description?: string;
  cursorPoint?: CursorPoint;
  region?: ScreenRegion;
  confidence?: number;
}

export interface ComputerUseFocusSignal {
  kind:
    | "cursor_point"
    | "screen_region"
    | "focused_element"
    | "screenshot_reference"
    | "user_pointed_target";
  source: "model" | "user" | "system";
  createdAt: string;
  highValueGrounding?: boolean;
}

export interface ComputerUseFocusContext {
  executionMode: ComputerUseExecutionMode;
  riskLevel: ComputerUseRiskLevel;
  trustTier: ComputerUseTrustTier;
  requiresGuardApproval: boolean;
  prefersSandbox: boolean;
  cursorPoint?: CursorPoint;
  screenRegion?: ScreenRegion;
  focusedElement?: FocusedElement;
  screenshotReference?: ScreenshotReference;
  userPointedTarget?: UserPointedTarget;
  focusSignals: ComputerUseFocusSignal[];
  metadata: {
    contextOnly: true;
    actionsEnabled: false;
    systemApisEnabled: false;
  };
}

export interface ComputerUseFocusContextBuilderOptions {
  executionMode?: ComputerUseExecutionMode;
  riskLevel?: ComputerUseRiskLevel;
  trustTier?: ComputerUseTrustTier;
  guardApprovalProvided?: boolean;
  now?: () => string;
}
