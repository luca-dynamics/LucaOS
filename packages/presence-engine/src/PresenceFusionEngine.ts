import { CognitivePresence } from "./CognitivePresence";
import { ExpressionState } from "./ExpressionState";
import { PresenceEngine } from "./PresenceEngine";
import { OrbTranslator, ExpressiveOrbParameters } from "./OrbTranslator";
import { FaceTranslator, ExpressiveFaceParameters } from "./FaceTranslator";
import { InteractionState } from "../../voice-engine/src";
import { OrbTheme } from "../../luca-orb/src";

export interface PlatformCognitiveInputs {
  interactionState: InteractionState;
  modelCertainty?: number; // 0.0 to 1.0
  activeToolCount?: number;
  userPromptPace?: "slow" | "normal" | "fast";
  baseTheme?: OrbTheme;
}

export class PresenceFusionEngine {
  private presenceEngine: PresenceEngine;

  constructor(presenceEngine: PresenceEngine) {
    this.presenceEngine = presenceEngine;
  }

  public fuse(inputs: PlatformCognitiveInputs): {
    expression: ExpressionState;
    orbParams: ExpressiveOrbParameters;
    faceParams: ExpressiveFaceParameters;
  } {
    const certainty = inputs.modelCertainty ?? 0.9;
    const toolCount = inputs.activeToolCount ?? 0;

    // Calculate fused cognitive state
    const targetPresence: Partial<CognitivePresence> = {
      certainty,
      confidence: Math.min(1.0, certainty * 1.1),
      cognitiveLoad: toolCount > 0 ? 0.85 : 0.2,
      intentEnergy: toolCount > 0 ? 0.9 : 0.5,
      calmness: certainty < 0.5 ? 0.35 : 0.85,
    };

    this.presenceEngine.updatePresence(targetPresence);
    const presence = this.presenceEngine.getPresence();

    const expression: ExpressionState = {
      presence,
      gazeIntensity: presence.attention,
      focalBias: inputs.interactionState === InteractionState.Listening ? "listening" : "center",
      energyLevel: presence.intentEnergy,
      calmness: presence.calmness,
    };

    const orbParams = OrbTranslator.translate(inputs.interactionState, presence, undefined, inputs.baseTheme);
    const faceParams = FaceTranslator.translate(inputs.interactionState, presence);

    return {
      expression,
      orbParams,
      faceParams,
    };
  }
}
