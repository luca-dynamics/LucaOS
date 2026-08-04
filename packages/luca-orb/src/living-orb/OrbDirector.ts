/**
 * OrbDirector — Coordinates and directs all embodiment rhythms.
 *
 * Renamed and expanded from OrbAnimator.
 * The OrbDirector does not merely animate; it directs:
 *  - Anticipation (pre-motion overshoot when profile changes)
 *  - Damping & Lag (fluid, non-instantaneous response to energy shifts)
 *  - Stagger (staggered layer response: core lights first, glass follows, highlights lag)
 *  - Synchronization across Motion, Material, Lighting, Glow, and Highlights
 *
 * Driven by OrbIdentityDNA from @luca/orb-design.
 */
import { AnimationState, OrbProfile } from './types';
import { OrbIdentityDNA, DEFAULT_LUCA_IDENTITY_DNA, EmbodimentState, evaluateEmbodimentState } from '@luca/orb-design';

const MORPH_SPEED = 0.055;

export class OrbDirector {
  private startTime: number;
  private lastTimestamp: number = 0;
  private smoothedAudioEnergy: number = 0;
  private smoothedAudioOnset: number  = 0;
  private identityDNA: OrbIdentityDNA;

  // Stagger & lag states
  private targetProfile: OrbProfile = 'idle';
  private currentProfile: OrbProfile = 'idle';
  private profileTransitionProgress: number = 1.0;
  private profileTransitionStartTime: number = 0;

  constructor(dna: OrbIdentityDNA = DEFAULT_LUCA_IDENTITY_DNA) {
    this.identityDNA = dna;
    this.startTime = performance.now() / 1000;
  }

  setIdentityDNA(dna: OrbIdentityDNA): void {
    this.identityDNA = dna;
  }

  setProfile(profile: OrbProfile): void {
    if (profile !== this.targetProfile) {
      this.currentProfile = this.targetProfile;
      this.targetProfile = profile;
      this.profileTransitionProgress = 0.0;
      this.profileTransitionStartTime = performance.now() / 1000;
    }
  }

  setAudioInput(rawEnergy: number, rawOnset: number): void {
    const dt = this.lastTimestamp > 0
      ? performance.now() / 1000 - this.lastTimestamp
      : 1 / 60;

    const attackRate  = 1 - Math.exp(-dt / 0.08);
    const releaseRate = 1 - Math.exp(-dt / 0.25);

    const energyRate = rawEnergy > this.smoothedAudioEnergy ? attackRate : releaseRate;
    this.smoothedAudioEnergy += (rawEnergy - this.smoothedAudioEnergy) * energyRate;
    this.smoothedAudioOnset  += (rawOnset  - this.smoothedAudioOnset)  * attackRate;
  }

  /** Direct the state for the current frame */
  tick(): AnimationState {
    const now = performance.now() / 1000;
    const t = now - this.startTime;
    const dt = this.lastTimestamp > 0 ? now - this.lastTimestamp : 1 / 60;
    this.lastTimestamp = now;

    const { shape, motion, breathing, highlight, timing } = this.identityDNA;

    // ── Profile transition & anticipation ────────────────────────────────
    if (this.profileTransitionProgress < 1.0) {
      const elapsed = now - this.profileTransitionStartTime;
      const duration = timing.settleDuration;
      this.profileTransitionProgress = Math.min(1.0, elapsed / duration);
    }

    // Anticipation curve: brief compression before expansion during transition
    const anticipationFactor = this.profileTransitionProgress < timing.anticipationDuration
      ? Math.sin((this.profileTransitionProgress / timing.anticipationDuration) * Math.PI) * -0.02
      : 0.0;

    // ── Breathing oscillation ──────────────────────────────────────────────
    const breathPhase = (t % motion.breathingPeriod) / motion.breathingPeriod;
    const breathSin   = Math.sin(breathPhase * Math.PI * 2);
    const breathShaped = breathSin - 0.15 * Math.sin(breathPhase * Math.PI * 4 * breathing.inhaleRatio);
    const breathingScale = 1.0 + breathShaped * 0.028 * breathing.deepBreathScale + anticipationFactor;

    // ── Floating drift ─────────────────────────────────────────────────────
    const f1 = Math.sin((t / motion.floatAmplitude) * Math.PI * 2);
    const f2 = Math.sin((t / (motion.floatAmplitude * 1.618)) * Math.PI * 2) * 0.28;
    const floatOffset = (f1 + f2) * motion.floatAmplitude;

    // ── Highlight wander phase ─────────────────────────────────────────────
    const highlightDrift = (t / highlight.driftPeriod) * Math.PI * 2;

    // ── Micro-jitter ────────────────────────────────────────────────────────
    const j1 = Math.sin(t * motion.microJitterFrequency * Math.PI * 2);
    const j2 = Math.sin(t * motion.microJitterFrequency * 1.37 * Math.PI * 2) * 0.5;
    const microJitter = Math.abs((j1 + j2) / 1.5) * 0.007 * shape.organicAsymmetry;

    return {
      time:           t,
      breathingScale: Math.max(0.9, Math.min(1.1, breathingScale)),
      floatOffset,
      microJitter,
      highlightDrift: highlightDrift % (Math.PI * 2),
      profileBlend:   this.profileTransitionProgress,
      audioEnergy:    Math.max(0, Math.min(1, this.smoothedAudioEnergy)),
      audioOnset:     Math.max(0, Math.min(1, this.smoothedAudioOnset)),
    };
  }

  /** Evaluate current low-level EmbodimentState for OrbRenderer */
  getEmbodimentState(): EmbodimentState {
    return evaluateEmbodimentState(
      this.targetProfile,
      0.42 * this.identityDNA.shape.baseScale,
      this.profileTransitionProgress
    );
  }

  reset(): void {
    this.startTime = performance.now() / 1000;
    this.smoothedAudioEnergy = 0;
    this.smoothedAudioOnset  = 0;
    this.profileTransitionProgress = 1.0;
  }
}
