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
    guardDecisionStatus?: ComputerUseGuardDecisionStatus;
    guardBridgeKind?: "scaffold";
    externalGuardCalled?: false;
    systemApisCalled: boolean;
    delegatesOnly: true;
    noDirectSystemCalls: true;
    executorKind: "scaffold";
    adapterCount?: number;
    defaultExecutionMode?: ComputerUseExecutionMode;
    executionMode?: ComputerUseExecutionMode;
    sandboxSimulated?: boolean;
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

export type ComputerUseGuardDecisionStatus = "allowed" | "denied" | "requires_approval";

export interface ComputerUseGuardDecision {
  status: ComputerUseGuardDecisionStatus;
  reason: string;
  metadata: {
    guardBridgeKind: "scaffold";
    externalGuardCalled: false;
  };
}

export interface ComputerUseGuardBridgeInput {
  action?: ComputerUsePlannedAction;
  plan?: Pick<ComputerUseActionPlan, "actions" | "requiresGuardApproval">;
  request?: Pick<ComputerUseExecutionRequest, "guardApprovalProvided">;
  dangerousContext?: boolean;
}

export interface ComputerUseGuardBridgeOptions {
  denyActions?: ComputerUseActionType[];
}

export interface ComputerUseSandboxExecutionLog {
  actionType: ComputerUseActionType;
  status: ComputerUseExecutionStatus;
  timestamp: string;
}

export interface ComputerUseSandboxExecutorAdapterOptions {
  adapterId?: string;
  now?: () => string;
}


export type ComputerUseVerificationStatus = "passed" | "failed" | "inconclusive";

export type ComputerUseRecoveryStrategy =
  | "observe_again"
  | "retry_sandbox"
  | "request_guard_approval"
  | "rollback"
  | "escalate_to_user"
  | "none";



export type ComputerUseBrowserRuntimeLane =
  | "ghost_browser"
  | "sandbox_browser"
  | "authenticated_direct_host"
  | "remote_linked_browser";

export interface ComputerUseBrowserRouteRequest {
  lane: ComputerUseBrowserRuntimeLane;
  action: ComputerUsePlannedAction;
  metadata: {
    bridgeKind: "scaffold";
    browserRuntimeImported: false;
  };
}

export interface ComputerUseBrowserRouteResult {
  status: "executed" | "failed";
  action: ComputerUsePlannedAction;
  metadata: {
    reason?: string;
    bridgeKind: "scaffold";
    browserRuntimeImported: false;
  };
}

export interface ComputerUseBrowserRuntimeBridgeOptions {
  browserRuntimeImportPlanned?: true;
  defaultBrowserLane?: ComputerUseBrowserRuntimeLane;
  defaultBrowserContext?: boolean;
}

export interface ComputerUseSandboxBrowserProviderOptions {
  providerId?: string;
}

export interface ComputerUseSandboxBrowserProviderResult {
  status: "executed" | "failed";
  action: ComputerUsePlannedAction;
  metadata: {
    reason?: string;
    providerKind: "scaffold";
    browserApisCalled: false;
    sandboxSimulated: true;
  };
}



export interface ComputerUseSandboxBrowserRouteRecord {
  route: ComputerUseBrowserRouteRequest;
  result: ComputerUseSandboxBrowserProviderResult;
}
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


export interface ComputerUsePipelineInput {
  missionId: string;
  textPayload?: string;
  cursorPoint?: CursorPoint;
  screenRegion?: ScreenRegion;
  focusedElement?: FocusedElement;
  screenshotReference?: ScreenshotReference;
  userPointedTarget?: UserPointedTarget;
  executionRequest?: ComputerUseExecutionRequest;
  attemptCount?: number;
}

export interface ComputerUsePipelineResult {
  missionId: string;
  focusContext: ComputerUseFocusContext;
  actionPlan: ComputerUseActionPlan;
  executionResults: ComputerUseExecutionResult[];
  verificationResults: ComputerUseVerificationResult[];
  recoveryPlan: ComputerUseRecoveryPlan;
  metadata: {
    pipelineKind: "scaffold";
    systemApisCalled: false;
  };
}

export interface ComputerUsePipelineOptions {
  focusContextBuilder: {
    reset: () => unknown;
    withCursorPoint: (cursorPoint: CursorPoint) => unknown;
    withScreenRegion: (screenRegion: ScreenRegion) => unknown;
    withFocusedElement: (focusedElement: FocusedElement) => unknown;
    withScreenshotReference: (screenshotReference: ScreenshotReference) => unknown;
    withUserPointedTarget: (userPointedTarget: UserPointedTarget) => unknown;
    build: () => ComputerUseFocusContext;
  };
  actionPlanner: {
    createPlan: (input: ComputerUseActionPlanningInput) => ComputerUseActionPlan;
    reset: () => unknown;
  };
  executor: {
    executeAction?: (
      action: ComputerUsePlannedAction,
      plan: Pick<ComputerUseActionPlan, "prefersSandbox">,
      request?: ComputerUseExecutionRequest,
    ) => Promise<ComputerUseExecutionResult>;
    executePlan: (
      plan: ComputerUseActionPlan,
      request?: ComputerUseExecutionRequest,
    ) => Promise<ComputerUseExecutionResult[]>;
    reset: () => unknown;
  };
  guardBridge?: {
    evaluatePlan: (input: ComputerUseGuardBridgeInput) => ComputerUseGuardDecision;
    evaluateAction: (input: ComputerUseGuardBridgeInput) => ComputerUseGuardDecision;
    reset: () => unknown;
  };
  verifier: {
    verifyPlanResults: (input: ComputerUseVerificationInput) => ComputerUseVerificationResult[];
    reset: () => unknown;
  };
  recovery: {
    createRecoveryPlan: (input: ComputerUseRecoveryInput) => ComputerUseRecoveryPlan;
    reset: () => unknown;
  };
  tapeBridge: {
    recordFocusContext: (missionId: string, payload: ComputerUseFocusContext) => unknown;
    recordActionPlan: (missionId: string, payload: ComputerUseActionPlan) => unknown;
    recordExecutionResult: (missionId: string, payload: ComputerUseExecutionResult) => unknown;
    recordVerificationResult: (missionId: string, payload: ComputerUseVerificationResult) => unknown;
    recordRecoveryPlan: (missionId: string, payload: ComputerUseRecoveryPlan) => unknown;
    reset: () => unknown;
  };
}

