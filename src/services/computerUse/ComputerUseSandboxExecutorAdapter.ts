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
  private readonly executionLog: ComputerUseSandboxExecutionLog[] = [];

  constructor(options: ComputerUseSandboxExecutorAdapterOptions = {}) {
    this.id = options.adapterId ?? "computer-use-sandbox-scaffold";
    this.now = options.now ?? (() => new Date().toISOString());
  }

  canExecute(context: { action: ComputerUsePlannedAction }): boolean {
    return context.action.type !== "observe" && this.supportedActionTypes.includes(context.action.type);
  }

  async execute(
    action: ComputerUsePlannedAction,
    _request: ComputerUseExecutionRequest,
  ): Promise<ComputerUseExecutionResult> {
    const executed = this.canExecute({ action });
    const status = executed ? "executed" : "failed";
    const reason = executed
      ? "Sandbox scaffold simulated execution."
      : `Unsupported action type for sandbox scaffold adapter: ${action.type}`;

    const resultAction = action.type === "type_text" ? { ...action, text: action.text } : action;

    this.executionLog.push({
      actionType: action.type,
      status,
      timestamp: this.now(),
    });

    return {
      status,
      action: resultAction,
      metadata: {
        reason,
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

  listExecutionLog(): ComputerUseSandboxExecutionLog[] {
    return [...this.executionLog];
  }

  reset(): void {
    this.executionLog.length = 0;
  }
}
