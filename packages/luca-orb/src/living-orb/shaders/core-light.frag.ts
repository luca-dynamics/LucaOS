import { NOISE_GLSL } from './noise';

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

${NOISE_GLSL}

// Blob SDF (must match glass.frag.ts exactly for correct masking)
uniform float u_lowFreqAmp;
uniform float u_midFreqAmp;

float blobSDF(vec2 p) {
  float sag = max(0.0, -p.y) * 0.08;
  vec2 sagP = vec2(p.x, p.y + sag * 0.15);
  float dist = length(sagP);

  vec2 noisePos = sagP * 1.8 + vec2(u_noiseTime * 0.7, u_noiseTime * 0.5);
  float n1 = noise2(noisePos * u_lowFreqAmp * 28.0) * 2.0 - 1.0;
  vec2 noisePos2 = sagP * 2.8 + vec2(u_noiseTime * 1.1, u_noiseTime * 0.8 + 2.3);
  float n2 = noise2(noisePos2 * u_midFreqAmp * 120.0 + vec2(3.3, 1.7)) * 2.0 - 1.0;
  float deformedRadius = 1.0 + sag * 0.10 + n1 * u_lowFreqAmp + n2 * u_midFreqAmp;
  return dist - deformedRadius;
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
  vec2 glowCenter = vec2(0.0, 0.06);
  float distFromGlow = length(localP - glowCenter);

  // Gaussian core
  float coreR = u_coreRadius;
  float coreGlow = exp(-distFromGlow * distFromGlow / (coreR * coreR));

  // Audio pulse: immediate brightness spike on onset
  float audioPulse = 1.0 + u_audioEnergy * 0.35 + u_audioOnset * 0.50;
  coreGlow *= audioPulse;

  // Breathing modulation — very subtle, in phase with breathing
  float breathMod = 1.0 + sin(u_time * 1.496) * 0.04; // 1.496 = 2π/4.2s
  coreGlow *= breathMod;

  // ── Secondary corona ──────────────────────────────────────────────────────

  float coronaR = u_coronaRadius;
  float corona = exp(-distFromGlow * distFromGlow / (coronaR * coronaR));
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
