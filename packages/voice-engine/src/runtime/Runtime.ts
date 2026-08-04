import { IEventBus } from "../events/EventBus";

export type HealthState = "healthy" | "degraded" | "unavailable";

export interface Runtime {
  name: string;
  start(): Promise<void>;
  stop(): Promise<void>;
  dispose(): Promise<void>;
  getHealth(): HealthState;
}

export interface EventProducingRuntime extends Runtime {
  attach(bus: IEventBus): void;
}
