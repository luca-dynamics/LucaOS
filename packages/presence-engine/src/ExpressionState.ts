import { CognitivePresence } from "./CognitivePresence";

export interface ExpressionState {
  presence: CognitivePresence;
  gazeIntensity: number; // 0.0 to 1.0
  focalBias: "center" | "listening" | "searching" | "defocused";
  energyLevel: number; // 0.0 to 1.0
  calmness: number; // 0.0 to 1.0
}
