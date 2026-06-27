import type {
  LocalChatRequest,
  LocalChatResponse,
  LocalRuntimeEvent,
  LocalRuntimeKind,
} from "./LocalModelTypes";

export type LocalRuntimeHealthStatus =
  | "online"
  | "no-models"
  | "unreachable"
  | "degraded";

export interface LocalRuntimeHealth {
  runtime: LocalRuntimeKind;
  status: LocalRuntimeHealthStatus;
  reachable: boolean;
  modelIds: string[];
  message: string;
  checkedAt: number;
}

export interface LocalRuntimeAdapter {
  readonly kind: LocalRuntimeKind;
  health(): Promise<LocalRuntimeHealth>;
  listModels(): Promise<string[]>;
  chat(request: LocalChatRequest): Promise<LocalChatResponse>;
  stream?(request: LocalChatRequest): AsyncGenerator<LocalRuntimeEvent>;
  ensureReady?(): Promise<void>;
}

export function createRuntimeHealth(input: {
  runtime: LocalRuntimeKind;
  reachable: boolean;
  modelIds?: string[];
  message?: string;
  checkedAt?: number;
  degraded?: boolean;
}): LocalRuntimeHealth {
  const modelIds = input.modelIds ?? [];
  const status: LocalRuntimeHealthStatus = input.degraded
    ? "degraded"
    : input.reachable
      ? modelIds.length > 0
        ? "online"
        : "no-models"
      : "unreachable";

  return {
    runtime: input.runtime,
    status,
    reachable: input.reachable,
    modelIds,
    message:
      input.message ??
      (input.reachable
        ? modelIds.length > 0
          ? `${modelIds.length} local models available.`
          : "Runtime is reachable but no models are installed."
        : "Runtime is not reachable."),
    checkedAt: input.checkedAt ?? Date.now(),
  };
}
