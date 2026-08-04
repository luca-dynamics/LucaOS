/**
 * Contact shadow layer — soft elliptical shadow cast beneath the orb.
 *
 * Even though the orb floats, a very subtle contact shadow grounds it
 * in space. Without it the orb feels disconnected and untethered.
 *
 * This layer renders BELOW everything, using standard alpha blend.
 * The shadow should be nearly invisible — just enough to suggest
 * that the orb occupies real space.
 *
 * Profile-aware: the shadow contracts in sleeping/thinking states
 * (orb feels more introverted) and expands in speaking (expressive).
 */
export const SHADOW_FRAG = /* glsl */`#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform vec2  u_resolution;
uniform float u_time;

// Orb placement
uniform vec2  u_center;
uniform float u_radius;
uniform float u_breathingScale;
uniform float u_floatOffset;     // Vertical drift in normalized units

// Shadow shape
uniform float u_shadowOffsetY;   // How far below orb center (normalized)
uniform float u_shadowSpreadX;   // Horizontal spread (> 1 = wider than orb)
uniform float u_shadowSpreadY;   // Vertical compression (< 1 = flattened)
uniform float u_shadowOpacity;   // Overall alpha [0,1]
uniform vec3  u_shadowColor;

void main() {
  vec2 uv = v_uv;
  float aspect = u_resolution.x / u_resolution.y;

  vec2 p = uv - u_center;
  p.x *= aspect;

  // Shadow center: offset below the orb, tracking its float position
  float shadowY = -(u_radius * u_shadowOffsetY) - u_floatOffset;
  vec2 shadowCenter = vec2(0.0, shadowY);

  vec2 d = p - shadowCenter;

  // Elliptical shadow: stretched on X, compressed on Y
  float r = u_radius * u_breathingScale;
  d.x /= r * u_shadowSpreadX;
  d.y /= r * u_shadowSpreadY;

  float dist = length(d);

  // Soft gaussian shadow
  // Shadow gets softer and more transparent as it gets farther from orb
  float proximityFade = 1.0 - clamp(abs(u_floatOffset) / (u_radius * 0.4), 0.0, 1.0);
  float shadow = exp(-dist * dist * 2.2) * u_shadowOpacity * proximityFade;

  // Very subtle breathing modulation on shadow (shadow shrinks as orb inhales)
  float breathShadow = 1.0 - (u_breathingScale - 1.0) * 3.0;
  shadow *= breathShadow;

  shadow = clamp(shadow, 0.0, 1.0);

  // Premultiplied alpha
  vec3 color = u_shadowColor * shadow;
  fragColor = vec4(color, shadow);
}
`;
