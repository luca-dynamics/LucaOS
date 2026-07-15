import * as THREE from "three";
import type { PresenceMarkState } from "../../presence/presenceMark";
import {
  LUCA_CADENCE,
  LUCA_SMOOTHING,
  approach,
  attentionPulse,
} from "../../styles/lucaPresenceMotion";
import { hexToRgb, rgbToUnit } from "./presenceColor";
import {
  DEFAULT_LUCA_OPTICAL_MATERIAL,
  normalizeLucaOpticalMaterialSettings,
  type LucaChromaticMetalTuning,
} from "../../styles/lucaOpticalMaterialSettings";

/**
 * Luca's face material: the same plasma light as the presence orb, laid over
 * the face mesh. Fresnel carries the silhouette; internal currents carry the
 * life; amber carries attention. Deliberately free of scanlines, glitch, and
 * grids — the face is an entity of light, not a sci-fi projection.
 *
 * Framework-free so the tuning lab and the R3F HologramScene share it.
 */

export interface LucaFacePlasmaInput {
  state: PresenceMarkState;
  amplitude?: number;
  identityColor?: string;
  attentionColor?: string;
  /** Manual mouth openness 0..1 for tuning; null/undefined = voice-driven. */
  mouthOpen?: number | null;
}

export interface LucaFacePlasma {
  material: THREE.ShaderMaterial;
  setInput(input: LucaFacePlasmaInput): void;
  /**
   * Where the mouth sits in the mesh's local space, and its influence
   * radius. The static avatar has no rig, so the jaw is a shader
   * displacement anchored here.
   */
  setMouthAnchor(center: [number, number, number], radius: number): void;
  setMaterialTuning(tuning: Partial<LucaChromaticMetalTuning>): void;
  /** Advance smoothing and uniforms. Call once per frame. */
  tick(nowMs: number, dtMs: number): void;
  dispose(): void;
}

interface FaceParams {
  flow: number;
  glow: number;
  bright: number;
  attention: number;
  breathAmp: number;
  energy: number;
  mouth: number;
}

const FACE_STATE_TARGETS: Record<
  PresenceMarkState,
  Omit<FaceParams, "energy" | "mouth">
> = {
  idle: { flow: 0.35, glow: 0.4, bright: 0.75, attention: 0, breathAmp: 1 },
  listening: { flow: 0.7, glow: 0.65, bright: 1, attention: 0, breathAmp: 0.3 },
  speaking: { flow: 0.6, glow: 0.6, bright: 0.95, attention: 0, breathAmp: 0.3 },
  thinking: { flow: 1.1, glow: 0.5, bright: 0.85, attention: 0, breathAmp: 0.6 },
  acting: { flow: 1.8, glow: 0.7, bright: 1, attention: 0, breathAmp: 0.3 },
  "needs-you": { flow: 0.5, glow: 0.55, bright: 1, attention: 1, breathAmp: 0.3 },
};

const FALLBACK_IDENTITY = "#8a8f98";
const FALLBACK_ATTENTION = "#d9a441";

const VERTEX = `
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vPosition;

uniform vec3 mouthCenter;
uniform float mouthRadius;
uniform float mouth;
uniform vec4 metalSurface;
uniform vec4 metalMotion;
uniform vec3 metalGeometry;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vPosition = position;

  vec3 pos = position;
  if (mouth > 0.001 && mouthRadius > 0.0) {
    float d = distance(position, mouthCenter);
    float infl = 1.0 - smoothstep(0.0, mouthRadius * 2.2, d);
    float below = clamp((mouthCenter.y - position.y) / (mouthRadius * 1.2) + 0.35, 0.0, 1.0);
    float jaw = infl * below;
    pos.y -= mouth * mouthRadius * 0.9 * jaw;
    pos.z += mouth * mouthRadius * 0.15 * infl;
  }

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
`;