export type ComputerUseMissionStepKind = "computer_use";

export interface ComputerUseMissionStepInput {
  missionId: string;
  stepId: string;
  kind: string;
  input?: Omit<ComputerUsePipelineInput, "missionId">;
}

export type ComputerUseMissionStepStatus = "completed" | "failed" | "inconclusive";

export interface ComputerUseMissionStepResult {
  missionId: string;
  stepId: string;
  kind: ComputerUseMissionStepKind;
  status: ComputerUseMissionStepStatus;
  pipelineResult?: ComputerUsePipelineResult;
  reason: string;
  metadata: {
    bridgeKind: "scaffold";
    missionEngineImported: false;
  };
}

export interface ComputerUseMissionEngineBridgeOptions {
  defaultReasonByStatus?: Partial<Record<ComputerUseMissionStepStatus, string>>;
}

export interface ComputerUseMissionStepAdapterResult {
  missionId: string;
  stepId: string;
  kind: ComputerUseMissionStepKind;
  status: ComputerUseMissionStepStatus;
  pipelineResult?: ComputerUsePipelineResult;
  reason: string;
  metadata: {
    adapterKind: "scaffold";
    systemApisCalled: false;
  };
}

export interface ComputerUseMissionStepAdapterOptions {
  pipeline: { run: (input: ComputerUsePipelineInput) => Promise<ComputerUsePipelineResult>; reset: () => unknown };
  missionEngineBridge: {
    isComputerUseStep: (step: { kind?: string }) => boolean;
    toMissionStepInput: (step: ComputerUseMissionStepInput) => ComputerUseMissionStepInput;
    toMissionStepResult: (input: { missionStep: ComputerUseMissionStepInput; pipelineResult: ComputerUsePipelineResult }) => ComputerUseMissionStepResult;
    reset: () => unknown;
  };
}

export interface ComputerUseMissionTapeStepRecord {
  missionId: string;
  timestamp: string;
  eventType: "action_plan";
  payload: unknown;
  metadata: {
    adapterKind: "scaffold";
    missionTapeImported: false;
  };
}

export interface ComputerUseMissionTapeVerificationRecord {
  missionId: string;
  timestamp: string;
  eventType: "verification_result";
  payload: unknown;
  metadata: {
    adapterKind: "scaffold";
    missionTapeImported: false;
  };
}

export interface ComputerUseMissionTapeRecoveryRecord {
  missionId: string;
  timestamp: string;
  eventType: "recovery_plan";
  payload: unknown;
  metadata: {
    adapterKind: "scaffold";
    missionTapeImported: false;
  };
}

export interface ComputerUseMissionTapeSnapshot {
  missionId: string;
  stepRecords: ComputerUseMissionTapeStepRecord[];
  verificationRecords: ComputerUseMissionTapeVerificationRecord[];
  recoveryRecords: ComputerUseMissionTapeRecoveryRecord[];
  metadata: {
    adapterKind: "scaffold";
    missionTapeImported: false;
  };
}

export interface ComputerUseRuntimeEntrypointInput {
  missionStepInput?: ComputerUseMissionStepInput;
  pipelineInput?: ComputerUsePipelineInput;
}

export interface ComputerUseRuntimeEntrypointResult {
  ok: boolean;
  stepResult?: ComputerUseMissionStepAdapterResult;
  pipelineResult?: ComputerUsePipelineResult;
  reason?: string;
  metadata: {
    entrypointKind: "scaffold";
    systemApisCalled: false;
  };
}

export interface ComputerUseRuntimeEntrypointOptions {
  pipeline: { run: (input: ComputerUsePipelineInput) => Promise<ComputerUsePipelineResult>; reset: () => unknown };
  missionStepAdapter: { executeStep: (step: ComputerUseMissionStepInput) => Promise<ComputerUseMissionStepAdapterResult>; reset: () => unknown };
}

export interface ComputerUseMissionRunnerStepRecord {
  index: number;
  missionId: string;
  stepId: string;
  kind: string;
  status: ComputerUseMissionStepStatus;
  reason: string;
}

export interface ComputerUseMissionRunnerSummary {
  total: number;
  completed: number;
  failed: number;
  inconclusive: number;
}

export interface ComputerUseMissionRunnerResult {
  results: ComputerUseMissionRunnerStepRecord[];
  summary: ComputerUseMissionRunnerSummary;
  metadata: {
    runnerKind: "scaffold";
    systemApisCalled: false;
  };
}

export interface ComputerUseMissionRunnerOptions {
  runtimeEntrypoint: {
    runComputerUseStep: (step: ComputerUseMissionStepInput) => Promise<ComputerUseRuntimeEntrypointResult>;
    reset: () => unknown;
  };
}
