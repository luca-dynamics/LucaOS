/** Neutral structure-only view. No glass, glow, smoke, refraction, or state FX. */
export const STRUCTURE_DIAGNOSTIC_FRAG = /* glsl */`#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform vec2 u_resolution;
uniform sampler2D u_thicknessMap;
uniform sampler2D u_pearlDepthMap;

float coverageAt(sampler2D map, vec2 uv) {
  vec4 sampleValue = texture(map, uv);
  return min(sampleValue.b, sampleValue.a);
}

vec3 depthNormal(sampler2D map, vec2 uv, float strength) {
  vec2 texel = 1.5 / u_resolution;
  float left = texture(map, uv - vec2(texel.x, 0.0)).r;
  float right = texture(map, uv + vec2(texel.x, 0.0)).r;
  float down = texture(map, uv - vec2(0.0, texel.y)).r;
  float up = texture(map, uv + vec2(0.0, texel.y)).r;
  return normalize(vec3((left - right) * strength, (down - up) * strength, 1.0));
}

void main() {
  vec4 shell = texture(u_thicknessMap, v_uv);
  vec4 pearl = texture(u_pearlDepthMap, v_uv);
  float shellCoverage = min(shell.b, shell.a);
  float pearlCoverage = min(pearl.b, pearl.a);
  if (shellCoverage < 0.001) {
    fragColor = vec4(0.0);
    return;
  }

  vec2 texel = 2.0 / u_resolution;
  float shellNeighbour = min(min(
    coverageAt(u_thicknessMap, v_uv + vec2(texel.x, 0.0)),
    coverageAt(u_thicknessMap, v_uv - vec2(texel.x, 0.0))
  ), min(
    coverageAt(u_thicknessMap, v_uv + vec2(0.0, texel.y)),
    coverageAt(u_thicknessMap, v_uv - vec2(0.0, texel.y))
  ));
  float pearlNeighbour = min(min(
    coverageAt(u_pearlDepthMap, v_uv + vec2(texel.x, 0.0)),
    coverageAt(u_pearlDepthMap, v_uv - vec2(texel.x, 0.0))
  ), min(
    coverageAt(u_pearlDepthMap, v_uv + vec2(0.0, texel.y)),
    coverageAt(u_pearlDepthMap, v_uv - vec2(0.0, texel.y))
  ));

  float shellEdge = clamp(shellCoverage - shellNeighbour, 0.0, 1.0);
  float pearlEdge = clamp(pearlCoverage - pearlNeighbour, 0.0, 1.0);
  float shellThickness = max(shell.r - shell.g, 0.0) * shellCoverage;
  float pearlThickness = max(pearl.r - pearl.g, 0.0) * pearlCoverage;

  vec3 lightDirection = normalize(vec3(-0.48, 0.66, 0.84));
  vec3 shellNormal = depthNormal(u_thicknessMap, v_uv, 42.0);
  vec3 pearlNormal = depthNormal(u_pearlDepthMap, v_uv, 34.0);
  float shellLight = 0.36 + max(dot(shellNormal, lightDirection), 0.0) * 0.28;
  float pearlLight = 0.46 + max(dot(pearlNormal, lightDirection), 0.0) * 0.30;

  // Rear shell establishes the complete silhouette; the front shell is a
  // restrained value ramp so thickness remains legible without glass tricks.
  vec3 color = vec3(0.24, 0.26, 0.30) * shellLight;
  color += vec3(0.16, 0.17, 0.20) * smoothstep(0.10, 0.68, shellThickness);

  if (pearlCoverage > 0.001) {
    vec3 pearlColor = vec3(0.53, 0.56, 0.61) * pearlLight;
    pearlColor += vec3(0.08) * smoothstep(0.18, 0.66, pearlThickness);
    color = mix(color, pearlColor, 0.92 * pearlCoverage);
  }

  color = mix(color, vec3(0.84, 0.87, 0.91), shellEdge * 0.92);
  color = mix(color, vec3(0.12, 0.13, 0.15), pearlEdge * 0.82);
  fragColor = vec4(color, 1.0);
}
`;
