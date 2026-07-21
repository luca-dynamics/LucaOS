import {
  createBrowserRuntimeRouterBridgeRequest,
  validateBrowserRuntimeRouterBridgeRequest,
} from "./BrowserRuntimeRouterBridge";
import { BrowserRuntimeRouterDryRunAdapter } from "./BrowserRuntimeRouterDryRunAdapter";
import {
  ComputerUseExecutionRequest,
  ComputerUseExecutionResult,
  ComputerUseExecutorAdapter,
  ComputerUsePlannedAction,
  ComputerUseSandboxExecutionLog,
  ComputerUseSandboxExecutorAdapterOptions,
} from "./types";

const SUPPORTED_ACTION_TYPES = ["click", "type_text", "hotkey", "scroll", "wait"] as const;

export class ComputerUseSandboxExecutorAdapter implements ComputerUseExecutorAdapter {
  readonly id: string;
  readonly mode = "sandbox" as const;
  readonly supportedActionTypes = [...SUPPORTED_ACTION_TYPES];

  private readonly now: () => string;
  private readonly realSandboxExecutionEnabled: boolean;
  private readonly invocationShell: ComputerUseSandboxExecutorAdapterOptions["invocationShell"];
  private readonly defaultMissionId?: string;
  private readonly defaultStepId?: string;
  private readonly dryRunAdapter: BrowserRuntimeRouterDryRunAdapter;
  private readonly executionLog: ComputerUseSandboxExecutionLog[] = [];

  constructor(options: ComputerUseSandboxExecutorAdapterOptions = {}) {
    this.id = options.adapterId ?? "computer-use-sandbox-scaffold";
    this.now = options.now ?? (() => new Date().toISOString());
    this.realSandboxExecutionEnabled = options.realSandboxExecutionEnabled === true;
    this.invocationShell = options.invocationShell;
    this.defaultMissionId = options.defaultMissionId;
    this.defaultStepId = options.defaultStepId;
    this.dryRunAdapter = new BrowserRuntimeRouterDryRunAdapter({ now: this.now });
  }

  canExecute(context: { action: ComputerUsePlannedAction }): boolean {
    return (
      context.action.type !== "observe" &&
      this.supportedActionTypes.includes(context.action.type)
    );
  }

  async execute(
    action: ComputerUsePlannedAction,
    request: ComputerUseExecutionRequest,
  ): Promise<ComputerUseExecutionResult> {
    if (!this.canExecute({ action })) {
      const reason = `Unsupported action type for sandbox adapter: ${action.type}`;
      this.executionLog.push({
        actionType: action.type,
        status: "failed",
        timestamp: this.now(),
      });
      return {
        status: "failed",
        action,
        metadata: {
          reason,
          adapterId: this.id,
          executionMode: "sandbox",
          systemApisCalled: false,
          delegatesOnly: true,
          noDirectSystemCalls: true,
          executorKind: this.realSandboxExecutionEnabled ? "real_sandbox" : "scaffold",
          sandboxSimulated: !this.realSandboxExecutionEnabled,
        },
      };
    }

    if (this.realSandboxExecutionEnabled) {
      return this.executeReal(action, request);
    }

    return this.executeSimulated(action);
  }

  listExecutionLog(): ComputerUseSandboxExecutionLog[] {
    return [...this.executionLog];
  }

  reset(): void {
    this.executionLog.length = 0;
    this.dryRunAdapter.reset();
  }

  private executeSimulated(action: ComputerUsePlannedAction): ComputerUseExecutionResult {
    const resultAction =
      action.type === "type_text" ? { ...action, text: action.text } : action;

    this.executionLog.push({
      actionType: action.type,
      status: "executed",
      timestamp: this.now(),
    });

    return {
      status: "executed",
      action: resultAction,
      metadata: {
        reason: "Sandbox scaffold simulated execution.",
        adapterId: this.id,
        executionMode: "sandbox",
        systemApisCalled: false,
        delegatesOnly: true,
        noDirectSystemCalls: true,
        executorKind: "scaffold",
        sandboxSimulated: true,
      },
    };
  }

