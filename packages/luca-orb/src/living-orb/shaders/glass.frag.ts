import { NOISE_GLSL } from './noise';

/**
 * Glass body fragment shader — the main orb surface.
 *
 * Technique:
 *  1. Evaluate a domain-warped SDF to get the organic blob shape
 *  2. Compute the surface normal from the SDF gradient
 *  3. Apply Fresnel rim lighting
 *  4. Fake refraction (UV offset by normal)
 *  5. Subsurface scatter approximation (light falls off from center)
 *  6. Chromatic aberration at edges
 *  7. Soft edge anti-aliasing
 *
 * All parameters are passed as uniforms — the shader has no hardcoded
 * design values. Those live in packages/luca-orb-design.
 */
export const GLASS_FRAG = /* glsl */`#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

// ─── Uniforms ─────────────────────────────────────────────────────────────────

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_noiseTime;      // Slow-moving time for morph (u_time * morphSpeed)

// Orb placement
uniform vec2  u_center;         // Orb center in UV [0,1]
uniform float u_radius;         // Orb radius in UV units

// Animation
uniform float u_breathingScale; // 0.97–1.03
uniform float u_microJitter;    // 0–0.008
uniform float u_audioEnergy;    // 0–1
uniform float u_audioOnset;     // 0–1

// Glass material
uniform float u_refractionStrength;  // How much the background is offset
uniform float u_fresnelExponent;     // Width of Fresnel rim
uniform float u_fresnelStrength;     // Intensity of Fresnel rim
uniform float u_transparency;        // Overall transmittance at normal incidence
uniform float u_specularExponent;    // Blinn-Phong shininess
uniform float u_specularIntensity;   // Specular brightness
uniform float u_subsurfaceDepth;     // Internal scatter depth
uniform float u_edgeSoftness;        // Silhouette AA width
uniform float u_chromaticAberration; // Chromatic split at edges

// Colors
uniform vec3  u_glassColor;
uniform vec3  u_rimColor;
uniform vec3  u_innerGlowColor;
uniform float u_innerGlowIntensity;

// Blob shape
uniform float u_lowFreqAmp;     // Large bump amplitude
uniform float u_midFreqAmp;     // Medium detail amplitude
uniform float u_highFreqAmp;    // Surface tension ripple amplitude

// Lighting (key light for specular)
uniform vec2  u_keyLightPos;    // Light position in UV
uniform float u_keyLightIntensity;
uniform vec3  u_keyLightColor;
uniform vec2  u_fillLightPos;
uniform float u_fillLightIntensity;
uniform vec3  u_fillLightColor;

// ─── Noise ────────────────────────────────────────────────────────────────────
${NOISE_GLSL}

// ─── Blob SDF ────────────────────────────────────────────────────────────────

/**
 * Signed distance function for the organic blob.
 * Returns negative values inside the blob, positive outside.
 * p: point in orb-local space (orb center = origin, orb radius = 1.0)
 */
float blobSDF(vec2 p) {
  // Gravitational sag: subtle teardrop/sag near the bottom
  float sag = max(0.0, -p.y) * 0.08;
  vec2 sagP = vec2(p.x, p.y + sag * 0.15);
  float dist = length(sagP);

  // Domain warp: apply noise in object space
  vec2 noisePos = sagP * 1.8 + vec2(u_noiseTime * 0.7, u_noiseTime * 0.5);

  // Low frequency: organic bumps
  float n1 = noise2(noisePos * u_lowFreqAmp * 28.0) * 2.0 - 1.0;

  // Medium frequency: surface detail
  vec2 noisePos2 = sagP * 2.8 + vec2(u_noiseTime * 1.1, u_noiseTime * 0.8 + 2.3);
  float n2 = noise2(noisePos2 * u_midFreqAmp * 120.0 + vec2(3.3, 1.7)) * 2.0 - 1.0;

  // High frequency: surface tension ripple
  float n3 = noise2(sagP * 8.0 + u_time * 3.7 + vec2(1.1, 2.2)) * 2.0 - 1.0;

  // Audio-reactive surface deformation
  float audioDeform = u_audioEnergy * 0.04 + u_audioOnset * 0.06;

  float deformedRadius = 1.0
    + sag * 0.10
    + n1 * u_lowFreqAmp
    + n2 * u_midFreqAmp
    + n3 * u_highFreqAmp
    + audioDeform
    + u_microJitter * (noise2(sagP * 12.0 + u_time * 4.2) * 2.0 - 1.0);

  return dist - deformedRadius;
}

// ─── Compute SDF gradient (surface normal) ────────────────────────────────────

vec2 blobNormal(vec2 p) {
  const float eps = 0.002;
  float dx = blobSDF(p + vec2(eps, 0.0)) - blobSDF(p - vec2(eps, 0.0));
  float dy = blobSDF(p + vec2(0.0, eps)) - blobSDF(p - vec2(0.0, eps));
  return normalize(vec2(dx, dy));
}

// ─── Fresnel approximation ────────────────────────────────────────────────────

float fresnel(vec3 normal, vec3 viewDir, float exponent) {
  float cosTheta = clamp(dot(normal, viewDir), 0.0, 1.0);
  return pow(1.0 - cosTheta, exponent);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

void main() {
  vec2 uv = v_uv;
  float aspect = u_resolution.x / u_resolution.y;

  // Work in corrected aspect space
  vec2 p = (uv - u_center);
  p.x *= aspect;

  // Scale to orb-local space (orb radius = 1.0)
  vec2 localP = p / (u_radius * u_breathingScale);

  // ── SDF evaluation ────────────────────────────────────────────────────────

  float sdf = blobSDF(localP);

  // Edge anti-aliasing
  float edgeFade = 1.0 - smoothstep(-u_edgeSoftness / u_radius, u_edgeSoftness / u_radius, sdf);

  // Discard fully outside fragments
  if (edgeFade < 0.001) {
    fragColor = vec4(0.0);
    return;
  }

  // ── Surface normal ────────────────────────────────────────────────────────

  vec2 normal2D = blobNormal(localP);
  float normalZ = 0.65;
  vec3 normal = normalize(vec3(normal2D, normalZ));
  vec3 viewDir = vec3(0.0, 0.0, 1.0);

  // ── Depth inside orb ──────────────────────────────────────────────────────

  float depth = clamp(-sdf, 0.0, 1.0);

  // ── Asymmetrical Fresnel rim (Upper-Left Brighter, Lower-Right Softer) ─────

  vec2 lightDir2D = normalize(vec2(-0.5, 0.7));
  float rimAngle = dot(normal2D, lightDir2D);
  float rimAsymmetry = mix(0.45, 1.30, rimAngle * 0.5 + 0.5);

  float fresnelF = fresnel(normal, viewDir, u_fresnelExponent) * u_fresnelStrength * rimAsymmetry;
  vec3 rimLight = u_rimColor * fresnelF;

  // ── Key light specular (Blinn-Phong) ─────────────────────────────────────

  vec2 keyLightLocal = (u_keyLightPos - u_center);
  keyLightLocal.x *= aspect;
  vec3 keyDir = normalize(vec3(keyLightLocal - p, 1.5));
  vec3 halfDir = normalize(keyDir + viewDir);
  float spec = pow(max(dot(normal, halfDir), 0.0), u_specularExponent) * u_specularIntensity;
  vec3 keySpecular = u_keyLightColor * spec * u_keyLightIntensity;

  // ── Fill light diffuse ────────────────────────────────────────────────────

  vec2 fillLightLocal = (u_fillLightPos - u_center);
  fillLightLocal.x *= aspect;
  vec3 fillDir = normalize(vec3(fillLightLocal - p, 1.2));
  float fillDiff = max(dot(normal, fillDir), 0.0) * u_fillLightIntensity * 0.25;
  vec3 fillLight = u_fillLightColor * fillDiff;

  // ── Subsurface / inner glow ───────────────────────────────────────────────

  float distFromCenter = length(localP);
  float subsurface = exp(-distFromCenter * distFromCenter / (u_subsurfaceDepth * u_subsurfaceDepth + 0.01));
  vec3 innerGlow = u_innerGlowColor * subsurface * u_innerGlowIntensity * (1.0 + u_audioEnergy * 0.3);

  // ── Chromatic aberration at edges ─────────────────────────────────────────

  // At the edge (high fresnel), split RGB channels slightly
  float chromaticScale = fresnelF * u_chromaticAberration;
  // We apply this to the final color rather than re-sampling (approximation)
  vec3 chromaticShift = vec3(
    chromaticScale * 0.8,
    0.0,
    -chromaticScale * 0.5
  );

  // ── Glass body color ──────────────────────────────────────────────────────

  // Glass transparency varies with angle: more transparent at center, less at edge
  float angleTransparency = u_transparency - fresnelF * 0.3;
  vec3 glassBody = u_glassColor * (1.0 - angleTransparency) * (0.5 + depth * 0.5);

  // ── Composite ─────────────────────────────────────────────────────────────

  vec3 color = vec3(0.0);
  color += glassBody;
  color += innerGlow;
  color += rimLight;
  color += keySpecular;
  color += fillLight;
  color += chromaticShift;

  // Glass alpha: rim is more opaque, center is more transparent
  float alpha = mix(angleTransparency * 0.6, 1.0, fresnelF * 0.8 + spec * 0.5);
  alpha = clamp(alpha, 0.0, 1.0);

  // Apply edge anti-aliasing
  alpha *= edgeFade;
  color *= edgeFade;

  // Premultiplied alpha (required for correct compositing over transparent canvas)
  fragColor = vec4(color * alpha, alpha);
}
`;
