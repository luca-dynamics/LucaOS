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
  /** Optional mission context for real sandbox bridge mapping. */
  missionId?: string;
  stepId?: string;
  traceId?: string;
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
    executorKind: "scaffold" | "real_sandbox";
    adapterCount?: number;
    defaultExecutionMode?: ComputerUseExecutionMode;
    executionMode?: ComputerUseExecutionMode;
    sandboxSimulated?: boolean;
    realBrowserExecutionEnabled?: boolean;
    browserRuntimeRouterCalled?: boolean;
    playwrightCalled?: boolean;
    browserApisCalled?: boolean;
    shellStatus?: string;
    routeLane?: string;
    [key: string]: unknown;
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

export type ComputerUseGuardDecisionStatus = "allowed" | "denied" | "needs_confirmation";

export type ComputerUseGuardRiskLevel = "low" | "medium" | "high" | "critical";

export type ComputerUseGuardApprovalRequirement =
  | "none"
  | "guard_approval"
  | "user_confirmation_required";

export interface ComputerUseGuardApprovalContext {
  userConfirmed?: boolean;
  approvalToken?: string;
  approvedBy?: "user" | "policy" | "system";
  approvalReason?: string;
}

export interface ComputerUseGuardDecisionMetadata {
  guardPolicyKind: "scaffold";
  externalGuardCalled: false;
  systemApisCalled: false;
  directHostAllowed: false;
  requiresExplicitOptIn: true;
  missionId?: string;
  stepId?: string;
  actionType?: ComputerUseActionType;
  riskLevel: ComputerUseGuardRiskLevel;
  status: ComputerUseGuardDecisionStatus;
  confirmationRequired: boolean;
  approvalRequirement: ComputerUseGuardApprovalRequirement;
}

export interface ComputerUseGuardDecision {
  status: ComputerUseGuardDecisionStatus;
  reason: string;
  metadata: ComputerUseGuardDecisionMetadata;
}

export interface ComputerUseGuardBridgeInput {
  action?: ComputerUsePlannedAction;
  plan?: Pick<ComputerUseActionPlan, "actions" | "requiresGuardApproval">;
  request?: Pick<ComputerUseExecutionRequest, "guardApprovalProvided"> & {
    approval?: ComputerUseGuardApprovalContext;
    missionId?: string;
    stepId?: string;
  };
  dangerousContext?: boolean;
}


export type ComputerUseGuardConfirmationStatus = "pending" | "approved" | "rejected" | "expired";

export interface ComputerUseGuardConfirmationRequest {
  confirmationId: string;
  missionId?: string;
  stepId?: string;
  actionType?: ComputerUseActionType;
  riskLevel: ComputerUseGuardRiskLevel;
  reason: string;
  requiredPhrase?: string;
  createdAt: string;
  expiresAt?: string;
  status: ComputerUseGuardConfirmationStatus;
  metadata: {
    bridgeKind: "guard_confirmation_scaffold";
    systemApisCalled: false;
    directHostAllowed: false;
    storageWritesEnabled: false;
    requiresExplicitOptIn: true;
  };
}

export interface ComputerUseGuardConfirmationResult {
  ok: boolean;
  status: ComputerUseGuardConfirmationStatus;
  confirmationId: string;
  approval?: ComputerUseGuardApprovalContext;
  reason?: string;
  metadata: ComputerUseGuardConfirmationRequest["metadata"];
}

export interface ComputerUseGuardConfirmationBridgeOptions {
  now?: () => string;
  defaultExpiresInMs?: number;
  enforceRequiredPhrase?: boolean;
  requiredPhrase?: string;
}

