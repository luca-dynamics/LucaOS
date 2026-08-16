/**
 * OrbRenderer — coordinates all Living Orb render layers.
 *
 * Architecture:
 *  - One WebGL2 context (transparent, premultiplied alpha)
 *  - One WebGLLayer instance per visual layer
 *  - Layers drawn in correct order with correct blend modes:
 *
 *    Draw order:
 *    1. Shadow      (SRC_ALPHA / ONE_MINUS_SRC_ALPHA — standard blend, UNDER)
 *    2. Background  (SRC_ONE  / ONE — additive, BEHIND orb)
 *    3. GlassBody   (SRC_ONE  / ONE_MINUS_SRC_ALPHA — premultiplied over)
 *    4. CoreLight   (ONE      / ONE — additive, INSIDE)
 *    5. Highlight   (ONE      / ONE — additive, ON TOP)
 *    6. Debug       (SRC_ALPHA / ONE_MINUS_SRC_ALPHA — overlay)
 *
 * Design values come from packages/luca-orb-design.
 * This class is a pure implementation of that specification.
 */
import { WebGLLayer } from './WebGLLayer';
import { WebGLRenderTarget } from './WebGLRenderTarget';
import { WebGLSceneTexture } from './WebGLSceneTexture';
import { WebGLVolumeDepthPass } from './WebGLVolumeDepthPass';
import { WebGLHeroSurfacePass } from './WebGLHeroSurfacePass';
import { WebGLPearlDepthPass } from './WebGLPearlDepthPass';
import { WebGLStructureTurntablePass } from './WebGLStructureTurntablePass';
import { OrbDirector } from './OrbDirector';
import { AnimationState, OrbLayerVisibility, OrbProfile, OrbRenderMode, OrbStructureStudy, PROFILE_INDEX, DEFAULT_LAYER_VISIBILITY } from './types';
import { GLASS_FRAG }      from './shaders/glass.frag';
import { BACKGROUND_FRAG } from './shaders/background.frag';
import { CORE_LIGHT_FRAG } from './shaders/core-light.frag';
import { HIGHLIGHT_FRAG }  from './shaders/highlight.frag';
import { SHADOW_FRAG }     from './shaders/shadow.frag';
import { PEARL_VOLUME_FRAG } from './shaders/pearl-volume.frag';
import { STRUCTURE_DIAGNOSTIC_FRAG } from './shaders/structure-diagnostic.frag';

import {
  PROFILE_COLORS,
  GlassMaterial, GLASS_PROFILE_DELTAS, LucaOpticalVolumeMaterial,
  LIGHTING_RIGS,
  OrbDimensions, OrbBlobShape,
  OrbIdentityDNA, DEFAULT_LUCA_IDENTITY_DNA
} from '@luca/orb-design';

const MORPH_SPEED = 0.055;

export interface OrbRendererOptions {
  profile?: OrbProfile;
  dna?: OrbIdentityDNA;
  layers?: Partial<OrbLayerVisibility>;
  devicePixelRatio?: number;
  /** A pixel-matched capture of the surface immediately behind the orb. */
  background?: TexImageSource;
  /** Frozen neutral geometry inspection; material passes are bypassed. */
  renderMode?: OrbRenderMode;
  structureStudy?: OrbStructureStudy;
  structureYaw?: number;
  structurePitch?: number;
}

export class OrbRenderer {
  private gl: WebGL2RenderingContext;
  private canvas: HTMLCanvasElement;
  private director: OrbDirector;

  private shadowLayer!:     WebGLLayer;
  private backgroundLayer!: WebGLLayer;
  private volumeDepthPass: WebGLVolumeDepthPass;
  private heroSurfacePass: WebGLHeroSurfacePass;
  private pearlDepthPass: WebGLPearlDepthPass;
  private structureTurntablePass: WebGLStructureTurntablePass;
  private glassLayer!:      WebGLLayer;
  private pearlLayer!:      WebGLLayer;
  private coreLayer!:       WebGLLayer;
  private highlightLayer!:  WebGLLayer;
  private structureLayer!:  WebGLLayer;
  private thicknessTarget: WebGLRenderTarget;
  private pearlDepthTarget: WebGLRenderTarget;
  private sceneTexture: WebGLSceneTexture;

