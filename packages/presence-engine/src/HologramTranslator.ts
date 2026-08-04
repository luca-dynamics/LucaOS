import { CognitivePresence } from "./CognitivePresence";
import { PresenceProfile } from "./PresenceProfile";
import { InteractionState } from "../../voice-engine/src";

export interface ExpressiveHologramParameters {
  gazeIntensity: number;
  headTiltAngleDegrees: number;
  eyebrowElevation: number;
  mouthMicroEnergy: number;
  hologramAlphaOpacity: number;
}

export class HologramTranslator {
  public static translate(
    interactionState: InteractionState,
    presence: CognitivePresence,
    profile?: PresenceProfile
  ): ExpressiveHologramParameters {
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
      hologramAlphaOpacity: Math.min(1.0, Math.max(0.2, 0.85 * scale)),
    };
  }
}
