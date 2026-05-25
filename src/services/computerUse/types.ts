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

export type ComputerUseActionType = "click" | "type_text" | "hotkey" | "scroll" | "wait" | "observe";

export interface ComputerUsePlannedAction {
  type: ComputerUseActionType;
  target?: {
    description?: string;
    cursorPoint?: CursorPoint;
    region?: ScreenRegion;
    role?: string;
    label?: string;
    selectorHint?: string;
  };
  text?: string;
  reason: string;
  requiresGuardApproval: boolean;
}

export interface ComputerUseActionPlan {
  actions: ComputerUsePlannedAction[];
  requiresGuardApproval: boolean;
  prefersSandbox: boolean;
  metadata: {
    planningOnly: true;
    actionsExecuted: false;
    systemApisUsed: false;
  };
}

export interface ComputerUseActionPlannerOptions {
  now?: () => string;
}

export interface ComputerUseActionPlanningInput {
  focusContext: ComputerUseFocusContext;
  textPayload?: string;
}

export type ComputerUseExecutionStatus =
  | "pending"
  | "approved"
  | "denied"
  | "executed"
  | "failed"
  | "skipped";

export interface ComputerUseExecutionRequest {
  executionMode?: ComputerUseExecutionMode;
  guardApprovalProvided?: boolean;
}

export interface ComputerUseExecutionResult {
  status: ComputerUseExecutionStatus;
  action: ComputerUsePlannedAction;
  metadata?: {
    reason?: string;
    adapterId?: string;
    systemApisCalled: boolean;
    delegatesOnly: true;
    noDirectSystemCalls: true;
    executorKind: "scaffold";
    adapterCount?: number;
    defaultExecutionMode?: ComputerUseExecutionMode;
  };
}

export interface ComputerUseExecutorAdapter {
  id: string;
  mode: ComputerUseExecutionMode;
  supportedActionTypes: ComputerUseActionType[];
  canExecute?: (context: {
    action: ComputerUsePlannedAction;
    plan: Pick<ComputerUseActionPlan, "prefersSandbox">;
    request: ComputerUseExecutionRequest;
  }) => boolean;
  execute: (
    action: ComputerUsePlannedAction,
    request: ComputerUseExecutionRequest,
  ) => Promise<ComputerUseExecutionResult>;
}

export interface ComputerUseExecutorOptions {
  defaultExecutionMode?: ComputerUseExecutionMode;
}


export type ComputerUseVerificationStatus = "passed" | "failed" | "inconclusive";

export type ComputerUseRecoveryStrategy =
  | "observe_again"
  | "retry_sandbox"
  | "request_guard_approval"
  | "rollback"
  | "escalate_to_user"
  | "none";

export interface ComputerUseVerificationInput {
  result: ComputerUseExecutionResult;
  results: ComputerUseExecutionResult[];
}

export interface ComputerUseVerificationResult {
  status: ComputerUseVerificationStatus;
  followUpObservationRequired: boolean;
  reason: string;
  metadata: {
    verifierKind: "scaffold";
    systemApisCalled: boolean;
    screenshotsCaptured: false;
  };
}

export interface ComputerUseRecoveryInput {
  verification: ComputerUseVerificationResult;
  executionResult: ComputerUseExecutionResult;
  attemptCount?: number;
  dangerousContext?: boolean;
  executionMode?: ComputerUseExecutionMode;
}

export interface ComputerUseRecoveryPlan {
  strategy: ComputerUseRecoveryStrategy;
  requiresGuardApprovalRequest: boolean;
  shouldEscalateToUser: boolean;
  reason: string;
  metadata: {
    recoveryKind: "scaffold";
    noRollbackPerformed: true;
    noSystemActionsPerformed: true;
  };
}

export interface ComputerUseVerifierOptions {
  now?: () => string;
}

export interface ComputerUseRecoveryOptions {
  maxRetriesBeforeEscalation?: number;
}


export type ComputerUseTapeEventType =
  | "focus_context"
  | "action_plan"
  | "execution_result"
  | "verification_result"
  | "recovery_plan";

export interface ComputerUseTapeEvent {
  missionId: string;
  timestamp: string;
  eventType: ComputerUseTapeEventType;
  payload: unknown;
}

export interface ComputerUseTapeRecord {
  missionId: string;
  events: ComputerUseTapeEvent[];
  metadata: {
    bridgeKind: "scaffold";
    storageWritesEnabled: false;
    missionTapeIntegrationEnabled: false;
  };
}

export interface ComputerUseMissionTapeBridgeOptions {
  redactSensitiveText?: boolean;
  now?: () => string;
}
