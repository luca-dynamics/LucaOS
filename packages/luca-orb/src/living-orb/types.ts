/**
 * Living Orb — types.ts
 * All visual/rendering types. No runtime or AI concepts.
 */

/** The seven visual profiles the Living Orb can express. */
export type OrbProfile =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'success'
  | 'error'
  | 'sleeping';

/** Diagnostic structure mode deliberately bypasses every material effect. */
export type OrbRenderMode = 'material' | 'structure';

/** Structure Lab studies: exact front trace, closed shell, or exposed anatomy. */
export type OrbStructureStudy = 'front' | 'turntable' | 'anatomy';

/** Which rendering layers are active. All true by default. */
export interface OrbLayerVisibility {
  /** Ripple rings + ambient bloom */
  background: boolean;
  /** Contact shadow below orb */
  shadow: boolean;
  /** Main orb glass body */
  glassBody: boolean;
  /** Volumetric inner glow */
  coreLight: boolean;
  /** Specular highlights */
  highlight: boolean;
  /** Debug overlay (false by default) */
  debug: boolean;
}

export const DEFAULT_LAYER_VISIBILITY: OrbLayerVisibility = {
  background: true,
  shadow: true,
  glassBody: true,
  coreLight: true,
  highlight: true,
  debug: false,
};

/** Animated values produced by OrbAnimator each frame. */
export interface AnimationState {
  /** Monotonic seconds since orb creation */
  time: number;
  /** Breathing scale 0.97–1.03 */
  breathingScale: number;
  /** Float offset in normalized UV units */
  floatOffset: number;
  /** Surface micro-jitter amplitude 0–0.008 */
  microJitter: number;
  /** Highlight wander phase 0–2π */
  highlightDrift: number;
  /** Profile blend progress 0–1 (used during transitions) */
  profileBlend: number;
  /** Audio energy 0–1 */
  audioEnergy: number;
  /** Audio onset transient 0–1 */
  audioOnset: number;
}

/** Props for the main LivingOrb React component. */
export interface LivingOrbProps {
  /** Visual profile — determines material, motion, and lighting character */
  profile?: OrbProfile;
  /** Orb diameter in CSS pixels (canvas size = size * devicePixelRatio) */
  size?: number;
  /** Audio energy 0–1 for audio-reactive surface */
  audioEnergy?: number;
  /** Structure mode renders frozen neutral anatomy for geometry approval. */
  renderMode?: OrbRenderMode;
  /** Structure-only camera/study controls; ignored by the material renderer. */
  structureStudy?: OrbStructureStudy;
  structureYaw?: number;
  structurePitch?: number;
  /** Layer visibility overrides */
  layers?: Partial<OrbLayerVisibility>;
  /** Pixel-matched source for refraction. Omit for the honest non-refractive fallback. */
  background?: TexImageSource;
  /** Show debug overlay */
  debug?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/** Profile index for shader uniforms */
export const PROFILE_INDEX: Record<OrbProfile, number> = {
  idle: 0,
  listening: 1,
  thinking: 2,
  speaking: 3,
  success: 4,
  error: 5,
  sleeping: 6,
};

/** All seven profiles in order */
export const ALL_PROFILES: OrbProfile[] = [
  'idle', 'listening', 'thinking', 'speaking', 'success', 'error', 'sleeping',
];
