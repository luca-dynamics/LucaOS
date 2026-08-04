import React from "react";
import { OrbRenderer } from "../renderer/OrbRenderer";
import { OrbState, OrbMaterialPreset } from "../types/OrbState";

export interface LucaOrbProps {
  size?: number;
  state?: OrbState | `${OrbState}`;
  intensity?: number;
  material?: OrbMaterialPreset;
  className?: string;
}

export const LucaOrb: React.FC<LucaOrbProps> = ({
  size = 220,
  state = OrbState.Idle,
  intensity = 0.35,
  material = "liquidGlass",
  className = "",
}) => {
  const resolvedState = (
    typeof state === "string" ? state : OrbState.Idle
  ) as OrbState;

  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <OrbRenderer
        size={size}
        state={resolvedState}
        intensity={intensity}
        material={material}
      />
    </div>
  );
};
