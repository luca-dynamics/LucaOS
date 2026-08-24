/**
 * Living Orb Embodiment System — Public API
 */
export { LivingOrb }       from './LivingOrb';
export { OrbController }   from './OrbController';
export { OrbLab }          from './OrbLab';
export { OrbMaterialLabV2 } from './OrbMaterialLabV2';
export type { OrbMaterialLabV2Props, OrbMaterialLabTier, OrbMaterialLabView } from './OrbMaterialLabV2';
export { OrbRenderer }     from './OrbRenderer';
export { OrbDirector }     from './OrbDirector';
export { OrbAnimator }     from './OrbAnimator';
export { WebGLLayer }      from './WebGLLayer';

export type {
  Embodiment,
  EmbodimentKind,
  EmbodimentProps,
} from './Embodiment';

export type {
  OrbProfile,
  OrbLayerVisibility,
  AnimationState,
  LivingOrbProps,
} from './types';

export {
  ALL_PROFILES,
  PROFILE_INDEX,
  DEFAULT_LAYER_VISIBILITY,
} from './types';