  private async executeReal(
    action: ComputerUsePlannedAction,
    request: ComputerUseExecutionRequest,
  ): Promise<ComputerUseExecutionResult> {
    if (!this.invocationShell) {
      return this.failReal(
        action,
        "realSandboxExecutionEnabled requires an injected invocationShell.",
        { browserRuntimeRouterCalled: false, playwrightCalled: false },
      );
    }

    const bridgeInput = {
      lane: "sandbox_browser" as const,
      action,
      context: {
        missionId: request.missionId ?? this.defaultMissionId,
        stepId: request.stepId ?? this.defaultStepId,
        traceId: request.traceId,
        source: "pipeline" as const,
      },
    };

    const bridge = createBrowserRuntimeRouterBridgeRequest(bridgeInput);
    if (!bridge.ok) {
      return this.failReal(action, bridge.reason, {
        browserRuntimeRouterCalled: false,
        playwrightCalled: false,
      });
    }

    // Wait/scroll map to extract without a target — bridge validation may fail.
    // For missing targets on click/type, fail closed rather than simulate.
    const validation = validateBrowserRuntimeRouterBridgeRequest(bridge.request);
    if (!validation.ok) {
      // Soft path: wait/scroll without target can no-op successfully in sandbox.
      if (action.type === "wait" || action.type === "scroll") {
        this.executionLog.push({
          actionType: action.type,
          status: "executed",
          timestamp: this.now(),
        });
        return {
          status: "executed",
          action,
          metadata: {
            reason: `Sandbox real path no-op for ${action.type}: ${validation.reason}`,
            adapterId: this.id,
            executionMode: "sandbox",
            systemApisCalled: false,
            delegatesOnly: true,
            noDirectSystemCalls: true,
            executorKind: "real_sandbox",
            sandboxSimulated: false,
            realBrowserExecutionEnabled: true,
            browserRuntimeRouterCalled: false,
            playwrightCalled: false,
          },
        };
      }
      return this.failReal(action, validation.reason, {
        browserRuntimeRouterCalled: false,
        playwrightCalled: false,
      });
    }

    const dryRunResult = this.dryRunAdapter.invoke(bridge.request);
    if (!dryRunResult.ok) {
      return this.failReal(
        action,
        dryRunResult.reason ?? "BrowserRuntime router dry-run failed.",
        { browserRuntimeRouterCalled: false, playwrightCalled: false },
      );
    }

    const shellResult = await this.invocationShell.invoke({
      featureFlags: {
        sandboxBrowserAdapterEnabled: true,
        browserRuntimeRouterBridgeEnabled: true,
        browserRuntimeRouterDryRunEnabled: true,
        realBrowserRuntimeRouterEnabled: true,
      },
      bridgeRequest: bridge.request,
      dryRunResult,
      guardDecision: {
        status: request.guardApprovalProvided || !action.requiresGuardApproval
          ? "allowed"
          : "needs_confirmation",
        reason: "sandbox-executor-real-path",
      },
      confirmationResult:
        request.guardApprovalProvided || !action.requiresGuardApproval
          ? { status: "approved" }
          : undefined,
      lane: "sandbox_browser",
      riskLevel: action.requiresGuardApproval ? "medium" : "low",
      missionTapeReady: true,
    });

    if (shellResult.status === "invoked") {
      this.executionLog.push({
        actionType: action.type,
        status: "executed",
        timestamp: this.now(),
      });
      return {
        status: "executed",
        action: action.type === "type_text" ? { ...action, text: action.text } : action,
        metadata: {
          reason: shellResult.reason,
          adapterId: this.id,
          executionMode: "sandbox",
          systemApisCalled: false,
          delegatesOnly: true,
          noDirectSystemCalls: true,
          executorKind: "real_sandbox",
          sandboxSimulated: false,
          realBrowserExecutionEnabled: true,
          browserRuntimeRouterCalled: shellResult.metadata.browserRuntimeRouterCalled,
          playwrightCalled: shellResult.metadata.playwrightCalled,
          browserApisCalled: shellResult.metadata.browserApisCalled,
          shellStatus: shellResult.status,
          routeLane: shellResult.metadata.routeLane,
        },
      };
    }

    if (shellResult.status === "ready_but_real_invocation_disabled") {
      return this.failReal(
        action,
        shellResult.reason ||
          "Real sandbox path ready but invocation shell has no router DI.",
        {
          browserRuntimeRouterCalled: false,
          playwrightCalled: false,
          shellStatus: shellResult.status,
        },
      );
    }

    if (
      shellResult.status === "needs_confirmation" ||
      shellResult.status === "blocked" ||
      shellResult.status === "dry_run_required"
    ) {
      return this.failReal(action, shellResult.reason, {
        browserRuntimeRouterCalled: false,
        playwrightCalled: false,
        shellStatus: shellResult.status,
      });
    }

    // invoke_failed
    return this.failReal(action, shellResult.reason, {
      browserRuntimeRouterCalled: shellResult.metadata.browserRuntimeRouterCalled,
      playwrightCalled: shellResult.metadata.playwrightCalled,
      shellStatus: shellResult.status,
    });
  }

  private failReal(
    action: ComputerUsePlannedAction,
    reason: string,
    extra: Record<string, unknown>,
  ): ComputerUseExecutionResult {
    this.executionLog.push({
      actionType: action.type,
      status: "failed",
      timestamp: this.now(),
    });
    return {
      status: "failed",
      action,
      metadata: {
        reason,
        adapterId: this.id,
        executionMode: "sandbox",
        systemApisCalled: false,
        delegatesOnly: true,
        noDirectSystemCalls: true,
        executorKind: "real_sandbox",
        sandboxSimulated: false,
        realBrowserExecutionEnabled: true,
        ...extra,
      },
    };
  }
}
