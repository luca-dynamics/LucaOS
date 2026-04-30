/* eslint-disable react/no-unknown-property */
import React, { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Center } from "@react-three/drei";
import * as THREE from "three";
import "./HolographicMaterial";
import { eventBus } from "../../services/eventBus";

// Three.js elements are now declared in src/types/jsx.d.ts

const sanitizeColor = (color: string) => {
  if (color.startsWith("#") && color.length === 9) {
    return color.substring(0, 7);
  }
  return color;
};

const SceneWithMaterial = ({
  color,
  audioLevel,
  onClick,
  onDragStart,
  isVisionActive,
}: {
  color: string;
  audioLevel: number;
  onClick?: () => void;
  onDragStart?: (e: any) => void;
  isVisionActive?: boolean;
}) => {
  const { scene } = useGLTF("/models/avatar.glb");
  const materialRef = useRef<any>(null);
  const groupRef = useRef<THREE.Group>(null);
  const smoothedLevel = useRef(0);
  const wakePulse = useRef(0);
  const genesisPulse = useRef(0);

  // Cache THREE colors to avoid GC pressure in useFrame
  const rimColorObj = useMemo(() => new THREE.Color(), []);

  const internalAudioLevel = useRef(0);

  React.useEffect(() => {
    const handleAmplitude = (data: any) => {
      internalAudioLevel.current = data.amplitude;
    };
    const handleWakeWord = () => {
      wakePulse.current = 1.5; // Trigger a strong visual pulse
    };
    const handleGenesis = () => {
      console.log("[HOLOGRAM] Genesis Expansion Initialized...");
      genesisPulse.current = 3.0; // Massive cinematic expansion
    };

    eventBus.on("audio-amplitude", handleAmplitude);
    eventBus.on("wake-word-triggered", handleWakeWord);
    eventBus.on("genesis-start", handleGenesis);

    return () => {
      eventBus.off("audio-amplitude", handleAmplitude);
      eventBus.off("wake-word-triggered", handleWakeWord);
      eventBus.off("genesis-start", handleGenesis);
    };
  }, []);

  useFrame((state: any, delta: number) => {
    // Combine props with internal event-driven level for maximum responsiveness
    const targetLevel = Math.max(audioLevel, internalAudioLevel.current);
    // Even faster smoothing for cinematic snappy reactivity
    smoothedLevel.current += (targetLevel - smoothedLevel.current) * 0.22;
    const level = smoothedLevel.current;

    if (wakePulse.current > 0) {
      wakePulse.current *= 0.94; // Decay for smooth fade
      if (wakePulse.current < 0.01) wakePulse.current = 0;
    }

    if (genesisPulse.current > 0) {
      genesisPulse.current *= 0.97; // Slower decay for dramatic effect
      if (genesisPulse.current < 0.01) genesisPulse.current = 0;
    }

    if (materialRef.current) {
      materialRef.current.time += delta;
      
      // Dramatic glitch on audio spikes + massive glitch on genesis
      const baseGlitch = Math.random() > 0.99 ? Math.random() * 0.4 : 0;
      const audioGlitch = (level / 255) * 0.8;
      const genesisGlitch = (genesisPulse.current * 0.5);
      
      materialRef.current.glitch = baseGlitch + audioGlitch + (wakePulse.current * 0.6) + genesisGlitch;

      // RIM BOOST: High intensity rim light that pulses with voice
      const audioIntensity = (level / 255) * 1.5;
      const intensity = 1.0 + audioIntensity + (wakePulse.current * 1.5) + (genesisPulse.current * 2.0);
      const sanitizedColor = sanitizeColor(color);

      materialRef.current.uniforms.color.value.set(sanitizedColor);

      // Multi-layered rim coloring for depth
      const rim = rimColorObj
        .set(sanitizedColor)
        .multiplyScalar(intensity * 1.2);
      materialRef.current.uniforms.rimColor.value.copy(rim);

      materialRef.current.uniforms.isVisionActive.value = isVisionActive
        ? 1.0
        : 0.0;
    }

    if (groupRef.current) {
      // Elegant idle float
      const floatY = Math.sin(state.clock.elapsedTime * 0.6) * 0.08 - 0.22;
      
      // SIZABLE PULSE: Entity grows slightly when speaking, EXPANDS on genesis
      const scalePulse = 1.15 + (level / 255) * 0.15 + (wakePulse.current * 0.25) + (genesisPulse.current * 0.8);
      
      groupRef.current.position.y = floatY;
      groupRef.current.scale.setScalar(scalePulse);
      
      // Subtle rotation shift based on audio energy + Genesis spin
      const genesisSpin = genesisPulse.current * 0.2;
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.1 + (level / 255) * 0.05 + genesisSpin;
    }
  });

  useMemo(() => {
    const sanitizedInitialColor = sanitizeColor(color);
    const material = new (THREE.ShaderMaterial as any)({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(sanitizedInitialColor) },
        rimColor: {
          value: new THREE.Color(sanitizedInitialColor).multiplyScalar(1.5),
        },
        glitch: { value: 0 },
        isVisionActive: { value: 0 },
      },
      vertexShader: `
                varying vec3 vNormal;
                varying vec3 vPosition;
                varying vec3 vViewPosition;
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
                    // Progenitor Distort: More chaotic during high glitch (Genesis)
                    if (noise > 0.8) {
                      pos.x += sin(time * 100.0) * 0.15 * glitch;
                      pos.y += cos(time * 100.0) * 0.15 * glitch;
                    }
                  }
                  
                  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                  vViewPosition = -mvPosition.xyz;
                  gl_Position = projectionMatrix * mvPosition;
                }
            `,
      fragmentShader: `
                varying vec3 vNormal;
                varying vec3 vPosition;
                varying vec3 vViewPosition;
                varying vec2 vUv;
                uniform float time;
                uniform vec3 color;
                uniform vec3 rimColor;
                uniform float isVisionActive;
                
                void main() {
                  vec3 normal = normalize(vNormal);
                  vec3 viewDirection = normalize(vViewPosition);
                  float fresnel = pow(1.0 - abs(dot(viewDirection, normal)), 2.0);

                  float scanline = sin(vPosition.y * 50.0 - time * 5.0) * 0.5 + 0.5;
                  float scanbeam = smoothstep(0.4, 0.6, sin(vPosition.y * 2.0 - time * 2.0));
                  
                  float visionBeam = 0.0;
                  if (isVisionActive > 0.5) {
                    visionBeam = smoothstep(0.45, 0.55, sin(vPosition.y * 10.0 - time * 8.0));
                  }

                  vec3 finalColor = color * scanline;
                  finalColor += rimColor * fresnel * 2.0; 
                  finalColor += rimColor * scanbeam * 0.5; 
                  finalColor += rimColor * visionBeam * 1.5;

                  float alpha = fresnel + (scanbeam * 0.3) + (visionBeam * 0.5);
                  
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
          object={scene}
          scale={1.0}
          position={[0, -0.4, 0]}
          onPointerDown={(e: any) =>
            onDragStart && e.nativeEvent && onDragStart(e.nativeEvent)
          }
          onClick={(e: any) => {
            e.stopPropagation();
            onClick?.();
          }}
          onPointerOver={() => (document.body.style.cursor = "pointer")}
          onPointerOut={() => (document.body.style.cursor = "auto")}
        />
      </Center>
    </group>
  );
};

const HologramScene: React.FC<{
  color?: string;
  audioLevel?: number;
  onClick?: () => void;
  onDragStart?: (e: any) => void;
  isVisionActive?: boolean;
}> = ({
  color = "#00ffff",
  audioLevel = 0,
  onClick,
  onDragStart,
  isVisionActive = false,
}) => {
  return (
    <div className="w-full h-full bg-transparent">
      <Canvas
        camera={{ position: [0, 0, 4], fov: 45 }}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <React.Suspense fallback={null}>
          <SceneWithMaterial
            color={color}
            audioLevel={audioLevel}
            isVisionActive={isVisionActive}
            onClick={onClick}
            onDragStart={onDragStart}
          />
        </React.Suspense>
      </Canvas>
    </div>
  );
};

useGLTF.preload("/models/avatar.glb");

export default HologramScene;
