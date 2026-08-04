import { OrbState, ORB_STATE_PROPERTIES, OrbStateProperties } from "../types/OrbState";

function cubicBezier(t: number, p1: number, p2: number): number {
  const u = 1 - t;
  return 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t;
}

export class AnimationGraph {
  private currentState: OrbState = OrbState.Idle;
  private targetState: OrbState = OrbState.Idle;
  private transitionProgress: number = 1.0;
  private transitionDurationMs: number = 450;
  private lastTimeMs: number = performance.now();

  public transitionTo(newState: OrbState): void {
    if (this.targetState === newState) return;
    this.currentState = this.targetState;
    this.targetState = newState;
    this.transitionProgress = 0.0;
    this.lastTimeMs = performance.now();
  }

  public update(): OrbStateProperties {
    const now = performance.now();
    const dt = now - this.lastTimeMs;
    this.lastTimeMs = now;

    if (this.transitionProgress < 1.0) {
      this.transitionProgress = Math.min(1.0, this.transitionProgress + dt / this.transitionDurationMs);
    }

    const ease = cubicBezier(this.transitionProgress, 0.4, 0.2);
    const currentProps = ORB_STATE_PROPERTIES[this.currentState] || ORB_STATE_PROPERTIES[OrbState.Idle];
    const targetProps = ORB_STATE_PROPERTIES[this.targetState] || ORB_STATE_PROPERTIES[OrbState.Idle];

    return {
      breathingSpeed: currentProps.breathingSpeed + (targetProps.breathingSpeed - currentProps.breathingSpeed) * ease,
      glowIntensity: currentProps.glowIntensity + (targetProps.glowIntensity - currentProps.glowIntensity) * ease,
      blobScale: currentProps.blobScale + (targetProps.blobScale - currentProps.blobScale) * ease,
      rippleSpeed: currentProps.rippleSpeed + (targetProps.rippleSpeed - currentProps.rippleSpeed) * ease,
      primaryColor: targetProps.primaryColor,
      secondaryColor: targetProps.secondaryColor,
    };
  }
}
