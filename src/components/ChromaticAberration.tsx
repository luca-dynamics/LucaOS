import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ChromaticAberrationProps {
  children: React.ReactNode;
  intensity?: number;
}

const ChromaticAberration: React.FC<ChromaticAberrationProps> = ({ 
  children, 
  intensity = 0.005 
}) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state: any) => {
    if (!groupRef.current) return;
    
    // Subtle chromatic aberration effect
    const time = state.clock.elapsedTime;
    const offset = Math.sin(time * 2) * intensity;
    
    // Apply slight color separation
    groupRef.current.children.forEach((child, index) => {
      if (child instanceof THREE.Mesh) {
        const material = child.material as THREE.MeshStandardMaterial;
        if (material) {
          // Shift positions slightly for chromatic effect
          const colorShift = offset * (index % 3 - 1);
          child.position.x = colorShift * 0.1;
          child.position.y = colorShift * 0.05;
        }
      }
    });
  });

  return (
    <group ref={groupRef}>
      {children}
    </group>
  );
};

export default ChromaticAberration;

