import { ORB_SHAPE_GLSL } from './orb-shape.glsl';

/**
 * Core light layer — volumetric inner glow.
 *
 * Rendered AFTER the glass body with additive blending.
 * This is the "soul" of the orb — the light that makes it feel alive from within.
 *
 * The core glow:
 *  - Is centered slightly off-center (more natural)
 *  - Has a soft Gaussian falloff
 *  - Pulses subtly with breathing
 *  - Reacts to audio energy (brightens on onset)
 *  - Is NOT painted on top — it fades at the orb edge naturally
 */
export const CORE_LIGHT_FRAG = /* glsl */`#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_noiseTime;

// Orb placement
uniform vec2  u_center;
uniform float u_radius;
uniform float u_breathingScale;

// Core light
uniform vec3  u_coreColor;
uniform float u_coreIntensity;   // Overall brightness [0,1]
uniform float u_coreRadius;      // Size relative to orb radius [0,1]

// Secondary inner corona
uniform vec3  u_coronaColor;
uniform float u_coronaIntensity;
uniform float u_coronaRadius;

// Audio
uniform float u_audioEnergy;
uniform float u_audioOnset;

// Profile
uniform float u_profile;        // 0–6

${ORB_SHAPE_GLSL}

// Blob SDF (must match glass.frag.ts exactly for correct masking)
uniform float u_lowFreqAmp;
uniform float u_midFreqAmp;
uniform float u_highFreqAmp;
uniform float u_microJitter;
uniform sampler2D u_pearlDepthMap;

float blobSDF(vec2 p) {
  return lucaAnimatedVolumeField(
    p, u_noiseTime, u_time, u_lowFreqAmp, u_midFreqAmp,
    u_highFreqAmp, u_microJitter, u_audioEnergy, u_audioOnset
  );
}

void main() {
  vec2 uv = v_uv;
  float aspect = u_resolution.x / u_resolution.y;

  vec2 p = uv - u_center;
  p.x *= aspect;

  float scale = u_radius * u_breathingScale;
  vec2 localP = p / scale;

  // ── Orb mask ──────────────────────────────────────────────────────────────

  // Only render inside the blob shape
  float sdf = blobSDF(localP);
  float insideMask = 1.0 - smoothstep(-0.05, 0.01, sdf);
  if (insideMask < 0.001) {
    fragColor = vec4(0.0);
    return;
  }

  // ── Core glow ─────────────────────────────────────────────────────────────

  // Center the glow slightly above the geometric center
  // (gives it a "looking up" quality — more alive)
  vec4 pearlSample = texture(u_pearlDepthMap, uv);
  float pearlThickness = max(pearlSample.r - pearlSample.g, 0.0)
    * min(pearlSample.b, pearlSample.a);
  float innerLobeMask = smoothstep(0.005, 0.055, pearlThickness);
  vec2 pearlCenter = vec2(-0.08, -0.10);
  vec2 coreDelta = (localP - pearlCenter) / vec2(0.73, 0.62);
  float coreAngle = -0.20;
  coreDelta = mat2(
    cos(coreAngle), -sin(coreAngle),
    sin(coreAngle), cos(coreAngle)
  ) * coreDelta;
  coreDelta.x *= 2.45;
  coreDelta.y *= 0.58;
  float distFromGlow = length(coreDelta);

  // Gaussian core
  float coreR = u_coreRadius;
  float coreGlow = exp(-distFromGlow * distFromGlow / (coreR * coreR));
  float lobeVolume = pow(clamp(pearlThickness / 0.62, 0.0, 1.0), 1.08);
  coreGlow = (coreGlow * 0.42 + lobeVolume * 0.10) * innerLobeMask;

  // Audio pulse: immediate brightness spike on onset
  float audioPulse = 1.0 + u_audioEnergy * 0.35 + u_audioOnset * 0.50;
  coreGlow *= audioPulse;

  // Breathing modulation — very subtle, in phase with breathing
  float breathMod = 1.0 + sin(u_time * 1.496) * 0.04; // 1.496 = 2π/4.2s
  coreGlow *= breathMod;

  // ── Secondary corona ──────────────────────────────────────────────────────

  float coronaR = u_coronaRadius;
  float corona = exp(-distFromGlow * distFromGlow / (coronaR * coronaR)) * innerLobeMask;
  // Corona is the wider, dimmer halo around the core
  corona = max(corona - coreGlow * 0.6, 0.0);

  // ── Composite ─────────────────────────────────────────────────────────────

  vec3 color = u_coreColor * coreGlow * u_coreIntensity
             + u_coronaColor * corona * u_coronaIntensity;

  // Apply orb mask — fade at edges so glow doesn't leak outside
  float alpha = (coreGlow * u_coreIntensity + corona * u_coronaIntensity * 0.5) * insideMask;
  alpha = clamp(alpha, 0.0, 1.0);

  // Premultiplied additive — this layer uses SRC_ALPHA / ONE blend mode
  fragColor = vec4(color * alpha, alpha);
}
`;
