import { OrbProfile } from './types';
import { OrbDirector } from './OrbDirector';
import { EmbodimentAdapter } from './EmbodimentAdapter';

/**
 * @public
 * @stable
 * Adapter configuration props for downstream UI consumers.
 */
export interface EmbodimentSessionConfig {
  adapter: EmbodimentAdapter;
  director: OrbDirector;
  initialProfile?: OrbProfile;
  autoStart?: boolean;
}

/**
 * @public
 * @stable
 * Manages application embodiment session lifecycle, state mapping, and tab restoration.
 * Downstream consumers (VoiceHUD, Floating Assistant, Desktop Widget) interact with
 * EmbodimentSession to drive living expressions without touching shader internals.
 */
export class EmbodimentSession {
  private adapter: EmbodimentAdapter;
  private director: OrbDirector;
  private currentProfile: OrbProfile;
  private isActive = false;
  private isPaused = false;

  constructor(config: EmbodimentSessionConfig) {
    this.adapter = config.adapter;
    this.director = config.director;
    this.currentProfile = config.initialProfile ?? 'idle';
    this.director.setProfile(this.currentProfile);

    if (config.autoStart !== false) {
      this.start();
    }
  }

  /** Start the living embodiment session loop. */
  public start(): void {
    if (this.isActive) return;
    this.isActive = true;
    this.isPaused = false;
    this.adapter.start();
  }

  /** Pause the session loop (e.g. background tab or hidden UI). */
  public pause(): void {
    if (!this.isActive || this.isPaused) return;
    this.isPaused = true;
    this.adapter.dispose();
  }

  /** Resume session loop after tab restore or UI wake. */
  public resume(): void {
    if (!this.isActive || !this.isPaused) return;
    this.isPaused = false;
    this.adapter.start();
  }

  /** Deterministically update conversation state profile. */
  public setProfile(profile: OrbProfile): void {
    if (this.currentProfile === profile) return;
    this.currentProfile = profile;
    this.director.setProfile(profile);
  }

  /** Get active conversation profile. */
  public getProfile(): OrbProfile {
    return this.currentProfile;
  }

  /** Pass real-time audio energy and onset to the living embodiment. */
  public updateAudio(rawEnergy: number, rawOnset: number): void {
    if (!this.isActive || this.isPaused) return;
    this.director.setAudioInput(rawEnergy, rawOnset);
  }

  /** Handle viewport or container resize. */
  public handleResize(): void {
    this.adapter.handleResize();
  }

  /** Terminate session and release resources. */
  public end(): void {
    this.isActive = false;
    this.isPaused = false;
    this.adapter.dispose();
  }
}
