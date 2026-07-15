/* eslint-disable react/no-unknown-property */
import React, { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Center, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { eventBus } from "../../services/eventBus";
import { createLucaFacePlasmaMaterial } from "../presence/lucaFacePlasmaMaterial";
import settingsService, { type LucaSettings } from "../../services/settingsService";

const sanitizeColor = (color: string) =>
  color.startsWith("#") && color.length === 9 ? color.substring(0, 7) : color;

interface SceneProps {
  color: string;
  audioLevel: number;
  onClick?: () => void;
  onDragStart?: (event: unknown) => void;
  isVisionActive?: boolean;
}

interface HologramFrameState {
  clock: { elapsedTime: number };
}

const SceneWithMaterial: React.FC<SceneProps> = ({
  color,
  audioLevel,
  onClick,
  onDragStart,
  isVisionActive = false,
}) => {
  const gltf = useGLTF("/models/avatar.glb");
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const face = useMemo(() => createLucaFacePlasmaMaterial(), []);
  const groupRef = useRef<THREE.Group>(null);
  const eventAmplitude = useRef(0);
  const wakePulse = useRef(0);
  const genesisPulse = useRef(0);
  const smoothedLevel = useRef(0);

  useEffect(() => {
    scene.traverse((child: THREE.Object3D) => {
      if ((child as THREE.Mesh).isMesh) (child as THREE.Mesh).material = face.material;
    });
    return () => face.dispose();
  }, [face, scene]);

  useEffect(() => {
    const applyOptics = (settings: LucaSettings) => {
      if (settings.general.opticalMaterial?.metal) {
        face.setMaterialTuning(settings.general.opticalMaterial.metal);
      }
    };
    applyOptics(settingsService.getSettings());
    settingsService.on("settings-changed", applyOptics);
    return () => { settingsService.off("settings-changed", applyOptics); };
  }, [face]);

  useEffect(() => {
    const onAmplitude = (data: { amplitude?: number }) => {
      eventAmplitude.current = data.amplitude ?? 0;
    };
    const onWake = () => { wakePulse.current = 1; };
    const onGenesis = () => { genesisPulse.current = 1; };
    eventBus.on("audio-amplitude", onAmplitude);
    eventBus.on("wake-word-triggered", onWake);
    eventBus.on("genesis-start", onGenesis);
    return () => {
      eventBus.off("audio-amplitude", onAmplitude);
      eventBus.off("wake-word-triggered", onWake);
      eventBus.off("genesis-start", onGenesis);
    };
  }, []);

  useFrame((state: HologramFrameState, delta: number) => {
    const rawLevel = Math.max(audioLevel, eventAmplitude.current);
    const normalized = rawLevel > 1 ? rawLevel / 255 : rawLevel;
    smoothedLevel.current += (normalized - smoothedLevel.current) * 0.22;
    wakePulse.current *= 0.94;
    genesisPulse.current *= 0.97;

    const energy = Math.min(1, smoothedLevel.current + wakePulse.current * 0.35);
    face.setInput({
      state: isVisionActive ? "acting" : energy > 0.035 ? "speaking" : "idle",
      amplitude: energy,
      identityColor: sanitizeColor(color),
    });
    face.tick(state.clock.elapsedTime * 1000, delta * 1000);

    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.6) * 0.08 - 0.22;
      groupRef.current.scale.setScalar(1.15 + energy * 0.15 + genesisPulse.current * 0.5);
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.1 + genesisPulse.current * 0.15;
    }
  });

  return (
    <group ref={groupRef}>
      <Center>
        <primitive
          object={scene}
          scale={1}
          position={[0, -0.4, 0]}
          onPointerDown={(event: { nativeEvent?: unknown }) =>
            event.nativeEvent && onDragStart?.(event.nativeEvent)
          }
          onClick={(event: { stopPropagation: () => void }) => {
            event.stopPropagation();
            onClick?.();
          }}
          onPointerOver={() => { document.body.style.cursor = "pointer"; }}
          onPointerOut={() => { document.body.style.cursor = "auto"; }}
        />
      </Center>
    </group>
  );
};

const HologramScene: React.FC<{
  color?: string;
  audioLevel?: number;
  onClick?: () => void;
  onDragStart?: (event: unknown) => void;
  isVisionActive?: boolean;
}> = ({ color = "#8a8f98", audioLevel = 0, onClick, onDragStart, isVisionActive }) => (
  <div className="relative h-full w-full bg-transparent">
    <Canvas camera={{ position: [0, 0, 4], fov: 45 }} gl={{ alpha: true, antialias: true }}>
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

useGLTF.preload("/models/avatar.glb");

export default HologramScene;
