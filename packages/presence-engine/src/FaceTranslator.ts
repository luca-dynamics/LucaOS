import { CognitivePresence } from "./CognitivePresence";
import { ExpressionState } from "./ExpressionState";
import { PresenceProfile } from "./PresenceProfile";
import { InteractionState } from "../../voice-engine/src";

export interface ExpressiveFaceParameters {
  gazeIntensity: number;
  headTiltAngleDegrees: number;
  eyebrowElevation: number;
  mouthMicroEnergy: number;
  faceAlphaOpacity: number;
}

export class FaceTranslator {
  public static translate(
    interactionState: InteractionState,
    presence: CognitivePresence,
    profile?: PresenceProfile
  ): ExpressiveFaceParameters {
    const scale = profile?.expressionScale ?? 1.0;

    let gazeIntensity = presence.attention * scale;
    let headTiltAngleDegrees = (1.0 - presence.certainty) * 12.0 * scale;
    let eyebrowElevation = presence.intentEnergy * 0.4 * scale;
    let mouthMicroEnergy = presence.expressiveness * scale;

    if (interactionState === InteractionState.Listening) {
      gazeIntensity = Math.min(1.0, gazeIntensity * 1.3);
      headTiltAngleDegrees += 4.0;
    }

    return {
      gazeIntensity: Math.min(1.0, Math.max(0.1, gazeIntensity)),
      headTiltAngleDegrees: Math.min(25.0, Math.max(-25.0, headTiltAngleDegrees)),
      eyebrowElevation: Math.min(1.0, Math.max(-0.5, eyebrowElevation)),
      mouthMicroEnergy: Math.min(1.0, Math.max(0.0, mouthMicroEnergy)),
      faceAlphaOpacity: Math.min(1.0, Math.max(0.2, 0.85 * scale)),
    };
  }

  public static translateExpression(
    interactionState: InteractionState,
    expression: ExpressionState,
    profile?: PresenceProfile
  ): ExpressiveFaceParameters {
    return this.translate(interactionState, expression.presence, profile);
  }
}
