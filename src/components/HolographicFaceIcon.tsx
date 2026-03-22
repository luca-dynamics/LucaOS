import React, { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Center } from "@react-three/drei";
import * as THREE from "three";
import { eventBus } from "../services/eventBus";

// Compact 3D holographic face icon for header
const FaceModel = ({ color }: { color: string }) => {
  const { scene } = useGLTF("/models/avatar.glb");
  const materialRef = useRef<any>(null);
  const groupRef = useRef<THREE.Group>(null);
  const amplitudeRef = useRef(0);
  const smoothedAmplitude = useRef(0);

  useEffect(() => {
    const handleAmplitude = (data: any) => {
      // Standardized 0-255 range from eventBus
      amplitudeRef.current = data.amplitude;
    };
    eventBus.on("audio-amplitude", handleAmplitude);
    return () => {
      eventBus.off("audio-amplitude", handleAmplitude);
    };
  }, []);

  // THREE.Color doesn't always handle 8-digit hex properly, sanitize to 6-digit
  const safeColor = useMemo(() => {
    if (color.startsWith("#") && color.length > 7) {
      return color.slice(0, 7);
    }
    return color;
  }, [color]);

  useFrame((state: any, delta: any) => {
    // Smooth the amplitude for fluid animation
    smoothedAmplitude.current +=
      (amplitudeRef.current - smoothedAmplitude.current) * 0.15;
    const level = smoothedAmplitude.current;

    if (materialRef.current) {
      materialRef.current.time += delta;

      // Subtle glitch effect + audio-driven glitch
      const baseGlitch = Math.random() > 0.98 ? Math.random() * 0.2 : 0;
      const audioGlitch = (level / 255) * 0.4;
      materialRef.current.glitch = baseGlitch + audioGlitch;

      // Update color from theme
      materialRef.current.uniforms.color.value.set(safeColor);
      materialRef.current.uniforms.rimColor.value
        .set(safeColor)
        .offsetHSL(0.1, 0, 0.2);
    }

    if (groupRef.current) {
      // Gentle floating animation + audio pulsing
      const floatY = Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
      const scalePulse = 1.0 + (level / 255) * 0.15;
      groupRef.current.position.y = floatY;
      groupRef.current.scale.setScalar(scalePulse);
    }
  });

  // Create holographic shader material
  useMemo(() => {
    const material = new (THREE.ShaderMaterial as any)({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(safeColor) },
        rimColor: { value: new THREE.Color(safeColor).offsetHSL(0.1, 0, 0.2) },
        glitch: { value: 0 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec2 vUv;
        uniform float time;
        uniform float glitch;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          vUv = uv;

          vec3 pos = position;
          if (glitch > 0.0) {
            float noise = sin(time * 50.0 + position.y * 10.0);
            if (noise > 0.9) {
              pos.x += sin(time * 100.0) * 0.1 * glitch;
            }
          }
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec2 vUv;
        uniform float time;
        uniform vec3 color;
        uniform vec3 rimColor;
        
        void main() {
          vec3 normal = normalize(vNormal);
          vec3 simpleView = vec3(0.0, 0.0, 1.0);
          float fresnel = pow(1.0 - abs(dot(simpleView, normal)), 2.0);

          float scanline = sin(vPosition.y * 50.0 - time * 5.0) * 0.5 + 0.5;
          float scanbeam = smoothstep(0.4, 0.6, sin(vPosition.y * 2.0 - time * 2.0));

          vec3 finalColor = color * scanline;
          finalColor += rimColor * fresnel * 2.0; 
          finalColor += rimColor * scanbeam * 0.5; 

          float alpha = fresnel + 0.1 + (scanbeam * 0.3);
          
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      side: THREE.FrontSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    materialRef.current = material;

    scene.traverse((child: THREE.Object3D) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).material = material;
      }
    });
  }, [scene, color]);

  return (
    <group ref={groupRef}>
      <Center>
        <primitive
          {...({ object: scene, scale: 1.5, position: [0, -0.4, 0] } as any)}
        />
      </Center>
    </group>
  );
};

// Main icon component
const HolographicFaceIcon: React.FC<{
  themeColor: string; // Hex color from active theme
}> = ({ themeColor }) => {
  return (
    <div className="w-full h-full bg-transparent">
      <Canvas
        camera={{ position: [0, 0, 3.5], fov: 50 }}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight {...({ intensity: 0.5 } as any)} />
        <pointLight {...({ position: [10, 10, 10] } as any)} />
        <React.Suspense fallback={null}>
          <FaceModel color={themeColor} />
        </React.Suspense>
      </Canvas>
    </div>
  );
};

export default HolographicFaceIcon;
