export interface CognitivePresence {
  attention: number; // 0.0 to 1.0
  cognitiveLoad: number; // 0.0 to 1.0
  confidence: number; // 0.0 to 1.0
  certainty: number; // 0.0 to 1.0 (actual model/search certainty)
  urgency: number; // 0.0 to 1.0
  intentEnergy: number; // 0.0 to 1.0 (task energy: greeting, coding, searching)
  expressiveness: number; // 0.0 to 1.0
  calmness: number; // 0.0 to 1.0
}

export function createDefaultCognitivePresence(): CognitivePresence {
  return {
    attention: 0.5,
    cognitiveLoad: 0.2,
    confidence: 0.95,
    certainty: 0.9,
    urgency: 0.1,
    intentEnergy: 0.5,
    expressiveness: 0.8,
    calmness: 0.8,
  };
}
