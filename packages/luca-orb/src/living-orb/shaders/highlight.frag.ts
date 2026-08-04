/**
 * Highlight layer shader — key and secondary specular highlights.
 *
 * These are rendered as independent smooth elliptical patches,
 * separate from the per-fragment specular in glass.frag.ts.
 *
 * The reason for a separate layer:
 *  - The glass body's per-fragment specular gives physically correct behaviour
 *  - This layer adds the large, painterly "hero highlight" visible in the mockup
 *  - The hero highlight slowly drifts (highlightDrift uniform) — like ambient light moving
 *  - This makes the orb feel like it exists in a real lit environment
 *
 * Blend mode: SRC_ALPHA / ONE (additive)
 */
export const HIGHLIGHT_FRAG = /* glsl */`#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform vec2  u_resolution;
uniform float u_time;

// Orb placement
uniform vec2  u_center;
uniform float u_radius;
uniform float u_breathingScale;

// Key highlight (large, soft, upper area)
uniform vec3  u_keyHighlightColor;
uniform float u_keyHighlightIntensity;
uniform float u_keyHighlightSize;     // Relative to radius
uniform vec2  u_keyHighlightOffset;   // Offset from center in orb-radius units
uniform float u_highlightDrift;       // Phase 0–2π, slow rotation

// Secondary highlight (smaller, lower, complementary)
uniform vec3  u_secondaryHighlightColor;
uniform float u_secondaryHighlightIntensity;
uniform float u_secondaryHighlightSize;
uniform vec2  u_secondaryHighlightOffset;

// Orb mask radius (approximate — not full SDF, just radius check)
uniform float u_maskSoftness;

void main() {
  vec2 uv = v_uv;
  float aspect = u_resolution.x / u_resolution.y;

  vec2 p = uv - u_center;
  p.x *= aspect;

  float scale = u_radius * u_breathingScale;
  vec2 localP = p / scale;

  // ── Orb mask (approximate sphere — highlights only appear inside orb) ─────

  float distFromCenter = length(localP);
  float orbMask = 1.0 - smoothstep(0.9, 1.05, distFromCenter);
  if (orbMask < 0.001) {
    fragColor = vec4(0.0);
    return;
  }

  // ── Highlight drift: the key highlight slowly wanders ────────────────────

  // The drift is very subtle — imagine ambient light slowly shifting in a room
  float driftX = sin(u_highlightDrift) * 0.08;
  float driftY = cos(u_highlightDrift * 0.7) * 0.05;

  // ── Key highlight ─────────────────────────────────────────────────────────

  vec2 keyCenter = u_keyHighlightOffset + vec2(driftX, driftY);
  vec2 dKey = localP - keyCenter;
  // Elliptical: tilted slightly to match Apple's painterly highlight vector
  float angle = 0.35;
  mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
  dKey = rot * dKey;
  dKey.x *= 0.70;
  dKey.y *= 1.15;

  float keyDist = length(dKey);
  float keyR = u_keyHighlightSize;
  
  // Painterly dual-falloff (bright core + soft ambient spread)
  float coreSpot = exp(-pow(keyDist / (keyR * 0.45), 2.2));
  float softHalo = exp(-pow(keyDist / keyR, 1.4)) * 0.55;
  float keyGlow  = coreSpot + softHalo;

  // ── Secondary highlight (smaller, rounder, different position) ────────────

  vec2 secCenter = u_secondaryHighlightOffset + vec2(-driftX * 0.4, driftY * 0.3);
  float secDist = length(localP - secCenter);
  float secR = u_secondaryHighlightSize;
  float secGlow = exp(-pow(secDist / secR, 2.0));

  // ── Composite ─────────────────────────────────────────────────────────────

  vec3 color = u_keyHighlightColor * keyGlow * u_keyHighlightIntensity
             + u_secondaryHighlightColor * secGlow * u_secondaryHighlightIntensity;

  float alpha = (keyGlow * u_keyHighlightIntensity + secGlow * u_secondaryHighlightIntensity * 0.4);
  alpha *= orbMask;
  alpha = clamp(alpha, 0.0, 1.0);

  // Premultiplied
  fragColor = vec4(color * alpha, alpha);
}
`;
