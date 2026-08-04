import React from "react";
import { OrbRenderer } from "./renderer/OrbRenderer";
import { OrbState } from "./types/OrbState";
import { OrbMaterial } from "./materials/OrbMaterial";
import { OrbAccessibility } from "./engine/OrbAccessibility";
import { OrbTheme } from "./engine/OrbTheme";

export interface LucaOrbProps {
  size?: number;
  state?: OrbState;
  intensity?: number;
  material?: string | OrbMaterial;
  theme?: OrbTheme;
  accessibility?: OrbAccessibility;
  className?: string;
  style?: React.CSSProperties;
}

export function LucaOrb({
  size = 220,
  state = OrbState.Idle,
  intensity = 0.35,
  material = "liquidGlass",
  theme,
  accessibility,
  className = "",
  style = {},
}: LucaOrbProps) {
  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{
        width: size,
        height: size,
        ...style,
      }}
    >
      <OrbRenderer
        size={size}
        state={state}
        intensity={intensity}
        material={material}
        theme={theme}
        accessibility={accessibility}
      />
    </div>
  );
}
