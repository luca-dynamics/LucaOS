import { OrbMaterial, ORB_MATERIALS } from "./MaterialEngine";
import { MotionProfile, MOTION_PROFILES } from "./MotionProfile";
import { OrbState } from "../types/OrbState";

export interface OrbPersonality {
  id: string;
  name: string;
  material: OrbMaterial;
  motionProfile: MotionProfile;
}

export const ORB_PERSONALITIES: Record<string, OrbPersonality> = {
  default: {
    id: "default",
    name: "Luca Default (Calm & Precise)",
    material: ORB_MATERIALS.liquidGlass,
    motionProfile: MOTION_PROFILES[OrbState.Idle],
  },
  creative: {
    id: "creative",
    name: "Creative (Expressive & Vibrant)",
    material: ORB_MATERIALS.aurora,
    motionProfile: MOTION_PROFILES[OrbState.Thinking],
  },
  developer: {
    id: "developer",
    name: "Developer (Restrained & High Speed)",
    material: ORB_MATERIALS.hologram,
    motionProfile: MOTION_PROFILES[OrbState.Listening],
  },
};