const FRAGMENT = `
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vPosition;

uniform float time;
uniform vec3 color;
uniform vec3 attentionColor;
uniform float attention;
uniform float pulse;
uniform float energy;
uniform float flow;
uniform float glow;
uniform float bright;
uniform float breath;
uniform vec3 mouthCenter;
uniform float mouthRadius;
uniform float mouth;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.55;
  for (int i = 0; i < 3; i++) {
    v += amp * vnoise(p);
    p = p * 2.03 + 17.31;
    amp *= 0.5;
  }
  return v;
}

void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(vViewPosition);
  float fresnel = pow(1.0 - abs(dot(v, n)), 2.0);

  vec3 base = mix(color, attentionColor, attention);
  vec3 lightC = mix(base, vec3(1.0), 0.6);

  float t = time;
  float c1 = fbm(vPosition.xy * 2.0 + vec2(t * 0.06, -t * 0.08) * flow);
  float c2 = fbm(vPosition.yz * 2.4 + vec2(-t * 0.05, t * 0.07) * flow + c1 * 0.9);
  float currents = smoothstep(0.25, 0.9, c1 * c2 * 1.8);

  float facing = 1.0 - fresnel;

  // Skin of light: a finer detail layer over the broad currents
  float detail = fbm(vPosition.xy * 6.0 + vec2(t * 0.03, -t * 0.025) * flow);
  float topLight = clamp(n.y * 0.5 + 0.5, 0.0, 1.0);

  vec3 col = base * (0.3 + 0.7 * currents) * facing * (0.45 + glow + energy * 0.5);
  col += base * max(detail - 0.35, 0.0) * facing * 0.5 * glow;
  col += lightC * fresnel * (1.1 + 1.6 * energy + 1.2 * pulse);
  col += lightC * currents * fresnel * 0.6;
  col += lightC * topLight * facing * 0.16 * bright;

  // Chromatic metal is integrated into the face mesh. It is never a plate
  // or circle placed over Luca: the mesh position and normals own the bands.
  float metalAngle = radians(metalGeometry.z);
  vec2 metalP = mat2(cos(metalAngle), -sin(metalAngle), sin(metalAngle), cos(metalAngle)) * vPosition.xy;
  metalP.x *= metalGeometry.y;
  float metalCoordinate = metalP.x * metalSurface.x
    + sin(metalP.y * 2.1 + t * metalMotion.w * 6.28318) * metalGeometry.x
    + metalMotion.x + sin(t * metalMotion.w * 6.28318 + metalMotion.y * 6.28318) * 0.12;
  float split = metalSurface.z * 0.08;
  vec3 chrome = vec3(
    0.5 + 0.5 * sin((metalCoordinate + split) * 6.28318),
    0.5 + 0.5 * sin(metalCoordinate * 6.28318),
    0.5 + 0.5 * sin((metalCoordinate - split) * 6.28318)
  );
  chrome = mix(chrome, smoothstep(vec3(0.34), vec3(0.66), chrome), 1.0 - metalSurface.y);
  chrome *= mix(0.62, 1.18, facing * metalMotion.z);
  col = mix(col, chrome * mix(base, vec3(1.0), 0.72), 0.34 + fresnel * 0.28);

  float mouthMask = 0.0;
  if (mouthRadius > 0.0) {
    float mouthD = distance(vPosition, mouthCenter);
    mouthMask = 1.0 - smoothstep(mouthRadius * 0.4, mouthRadius * 1.4, mouthD);
    col += lightC * mouthMask * mouth * 1.1;
  }

  col *= bright * (0.92 + 0.08 * breath);

  float alpha = clamp(
    fresnel * (0.85 + 0.6 * pulse)
      + facing * (0.14 + 0.30 * currents + 0.18 * max(detail - 0.3, 0.0)) * glow
      + energy * 0.15
      + mouthMask * mouth * 0.25,
    0.0,
    1.0
  );
  gl_FragColor = vec4(col, alpha);
}
`;

