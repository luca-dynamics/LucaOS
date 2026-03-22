/* eslint-disable react/no-unknown-property */
import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import * as THREE from "three";

interface Props {
  intensity?: number; // 0 to 1
  color?: string; // Optional theme color
}

const DataRiver: React.FC<Props> = ({ intensity = 0.5, color: themeColor }) => {
  const pointsRef = useRef<THREE.Points>(null);

  // Generate data stream particles
  const streamParticles = useMemo(() => {
    const count = 5000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const speeds = new Float32Array(count);

    const baseColor = themeColor ? new THREE.Color(themeColor) : null;
    const color1 = baseColor || new THREE.Color(0x06b6d4); // Cyan
    const color2 = baseColor ? baseColor.clone().multiplyScalar(0.8) : new THREE.Color(0x3b82f6); // Blue
    const color3 = baseColor ? baseColor.clone().multiplyScalar(0.6) : new THREE.Color(0x8b5cf6); // Purple

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Create flowing streams
      const streamId = Math.floor(i / (count / 10)); // 10 streams
      const streamOffset = (streamId / 10) * 20 - 10; // Spread across X

      positions[i3] = streamOffset + (Math.random() - 0.5) * 2;
      positions[i3 + 1] = (Math.random() - 0.5) * 20; // Y position
      positions[i3 + 2] = (Math.random() - 0.5) * 20; // Z depth

      // Color based on stream
      const colorChoice = Math.random();
      let color: THREE.Color;
      if (colorChoice < 0.33) color = color1;
      else if (colorChoice < 0.66) color = color2;
      else color = color3;

      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      speeds[i] = 0.5 + Math.random() * 1.5; // Flow speed
    }

    return { positions, colors, speeds };
  }, []);

  useFrame((state: any, delta: any) => {
    if (!pointsRef.current) return;

    const positions = pointsRef.current.geometry.attributes.position
      .array as Float32Array;
    const speeds = streamParticles.speeds;

    // Animate particles flowing upward
    for (let i = 0; i < positions.length; i += 3) {
      const index = i / 3;
      positions[i + 1] += speeds[index] * delta * intensity;

      // Reset when particles reach top
      if (positions[i + 1] > 10) {
        positions[i + 1] = -10;
        // Randomize X position slightly for variation
        positions[i] += (Math.random() - 0.5) * 0.5;
      }
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;

    // Rotate slowly for depth effect
    pointsRef.current.rotation.y += delta * 0.05;
  });

  return (
    <group>
      {/* Main data stream particles */}
      <Points ref={pointsRef} positions={streamParticles.positions} stride={3}>
        <PointMaterial
          transparent
          vertexColors
          size={0.04 * intensity}
          sizeAttenuation={true}
          depthWrite={false}
          opacity={0.8 * intensity}
          blending={THREE.AdditiveBlending}
        />
      </Points>
    </group>
  );
};

export default DataRiver;