  private profile: OrbProfile;
  private layerVisibility: OrbLayerVisibility;
  private dpr: number;
  private rafId: number | null = null;
  private isDisposed = false;
  private readonly renderMode: OrbRenderMode;
  private structureStudy: OrbStructureStudy;
  private structureYaw: number;
  private structurePitch: number;

  constructor(canvas: HTMLCanvasElement, options: OrbRendererOptions = {}) {
    this.canvas = canvas;
    this.profile = options.profile ?? 'idle';
    this.dpr = options.devicePixelRatio ?? window.devicePixelRatio ?? 1;
    this.layerVisibility = { ...DEFAULT_LAYER_VISIBILITY, ...options.layers };
    this.renderMode = options.renderMode ?? 'material';
    this.structureStudy = options.structureStudy ?? 'front';
    this.structureYaw = options.structureYaw ?? 0;
    this.structurePitch = options.structurePitch ?? 0;

    const ctx = canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,         // MSAA off — edge AA done in shaders
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
    });
    if (!ctx) throw new Error('WebGL2 not supported');
    this.gl = ctx;
    this.thicknessTarget = new WebGLRenderTarget(ctx);
    this.pearlDepthTarget = new WebGLRenderTarget(ctx);
    this.sceneTexture = new WebGLSceneTexture(ctx);
    this.volumeDepthPass = new WebGLVolumeDepthPass(ctx);
    this.heroSurfacePass = new WebGLHeroSurfacePass(ctx);
    this.pearlDepthPass = new WebGLPearlDepthPass(ctx);
    this.structureTurntablePass = new WebGLStructureTurntablePass(ctx);
    this.sceneTexture.setSource(options.background);
    this.director = new OrbDirector(options.dna ?? DEFAULT_LUCA_IDENTITY_DNA);
    this.director.setProfile(this.profile);

    this.initLayers();
  }

  private initLayers(): void {
    const gl = this.gl;

    // Compile all layer shaders
    this.shadowLayer     = new WebGLLayer(gl, SHADOW_FRAG);
    this.backgroundLayer = new WebGLLayer(gl, BACKGROUND_FRAG);
    this.glassLayer      = new WebGLLayer(gl, GLASS_FRAG);
    this.pearlLayer      = new WebGLLayer(gl, PEARL_VOLUME_FRAG);
    this.coreLayer       = new WebGLLayer(gl, CORE_LIGHT_FRAG);
    this.highlightLayer  = new WebGLLayer(gl, HIGHLIGHT_FRAG);
    this.structureLayer  = new WebGLLayer(gl, STRUCTURE_DIAGNOSTIC_FRAG);
  }

  // ── Uniform builders ────────────────────────────────────────────────────────

  private getCommonUniforms(anim: AnimationState): Record<string, number | number[]> {
    const { canvas, dpr } = this;
    const w = canvas.width;
    const h = canvas.height;
    const r = Math.min(w, h) * OrbDimensions.normalizedRadius / dpr;

    // Convert float offset from pixels to normalized UV
    const floatOffsetNorm = anim.floatOffset / h;

    return {
      u_resolution:    [w / dpr, h / dpr],   // Logical (CSS) pixels
      u_time:          anim.time,
      u_noiseTime:     anim.time * MORPH_SPEED,
      u_center:        [0.5, 0.5 + floatOffsetNorm],
      u_radius:        r / (w / dpr),         // Normalized to width
      u_breathingScale: anim.breathingScale,
      u_floatOffset:   floatOffsetNorm,
      u_microJitter:   anim.microJitter,
      u_highlightDrift: anim.highlightDrift,
      u_audioEnergy:   anim.audioEnergy,
      u_audioOnset:    anim.audioOnset,
    };
  }

  private getProfileColors() {
    const colors = PROFILE_COLORS[this.profile] ?? PROFILE_COLORS.idle;
    return colors;
  }

  private getGlassMaterial() {
    const base = GlassMaterial;
    const delta = GLASS_PROFILE_DELTAS[this.profile] ?? {};
    return {
      refractionStrength:  (base.refractionStrength  + (delta.refractionStrength  ?? 0)),
      fresnelExponent:     (base.fresnelExponent      + (delta.refractionIndex     ?? 0) * 2),
      fresnelStrength:     (base.fresnelStrength      + (delta.fresnelStrength     ?? 0)),
      transparency:        (base.transparency         + (delta.transparency        ?? 0)),
      specularExponent:    (base.specularExponent      + (delta.specularExponent    ?? 0)),
      specularIntensity:   (base.specularIntensity    + (delta.specularIntensity   ?? 0)),
      subsurfaceDepth:     (base.subsurfaceDepth      + (delta.subsurfaceDepth     ?? 0)),
      edgeSoftness:        base.edgeSoftness,
      chromaticAberration: base.chromaticAberration,
    };
  }

  private getLightingRig() {
    return LIGHTING_RIGS[this.profile] ?? LIGHTING_RIGS.idle;
  }

  // ── Draw ────────────────────────────────────────────────────────────────────

  private drawFrame(): void {
    if (this.isDisposed) return;

    const gl = this.gl;
    const anim = this.director.tick();
    const state = this.director.getEmbodimentState();
    const common = this.getCommonUniforms(anim);
    if (this.renderMode === 'structure') {
      common.u_time = 0;
      common.u_noiseTime = 0;
      common.u_breathingScale = 1;
      common.u_floatOffset = 0;
      common.u_microJitter = 0;
      common.u_audioEnergy = 0;
      common.u_audioOnset = 0;
      common.u_center = [0.5, 0.5];
    }
    const r      = common.u_radius as number;
    const cx     = (common.u_center as number[])[0];
    const cy     = (common.u_center as number[])[1];

    if (this.renderMode === 'structure' && this.structureStudy !== 'front') {
      gl.clearColor(0, 0, 0, 0);
      gl.clearDepth(1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      this.structureTurntablePass.draw({
        ...common,
        u_structureYaw: this.structureYaw,
        u_structurePitch: this.structurePitch,
        u_modelScale: 0.92,
      }, this.structureStudy);
      return;
    }

    // Optical pre-pass: rasterize independent authored front and rear surfaces.
    this.thicknessTarget.bind();
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.disable(gl.DEPTH_TEST);
    this.volumeDepthPass.draw({
      ...common,
    });
    this.thicknessTarget.unbind(this.canvas.width, this.canvas.height);

    // Rasterize the suspended pearl once so its material, glow and authored
    // overlap surfaces all agree on one asymmetric front/rear volume.
    this.pearlDepthTarget.bind();
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.disable(gl.DEPTH_TEST);
    this.pearlDepthPass.draw({ ...common });
    this.pearlDepthTarget.unbind(this.canvas.width, this.canvas.height);

    if (this.renderMode === 'structure') {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      this.structureLayer.use();
      this.structureLayer.setUniforms({ ...common });
      this.structureLayer.bindTexture('u_thicknessMap', this.thicknessTarget.texture, 0);
      this.structureLayer.bindTexture('u_pearlDepthMap', this.pearlDepthTarget.texture, 1);
      this.structureLayer.draw();
      this.heroSurfacePass.bindThicknessMap(this.thicknessTarget.texture, 0);
      this.heroSurfacePass.bindPearlDepthMap(this.pearlDepthTarget.texture, 1);
      this.heroSurfacePass.draw({
        ...common,
        u_keyLightDirection: [-0.48, 0.66],
        u_keyLightColor: [0.82, 0.84, 0.88],
        u_structureMode: 1,
      });
      gl.disable(gl.BLEND);
      return;
    }

    // Clear with full transparency
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);

    // ── 1. Shadow (standard alpha blend, UNDER everything) ───────────────────
    if (this.layerVisibility.shadow) {
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      this.shadowLayer.use();
      this.shadowLayer.setUniforms({
        ...common,
        u_shadowOffsetY:  state.shadowOffsetY,
        u_shadowSpreadX:  state.shadowSpreadX,
        u_shadowSpreadY:  state.shadowSpreadY,
        u_shadowOpacity:  state.shadowOpacity,
        u_shadowColor:    [0.02, 0.04, 0.08],
      });
      this.shadowLayer.draw();
    }

    // ── 2. Background (additive — bloom + ripple rings, BEHIND orb) ──────────
    if (this.layerVisibility.background) {
      gl.blendFunc(gl.ONE, gl.ONE);  // additive
      this.backgroundLayer.use();
      this.backgroundLayer.setUniforms({
        ...common,
        u_bloomColor:      state.bloomColor,
        u_bloomIntensity:  state.bloomIntensity,
        u_bloomRadius:     state.bloomRadius,
        u_rippleColor:     state.rippleColor,
        u_rippleOpacity:   state.rippleOpacity,
        u_rippleSpacing:   state.rippleSpacing,
        u_rippleWidth:     0.004,
      });
      this.backgroundLayer.setInt('u_rippleCount', Math.round(state.rippleCount));
      this.backgroundLayer.draw();
    }

    // ── 3. Glass body (premultiplied over) ────────────────────────────────────
    if (this.layerVisibility.glassBody) {
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);  // premultiplied
      this.glassLayer.use();
      this.glassLayer.setUniforms({
        ...common,
        // Material
        u_refractionStrength:  state.refractionStrength,
        u_fresnelExponent:     state.fresnelExponent,
        u_fresnelStrength:     state.fresnelStrength,
        u_transparency:        state.transparency,
        u_specularExponent:    state.specularExponent,
        u_specularIntensity:   state.specularIntensity,
        u_subsurfaceDepth:     state.subsurfaceDepth,
        u_edgeSoftness:        state.edgeSoftness,
        u_chromaticAberration: state.chromaticAberration,
        u_hasSceneTexture:     this.sceneTexture.hasSource,
        u_absorption:          LucaOpticalVolumeMaterial.absorption,
        u_opticalDensity:      LucaOpticalVolumeMaterial.opticalDensity,
        u_scattering:          LucaOpticalVolumeMaterial.scattering,
        u_causticStrength:     LucaOpticalVolumeMaterial.causticStrength,
        u_sceneTransmission:   LucaOpticalVolumeMaterial.sceneTransmission,
        u_shellReflectivity:   LucaOpticalVolumeMaterial.shellReflectivity,
        // Colors
        u_glassColor:          state.glassColor,
        u_rimColor:            state.rimColor,
        u_innerGlowColor:      state.coreColor,
        u_innerGlowIntensity:  0.6,
        // Blob shape
        u_lowFreqAmp:          state.lowFreqAmp,
        u_midFreqAmp:          state.midFreqAmp,
        u_highFreqAmp:         state.highFreqAmp,
        // Lighting
        u_keyLightPos:         [cx + state.keyLightPos[0] * r, cy + state.keyLightPos[1] * r],
        u_keyLightIntensity:   state.keyLightIntensity,
        u_keyLightColor:       state.specularColor,
        u_fillLightPos:        [cx + state.fillLightPos[0] * r, cy + state.fillLightPos[1] * r],
        u_fillLightIntensity:  state.fillLightIntensity,
        u_fillLightColor:      state.glassColor,
      });
      this.glassLayer.bindTexture('u_thicknessMap', this.thicknessTarget.texture, 0);
      this.glassLayer.bindTexture('u_sceneTexture', this.sceneTexture.texture, 1);
      this.glassLayer.draw();
    }

    // The pearl is a private internal pass so the optical glass program stays
    // within conservative hardware fragment-shader budgets.
    if (this.layerVisibility.glassBody) {
      gl.blendFunc(gl.ONE, gl.ONE);
      this.pearlLayer.use();
      this.pearlLayer.setUniforms({
        ...common,
        u_lowFreqAmp:       state.lowFreqAmp,
        u_midFreqAmp:       state.midFreqAmp,
        u_highFreqAmp:      state.highFreqAmp,
        u_pearlDensity:     LucaOpticalVolumeMaterial.pearlDensity,
        u_pearlScatter:     LucaOpticalVolumeMaterial.pearlScatter,
        u_pearlIridescence: LucaOpticalVolumeMaterial.pearlIridescence,
        u_smokeDensity:     LucaOpticalVolumeMaterial.smokeDensity,
        u_internalBloom:    LucaOpticalVolumeMaterial.internalBloom,
      });
      this.pearlLayer.bindTexture('u_thicknessMap', this.thicknessTarget.texture, 0);
      this.pearlLayer.bindTexture('u_pearlDepthMap', this.pearlDepthTarget.texture, 1);
      this.pearlLayer.draw();
    }

    // Product-master anatomy: independent crown, lower fold and reflection
    // return. These remain private identity geometry rather than public props.
    if (this.layerVisibility.glassBody) {
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      this.heroSurfacePass.bindThicknessMap(this.thicknessTarget.texture, 0);
      this.heroSurfacePass.bindPearlDepthMap(this.pearlDepthTarget.texture, 1);
      this.heroSurfacePass.draw({
        ...common,
        u_keyLightDirection: state.keyLightPos,
        u_keyLightColor: state.specularColor,
      });
    }

    // ── 4. Core light (additive — volumetric glow INSIDE orb) ────────────────
    if (this.layerVisibility.coreLight) {
      gl.blendFunc(gl.ONE, gl.ONE);  // additive
      this.coreLayer.use();
      this.coreLayer.setUniforms({
        ...common,
        u_coreColor:          state.coreColor,
        u_coreIntensity:      state.coreIntensity,
        u_coreRadius:         state.coreRadius,
        u_coronaColor:        state.glassColor,
        u_coronaIntensity:    state.coronaIntensity,
        u_coronaRadius:       state.coronaRadius,
        u_lowFreqAmp:         state.lowFreqAmp,
        u_midFreqAmp:         state.midFreqAmp,
        u_highFreqAmp:        state.highFreqAmp,
        u_profile:            PROFILE_INDEX[this.profile],
      });
      this.coreLayer.bindTexture('u_pearlDepthMap', this.pearlDepthTarget.texture, 0);
      this.coreLayer.draw();
    }

    // ── 5. Highlight (additive — hero specular ON TOP) ────────────────────────
    if (this.layerVisibility.highlight) {
      gl.blendFunc(gl.ONE, gl.ONE);  // additive
      this.highlightLayer.use();
      this.highlightLayer.setUniforms({
        ...common,
        u_keyHighlightColor:            state.specularColor,
        u_keyHighlightIntensity:        state.keyLightIntensity * state.specularIntensity,
        u_keyHighlightSize:             state.keyHighlightSize,
        u_keyHighlightOffset:           [state.keyLightPos[0] * -0.18, state.keyLightPos[1] * 0.22],
        u_highlightDrift:               anim.highlightDrift,
        u_secondaryHighlightColor:      state.glassColor,
        u_secondaryHighlightIntensity:  state.secondaryHighlightIntensity,
        u_secondaryHighlightSize:       state.secondaryHighlightSize,
        u_secondaryHighlightOffset:     [0.25, -0.20],
        u_maskSoftness:                 0.05,
      });
      this.highlightLayer.draw();
    }

    gl.disable(gl.BLEND);
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  /** Start the render loop */
  start(): void {
    if (this.rafId !== null) return;
    const loop = (): void => {
      if (this.isDisposed) return;
      this.drawFrame();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  /** Stop the render loop */
  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /** Update the visual profile */
  setProfile(profile: OrbProfile): void {
    this.profile = profile;
    this.director.setProfile(profile);
  }

  /** Update identity DNA */
  setIdentityDNA(dna: OrbIdentityDNA): void {
    this.director.setIdentityDNA(dna);
  }

  /** Update layer visibility */
  setLayerVisibility(layers: Partial<OrbLayerVisibility>): void {
    this.layerVisibility = { ...this.layerVisibility, ...layers };
  }

  /** Feed audio data each frame */
  setAudioInput(energy: number, onset: number = 0): void {
    this.director.setAudioInput(energy, onset);
  }

  /** Update the prototype's non-material structural camera without recreating WebGL. */
  setStructureView(study: OrbStructureStudy, yaw: number, pitch: number): void {
    this.structureStudy = study;
    this.structureYaw = yaw;
    this.structurePitch = pitch;
  }

  /** Replace the matched host-scene capture used by the refraction pass. */
  setBackground(background?: TexImageSource): void {
    this.sceneTexture.setSource(background);
  }

  /** Resize canvas to match container */
  resize(cssWidth: number, cssHeight: number): void {
    this.canvas.width  = cssWidth  * this.dpr;
    this.canvas.height = cssHeight * this.dpr;
    this.canvas.style.width  = `${cssWidth}px`;
    this.canvas.style.height = `${cssHeight}px`;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.thicknessTarget.resize(this.canvas.width, this.canvas.height);
    this.pearlDepthTarget.resize(this.canvas.width, this.canvas.height);
  }

  /** Release all WebGL resources */
  dispose(): void {
    this.isDisposed = true;
    this.stop();
    this.shadowLayer.dispose();
    this.backgroundLayer.dispose();
    this.volumeDepthPass.dispose();
    this.heroSurfacePass.dispose();
    this.pearlDepthPass.dispose();
    this.structureTurntablePass.dispose();
    this.glassLayer.dispose();
    this.pearlLayer.dispose();
    this.coreLayer.dispose();
    this.highlightLayer.dispose();
    this.structureLayer.dispose();
    this.thicknessTarget.dispose();
    this.pearlDepthTarget.dispose();
    this.sceneTexture.dispose();
  }
}
