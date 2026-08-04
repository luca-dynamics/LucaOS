export class RefractionEngine {
  public static getSkSLRefractionHeader(): string {
    return `
vec3 applyGlassRefractionAndChromatic(vec3 compositeRGB, vec2 st, float refractionStr) {
  float chromoShift = 0.003 * refractionStr;
  return vec3(
    compositeRGB.r + snoise(st * 10.0 + vec2(chromoShift, 0.0)) * 0.04,
    compositeRGB.g,
    compositeRGB.b + snoise(st * 10.0 - vec2(chromoShift, 0.0)) * 0.04
  );
}
`;
  }
}
