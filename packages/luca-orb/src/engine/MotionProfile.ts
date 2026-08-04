import { OrbState } from "../types/OrbState";

export interface MotionProfile {
  flowSpeed: number;
  breathingRate: number;
  breathingAmplitude: number;
  turbulence: number;
  curlStrength: number;
  rippleFrequency: number;
  rippleAmplitude: number;
  particleVelocity: number;
  particleSpawnRate: number;
  glowIntensity: number;
}

export const MOTION_PROFILES: Record<OrbState, MotionProfile> = {
  [OrbState.Idle]: {
    flowSpeed: 0.4,
    breathingRate: 0.8,
    breathingAmplitude: 0.012,
    turbulence: 0.3,
    curlStrength: 0.12,
    rippleFrequency: 1.0,
    rippleAmplitude: 0.01,
    particleVelocity: 0.2,
    particleSpawnRate: 4,
    glowIntensity: 0.35,
  },
  [OrbState.Listening]: {
    flowSpeed: 0.8,
    breathingRate: 1.5,
    breathingAmplitude: 0.02,
    turbulence: 0.6,
    curlStrength: 0.25,
    rippleFrequency: 3.0,
    rippleAmplitude: 0.035,
    particleVelocity: 0.5,
    particleSpawnRate: 12,
    glowIntensity: 0.75,
  },
  [OrbState.Thinking]: {
    flowSpeed: 1.4,
    breathingRate: 2.2,
    breathingAmplitude: 0.018,
    turbulence: 0.9,
    curlStrength: 0.4,
    rippleFrequency: 5.0,
    rippleAmplitude: 0.05,
    particleVelocity: 0.8,
    particleSpawnRate: 18,
    glowIntensity: 0.85,
  },
  [OrbState.Speaking]: {
    flowSpeed: 1.1,
    breathingRate: 1.8,
    breathingAmplitude: 0.035,
    turbulence: 0.7,
    curlStrength: 0.3,
    rippleFrequency: 4.0,
    rippleAmplitude: 0.06,
    particleVelocity: 0.6,
    particleSpawnRate: 14,
    glowIntensity: 1.0,
  },
  [OrbState.Success]: {
    flowSpeed: 0.6,
    breathingRate: 1.0,
    breathingAmplitude: 0.015,
    turbulence: 0.2,
    curlStrength: 0.1,
    rippleFrequency: 2.0,
    rippleAmplitude: 0.02,
    particleVelocity: 0.3,
    particleSpawnRate: 8,
    glowIntensity: 0.95,
  },
  [OrbState.Error]: {
    flowSpeed: 0.9,
    breathingRate: 1.4,
    breathingAmplitude: 0.01,
    turbulence: 0.8,
    curlStrength: 0.35,
    rippleFrequency: 1.5,
    rippleAmplitude: 0.015,
    particleVelocity: 0.4,
    particleSpawnRate: 6,
    glowIntensity: 0.7,
  },
  [OrbState.Sleeping]: {
    flowSpeed: 0.15,
    breathingRate: 0.3,
    breathingAmplitude: 0.005,
    turbulence: 0.1,
    curlStrength: 0.05,
    rippleFrequency: 0.5,
    rippleAmplitude: 0.005,
    particleVelocity: 0.1,
    particleSpawnRate: 1,
    glowIntensity: 0.15,
  },
};
