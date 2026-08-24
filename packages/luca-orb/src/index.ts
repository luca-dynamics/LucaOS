export { LucaOrb, type LucaOrbProps } from "./LucaOrb";
export { LucaOrbPreview } from "./components/LucaOrbPreview";
export { LucaOrbInspector } from "./components/LucaOrbInspector";
export { OrbRenderer, type OrbRendererProps } from "./renderer/OrbRenderer";
export { CompositeRenderer, type CompositeRendererProps } from "./renderer/CompositeRenderer";
export * from "./types/OrbState";
export { useOrbAnimation } from "./hooks/useOrbAnimation";
export { LIQUID_SKSL } from "./shaders/liquid";

// Living Orb Embodiment System (Sprint A & C)
export { LivingOrb } from "./living-orb/LivingOrb";
export { OrbController } from "./living-orb/OrbController";
export { OrbLab } from "./living-orb/OrbLab";
export { OrbMaterialLabV2, type OrbMaterialLabV2Props, type OrbMaterialLabTier, type OrbMaterialLabView } from "./living-orb/OrbMaterialLabV2";
export { OrbShowcase } from "./living-orb/OrbShowcase";
export { OrbDirector as LivingOrbDirector } from "./living-orb/OrbDirector";
export { OrbRenderer as LivingOrbRenderer } from "./living-orb/OrbRenderer";
export { EmbodimentAdapter, type EmbodimentRenderer, type EmbodimentAdapterProps } from "./living-orb/EmbodimentAdapter";
export { EmbodimentSession, type EmbodimentSessionConfig } from "./living-orb/EmbodimentSession";
export type { OrbProfile, LivingOrbProps, OrbLayerVisibility } from "./living-orb/types";
export type { Embodiment, EmbodimentKind, EmbodimentProps } from "./living-orb/Embodiment";

// Modular Engine Render Graph Passes & Systems
export { MaterialEngine, ORB_MATERIALS, type OrbMaterial } from "./engine/MaterialEngine";
export { NoiseEngine } from "./engine/NoiseEngine";
export { LightingEngine } from "./engine/LightingEngine";
export { RefractionEngine } from "./engine/RefractionEngine";
export { BloomEngine } from "./engine/BloomEngine";
export { ParticleEngine, type SparkleParticle } from "./engine/ParticleEngine";
export { RippleEngine } from "./engine/RippleEngine";
export { AudioEngine } from "./engine/AudioEngine";
export { AnimationGraph } from "./engine/AnimationGraph";
export { SceneGraph, type SceneNode } from "./engine/SceneGraph";
export { RenderGraph } from "./engine/RenderGraph";
export { type RenderPass, type RenderContext } from "./engine/RenderPass";
export { type OrbUniforms, createDefaultOrbUniforms } from "./engine/OrbUniforms";
export { MOTION_PROFILES, type MotionProfile } from "./engine/MotionProfile";
export { AdaptiveQualityEngine, QUALITY_PRESETS, type QualityPreset, type QualityTier } from "./engine/AdaptiveQuality";
export { ORB_PERSONALITIES, type OrbPersonality } from "./engine/OrbPersonality";
export { type OrbAccessibility, type AccessibilityProfile, createAccessibilityProfile } from "./engine/OrbAccessibility";
export { type OrbTheme, validateOrbTheme } from "./engine/OrbTheme";

