import {
  ComputerUseActionPlan,
  ComputerUseExecutionMode,
  ComputerUseExecutionRequest,
  ComputerUseExecutionResult,
  ComputerUseExecutorAdapter,
  ComputerUseExecutorOptions,
  ComputerUsePlannedAction,
} from "./types";

export class ComputerUseExecutor {
  private readonly options: ComputerUseExecutorOptions;
  private adapters: ComputerUseExecutorAdapter[] = [];

  constructor(options: ComputerUseExecutorOptions = {}) {
    this.options = options;
  }

  registerAdapter(adapter: ComputerUseExecutorAdapter): void {
    this.adapters.push(adapter);
  }

  async executePlan(plan: ComputerUseActionPlan, request: ComputerUseExecutionRequest = {}): Promise<ComputerUseExecutionResult[]> {
    const results: ComputerUseExecutionResult[] = [];

    for (const action of plan.actions) {
      results.push(await this.executeAction(action, plan, request));
    }

    return results;
  }

  async executeAction(
    action: ComputerUsePlannedAction,
    plan: Pick<ComputerUseActionPlan, "prefersSandbox">,
    request: ComputerUseExecutionRequest = {},
  ): Promise<ComputerUseExecutionResult> {
    if (action.type === "observe") {
      return this.skipObserveAction(action);
    }

    if (this.requiresApproval(action, request)) {
      return this.denyForApproval(action);
    }

    const adapter = this.selectAdapter(action, plan, request);
    if (!adapter) {
      return {
        status: "failed",
        action,
        metadata: this.baseMetadata("No matching executor adapter found."),
      };
    }

    const result = await adapter.execute(action, request);
    const scaffoldMetadata = this.baseMetadata();
    const adapterMetadata = result.metadata;

    return {
      ...result,
      metadata: {
        ...(adapterMetadata ?? {}),
        ...(scaffoldMetadata.defaultExecutionMode !== undefined
          ? { defaultExecutionMode: scaffoldMetadata.defaultExecutionMode }
          : {}),
        ...(scaffoldMetadata.adapterCount !== undefined
          ? { adapterCount: scaffoldMetadata.adapterCount }
          : {}),
        systemApisCalled: false,
        delegatesOnly: true,
        noDirectSystemCalls: true,
        executorKind: "scaffold",
        executionMode: adapterMetadata?.executionMode ?? adapter.mode,
      },
    };
  }

  requiresApproval(action: ComputerUsePlannedAction, request: ComputerUseExecutionRequest): boolean {
    return Boolean(action.requiresGuardApproval && !request.guardApprovalProvided);
  }

  selectAdapter(
    action: ComputerUsePlannedAction,
    plan: Pick<ComputerUseActionPlan, "prefersSandbox">,
    request: ComputerUseExecutionRequest,
  ): ComputerUseExecutorAdapter | undefined {
    const selectedMode = request.executionMode ?? this.options.defaultExecutionMode;

    return this.adapters.find((adapter) => {
      if (selectedMode && adapter.mode !== selectedMode) {
        return false;
      }

      if (!selectedMode && plan.prefersSandbox && adapter.mode === "direct_host") {
        return false;
      }

      if (!adapter.supportedActionTypes.includes(action.type)) {
        return false;
      }

      if (adapter.canExecute) {
        return adapter.canExecute({ action, plan, request });
      }

      return true;
    });
  }

  denyForApproval(action: ComputerUsePlannedAction): ComputerUseExecutionResult {
    return {
      status: "denied",
      action,
      metadata: this.baseMetadata("Guard approval required before executing this action."),
    };
  }

  skipObserveAction(action: ComputerUsePlannedAction): ComputerUseExecutionResult {
    return {
      status: "skipped",
      action,
      metadata: this.baseMetadata("Observe actions are planning-only and are not executed."),
    };
  }

  reset(): void {
    this.adapters = [];
  }

  private baseMetadata(reason?: string): NonNullable<ComputerUseExecutionResult["metadata"]> {
    return {
      executorKind: "scaffold",
      reason,
      systemApisCalled: false,
      delegatesOnly: true,
      noDirectSystemCalls: true,
      adapterCount: this.adapters.length,
      defaultExecutionMode: this.options.defaultExecutionMode,
    };
  }
}
