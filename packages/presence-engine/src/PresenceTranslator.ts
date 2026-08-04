import { CognitivePresence } from "./CognitivePresence";
import { PresenceProfile } from "./PresenceProfile";
import { InteractionState } from "../../voice-engine/src";
import { OrbTheme } from "../../luca-orb/src";

export interface ExpressiveOrbParameters {
  flowSpeedMultiplier: number;
  breathingAmplitudeMultiplier: number;
  bloomScale: number;
  fresnelBoost: number;
  glowTint?: [number, number, number];
  ambientTint?: [number, number, number];
}

export class ExpressionEngine {
  public static translate(
    interactionState: InteractionState,
    presence: CognitivePresence,
    profile?: PresenceProfile,
    baseTheme?: OrbTheme
  ): ExpressiveOrbParameters {
    const scale = profile?.expressionScale ?? 1.0;

    let flowSpeedMultiplier = 1.0 + (presence.cognitiveLoad * 0.8 - presence.calmness * 0.4) * scale;
    let breathingAmplitudeMultiplier = 1.0 + (presence.urgency * 0.6 + (1.0 - presence.calmness) * 0.4) * scale;
    let bloomScale = (baseTheme?.bloomScale ?? 1.0) * (0.8 + presence.attention * 0.5) * scale;
    let fresnelBoost = 1.0 + presence.attention * 0.4 * scale;

    switch (interactionState) {
      case InteractionState.Thinking:
        flowSpeedMultiplier *= 1.25;
        break;
      case InteractionState.Listening:
        fresnelBoost *= 1.35;
        break;
      case InteractionState.Sleeping:
        flowSpeedMultiplier = 0.2;
        breathingAmplitudeMultiplier = 0.3;
        break;
    }

    return {
      flowSpeedMultiplier: Math.max(0.1, flowSpeedMultiplier),
      breathingAmplitudeMultiplier: Math.max(0.1, breathingAmplitudeMultiplier),
      bloomScale: Math.max(0.2, Math.min(2.0, bloomScale)),
      fresnelBoost: Math.max(0.5, fresnelBoost),
      glowTint: baseTheme?.glowTint,
      ambientTint: baseTheme?.ambientTint,
    };
  }
}
