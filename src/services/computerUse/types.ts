export type ComputerUseExecutionMode =
  | "direct_host"
  | "sandbox"
  | "remote_linked"
  | "browser_body";

export type ComputerUseRiskLevel = "safe" | "sensitive" | "dangerous";

export type ComputerUseTrustTier = "trusted" | "verified" | "untrusted";

export type ComputerUseActionType = "click" | "type_text" | "hotkey" | "scroll" | "wait" | "observe";

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

export interface ComputerUsePlannedAction {
  type: ComputerUseActionType;
  reason: string;
  text?: string;
  requiresGuardApproval: boolean;
}

export interface ComputerUseActionPlan {
  actions: ComputerUsePlannedAction[];
  requiresGuardApproval: boolean;
  prefersSandbox: boolean;
  metadata: {
    planningOnly: true;
    executionEnabled: false;
    mouseKeyboardApisEnabled: false;
    systemApisEnabled: false;
  };
}

export interface ComputerUseActionPlannerOptions {
  now?: () => string;
}

export interface ComputerUseActionPlanningInput {
  context: ComputerUseFocusContext;
  textPayload?: string;
}