export interface ComputerUseGuardConfirmationBridgeSnapshot {
  requests: ComputerUseGuardConfirmationRequest[];
  metadata: ComputerUseGuardConfirmationRequest["metadata"];
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
  /**
   * When true, attempt real sandbox browser invocation via `invocationShell`.
   * Default false (scaffold simulation only).
   */
  realSandboxExecutionEnabled?: boolean;
  /**
   * Injected real-invocation shell (with optional BrowserRuntimeRouter DI).
   * Required when `realSandboxExecutionEnabled` is true.
   */
  invocationShell?: import("./BrowserRuntimeRouterRealInvocationShell").BrowserRuntimeRouterRealInvocationShell;
  /** Mission/step defaults for bridge request mapping when request lacks them. */
  defaultMissionId?: string;
  defaultStepId?: string;
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

export interface ComputerUseBrowserRuntimeAdapterMetadata {
  adapterKind: "scaffold";
  delegatedToBrowserRuntime: false;
  simulated: true;
  browserRuntimeImported: false;
  playwrightCalled: false;
  browserApisCalled: false;
  systemApisCalled: false;
  requiresExplicitOptIn: true;
  recordingAttempted?: boolean;
  recordingFailed?: boolean;
  recordingFailureReason?: string;
}

export type ComputerUseBrowserRuntimeAdapterRequestSource = "mission" | "pipeline" | "browser_provider" | "manual";

export interface ComputerUseBrowserRuntimeAdapterRequest {
  lane?: ComputerUseBrowserRuntimeLane;
  action?: ComputerUsePlannedAction;
  context?: {
    missionId?: string;
    stepId?: string;
    traceId?: string;
    source?: ComputerUseBrowserRuntimeAdapterRequestSource;
  };
}

export interface ComputerUseBrowserRuntimeAdapterResult {
  status: "executed" | "failed";
  action?: ComputerUsePlannedAction;
  metadata: ComputerUseBrowserRuntimeAdapterMetadata & {
    reason: string;
  };
}

export interface ComputerUseBrowserRuntimeAdapter {
  canHandle: (routeOrAction: ComputerUseBrowserRuntimeAdapterRequest) => boolean;
  execute: (routeOrAction: ComputerUseBrowserRuntimeAdapterRequest) => Promise<ComputerUseBrowserRuntimeAdapterResult>;
  getSnapshot: () => ComputerUseSandboxBrowserAdapterSnapshot;
  reset: () => void;
}

/** Shared factory options for sandbox browser adapter wiring (tape / event bridge). */
export interface CreateComputerUseBrowserRuntimeAdapterOptions {
  recordingEnabled?: boolean;
  tapeSink?: ComputerUseMissionTapeSink;
  externalMissionTapeSink?: ComputerUseMissionTapeExternalSink;
  enableExternalMissionTapeSink?: boolean;
  featureFlags?: ComputerUseSandboxBrowserAdapterFeatureFlags;
  recording?: ComputerUseBrowserRuntimeAdapterRecordingOptions;
  eventBridge?: {
    recordBrowserAdapterStarted: (input: ComputerUseBrowserRuntimeAdapterEventInput) => ComputerUseRuntimeEventBridgeResult;
    recordBrowserAdapterResult: (
      result: ComputerUseBrowserRuntimeAdapterResult,
      request?: ComputerUseBrowserRuntimeAdapterRequest,
    ) => ComputerUseRuntimeEventBridgeResult;
    getSnapshot: (missionId?: string) => ComputerUseMissionTapeSinkSnapshot;
    reset: () => void;
  };
}

export interface ComputerUseBrowserRuntimeAdapterEventInput {
  missionId?: string;
  stepId?: string;
  traceId?: string;
  source?: ComputerUseBrowserRuntimeAdapterRequestSource;
  lane?: ComputerUseBrowserRuntimeLane;
  actionType?: ComputerUseActionType;
  reason?: string;
}

export interface ComputerUseBrowserRuntimeAdapterRecordingMetadata {
  adapterKind: "scaffold";
  eventBridgeKind: "scaffold";
  storageWritesEnabled: false;
  browserRuntimeImported: false;
  playwrightCalled: false;
  browserApisCalled: false;
  systemApisCalled: false;
  requiresExplicitOptIn: true;
}

export interface ComputerUseBrowserRuntimeAdapterRecordingOptions {
  eventBridge: {
    recordBrowserAdapterStarted: (input: ComputerUseBrowserRuntimeAdapterEventInput) => ComputerUseRuntimeEventBridgeResult;
    recordBrowserAdapterResult: (
      result: ComputerUseBrowserRuntimeAdapterResult,
      request?: ComputerUseBrowserRuntimeAdapterRequest,
    ) => ComputerUseRuntimeEventBridgeResult;
  };
}


export interface ComputerUseSandboxBrowserAdapterFeatureFlags {
  /** Canonical: enable sandbox browser adapter path. */
  sandboxBrowserAdapterEnabled?: boolean;
  /**
   * @deprecated Use `sandboxBrowserAdapterEnabled`.
   */
  enableSandboxBrowserAdapter?: boolean;
  /** Canonical: emit/validate BrowserRuntimeRouter bridge requests. */
  browserRuntimeRouterBridgeEnabled?: boolean;
  /**
   * @deprecated Use `browserRuntimeRouterBridgeEnabled`.
   */
  enableBrowserRuntimeRouterBridge?: boolean;
}

export interface ComputerUseSandboxBrowserAdapterMetadata extends Omit<ComputerUseBrowserRuntimeAdapterMetadata, "adapterKind"> {
  adapterKind: "sandbox_browser_scaffold";
  sandboxBrowserAdapterEnabled: boolean;
  browserRuntimeRouterBridgeEnabled: boolean;
  realBrowserExecutionEnabled: false;
  directHostAllowed: false;
  browserRuntimeRouterImported: false;
  browserRuntimeRouterCalled: false;
  mappedTargetRequest?: {
    requestId: string;
    missionId: string;
    action: "navigate" | "click" | "type" | "extract" | "screenshot";
    target?: string;
    payload?: Record<string, unknown>;
    issuedAt: string;
    riskLevel: "safe" | "sensitive" | "dangerous";
    trustTier: "trusted" | "untrusted";
    preferredLane?: "sandbox_browser";
    hasGuardApproval?: boolean;
  };
  mappedTargetResult?: {
    accepted: boolean;
    lane: "sandbox_browser" | "unknown";
    runtime: "playwright" | "bidi" | "unknown";
    reason?: string;
  };
  routerBridgeRequest?: import("./BrowserRuntimeRouterBridge").BrowserRuntimeRouterBridgeRequest;
}

export interface ComputerUseSandboxBrowserAdapterResult extends Omit<ComputerUseBrowserRuntimeAdapterResult, "metadata"> {
  metadata: ComputerUseSandboxBrowserAdapterMetadata & { reason: string };
}

export interface ComputerUseSandboxBrowserAdapterSnapshot {
  featureFlags: Required<ComputerUseSandboxBrowserAdapterFeatureFlags>;
  executionCount: number;
  lastRequest?: ComputerUseBrowserRuntimeAdapterRequest;
  lastResult?: ComputerUseSandboxBrowserAdapterResult;
}

export interface ComputerUseSandboxBrowserAdapterOptions {
  featureFlags?: ComputerUseSandboxBrowserAdapterFeatureFlags;
  recording?: ComputerUseBrowserRuntimeAdapterRecordingOptions;
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
  recording?: {
    eventBridge: Pick<ComputerUseMissionIntegrationRecordingOptions["eventBridge"], "recordGuardDecision">;
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
    stepId: string;
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

export type ComputerUseMissionRuntimeHandler = (
  input: ComputerUseMissionRuntimeDispatchInput,
) => Promise<ComputerUseMissionRuntimeDispatchResult>;

export interface ComputerUseMissionRuntimeRegistrySnapshot {
  handlers: string[];
  metadata: {
    registryKind: "scaffold";
    systemApisCalled: false;
    missionEngineImported: false;
  };
}

export interface ComputerUseMissionRuntimeRegistry {
  registerHandler: (
    kind: string,
    handler: ComputerUseMissionRuntimeHandler,
    options?: { overwrite?: boolean },
  ) => void;
  canHandle: (step: Pick<ComputerUseMissionStepInput, "kind">) => boolean;
  getHandler: (kind: string) => ComputerUseMissionRuntimeHandler | undefined;
  listHandlers: () => string[];
  getSnapshot: () => ComputerUseMissionRuntimeRegistrySnapshot;
  reset: () => void;
}

export interface ComputerUseMissionRuntimeDispatcherOptions {
  registry: ComputerUseMissionRuntimeRegistry;
}

export interface ComputerUseMissionRuntimeDispatchInput {
  step: ComputerUseMissionStepInput;
}

export interface ComputerUseMissionRuntimeDispatchResult {
  ok: boolean;
  step: ComputerUseMissionStepInput;
  stepResult?: ComputerUseMissionStepAdapterResult;
  reason: string;
  metadata: {
    dispatcherKind: "scaffold";
    systemApisCalled: false;
    missionEngineImported: false;
  };
}

export interface ComputerUseMissionRunnerOptions {
  runtimeEntrypoint: {
    runComputerUseStep: (step: ComputerUseMissionStepInput) => Promise<ComputerUseRuntimeEntrypointResult>;
    reset: () => unknown;
  };
}

export interface CreateComputerUseRuntimeOptions {
  pipelineOptions?: {
    registerDefaultSandboxAdapter?: boolean;
    riskLevel?: ComputerUseRiskLevel;
    realSandboxExecutionEnabled?: boolean;
    invocationShell?: import("./BrowserRuntimeRouterRealInvocationShell").BrowserRuntimeRouterRealInvocationShell;
    sandboxAdapterOptions?: ComputerUseSandboxExecutorAdapterOptions;
  };
  missionEngineBridgeOptions?: ComputerUseMissionEngineBridgeOptions;
  missionTapeAdapter?: {
    recordStepResult: (result: ComputerUseMissionStepResult) => ComputerUseMissionTapeStepRecord;
    recordVerificationResult: (missionId: string, payload: unknown) => ComputerUseMissionTapeVerificationRecord;
    recordRecoveryPlan: (missionId: string, payload: unknown) => ComputerUseMissionTapeRecoveryRecord;
    getSnapshot: (missionId: string) => ComputerUseMissionTapeSnapshot;
    reset: () => unknown;
  };
}

export interface ComputerUseRuntime {
  pipeline: { run: (input: ComputerUsePipelineInput) => Promise<ComputerUsePipelineResult>; reset: () => unknown };
  missionEngineBridge: {
    isComputerUseStep: (step: { kind?: string }) => boolean;
    toMissionStepInput: (step: ComputerUseMissionStepInput) => ComputerUseMissionStepInput;
    toMissionStepResult: (input: { missionStep: ComputerUseMissionStepInput; pipelineResult: ComputerUsePipelineResult }) => ComputerUseMissionStepResult;
    reset: () => unknown;
  };
  missionStepAdapter: { executeStep: (step: ComputerUseMissionStepInput) => Promise<ComputerUseMissionStepAdapterResult>; reset: () => unknown };
  runtimeEntrypoint: {
    runComputerUseStep: (step: ComputerUseMissionStepInput) => Promise<ComputerUseRuntimeEntrypointResult>;
    runPipelineInput: (input: ComputerUseRuntimeEntrypointInput) => Promise<ComputerUseRuntimeEntrypointResult>;
    reset: () => unknown;
  };
  missionRunner: {
    runStep: (step: ComputerUseMissionStepInput, index?: number) => Promise<ComputerUseMissionRunnerStepRecord>;
    runSteps: (steps: ComputerUseMissionStepInput[]) => Promise<ComputerUseMissionRunnerResult>;
    reset: () => unknown;
  };
  missionTapeAdapter: {
    recordStepResult: (result: ComputerUseMissionStepResult) => ComputerUseMissionTapeStepRecord;
    recordVerificationResult: (missionId: string, payload: unknown) => ComputerUseMissionTapeVerificationRecord;
    recordRecoveryPlan: (missionId: string, payload: unknown) => ComputerUseMissionTapeRecoveryRecord;
    getSnapshot: (missionId: string) => ComputerUseMissionTapeSnapshot;
    reset: () => unknown;
  };
  runComputerUseStep: (step: ComputerUseMissionStepInput) => Promise<ComputerUseMissionStepAdapterResult>;
  runPipelineInput: (input: ComputerUsePipelineInput) => Promise<ComputerUseRuntimeEntrypointResult>;
  runMissionSteps: (steps: ComputerUseMissionStepInput[]) => Promise<ComputerUseMissionRunnerResult>;
  reset: () => void;
}

export interface ComputerUseMissionIntegrationFeatureFlags {
  computerUseEnabled?: boolean;
  enableComputerUseDispatch?: boolean;
}

export interface ComputerUseMissionIntegrationInput {
  step?: Partial<ComputerUseMissionStepInput> | null;
  featureFlags?: ComputerUseMissionIntegrationFeatureFlags;
}

export interface ComputerUseMissionIntegrationResult {
  ok: boolean;
  step?: ComputerUseMissionStepInput;
  stepResult?: ComputerUseMissionStepAdapterResult;
  reason?: string;
  metadata: {
    integrationKind: "scaffold";
    systemApisCalled: false;
    missionEngineImported: false;
    requiresExplicitOptIn: true;
    recordingAttempted?: boolean;
    recordingFailed?: boolean;
    recordingFailureReason?: string;
  };
}

export interface ComputerUseMissionIntegrationSnapshot {
  canHandleLastInput: boolean;
  lastInput?: ComputerUseMissionIntegrationInput;
  metadata: {
    integrationKind: "scaffold";
    systemApisCalled: false;
    missionEngineImported: false;
    requiresExplicitOptIn: true;
  };
}

export interface ComputerUseMissionIntegrationAdapterOptions {
  dispatcher: {
    dispatch: (input: { step: ComputerUseMissionStepInput }) => Promise<{
      ok: boolean;
      step: ComputerUseMissionStepInput;
      stepResult?: ComputerUseMissionStepAdapterResult;
      reason?: string;
    }>;
    reset: () => unknown;
  };
  recording?: ComputerUseMissionIntegrationRecordingOptions;
}

export type ComputerUseRuntimeEventType =
  | "computer_use_dispatch_started"
  | "computer_use_dispatch_completed"
  | "computer_use_dispatch_rejected"
  | "computer_use_step_result"
  | "computer_use_browser_adapter_started"
  | "computer_use_browser_adapter_completed"
  | "computer_use_browser_adapter_rejected"
  | "computer_use_browser_adapter_failed"
  | "computer_use_guard_decision"
  | "computer_use_guard_allowed"
  | "computer_use_guard_denied"
  | "computer_use_guard_needs_confirmation";

export interface ComputerUseMissionTapeSinkRecord {
  missionId: string;
  timestamp: string;
  eventType: ComputerUseRuntimeEventType;
  payload: Record<string, unknown>;
  metadata: {
    tapeSinkKind: "scaffold";
    eventBridgeKind: "scaffold";
    storageWritesEnabled: false;
    missionTapeImported: false;
    systemApisCalled: false;
  };
}

export interface ComputerUseMissionTapeSinkSnapshot {
  records: ComputerUseMissionTapeSinkRecord[];
  metadata: {
    tapeSinkKind: "scaffold";
    storageWritesEnabled: false;
    missionTapeImported: false;
    systemApisCalled: false;
  };
}


export interface ComputerUseMissionTapeExternalSinkResult {
  ok: boolean;
  reason?: string;
}

export interface ComputerUseMissionTapeExternalSink {
  record: (record: ComputerUseMissionTapeSinkRecord) => ComputerUseMissionTapeExternalSinkResult | Promise<ComputerUseMissionTapeExternalSinkResult>;
  getSnapshot?: (missionId?: string) => unknown;
  reset?: () => void;
}

export interface ComputerUseMissionTapeExternalSinkMetadata {
  sinkKind: "external_adapter";
  storageWritesEnabled: boolean;
  missionTapeImported: boolean;
  systemApisCalled: false;
  requiresExplicitOptIn: true;
}

export interface ComputerUseMissionTapeSinkAdapterOptions {
  externalSink: ComputerUseMissionTapeExternalSink;
  enableExternalMissionTapeSink?: boolean;
  storageWritesEnabled?: boolean;
  missionTapeImported?: boolean;
}

export interface ComputerUseMissionTapeSinkAdapterSnapshot {
  records: ComputerUseMissionTapeSinkRecord[];
  forwardedCount: number;
  acceptedCount: number;
  rejectedCount: number;
  failedCount: number;
  lastResult?: ComputerUseMissionTapeExternalSinkResult;
  externalSnapshot?: unknown;
  metadata: ComputerUseMissionTapeExternalSinkMetadata;
}

export interface ComputerUseMissionTapeSink {
  record: (record: ComputerUseMissionTapeSinkRecord) => ComputerUseMissionTapeSinkRecord;
  listRecords: (missionId?: string) => ComputerUseMissionTapeSinkRecord[];
  getSnapshot: (missionId?: string) => ComputerUseMissionTapeSinkSnapshot;
  reset: () => void;
}

export interface ComputerUseRuntimeEventBridgeOptions {
  tapeSink: ComputerUseMissionTapeSink;
  redactSensitiveText?: boolean;
  now?: () => string;
}

export interface ComputerUseRuntimeEventBridgeRecordInput {
  missionId: string;
  stepId?: string;
  kind?: string;
}

export interface ComputerUseGuardDecisionEventInput {
  missionId?: string;
  stepId?: string;
  actionType?: ComputerUseActionType;
  riskLevel: ComputerUseGuardRiskLevel;
  status: ComputerUseGuardDecisionStatus;
  reason: string;
  confirmationRequired: boolean;
  approvalRequirement: ComputerUseGuardApprovalRequirement;
  approvedBy?: ComputerUseGuardApprovalContext["approvedBy"];
  guardPolicyKind: ComputerUseGuardDecisionMetadata["guardPolicyKind"];
  confirmationId?: string;
}

export interface ComputerUseRuntimeEventBridgeResult {
  ok: boolean;
  record?: ComputerUseMissionTapeSinkRecord;
  reason?: string;
  metadata: {
    eventBridgeKind: "scaffold";
    storageWritesEnabled: false;
    missionTapeImported: false;
    systemApisCalled: false;
  };
}

export interface ComputerUseMissionIntegrationRecordingOptions {
  eventBridge: {
    recordDispatchStarted: (input: ComputerUseRuntimeEventBridgeRecordInput) => ComputerUseRuntimeEventBridgeResult;
    recordIntegrationResult: (result: ComputerUseMissionIntegrationResult) => ComputerUseRuntimeEventBridgeResult;
    recordStepResult: (result: ComputerUseMissionStepAdapterResult) => ComputerUseRuntimeEventBridgeResult;
    recordBrowserAdapterStarted: (input: ComputerUseBrowserRuntimeAdapterEventInput) => ComputerUseRuntimeEventBridgeResult;
    recordBrowserAdapterResult: (
      result: ComputerUseBrowserRuntimeAdapterResult,
      request?: ComputerUseBrowserRuntimeAdapterRequest,
    ) => ComputerUseRuntimeEventBridgeResult;
    recordGuardDecision: (input: ComputerUseGuardDecisionEventInput) => ComputerUseRuntimeEventBridgeResult;
    getSnapshot: (missionId?: string) => ComputerUseMissionTapeSinkSnapshot;
    reset: () => void;
  };
}

export type ComputerUseBrowserRuntimeRouterDryRunMetadata = {
  adapterKind: "browser_runtime_router_dry_run";
  dryRun: true;
  realBrowserExecutionEnabled: false;
  browserRuntimeRouterImported: false;
  browserRuntimeRouterInstantiated: false;
  browserRuntimeRouterCalled: false;
  playwrightCalled: false;
  browserApisCalled: false;
  systemApisCalled: false;
  directHostAllowed: false;
  requiresExplicitOptIn: true;
};

export interface ComputerUseBrowserRuntimeRouterDryRunResult {
  ok: boolean;
  requestId?: string;
  action?: string;
  target?: string;
  missionId?: string;
  reason?: string;
  metadata: ComputerUseBrowserRuntimeRouterDryRunMetadata;
}

export interface ComputerUseBrowserRuntimeRouterDryRunSnapshot {
  invocationCount: number;
  successCount: number;
  failureCount: number;
  lastInvocationAt?: string;
  lastResult?: ComputerUseBrowserRuntimeRouterDryRunResult;
}

export interface ComputerUseBrowserRuntimeRouterDryRunEvent {
  eventType: "browser_runtime_router_dry_run_started" | "browser_runtime_router_dry_run_completed" | "browser_runtime_router_dry_run_failed";
  timestamp: string;
  requestId?: string;
  missionId?: string;
  action?: string;
  target?: string;
  reason?: string;
}

export interface ComputerUseBrowserRuntimeRouterDryRunOptions {
  now?: () => string;
  onEvent?: (event: ComputerUseBrowserRuntimeRouterDryRunEvent) => void;
}

export type ComputerUseBrowserRuntimeRouterInvocationReadinessStatus =
  | "blocked"
  | "ready"
  | "needs_confirmation"
  | "dry_run_required";

export interface ComputerUseBrowserRuntimeRouterInvocationGate {
  gate: string;
  passed: boolean;
  reason: string;
}

export interface ComputerUseBrowserRuntimeRouterInvocationReadinessResult {
  status: ComputerUseBrowserRuntimeRouterInvocationReadinessStatus;
  gates: ComputerUseBrowserRuntimeRouterInvocationGate[];
  metadata: {
    guardKind: "browser_runtime_router_invocation_guard";
    realBrowserExecutionEnabled: false;
    browserRuntimeRouterImported: false;
    browserRuntimeRouterInstantiated: false;
    browserRuntimeRouterCalled: false;
    playwrightCalled: false;
    browserApisCalled: false;
    systemApisCalled: false;
    directHostAllowed: false;
    requiresExplicitOptIn: true;
  };
}

export type ComputerUseBrowserRuntimeRouterGuardedAdapterMetadata = {
  adapterKind: "browser_runtime_router_guarded_shell";
  shellOnly: true;
  realBrowserExecutionEnabled: false;
  browserRuntimeRouterImported: false;
  browserRuntimeRouterInstantiated: false;
  browserRuntimeRouterCalled: false;
  playwrightCalled: false;
  browserApisCalled: false;
  systemApisCalled: false;
  directHostAllowed: false;
  requiresExplicitOptIn: true;
};

export interface ComputerUseBrowserRuntimeRouterGuardedAdapterOptions {
  now?: () => string;
  onEvent?: (event: {
    eventType: "browser_runtime_router_guarded_shell_invoked";
    timestamp: string;
    status: ComputerUseBrowserRuntimeRouterGuardedInvocationResult["status"];
    requestId?: string;
    missionId?: string;
    action?: string;
    target?: string;
    reason?: string;
  }) => void;
}

export interface ComputerUseBrowserRuntimeRouterGuardedInvocationInput {
  readinessInput?: import("./BrowserRuntimeRouterInvocationGuard").BrowserRuntimeRouterInvocationReadinessInput;
  bridgeRequest?: import("./BrowserRuntimeRouterBridge").BrowserRuntimeRouterBridgeRequest;
  dryRunResult?: ComputerUseBrowserRuntimeRouterDryRunResult;
  guardDecision?: Pick<ComputerUseGuardDecision, "status" | "reason">;
  confirmationResult?: Pick<ComputerUseGuardConfirmationResult, "status">;
  featureFlags?: import("./BrowserRuntimeRouterInvocationGuard").BrowserRuntimeRouterInvocationReadinessFeatureFlags;
  lane?: ComputerUseBrowserRuntimeLane;
  riskLevel?: ComputerUseGuardRiskLevel;
  missionTapeReady?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ComputerUseBrowserRuntimeRouterGuardedInvocationResult {
  status: "blocked" | "dry_run_required" | "needs_confirmation" | "ready_but_not_invoked";
  requestId?: string;
  missionId?: string;
  action?: string;
  target?: string;
  reason: string;
  gates: ComputerUseBrowserRuntimeRouterInvocationGate[];
  readinessStatus: ComputerUseBrowserRuntimeRouterInvocationReadinessStatus;
  metadata: ComputerUseBrowserRuntimeRouterGuardedAdapterMetadata;
}


/**
 * Minimal router port for DI. Prefer injecting `BrowserRuntimeRouter` (or a test
 * double) so computer-use never hard-imports Playwright at module load.
 */
export interface ComputerUseBrowserRuntimeRouterPort {
  route(request: {
    requestId: string;
    missionId: string;
    action: string;
    target?: string;
    payload?: Record<string, unknown>;
    issuedAt: string;
    riskLevel: string;
    trustTier: string;
    preferredLane?: string;
    hasGuardApproval?: boolean;
    linkedDeviceTrusted?: boolean;
    linkedDeviceAvailable?: boolean;
  }): Promise<{
    accepted: boolean;
    lane: string;
    runtime: string;
    reason?: string;
    requiresApproval?: boolean;
    execution?: {
      playwrightCalled?: boolean;
      browserApisCalled?: boolean;
      realBrowserExecutionEnabled?: boolean;
      systemApisCalled?: boolean;
      directHostAllowed?: boolean;
    };
  }>;
}

export type ComputerUseBrowserRuntimeRealInvocationShellMetadata = {
  adapterKind: "browser_runtime_real_invocation_shell";
  /** true when shell did not call a real router (scaffold / disabled path). */
  shellOnly: boolean;
  realBrowserExecutionEnabled: boolean;
  browserRuntimeRouterImported: boolean;
  browserRuntimeRouterInstantiated: boolean;
  browserRuntimeRouterCalled: boolean;
  playwrightCalled: boolean;
  browserApisCalled: boolean;
  systemApisCalled: false;
  directHostAllowed: false;
  requiresExplicitOptIn: true;
  routeAccepted?: boolean;
  routeLane?: string;
  routeRuntime?: string;
};

export interface ComputerUseBrowserRuntimeRealInvocationShellOptions {
  now?: () => string;
  guardedAdapter?: import("./BrowserRuntimeRouterGuardedAdapter").BrowserRuntimeRouterGuardedAdapter;
  /**
   * Injected BrowserRuntimeRouter (or mock). Required for real invocation when
   * readiness is ready and realBrowserRuntimeRouterEnabled is true.
   */
  router?: ComputerUseBrowserRuntimeRouterPort;
  onEvent?: (event: {
    eventType: "browser_runtime_real_invocation_shell_invoked";
    timestamp: string;
    status: ComputerUseBrowserRuntimeRealInvocationResult["status"];
    requestId?: string;
    missionId?: string;
    action?: string;
    target?: string;
    reason?: string;
  }) => void;
}

export interface ComputerUseBrowserRuntimeRealInvocationInput
  extends ComputerUseBrowserRuntimeRouterGuardedInvocationInput {
  guardedInput?: ComputerUseBrowserRuntimeRouterGuardedInvocationInput;
}

export interface ComputerUseBrowserRuntimeRealInvocationResult {
  status:
    | "blocked"
    | "dry_run_required"
    | "needs_confirmation"
    | "ready_but_real_invocation_disabled"
    | "invoked"
    | "invoke_failed";
  guardedStatus: ComputerUseBrowserRuntimeRouterGuardedInvocationResult["status"];
  requestId?: string;
  missionId?: string;
  action?: string;
  target?: string;
  reason: string;
  gates: ComputerUseBrowserRuntimeRouterInvocationGate[];
  readinessStatus: ComputerUseBrowserRuntimeRouterInvocationReadinessStatus;
  metadata: ComputerUseBrowserRuntimeRealInvocationShellMetadata;
}

export interface ComputerUseBrowserRuntimeRealInvocationSnapshot {
  invocationCount: number;
  blockedCount: number;
  dryRunRequiredCount: number;
  needsConfirmationCount: number;
  readyButRealInvocationDisabledCount: number;
  invokedCount: number;
  invokeFailedCount: number;
  lastInvocationAt?: string;
  lastResult?: ComputerUseBrowserRuntimeRealInvocationResult;
}
export interface ComputerUseBrowserRuntimeRouterGuardedAdapterSnapshot {
  invocationCount: number;
  blockedCount: number;
  dryRunRequiredCount: number;
  needsConfirmationCount: number;
  readyButNotInvokedCount: number;
  lastInvocationAt?: string;
  lastResult?: ComputerUseBrowserRuntimeRouterGuardedInvocationResult;
}
