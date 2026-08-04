import { ExpressionState } from "./ExpressionState";

export interface Embodiment {
  initialize(): Promise<void>;
  update(state: ExpressionState): void;
  suspend(): void;
  resume(): void;
  destroy(): void;
}
