export enum OrbState {
  Idle = "idle",
  Listening = "listening",
  Thinking = "thinking",
  Speaking = "speaking",
  Success = "success",
  Error = "error",
  Sleeping = "sleeping",
}

export type OrbMaterialPreset =
  | "liquidGlass"
  | "crystal"
  | "ice"
  | "metal"
  | "energy"
  | "neon"
  | "hologram";

export interface OrbStateProperties {
  breathingSpeed: number;
  glowIntensity: number;
  blobScale: number;
  rippleSpeed: number;
  primaryColor: string;
  secondaryColor: string;
}

export const ORB_STATE_PROPERTIES: Record<OrbState, OrbStateProperties> = {
  [OrbState.Idle]: {
    breathingSpeed: 0.8,
    glowIntensity: 0.35,
    blobScale: 1.0,
    rippleSpeed: 0.0,
    primaryColor: "#38bdf8",
    secondaryColor: "#818cf8",
  },
  [OrbState.Listening]: {
    breathingSpeed: 1.5,
    glowIntensity: 0.75,
    blobScale: 1.15,
    rippleSpeed: 2.0,
    primaryColor: "#06b6d4",
    secondaryColor: "#3b82f6",
  },
  [OrbState.Thinking]: {
    breathingSpeed: 2.2,
    glowIntensity: 0.85,
    blobScale: 1.08,
    rippleSpeed: 3.5,
    primaryColor: "#a855f7",
    secondaryColor: "#ec4899",
  },
  [OrbState.Speaking]: {
    breathingSpeed: 1.8,
    glowIntensity: 1.0,
    blobScale: 1.3,
    rippleSpeed: 4.5,
    primaryColor: "#3b82f6",
    secondaryColor: "#22d3ee",
  },
  [OrbState.Success]: {
    breathingSpeed: 1.0,
    glowIntensity: 0.95,
    blobScale: 1.1,
    rippleSpeed: 1.5,
    primaryColor: "#10b981",
    secondaryColor: "#34d399",
  },
  [OrbState.Error]: {
    breathingSpeed: 1.4,
    glowIntensity: 0.7,
    blobScale: 0.95,
    rippleSpeed: 1.0,
    primaryColor: "#f43f5e",
    secondaryColor: "#fb923c",
  },
  [OrbState.Sleeping]: {
    breathingSpeed: 0.3,
    glowIntensity: 0.15,
    blobScale: 0.9,
    rippleSpeed: 0.0,
    primaryColor: "#475569",
    secondaryColor: "#334155",
  },
};
