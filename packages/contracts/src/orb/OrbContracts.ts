export interface ExpressionState {
  presence: {
    attention: number;
    cognitiveLoad: number;
    confidence: number;
    certainty: number;
    urgency: number;
    intentEnergy: number;
    expressiveness: number;
    calmness: number;
  };
  gazeIntensity: number;
  focalBias: "center" | "listening" | "searching" | "defocused";
  energyLevel: number;
  calmness: number;
}
