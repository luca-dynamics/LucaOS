import { NOISE_GLSL } from './noise';

/** Broad suspended pearl and silver particulate volume inside the glass shell. */
export const PEARL_VOLUME_FRAG = /* glsl */`#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_noiseTime;
uniform vec2 u_center;
uniform float u_radius;
uniform float u_breathingScale;
uniform float u_microJitter;
uniform float u_audioEnergy;
uniform float u_audioOnset;
uniform float u_lowFreqAmp;
uniform float u_midFreqAmp;
uniform float u_highFreqAmp;
uniform sampler2D u_thicknessMap;
uniform sampler2D u_pearlDepthMap;
uniform float u_pearlDensity;
uniform float u_pearlScatter;
uniform float u_pearlIridescence;
uniform float u_smokeDensity;
uniform float u_internalBloom;

${NOISE_GLSL}

void main() {
  float aspect = u_resolution.x / u_resolution.y;
  vec2 p = v_uv - u_center;
  p.x *= aspect;
  vec2 localP = p / (u_radius * u_breathingScale);

  vec4 opticalSample = texture(u_thicknessMap, v_uv);
  float shellThickness = max(opticalSample.r - opticalSample.g, 0.0)
    * min(opticalSample.b, opticalSample.a);
  vec4 pearlSample = texture(u_pearlDepthMap, v_uv);
  float pearlCoverage = min(pearlSample.b, pearlSample.a);
  float pearlThickness = max(pearlSample.r - pearlSample.g, 0.0) * pearlCoverage;
  if (pearlThickness <= 0.001 || shellThickness <= 0.001) {
    fragColor = vec4(0.0);
    return;
  }

  vec2 texel = 1.0 / u_resolution;
  float depthLeft = texture(u_pearlDepthMap, v_uv - vec2(texel.x, 0.0)).r;
  float depthRight = texture(u_pearlDepthMap, v_uv + vec2(texel.x, 0.0)).r;
  float depthDown = texture(u_pearlDepthMap, v_uv - vec2(0.0, texel.y)).r;
  float depthUp = texture(u_pearlDepthMap, v_uv + vec2(0.0, texel.y)).r;
  vec3 pearlNormal = normalize(vec3(
    (depthLeft - depthRight) * 18.0,
    (depthDown - depthUp) * 18.0,
    1.0
  ));
  float facing = clamp(dot(pearlNormal, normalize(vec3(-0.32, 0.42, 1.0))), 0.0, 1.0);
  vec2 pearlSpace = (localP - vec2(-0.075, -0.025)) / vec2(0.73, 0.62);
  float pearlAngle = -0.20;
  pearlSpace = mat2(
    cos(pearlAngle), -sin(pearlAngle),
    sin(pearlAngle), cos(pearlAngle)
  ) * pearlSpace;
  float flow = noise2(pearlSpace * 1.7 + vec2(u_noiseTime * 0.18, -u_noiseTime * 0.11));
  float phase = clamp(facing * 0.72 + flow * 0.28, 0.0, 1.0);

  vec3 pearlWarm = vec3(0.56, 0.61, 0.68);
  vec3 pearlCool = vec3(0.73, 0.82, 0.92);
  vec3 pearlTone = mix(pearlWarm, pearlCool, phase * u_pearlIridescence + 0.46);
  float pearlMass = pow(clamp(pearlThickness / 0.62, 0.0, 1.0), 0.46)
    * smoothstep(0.08, 0.34, shellThickness);
  float normalSlope = length(pearlNormal.xy);
  float pearlRim = smoothstep(0.10, 0.66, normalSlope)
    * smoothstep(0.015, 0.12, pearlThickness);
  float crown = exp(-pow((pearlSpace.x + 0.31) / 0.56, 2.0)
    - pow((pearlSpace.y - 0.28) / 0.38, 2.0));
  float rightFalloff = 1.0 - smoothstep(0.05, 0.95, pearlSpace.x);
  float pearlShade = mix(0.52, 1.02, facing) + crown * 0.34 + rightFalloff * 0.10;
  vec3 pearlBody = pearlTone * pearlMass * pearlShade * u_pearlDensity * u_pearlScatter;

  vec2 bloomP = pearlSpace - vec2(-0.07, -0.09);
  float verticalBloom = exp(-pow(bloomP.x / 0.12, 2.0) - pow(bloomP.y / 0.42, 2.0));
  float bloomShoulder = exp(-pow((bloomP.x + 0.16) / 0.34, 2.0) - pow((bloomP.y - 0.10) / 0.56, 2.0));
  vec3 livingBloom = mix(vec3(0.42, 0.57, 0.72), vec3(0.78, 0.86, 0.94), verticalBloom)
    * (verticalBloom * 0.58 + bloomShoulder * 0.16) * pearlMass * u_internalBloom;

  float smokeMass = smoothstep(0.10, 0.62, pearlThickness) * mix(0.78, 1.0, flow);
  vec3 smokeBed = mix(vec3(0.18, 0.23, 0.30), vec3(0.34, 0.41, 0.50), pearlThickness)
    * smokeMass * u_smokeDensity;

  float leftWeight = 1.0 - smoothstep(-0.62, 0.72, pearlSpace.x);
  vec3 color = pearlBody * mix(0.66, 0.82, leftWeight)
    + livingBloom * 0.62
    + smokeBed * mix(0.62, 0.42, leftWeight);
  color += mix(vec3(0.30, 0.35, 0.42), vec3(0.80, 0.84, 0.89), facing)
    * pearlRim * 0.42;
  float alpha = clamp(pearlMass * 0.42 + smokeMass * 0.16, 0.0, 0.68) * pearlCoverage;
  fragColor = vec4(color * pearlCoverage, alpha);
}
`;
