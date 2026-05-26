import {
  ComputerUseMissionRuntimeDispatchInput,
  ComputerUseMissionRuntimeDispatchResult,
  ComputerUseMissionRuntimeDispatcherOptions,
} from "./types";

export class ComputerUseMissionRuntimeDispatcher {
  constructor(private readonly options: ComputerUseMissionRuntimeDispatcherOptions) {}

  async dispatch(input: ComputerUseMissionRuntimeDispatchInput): Promise<ComputerUseMissionRuntimeDispatchResult> {
    const handler = this.options.registry.getHandler(input.step.kind);
    if (!handler) {
      return {
        ok: false,
        step: input.step,
        reason: `Unsupported mission step kind: ${input.step.kind}`,
        metadata: {
          dispatcherKind: "scaffold",
          systemApisCalled: false,
          missionEngineImported: false,
        },
      };
    }

    return handler(input);
  }

  canHandle(step: { kind: string }): boolean {
    return this.options.registry.canHandle(step);
  }

  reset(): void {
    this.options.registry.reset();
  }
}