export function createLucaFacePlasmaMaterial(): LucaFacePlasma {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      color: { value: new THREE.Color(FALLBACK_IDENTITY) },
      attentionColor: { value: new THREE.Color(FALLBACK_ATTENTION) },
      attention: { value: 0 },
      pulse: { value: 0 },
      energy: { value: 0 },
      flow: { value: FACE_STATE_TARGETS.idle.flow },
      glow: { value: FACE_STATE_TARGETS.idle.glow },
      bright: { value: FACE_STATE_TARGETS.idle.bright },
      breath: { value: 0 },
      mouthCenter: { value: new THREE.Vector3(0, 0, 0) },
      mouthRadius: { value: 0 },
      mouth: { value: 0 },
      metalSurface: { value: new THREE.Vector4(4.5, 0.18, 0.34, 1) },
      metalMotion: { value: new THREE.Vector4(0, 0.18, 0.74, 0.24) },
      metalGeometry: { value: new THREE.Vector3(1, 1.18, -18) },
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    side: THREE.FrontSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const input: Required<LucaFacePlasmaInput> = {
    state: "idle",
    amplitude: 0,
    identityColor: FALLBACK_IDENTITY,
    attentionColor: FALLBACK_ATTENTION,
    mouthOpen: null,
  };
  const params: FaceParams = { ...FACE_STATE_TARGETS.idle, energy: 0, mouth: 0 };
  let startMs: number | null = null;
  let metalTuning = DEFAULT_LUCA_OPTICAL_MATERIAL.metal;

  return {
    material,
    setInput(next: LucaFacePlasmaInput) {
      input.state = next.state;
      input.amplitude = next.amplitude ?? 0;
      if (next.identityColor) input.identityColor = next.identityColor;
      if (next.attentionColor) input.attentionColor = next.attentionColor;
      input.mouthOpen = next.mouthOpen ?? null;
    },
    setMouthAnchor(center: [number, number, number], radius: number) {
      (material.uniforms.mouthCenter.value as THREE.Vector3).set(
        center[0],
        center[1],
        center[2],
      );
      material.uniforms.mouthRadius.value = radius;
    },
    setMaterialTuning(nextTuning) {
      metalTuning = normalizeLucaOpticalMaterialSettings({
        metal: { ...metalTuning, ...nextTuning },
      }).metal;
    },
    tick(nowMs: number, dtMs: number) {
      if (startMs === null) startMs = nowMs;
      const dt = Math.min(dtMs, 64);
      const target = FACE_STATE_TARGETS[input.state];
      params.flow = approach(params.flow, target.flow, dt, LUCA_SMOOTHING.state);
      params.glow = approach(params.glow, target.glow, dt, LUCA_SMOOTHING.state);
      params.bright = approach(params.bright, target.bright, dt, LUCA_SMOOTHING.state);
      params.attention = approach(params.attention, target.attention, dt, LUCA_SMOOTHING.state);
      params.breathAmp = approach(params.breathAmp, target.breathAmp, dt, LUCA_SMOOTHING.state);

      const wantsEnergy = input.state === "listening" || input.state === "speaking";
      const energyTarget = wantsEnergy ? Math.max(0, Math.min(1, input.amplitude)) : 0;
      params.energy = approach(
        params.energy,
        energyTarget,
        dt,
        energyTarget > params.energy
          ? LUCA_SMOOTHING.amplitudeRise
          : LUCA_SMOOTHING.amplitudeFall,
      );

      // The mouth moves only when Luca speaks (or when tuned by hand)
      const mouthTarget =
        input.mouthOpen != null && input.mouthOpen > 0
          ? Math.min(1, input.mouthOpen)
          : input.state === "speaking"
            ? Math.max(0, Math.min(1, input.amplitude))
            : 0;
      params.mouth = approach(
        params.mouth,
        mouthTarget,
        dt,
        mouthTarget > params.mouth
          ? LUCA_SMOOTHING.amplitudeRise
          : LUCA_SMOOTHING.amplitudeFall,
      );

      const identity = rgbToUnit(hexToRgb(input.identityColor) ?? hexToRgb(FALLBACK_IDENTITY)!);
      const attention = rgbToUnit(hexToRgb(input.attentionColor) ?? hexToRgb(FALLBACK_ATTENTION)!);

      const u = material.uniforms;
      u.time.value = (nowMs - startMs) / 1000;
      (u.color.value as THREE.Color).setRGB(identity[0], identity[1], identity[2]);
      (u.attentionColor.value as THREE.Color).setRGB(attention[0], attention[1], attention[2]);
      u.attention.value = params.attention;
      u.pulse.value = params.attention > 0.01 ? attentionPulse(nowMs) * params.attention : 0;
      u.energy.value = params.energy;
      u.flow.value = params.flow;
      u.glow.value = params.glow;
      u.bright.value = params.bright;
      u.breath.value =
        params.breathAmp * Math.sin((nowMs / LUCA_CADENCE.breath) * Math.PI * 2);
      u.mouth.value = params.mouth;
      (u.metalSurface.value as THREE.Vector4).set(
        metalTuning.repeats * metalTuning.scale,
        metalTuning.roughness,
        metalTuning.rgbSplit,
        metalTuning.scale,
      );
      (u.metalMotion.value as THREE.Vector4).set(
        metalTuning.offset,
        metalTuning.phase,
        metalTuning.depth,
        metalTuning.evolution,
      );
      (u.metalGeometry.value as THREE.Vector3).set(
        metalTuning.scale,
        metalTuning.stretch,
        metalTuning.angle,
      );
    },
    dispose() {
      material.dispose();
    },
  };
}
