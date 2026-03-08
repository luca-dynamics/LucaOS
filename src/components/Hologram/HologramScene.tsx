/* eslint-disable react/no-unknown-property */
import React, { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Center } from "@react-three/drei";
import * as THREE from "three";
import "./HolographicMaterial";
import { eventBus } from "../../services/eventBus";

declare module "@react-three/fiber" {
  interface ThreeElements {
    holographicMaterial: any;
  }
}

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

  // Cache THREE colors to avoid GC pressure in useFrame
  const colorObj = useMemo(() => new THREE.Color(), []);
  const rimColorObj = useMemo(() => new THREE.Color(), []);

  const internalAudioLevel = useRef(0);

  React.useEffect(() => {
    const handleAmplitude = (data: any) => {
      internalAudioLevel.current = data.amplitude;
    };
    eventBus.on("audio-amplitude", handleAmplitude);
    return () => {
      eventBus.off("audio-amplitude", handleAmplitude);
    };
  }, []);

  useFrame((state, delta) => {
    // Combine props with internal event-driven level for maximum responsiveness
    const targetLevel = Math.max(audioLevel, internalAudioLevel.current);
    smoothedLevel.current += (targetLevel - smoothedLevel.current) * 0.15;
    const level = smoothedLevel.current;

    if (materialRef.current) {
      materialRef.current.time += delta;
      const baseGlitch = Math.random() > 0.98 ? Math.random() * 0.3 : 0;
      const audioGlitch = (level / 255) * 0.5;
      materialRef.current.glitch = baseGlitch + audioGlitch;

      const intensity = 1.0 + (level / 255) * 3.0;
      const sanitizedColor = sanitizeColor(color);

      materialRef.current.uniforms.color.value.set(sanitizedColor);

      // Fixed: Removed .offsetHSL(0.1, 0, 0.2) which caused "random/drifted" colors.
      // Now strictly uses a brighter version of the theme color for the rim.
      const rim = rimColorObj
        .set(sanitizedColor)
        .multiplyScalar(intensity * 1.5);
      materialRef.current.uniforms.rimColor.value.copy(rim);

      materialRef.current.uniforms.isVisionActive.value = isVisionActive
        ? 1.0
        : 0.0;
    }

    if (groupRef.current) {
      const floatY = Math.sin(state.clock.elapsedTime * 0.5) * 0.1 - 0.2;
      const scalePulse = 1.2 + (level / 255) * 0.1;
      groupRef.current.position.y = floatY;
      groupRef.current.scale.setScalar(scalePulse);
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
                uniform float isVisionActive;
                
                void main() {
                  vec3 normal = normalize(vNormal);
                  vec3 simpleView = vec3(0.0, 0.0, 1.0);
                  float fresnel = pow(1.0 - abs(dot(simpleView, normal)), 2.0);

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

                  float alpha = fresnel + 0.1 + (scanbeam * 0.3) + (visionBeam * 0.5);
                  
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
