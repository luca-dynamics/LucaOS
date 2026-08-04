import { NOISE_GLSL } from './noise';

/**
 * Background layer shader — ripple rings + ambient bloom pool.
 *
 * Renders BEHIND the orb. Transparent canvas — alpha compositing only.
 * This layer is what gives the orb its "weight" in the scene.
 *
 * Elements:
 *  1. Ambient bloom pool: a soft radial gradient glow behind the orb
 *  2. Concentric ripple rings: subtle white rings that radiate outward
 *     The rings are slightly animated (slow outward drift) to feel alive.
 */
export const BACKGROUND_FRAG = /* glsl */`#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform vec2  u_resolution;
uniform float u_time;

// Orb placement
uniform vec2  u_center;         // Orb center in UV [0,1]
uniform float u_radius;         // Orb base radius in UV units
uniform float u_breathingScale; // Applied to ring radii so they track the orb

// Bloom
uniform vec3  u_bloomColor;
uniform float u_bloomIntensity;
uniform float u_bloomRadius;    // Multiplier on u_radius

// Ripple rings
uniform vec3  u_rippleColor;
uniform float u_rippleOpacity;
uniform int   u_rippleCount;    // 3 or 4
uniform float u_rippleSpacing;  // Gap between rings as fraction of radius
uniform float u_rippleWidth;    // Width of each ring in UV units

// Audio reactivity
uniform float u_audioEnergy;    // Expands rings slightly on beat

${NOISE_GLSL}

void main() {
  vec2 uv = v_uv;
  float aspect = u_resolution.x / u_resolution.y;

  vec2 p = uv - u_center;
  p.x *= aspect;

  float dist = length(p);
  float r = u_radius * u_breathingScale;

  // ── Ambient bloom pool ────────────────────────────────────────────────────

  float bloomR = r * u_bloomRadius;
  // Gaussian-like falloff: very soft, large
  float bloom = exp(-dist * dist / (bloomR * bloomR * 0.8)) * u_bloomIntensity;
  // Audio makes bloom pulse slightly
  bloom *= 1.0 + u_audioEnergy * 0.18;

  // ── Concentric ripple rings ───────────────────────────────────────────────

  float rippleSum = 0.0;
  int count = clamp(u_rippleCount, 1, 6);

  for (int i = 0; i < 6; i++) {
    if (i >= count) break;

    float fi = float(i);

    // Each ring slowly drifts outward over time, creating a subtle
    // "radiating" effect. The offset is very slow — not a wave animation,
    // just a gentle breathing of the rings.
    float drift = mod(u_time * 0.012 + fi * 0.25, 1.0) * r * 0.15;

    float ringRadius = r * (1.18 + fi * u_rippleSpacing) + drift;
    // Audio expands rings
    ringRadius += u_audioEnergy * r * 0.04;

    // Smooth ring function: bell curve centered on ringRadius
    float d = abs(dist - ringRadius);
    float ringW = u_rippleWidth * (1.0 + fi * 0.2); // outer rings slightly wider
    float ring = exp(-d * d / (ringW * ringW));

    // Fade outer rings
    float fade = pow(1.0 - fi / float(count), 1.5);
    rippleSum += ring * fade;
  }

  // Slight wave in ripple opacity (breathing quality)
  float rippleWave = 1.0 + sin(u_time * 0.4) * 0.08;
  float rippleAlpha = rippleSum * u_rippleOpacity * rippleWave;

  // ── Composite ─────────────────────────────────────────────────────────────

  // Bloom is additive glow — alpha is the brightness
  vec3 color = u_bloomColor * bloom + u_rippleColor * rippleSum * u_rippleOpacity;
  float alpha = bloom * 0.4 + rippleAlpha * 0.7;
  alpha = clamp(alpha, 0.0, 1.0);

  // Premultiplied alpha
  fragColor = vec4(color * alpha, alpha);
}
`;
