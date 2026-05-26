import {
  ComputerUseMissionIntegrationAdapterOptions,
  ComputerUseMissionIntegrationInput,
  ComputerUseMissionIntegrationResult,
  ComputerUseMissionIntegrationSnapshot,
  ComputerUseMissionStepInput,
} from "./types";

export class ComputerUseMissionIntegrationAdapter {
  private lastInput?: ComputerUseMissionIntegrationInput;

  constructor(private readonly options: ComputerUseMissionIntegrationAdapterOptions) {}

  normalizeStep(input: ComputerUseMissionIntegrationInput): ComputerUseMissionStepInput | undefined {
    const step = input?.step;
    if (!step || typeof step !== "object") return undefined;
    if (typeof step.missionId !== "string" || typeof step.stepId !== "string" || typeof step.kind !== "string") return undefined;

    return {
      missionId: step.missionId,
      stepId: step.stepId,
      kind: step.kind,
      input: step.input,
    };
  }

  canHandle(input: ComputerUseMissionIntegrationInput): boolean {
    const step = this.normalizeStep(input);
    if (!step) return false;
    return step.kind === "computer_use" && !!(input.featureFlags?.computerUseEnabled || input.featureFlags?.enableComputerUseDispatch);
  }

  async dispatch(input: ComputerUseMissionIntegrationInput): Promise<ComputerUseMissionIntegrationResult> {
    this.lastInput = input;
    const step = this.normalizeStep(input);

    if (!step) {
      return this.rejected("Missing or malformed mission step");
    }

    if (step.kind !== "computer_use") {
      return this.rejected(`Unsupported mission step kind: ${step.kind}`, step);
    }

    if (!this.canHandle(input)) {
      return this.rejected("Computer-use dispatch requires explicit opt-in", step);
    }

    const dispatched = await this.options.dispatcher.dispatch({ step });
    return {
      ok: dispatched.ok,
      step,
      stepResult: dispatched.stepResult,
      reason: dispatched.reason,
      metadata: {
        integrationKind: "scaffold",
        systemApisCalled: false,
        missionEngineImported: false,
        requiresExplicitOptIn: true,
      },
    };
  }

  getSnapshot(): ComputerUseMissionIntegrationSnapshot {
    return {
      canHandleLastInput: this.lastInput ? this.canHandle(this.lastInput) : false,
      lastInput: this.lastInput,
      metadata: {
        integrationKind: "scaffold",
        systemApisCalled: false,
        missionEngineImported: false,
        requiresExplicitOptIn: true,
      },
    };
  }

  reset(): void {
    this.lastInput = undefined;
    this.options.dispatcher.reset();
  }

  private rejected(reason: string, step?: ComputerUseMissionStepInput): ComputerUseMissionIntegrationResult {
    return {
      ok: false,
      step,
      reason,
      metadata: {
        integrationKind: "scaffold",
        systemApisCalled: false,
        missionEngineImported: false,
        requiresExplicitOptIn: true,
      },
    };
  }
}
