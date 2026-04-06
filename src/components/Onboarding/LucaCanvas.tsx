/* eslint-disable react/no-unknown-property */
import React, { useRef, useMemo } from "react";
import { THEME_PALETTE, getThemeColors, PERSONA_UI_CONFIG } from "../../config/themeColors";
import { settingsService } from "../../services/settingsService";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial, Float } from "@react-three/drei";
import * as THREE from "three";

// Generate random points on a sphere
function generateSpherePoints(count: number, radius: number) {
  const points = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);
    points[i * 3] = x;
    points[i * 3 + 1] = y;
    points[i * 3 + 2] = z;
  }
  return points;
}

const ParticleSphere = ({
  color,
  count = 2000,
  radius = 1.5,
}: {
  color: string;
  count?: number;
  radius?: number;
}) => {
  const points = useMemo(
    () => generateSpherePoints(count, radius),
    [count, radius],
  );
  const ref = useRef<THREE.Points>(null!);

  useFrame((state: any, delta: any) => {
    ref.current.rotation.x -= delta / 10;
    ref.current.rotation.y -= delta / 15;
  });

  return (
    <group rotation={[0, 0, Math.PI / 4]}>
      <Points ref={ref} positions={points} stride={3} frustumCulled={false}>
        <PointMaterial
          transparent
          color={color}
          size={0.005}
          sizeAttenuation={true}
          depthWrite={false}
          opacity={0.8}
        />
      </Points>
    </group>
  );
};

const Core = ({ color, active }: { color: string; active: boolean }) => {
  const meshRef = useRef<THREE.Mesh>(null!);

  useFrame((state: any, delta: any) => {
    meshRef.current.rotation.x += delta * (active ? 0.5 : 0.2);
    meshRef.current.rotation.y += delta * (active ? 0.5 : 0.2);
  });

  return (
    <Float
      speed={active ? 2 : 1}
      rotationIntensity={active ? 2 : 1}
      floatIntensity={active ? 2 : 1}
    >
      <mesh ref={meshRef} scale={active ? 1.2 : 1}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={active ? 2 : 0.5}
          wireframe
          transparent
          opacity={0.3}
        />
      </mesh>
      <mesh ref={meshRef} scale={active ? 0.6 : 0.5}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.8}
          wireframe
          transparent
          opacity={0.5}
        />
      </mesh>
    </Float>
  );
};

interface LucaCanvasProps {
  step: "BOOT" | "IDENTITY" | "BRIDGE" | "CALIBRATION" | "COMPLETE";
}

const LucaCanvas: React.FC<LucaCanvasProps> = ({ step }) => {
  // Hook into our unified theme engine
  const themeId = settingsService.get("general")?.theme || "PROFESSIONAL";
  const themeConfig = PERSONA_UI_CONFIG[themeId] || PERSONA_UI_CONFIG.PROFESSIONAL;
  const isLight = themeConfig.isLight;
  const themeColors = getThemeColors(themeId);
  const coreColor = themeColors.hex || (isLight ? THEME_PALETTE.LIGHTCREAM.primary : THEME_PALETTE.MASTER_SYSTEM.primary);
  
  let color = coreColor;
  let active = false;

  switch (step) {
    case "BOOT":
      color = isLight ? THEME_PALETTE.LIGHTCREAM.primary : (themeColors.dark || THEME_PALETTE.AGENTIC_SLATE.primary); 
      break;
    case "IDENTITY":
      color = coreColor;
      break;
    case "BRIDGE":
      color = themeColors.secondary || THEME_PALETTE.DICTATION.primary; 
      break;
    case "CALIBRATION":
      color = THEME_PALETTE.BUILDER.primary; 
      active = true;
      break;
    case "COMPLETE":
      color = THEME_PALETTE.TERMINAL.primary; 
      active = true;
      break;
  }

  return (
    <div className="absolute inset-0 z-0">
      <Canvas camera={{ position: [0, 0, 5] }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} color={color} />

        <ParticleSphere color={color} radius={2} count={3000} />
        <ParticleSphere color={color} radius={3.5} count={1000} />

        <Core color={color} active={active} />

        {/* Background Fog for Depth — Dynamic Contrast for Boot Phase */}
        <fog attach="fog" args={[isLight ? THEME_PALETTE.LIGHTCREAM.dim : THEME_PALETTE.AGENTIC_SLATE.dark, 3, 10]} />
      </Canvas>
    </div>
  );
};

export default LucaCanvas;
