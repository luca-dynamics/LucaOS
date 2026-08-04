import { CognitivePresence, createDefaultCognitivePresence } from "./CognitivePresence";
import { ExpressionEngine, ExpressiveOrbParameters } from "./PresenceTranslator";
import { PresenceProfile, PRESENCE_PROFILES, SurfaceKind } from "./PresenceProfile";
import { PresenceTimeline } from "./PresenceTimeline";
import { InteractionState } from "../../voice-engine/src";
import { OrbTheme } from "../../luca-orb/src";

export class PresenceEngine {
  private timeline: PresenceTimeline;
  private profile: PresenceProfile;

  constructor(surface: SurfaceKind = "voice_hud", initialPresence?: CognitivePresence) {
    const init = initialPresence || createDefaultCognitivePresence();
    this.timeline = new PresenceTimeline(init);
    this.profile = PRESENCE_PROFILES[surface];
  }

  public updatePresence(partial: Partial<CognitivePresence>): void {
    this.timeline.setTarget(partial);
  }

  public stepTimeline(factor = 0.15): CognitivePresence {
    return this.timeline.step(factor);
  }

  public getPresence(): CognitivePresence {
    return this.timeline.getCurrent();
  }

  public setSurface(surface: SurfaceKind): void {
    this.profile = PRESENCE_PROFILES[surface];
  }

  public express(interactionState: InteractionState, baseTheme?: OrbTheme): ExpressiveOrbParameters {
    const current = this.timeline.step();
    return ExpressionEngine.translate(interactionState, current, this.profile, baseTheme);
  }
}
