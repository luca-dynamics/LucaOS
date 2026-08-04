/**
 * Shared GLSL noise utilities for the Living Orb shaders.
 * Include this at the top of any fragment shader that needs noise.
 *
 * Includes:
 *  - hash2/hash3 — fast value hash functions
 *  - noise2 — smooth value noise
 *  - fbm2 — fractal Brownian motion (multi-octave noise)
 *  - curl2 — divergence-free curl noise for surface flow
 */
export const NOISE_GLSL = /* glsl */`

// ─── Hash functions ───────────────────────────────────────────────────────────

float hash(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

vec2 hash2(vec2 p) {
  p = mat2(127.1, 311.7, 269.5, 183.3) * p;
  return fract(sin(p) * 43758.5453);
}

// ─── Smooth value noise [0,1] ─────────────────────────────────────────────────

float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  // Quintic smoothstep
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);

  float a = hash(i + vec2(0.0, 0.0));
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));

  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// ─── Fractal Brownian Motion ──────────────────────────────────────────────────

float fbm2(vec2 p, int octaves, float lacunarity, float gain) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  for (int i = 0; i < 8; i++) {
    if (i >= octaves) break;
    value += amplitude * noise2(p * frequency);
    frequency *= lacunarity;
    amplitude *= gain;
  }
  return value;
}

// Convenience overload: 4 octaves, standard settings
float fbm2(vec2 p) {
  return fbm2(p, 4, 2.0, 0.5);
}

// ─── Curl noise ───────────────────────────────────────────────────────────────
// Divergence-free 2D curl field, good for surface flow

vec2 curl2(vec2 p) {
  const float eps = 0.001;
  float n1 = noise2(vec2(p.x, p.y + eps));
  float n2 = noise2(vec2(p.x, p.y - eps));
  float n3 = noise2(vec2(p.x + eps, p.y));
  float n4 = noise2(vec2(p.x - eps, p.y));
  float dydx = (n1 - n2) / (2.0 * eps);
  float dxdy = (n3 - n4) / (2.0 * eps);
  return vec2(dydx, -dxdy);
}

// ─── Domain-warped noise (for organic blob deformation) ───────────────────────
// Applies two levels of domain warping to break symmetry further

float warpedNoise(vec2 p, float warpStrength) {
  vec2 q = vec2(
    noise2(p + vec2(0.0, 0.0)),
    noise2(p + vec2(5.2, 1.3))
  );
  vec2 r = vec2(
    noise2(p + warpStrength * q + vec2(1.7, 9.2)),
    noise2(p + warpStrength * q + vec2(8.3, 2.8))
  );
  return noise2(p + warpStrength * r);
}

`;
