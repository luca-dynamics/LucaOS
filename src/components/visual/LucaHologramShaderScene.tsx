/* eslint-disable react/no-unknown-property */
import React, { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import type { useThree } from "@react-three/fiber";
import { Center, useGLTF } from "@react-three/drei";
import * as THREE from "three";

interface LucaHologramAvatarProps {
  color: string;
  active: boolean;
  reducedMotion: boolean;
}

function LucaHologramAvatar({
  color,
  active,
  reducedMotion,
}: LucaHologramAvatarProps) {
  const { scene } = useGLTF("/models/avatar.glb");
  const groupRef = useRef<THREE.Group>(null);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          color: { value: new THREE.Color(color) },
          intensity: { value: active ? 1.2 : 0.85 },
        },
        vertexShader: `
          varying vec3 vNormal;
          varying vec3 vPosition;
          varying vec3 vViewPosition;
          uniform float time;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            vPosition = position;
            vec3 pos = position;
            pos.x += sin(position.y * 18.0 + time * 2.0) * 0.002;
            vec4 viewPosition = modelViewMatrix * vec4(pos, 1.0);
            vViewPosition = -viewPosition.xyz;
            gl_Position = projectionMatrix * viewPosition;
          }
        `,
        fragmentShader: `
          varying vec3 vNormal;
          varying vec3 vPosition;
          varying vec3 vViewPosition;
          uniform float time;
          uniform vec3 color;
          uniform float intensity;
          void main() {
            vec3 normal = normalize(vNormal);
            vec3 viewDirection = normalize(vViewPosition);
            float fresnel = pow(1.0 - abs(dot(viewDirection, normal)), 2.0);
            float scanline = sin(vPosition.y * 50.0 - time * 5.0) * 0.5 + 0.5;
            float scanbeam = smoothstep(0.4, 0.6, sin(vPosition.y * 2.0 - time * 2.0));
            vec3 finalColor = color * scanline;
            finalColor += color * fresnel * 2.4 * intensity;
            finalColor += color * scanbeam * 0.45;
            float alpha = fresnel + scanbeam * 0.28;
            gl_FragColor = vec4(finalColor, alpha);
          }
        `,
        transparent: true,
        side: THREE.FrontSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [active, color],
  );

  useMemo(() => {
    scene.traverse((child: THREE.Object3D) => {
      const mesh = child as THREE.Mesh;

      if (mesh.isMesh) {
        mesh.material = material;
      }
    });
  }, [material, scene]);

  useFrame(
    (state: ReturnType<typeof useThree>, delta: number) => {
      material.uniforms.time.value += reducedMotion ? 0 : delta;

      if (!groupRef.current || reducedMotion) return;

      groupRef.current.position.y =
        Math.sin(state.clock.elapsedTime * 0.6) * 0.06 - 0.22;

      const pulse = active
        ? Math.sin(state.clock.elapsedTime * 1.2) * 0.025
        : 0;

      groupRef.current.scale.setScalar(1.13 + pulse);
      groupRef.current.rotation.y =
        Math.sin(state.clock.elapsedTime * 0.3) * 0.08;
    },
  );

  return (
    <group ref={groupRef} position={[0, -0.22, 0]} scale={1.13}>
      <Center>
        <primitive object={scene} scale={1} position={[0, -0.4, 0]} />
      </Center>
    </group>
  );
}

interface LucaHologramShaderSceneProps {
  color?: string;
  active?: boolean;
  reducedMotion?: boolean;
}

export default function LucaHologramShaderScene({
  color = "#67e8f9",
  active = false,
  reducedMotion = false,
}: LucaHologramShaderSceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 4], fov: 45 }}
      gl={{ alpha: true, antialias: !reducedMotion }}
      dpr={[1, 1.5]}
    >
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <React.Suspense fallback={null}>
        <LucaHologramAvatar
          color={color}
          active={active}
          reducedMotion={reducedMotion}
        />
      </React.Suspense>
    </Canvas>
  );
}

useGLTF.preload("/models/avatar.glb");
