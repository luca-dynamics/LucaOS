import { PresenceEngine } from "../src/PresenceEngine";
import { PresenceFusionEngine } from "../src/PresenceFusionEngine";
import { InteractionState } from "../../voice-engine/src";

export function runPresenceEngineTest(): void {
  const engine = new PresenceEngine("voice_hud");
  const fusion = new PresenceFusionEngine(engine);

  const fused = fusion.fuse({
    interactionState: InteractionState.Thinking,
    modelCertainty: 0.35, // Low certainty search
    activeToolCount: 2,
  });

  if (fused.orbParams.flowSpeedMultiplier <= 1.0) {
    throw new Error("PresenceFusionEngine failed: expected elevated flow speed for low-certainty tool execution");
  }

  if (fused.faceParams.headTiltAngleDegrees <= 0) {
    throw new Error("PresenceFusionEngine failed: expected head tilt for low certainty");
  }

  if (!fused.expression) {
    throw new Error("PresenceFusionEngine failed: expected valid ExpressionState");
  }

  console.log("✅ All @luca/presence-engine Embodiment-Agnostic Tests Passed Successfully!");
}

runPresenceEngineTest();
