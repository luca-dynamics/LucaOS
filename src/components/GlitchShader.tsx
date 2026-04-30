/* eslint-disable react/no-unknown-property */
import React, { useRef, useMemo } from 'react';
import { useFrame, extend } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';

// Glitch shader material
const GlitchMaterial = shaderMaterial(
  {
    time: 0,
    intensity: 0.5,
  },
  // vertex shader
  `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
  `,
  // fragment shader
  `
  uniform float time;
  uniform float intensity;
  varying vec2 vUv;

  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
  }

  void main() {
    vec2 uv = vUv;
    
    // Chromatic aberration
    float offset = sin(time * 10.0) * intensity * 0.01;
    
    // Simple color shifts
    float r = random(uv + time * 0.1) * 0.1 * intensity;
    float g = random(uv + time * 0.2) * 0.1 * intensity;
    float b = random(uv + time * 0.3) * 0.1 * intensity;
    
    // Glitch effect
    float glitch = step(0.98, sin(time * 20.0 + uv.y * 10.0)) * intensity;
    
    vec3 color = vec3(r, g, b);
    color += glitch * vec3(1.0, 0.0, 0.0);
    
    gl_FragColor = vec4(color, 1.0);
  }
  `
);

extend({ GlitchMaterial });

interface GlitchEffectProps {
  children: React.ReactNode;
  intensity?: number;
  active?: boolean;
}

const GlitchEffect: React.FC<GlitchEffectProps> = ({ 
  children, 
  intensity = 0.5,
  active = false 
}) => {
  const materialRef = useRef<any>(null);
  
  // Memoize the material to prevent memory leaks in the render loop
  const material = useMemo(() => new GlitchMaterial(), []);

  useFrame((state: any) => {
    if (materialRef.current && active) {
      materialRef.current.time = state.clock.elapsedTime;
      materialRef.current.intensity = intensity;
    }
  });

  if (!active) return <>{children}</>;

  return (
    <group>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          const element = child as React.ReactElement<any>;
          return React.cloneElement(element, {
            children: (
              <>
                {element.props.children}
                <mesh scale={[1.1, 1.1, 1.1]}>
                  <planeGeometry args={[2, 2]} />
                  <primitive 
                    object={material} 
                    ref={materialRef} 
                    attach="material"
                    transparent 
                    opacity={0.2} 
                    depthWrite={false} 
                  />
                </mesh>
              </>
            )
          });
        }
        return child;
      })}
    </group>
  );
};

export default GlitchEffect;
