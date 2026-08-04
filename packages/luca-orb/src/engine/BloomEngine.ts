export class BloomEngine {
  public static getSkSLBloomHeader(): string {
    return `
vec3 applyDualGlowAndGrain(vec3 chromoRGB, vec3 colorCore, vec3 colorRim, float radialRatio, float fresnel, vec2 fragCoord, float time) {
  float grain = fract(sin(dot(fragCoord * (time * 0.01 + 1.0), vec2(12.9898, 78.233))) * 43758.5453) * 0.018;
  vec3 dualGlow = (colorCore * (1.0 - radialRatio) * 0.15) + (colorRim * fresnel * 0.25);
  return chromoRGB + dualGlow + vec3(grain);
}
`;
  }
}
