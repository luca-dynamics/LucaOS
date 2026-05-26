import { toRecoveryInput } from "./ComputerUseVerifier";
import {
  ComputerUseActionPlan,
  ComputerUseGuardDecision,
  ComputerUseExecutionResult,
  ComputerUseFocusContext,
  ComputerUsePipelineInput,
  ComputerUsePipelineOptions,
  ComputerUsePipelineResult,
  ComputerUseRecoveryPlan,
  ComputerUseVerificationResult,
} from "./types";

export class ComputerUsePipeline {
  private readonly focusContextBuilder: ComputerUsePipelineOptions["focusContextBuilder"];
  private readonly actionPlanner: ComputerUsePipelineOptions["actionPlanner"];
  private readonly executor: ComputerUsePipelineOptions["executor"];
  private readonly verifier: ComputerUsePipelineOptions["verifier"];
  private readonly recovery: ComputerUsePipelineOptions["recovery"];
  private readonly tapeBridge: ComputerUsePipelineOptions["tapeBridge"];
  private readonly guardBridge?: NonNullable<ComputerUsePipelineOptions["guardBridge"]>;

  private lastResult?: ComputerUsePipelineResult;

  constructor(options: ComputerUsePipelineOptions) {
    this.focusContextBuilder = options.focusContextBuilder;
    this.actionPlanner = options.actionPlanner;
    this.executor = options.executor;
    this.verifier = options.verifier;
    this.recovery = options.recovery;
    this.tapeBridge = options.tapeBridge;
    this.guardBridge = options.guardBridge;
  }

  async run(input: ComputerUsePipelineInput): Promise<ComputerUsePipelineResult> {
    const focusContext = this.buildFocusContext(input);
    const actionPlan = this.planActions({ ...input, focusContext });
    const executionResults = await this.executePlan(actionPlan, { ...input, focusContext });
    const verificationResults = this.verifyResults(executionResults);
    const recoveryPlan = this.planRecovery({ input, focusContext, actionPlan, executionResults, verificationResults });

    this.recordTapeEvents({
      missionId: input.missionId,
      focusContext,
      actionPlan,
      executionResults,
      verificationResults,
      recoveryPlan,
    });

    const result: ComputerUsePipelineResult = {
      missionId: input.missionId,
      focusContext,
      actionPlan,
      executionResults,
      verificationResults,
      recoveryPlan,
      metadata: {
        pipelineKind: "scaffold",
        systemApisCalled: false,
      },
    };

    this.lastResult = result;
    return result;
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

  planActions(input: ComputerUsePipelineInput & { focusContext: ComputerUseFocusContext }): ComputerUseActionPlan {
    return this.actionPlanner.createPlan({
      focusContext: input.focusContext,
      textPayload: input.textPayload,
    });
  }

  async executePlan(
    actionPlan: ComputerUseActionPlan,
    input: Pick<ComputerUsePipelineInput, "executionRequest"> & { focusContext?: ComputerUseFocusContext },
  ): Promise<ComputerUseExecutionResult[]> {
    const planDecision = this.guardBridge?.evaluatePlan({
      plan: actionPlan,
      request: input.executionRequest,
      dangerousContext: input.focusContext?.requiresGuardApproval ?? false,
    });
    if (planDecision && planDecision.status !== "allowed") {
      return actionPlan.actions.map((action) => this.deniedResult(action, planDecision));
    }

    if (this.guardBridge) {
      const guardedResults: ComputerUseExecutionResult[] = [];
      for (const action of actionPlan.actions) {
        const actionDecision = this.guardBridge.evaluateAction({
          action,
          plan: actionPlan,
          request: input.executionRequest,
          dangerousContext: input.focusContext?.requiresGuardApproval ?? false,
        });
        if (actionDecision.status !== "allowed") {
          guardedResults.push(this.deniedResult(action, actionDecision));
          continue;
        }
        if (this.executor.executeAction) {
          guardedResults.push(await this.executor.executeAction(action, actionPlan, input.executionRequest));
        } else {
          const [result] = await this.executor.executePlan({ ...actionPlan, actions: [action] }, input.executionRequest);
          guardedResults.push(result);
        }
      }
      return guardedResults;
    }

    return this.executor.executePlan(actionPlan, input.executionRequest);
  }

  verifyResults(executionResults: ComputerUseExecutionResult[]): ComputerUseVerificationResult[] {
    return this.verifier.verifyPlanResults({
      result: executionResults[0],
      results: executionResults,
    });
  }

  planRecovery(params: {
    input: ComputerUsePipelineInput;
    focusContext: ComputerUseFocusContext;
    actionPlan: ComputerUseActionPlan;
    executionResults: ComputerUseExecutionResult[];
    verificationResults: ComputerUseVerificationResult[];
  }): ComputerUseRecoveryPlan {
    const firstFailureIdx = params.verificationResults.findIndex((result) => result.status !== "passed");
    if (firstFailureIdx < 0) {
      return this.recovery.createRecoveryPlan(
        toRecoveryInput({
          verification: params.verificationResults[0],
          executionResult: params.executionResults[0],
          attemptCount: params.input.attemptCount,
          dangerousContext: params.focusContext.requiresGuardApproval,
          executionMode: this.resolveExecutionMode(params.executionResults[0], params.input),
        }),
      );
    }

    return this.recovery.createRecoveryPlan(
      toRecoveryInput({
        verification: params.verificationResults[firstFailureIdx],
        executionResult: params.executionResults[firstFailureIdx],
        attemptCount: params.input.attemptCount,
        dangerousContext: params.focusContext.requiresGuardApproval,
        executionMode: this.resolveExecutionMode(params.executionResults[firstFailureIdx], params.input),
      }),
    );
  }


  private resolveExecutionMode(
    executionResult: ComputerUseExecutionResult,
    input: Pick<ComputerUsePipelineInput, "executionRequest">,
  ) {
    return executionResult.metadata?.executionMode ?? input.executionRequest?.executionMode;
  }

  recordTapeEvents(args: {
    missionId: string;
    focusContext: ComputerUseFocusContext;
    actionPlan: ComputerUseActionPlan;
    executionResults: ComputerUseExecutionResult[];
    verificationResults: ComputerUseVerificationResult[];
    recoveryPlan: ComputerUseRecoveryPlan;
  }): void {
    this.tapeBridge.recordFocusContext(args.missionId, args.focusContext);
    this.tapeBridge.recordActionPlan(args.missionId, args.actionPlan);
    args.executionResults.forEach((result) => this.tapeBridge.recordExecutionResult(args.missionId, result));
    args.verificationResults.forEach((result) => this.tapeBridge.recordVerificationResult(args.missionId, result));
    this.tapeBridge.recordRecoveryPlan(args.missionId, args.recoveryPlan);
  }

  reset(): void {
    this.focusContextBuilder.reset();
    this.actionPlanner.reset();
    this.executor.reset();
    this.verifier.reset();
    this.recovery.reset();
    this.tapeBridge.reset();
    this.guardBridge?.reset();
    this.lastResult = undefined;
  }

  private deniedResult(action: ComputerUseExecutionResult["action"], decision: ComputerUseGuardDecision): ComputerUseExecutionResult {
    return {
      status: "denied",
      action,
      metadata: {
        reason: decision.reason,
        systemApisCalled: false,
        delegatesOnly: true,
        noDirectSystemCalls: true,
        executorKind: "scaffold",
      },
    };
  }
}
