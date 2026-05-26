import { ComputerUseRuntime } from "./types";
import {
  ComputerUseMissionRuntimeDispatchInput,
  ComputerUseMissionRuntimeDispatchResult,
  ComputerUseMissionRuntimeHandler,
  ComputerUseMissionRuntimeRegistry as ComputerUseMissionRuntimeRegistryContract,
  ComputerUseMissionRuntimeRegistrySnapshot,
} from "./types";

export class ComputerUseMissionRuntimeRegistry implements ComputerUseMissionRuntimeRegistryContract {
  private readonly handlers = new Map<string, ComputerUseMissionRuntimeHandler>();
  private readonly defaultHandlers = new Map<string, ComputerUseMissionRuntimeHandler>();

  constructor(options: { runtime: Pick<ComputerUseRuntime, "runComputerUseStep"> }) {
    const defaultComputerUseHandler: ComputerUseMissionRuntimeHandler = async (input: ComputerUseMissionRuntimeDispatchInput): Promise<ComputerUseMissionRuntimeDispatchResult> => {
      const stepResult = await options.runtime.runComputerUseStep(input.step);
      return {
        ok: true,
        step: input.step,
        stepResult,
        reason: "Computer-use mission step dispatched.",
        metadata: {
          dispatcherKind: "scaffold",
          systemApisCalled: false,
          missionEngineImported: false,
        },
      };
    };

    this.defaultHandlers.set("computer_use", defaultComputerUseHandler);
    this.reset();
  }

  registerHandler(kind: string, handler: ComputerUseMissionRuntimeHandler, options: { overwrite?: boolean } = {}): void {
    if (!options.overwrite && this.handlers.has(kind)) {
      throw new Error(`Handler already registered for kind: ${kind}`);
    }
    this.handlers.set(kind, handler);
  }

  canHandle(step: Pick<{ kind: string }, "kind">): boolean {
    return this.handlers.has(step.kind);
  }

  getHandler(kind: string): ComputerUseMissionRuntimeHandler | undefined {
    return this.handlers.get(kind);
  }

  listHandlers(): string[] {
    return Array.from(this.handlers.keys());
  }

  getSnapshot(): ComputerUseMissionRuntimeRegistrySnapshot {
    return {
      handlers: this.listHandlers(),
      metadata: {
        registryKind: "scaffold",
        systemApisCalled: false,
        missionEngineImported: false,
      },
    };
  }

  reset(): void {
    this.handlers.clear();
    for (const [kind, handler] of this.defaultHandlers.entries()) {
      this.handlers.set(kind, handler);
    }
  }
}
