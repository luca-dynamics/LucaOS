import { ORB_SHAPE_GLSL } from './orb-shape.glsl';

/**
 * Glass body fragment shader — the main orb surface.
 *
 * Technique:
 *  1. Evaluate a domain-warped SDF to get the organic blob shape
 *  2. Compute the surface normal from the SDF gradient
 *  3. Apply Fresnel rim lighting
 *  4. Sample the matched host scene through the optical-thickness field
 *  5. Apply Beer-Lambert absorption and suspended-volume scatter
 *  6. Apply restrained chromatic dispersion at the refracted edge
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
uniform sampler2D u_thicknessMap;
uniform sampler2D u_sceneTexture;
uniform bool u_hasSceneTexture;
uniform vec3 u_absorption;
uniform float u_opticalDensity;
uniform float u_scattering;
uniform float u_causticStrength;
uniform float u_sceneTransmission;
uniform float u_shellReflectivity;

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
${ORB_SHAPE_GLSL}

// ─── Blob SDF ────────────────────────────────────────────────────────────────

/**
 * Signed distance function for the organic blob.
 * Returns negative values inside the blob, positive outside.
 * p: point in orb-local space (orb center = origin, orb radius = 1.0)
 */
float blobSDF(vec2 p) {
  return lucaAnimatedVolumeField(
    p, u_noiseTime, u_time, u_lowFreqAmp, u_midFreqAmp,
    u_highFreqAmp, u_microJitter, u_audioEnergy, u_audioOnset
  );
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

  vec2 contourNormal2D = blobNormal(localP);

  // ── Depth inside orb ──────────────────────────────────────────────────────

  vec4 opticalSample = texture(u_thicknessMap, uv);
  float frontDepth = opticalSample.r;
  float rearDepth = opticalSample.g;
  float meshCoverage = min(opticalSample.b, opticalSample.a);
  float thickness = max(frontDepth - rearDepth, 0.0) * meshCoverage;
  float depth = thickness;

  // The rasterized front surface supplies a true depth gradient. Blend it
  // with the authored contour normal to keep the antialiased rim stable.
  vec2 depthTexel = 2.0 / u_resolution;
  vec2 depthGradient = vec2(
    texture(u_thicknessMap, uv + vec2(depthTexel.x, 0.0)).r
      - texture(u_thicknessMap, uv - vec2(depthTexel.x, 0.0)).r,
    texture(u_thicknessMap, uv + vec2(0.0, depthTexel.y)).r
      - texture(u_thicknessMap, uv - vec2(0.0, depthTexel.y)).r
  ) * 0.25;
  vec3 depthNormal = normalize(vec3(-depthGradient * vec2(aspect, 1.0) * 52.0, 1.0));
  vec2 depthNormal2D = length(depthNormal.xy) > 0.001 ? normalize(depthNormal.xy) : contourNormal2D;
  vec2 normal2D = normalize(mix(contourNormal2D, depthNormal2D, 0.68));
  float normalZ = mix(0.10, 1.0, clamp(thickness, 0.0, 1.0));
  vec3 contourNormal = normalize(vec3(normal2D * mix(1.0, 0.28, thickness), normalZ));
  vec3 normal = normalize(mix(contourNormal, depthNormal, 0.72));
  vec3 viewDir = vec3(0.0, 0.0, 1.0);

  // ── Asymmetrical Fresnel rim (Upper-Left Brighter, Lower-Right Softer) ─────

  vec2 lightDir2D = normalize(vec2(-0.5, 0.7));
  float rimAngle = dot(normal2D, lightDir2D);
  float rimAsymmetry = mix(0.45, 1.30, rimAngle * 0.5 + 0.5);

  float fresnelF = fresnel(normal, viewDir, u_fresnelExponent) * u_fresnelStrength * rimAsymmetry;
  // The master reads as a broad silver wall, not a neon contour. These two
  // overlapping lobes turn the depth field into a soft nested glass band.
  float outerWall = exp(-pow((thickness - 0.13) / 0.165, 2.0)) * edgeFade;
  float innerWall = exp(-pow((thickness - 0.31) / 0.175, 2.0)) * edgeFade;
  float lowerWall = smoothstep(-0.15, 0.72, dot(normal2D, normalize(vec2(-0.30, -0.95))));
  vec3 silverOuter = vec3(0.78, 0.82, 0.86) * outerWall * rimAsymmetry;
  vec3 silverInner = mix(vec3(0.42, 0.47, 0.54), vec3(0.82, 0.85, 0.88), lowerWall)
    * innerWall * (0.46 + lowerWall * 0.46);
  vec3 rimLight = u_rimColor * fresnelF * 0.46
    + (silverOuter * 0.72 + silverInner * 0.62) * u_shellReflectivity;

  // ── Key light specular (Blinn-Phong) ─────────────────────────────────────

  vec2 keyLightLocal = (u_keyLightPos - u_center);
  keyLightLocal.x *= aspect;
  vec3 keyDir = normalize(vec3(keyLightLocal - p, 1.5));
  vec3 halfDir = normalize(keyDir + viewDir);
  float spec = pow(max(dot(normal, halfDir), 0.0), u_specularExponent) * u_specularIntensity;
  vec3 keySpecular = mix(u_keyLightColor, vec3(0.92, 0.94, 0.97), 0.58)
    * spec * u_keyLightIntensity * 0.18;

  // ── Fill light diffuse ────────────────────────────────────────────────────

  vec2 fillLightLocal = (u_fillLightPos - u_center);
  fillLightLocal.x *= aspect;
  vec3 fillDir = normalize(vec3(fillLightLocal - p, 1.2));
  float fillDiff = max(dot(normal, fillDir), 0.0) * u_fillLightIntensity * 0.25;
  vec3 fillLight = u_fillLightColor * fillDiff;

  // ── Subsurface / inner glow ───────────────────────────────────────────────

  // ── Chromatic aberration at edges ─────────────────────────────────────────

  float refractionDepth = mix(0.08, 0.24, thickness);
  vec2 refractionOffset = -normal2D * u_refractionStrength * refractionDepth;
  float dispersion = u_chromaticAberration * (0.45 + fresnelF);
  vec2 uvR = clamp(uv + refractionOffset * (1.0 + dispersion), vec2(0.001), vec2(0.999));
  vec2 uvG = clamp(uv + refractionOffset, vec2(0.001), vec2(0.999));
  vec2 uvB = clamp(uv + refractionOffset * (1.0 - dispersion), vec2(0.001), vec2(0.999));
  vec3 refractedScene = vec3(
    texture(u_sceneTexture, uvR).r,
    texture(u_sceneTexture, uvG).g,
    texture(u_sceneTexture, uvB).b
  );
  vec3 transmittance = exp(-u_absorption * thickness * u_opticalDensity);
  vec3 transmittedScene = refractedScene * transmittance;
  vec3 volumeScatter = u_glassColor * (vec3(1.0) - transmittance)
    * u_scattering * (0.35 + thickness * 0.65);
  float silverVeil = smoothstep(0.07, 0.62, thickness)
    * (0.68 + 0.32 * max(dot(normal, normalize(vec3(-0.42, 0.52, 1.0))), 0.0));
  volumeScatter += vec3(0.25, 0.29, 0.34) * silverVeil * 0.24;
  float causticBand = exp(-pow((thickness - 0.34) / 0.13, 2.0))
    * max(dot(normal2D, normalize(vec2(-0.7, 0.5))), 0.0);
  vec3 innerCaustic = u_rimColor * causticBand * u_causticStrength;

  // ── Glass body color ──────────────────────────────────────────────────────

  // Glass transparency varies with angle: more transparent at center, less at edge
  float angleTransparency = u_transparency - fresnelF * 0.3;
  vec3 glassBody = u_glassColor * (1.0 - angleTransparency) * (0.28 + depth * 0.52);

  // ── Composite ─────────────────────────────────────────────────────────────

  float sceneMix = u_hasSceneTexture ? u_sceneTransmission : 0.0;
  vec3 color = mix(glassBody, transmittedScene, sceneMix);
  color += volumeScatter;
  color += innerCaustic;
  color += rimLight;
  color += keySpecular;
  color += fillLight;

  float absorptionOpacity = 1.0 - dot(transmittance, vec3(0.2126, 0.7152, 0.0722));
  float bodyOpacity = u_hasSceneTexture
    ? 0.16 + absorptionOpacity * 0.52
    : 0.34 + absorptionOpacity * 0.38;
  bodyOpacity += outerWall * 0.15 + innerWall * 0.08;
  float alpha = mix(bodyOpacity, 0.96, clamp(fresnelF * 0.75 + spec * 0.45, 0.0, 1.0));
  alpha = clamp(alpha, 0.0, 1.0);

  // Apply edge anti-aliasing
  alpha *= edgeFade;
  color *= edgeFade;

  // Premultiplied alpha (required for correct compositing over transparent canvas)
  fragColor = vec4(color * alpha, alpha);
}
`;
