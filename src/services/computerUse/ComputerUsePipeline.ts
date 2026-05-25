import { ComputerUseActionPlanner } from "./ComputerUseActionPlanner";
import { ComputerUseExecutor } from "./ComputerUseExecutor";
import { ComputerUseFocusContextBuilder } from "./ComputerUseFocusContext";
import { ComputerUseMissionTapeBridge } from "./ComputerUseMissionTapeBridge";
import { ComputerUseRecovery } from "./ComputerUseRecovery";
import { ComputerUseVerifier } from "./ComputerUseVerifier";
import {
  ComputerUseActionPlan,
  ComputerUseExecutionResult,
  ComputerUseFocusContext,
  ComputerUsePipelineInput,
  ComputerUsePipelineOptions,
  ComputerUsePipelineResult,
  ComputerUseRecoveryPlan,
  ComputerUseVerificationResult,
} from "./types";

export class ComputerUsePipeline {
  private readonly focusContextBuilder: ComputerUseFocusContextBuilder;
  private readonly actionPlanner: ComputerUseActionPlanner;
  private readonly executor: ComputerUseExecutor;
  private readonly verifier: ComputerUseVerifier;
  private readonly recovery: ComputerUseRecovery;
  private readonly tapeBridge: ComputerUseMissionTapeBridge;

  constructor(options: ComputerUsePipelineOptions = {}) {
    this.focusContextBuilder = options.focusContextBuilder ?? new ComputerUseFocusContextBuilder();
    this.actionPlanner = options.actionPlanner ?? new ComputerUseActionPlanner();
    this.executor = options.executor ?? new ComputerUseExecutor();
    this.verifier = options.verifier ?? new ComputerUseVerifier();
    this.recovery = options.recovery ?? new ComputerUseRecovery();
    this.tapeBridge = options.tapeBridge ?? new ComputerUseMissionTapeBridge(options.tapeBridgeOptions);
  }

  async run(input: ComputerUsePipelineInput): Promise<ComputerUsePipelineResult> {
    const focusContext = this.buildFocusContext(input);
    const plan = this.planActions(input, focusContext);
    const executionResults = await this.executePlan(input, focusContext, plan);
    const verificationResults = this.verifyResults(executionResults);
    const recoveryPlan = this.planRecovery(input, focusContext, executionResults, verificationResults);
    const tapeRecord = this.recordTapeEvents(input.missionId, focusContext, plan, executionResults, verificationResults, recoveryPlan);

    return {
      missionId: input.missionId,
      focusContext,
      plan,
      executionResults,
      verificationResults,
      recoveryPlan,
      tapeRecord,
      metadata: {
        pipelineKind: "scaffold",
        systemApisCalled: false,
      },
    };
  }

  buildFocusContext(input: ComputerUsePipelineInput): ComputerUseFocusContext {
    this.focusContextBuilder.reset();
    if (input.cursorPoint) this.focusContextBuilder.withCursorPoint(input.cursorPoint);
    if (input.screenRegion) this.focusContextBuilder.withScreenRegion(input.screenRegion);
    if (input.focusedElement) this.focusContextBuilder.withFocusedElement(input.focusedElement);
    if (input.screenshotReference) this.focusContextBuilder.withScreenshotReference(input.screenshotReference);
    if (input.userPointedTarget) this.focusContextBuilder.withUserPointedTarget(input.userPointedTarget);
    return this.focusContextBuilder.build();
  }

  planActions(input: ComputerUsePipelineInput, focusContext: ComputerUseFocusContext): ComputerUseActionPlan {
    return this.actionPlanner.createPlan({ focusContext, textPayload: input.textPayload });
  }

  async executePlan(
    input: ComputerUsePipelineInput,
    focusContext: ComputerUseFocusContext,
    plan: ComputerUseActionPlan,
  ): Promise<ComputerUseExecutionResult[]> {
    return this.executor.executePlan(plan, {
      executionMode: focusContext.executionMode,
      guardApprovalProvided: input.guardApprovalProvided,
    });
  }

  verifyResults(executionResults: ComputerUseExecutionResult[]): ComputerUseVerificationResult[] {
    return executionResults.map((result) =>
      this.verifier.verifyExecutionResult({
        result,
        results: executionResults,
      }),
    );
  }

  planRecovery(
    input: ComputerUsePipelineInput,
    focusContext: ComputerUseFocusContext,
    executionResults: ComputerUseExecutionResult[],
    verificationResults: ComputerUseVerificationResult[],
  ): ComputerUseRecoveryPlan {
    const firstExecution = executionResults[0];
    const firstVerification = verificationResults[0];

    return this.recovery.createRecoveryPlan({
      verification: firstVerification,
      executionResult: firstExecution,
      attemptCount: input.attemptCount,
      dangerousContext: focusContext.riskLevel === "dangerous",
      executionMode: focusContext.executionMode,
    });
  }

  recordTapeEvents(
    missionId: string,
    focusContext: ComputerUseFocusContext,
    plan: ComputerUseActionPlan,
    executionResults: ComputerUseExecutionResult[],
    verificationResults: ComputerUseVerificationResult[],
    recoveryPlan: ComputerUseRecoveryPlan,
  ) {
    this.tapeBridge.recordFocusContext(missionId, focusContext);
    this.tapeBridge.recordActionPlan(missionId, plan);
    for (const result of executionResults) {
      this.tapeBridge.recordExecutionResult(missionId, result);
    }
    for (const verification of verificationResults) {
      this.tapeBridge.recordVerificationResult(missionId, verification);
    }
    this.tapeBridge.recordRecoveryPlan(missionId, recoveryPlan);
    return this.tapeBridge.createTapeRecord(missionId);
  }

  reset(): void {
    this.focusContextBuilder.reset();
    this.actionPlanner.reset();
    this.executor.reset();
    this.verifier.reset();
    this.recovery.reset();
    this.tapeBridge.reset();
  }
}
