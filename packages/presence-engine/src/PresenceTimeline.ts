import { CognitivePresence } from "./CognitivePresence";

function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * Math.max(0, Math.min(1, t));
}

export class PresenceTimeline {
  private current: CognitivePresence;
  private target: CognitivePresence;

  constructor(initial: CognitivePresence) {
    this.current = { ...initial };
    this.target = { ...initial };
  }

  public setTarget(target: Partial<CognitivePresence>): void {
    this.target = { ...this.target, ...target };
  }

  public step(factor = 0.15): CognitivePresence {
    this.current = {
      attention: lerp(this.current.attention, this.target.attention, factor),
      cognitiveLoad: lerp(this.current.cognitiveLoad, this.target.cognitiveLoad, factor),
      confidence: lerp(this.current.confidence, this.target.confidence, factor),
      certainty: lerp(this.current.certainty, this.target.certainty, factor),
      urgency: lerp(this.current.urgency, this.target.urgency, factor),
      intentEnergy: lerp(this.current.intentEnergy, this.target.intentEnergy, factor),
      expressiveness: lerp(this.current.expressiveness, this.target.expressiveness, factor),
      calmness: lerp(this.current.calmness, this.target.calmness, factor),
    };
    return { ...this.current };
  }

  public getCurrent(): CognitivePresence {
    return { ...this.current };
  }
}
