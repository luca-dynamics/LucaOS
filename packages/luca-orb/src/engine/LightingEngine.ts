export class LightingEngine {
  public static getSkSLLightingHeader(): string {
    return `
vec3 computeThreePointLighting(vec2 st, float outerRadius, float t, vec3 colorCore, vec3 colorPrimary) {
  vec2 keyLightPos = vec2(cos(t * 0.5) * 0.14, sin(t * 0.5) * 0.14);
  vec2 fillLightPos = vec2(cos(-t * 0.35 + 2.1) * 0.18, sin(-t * 0.35 + 2.1) * 0.18);
  vec2 rimLightPos = vec2(-0.22, -0.22);

  float keyLight = pow(clamp(1.0 - length(st - keyLightPos) / (outerRadius * 1.1), 0.0, 1.0), 3.0);
  float fillLight = pow(clamp(1.0 - length(st - fillLightPos) / (outerRadius * 1.3), 0.0, 1.0), 2.5);
  float rimLight = pow(clamp(1.0 - length(st - rimLightPos) / (outerRadius * 0.5), 0.0, 1.0), 6.0);

  return (colorCore * keyLight * 0.35) + (colorPrimary * fillLight * 0.2) + (vec3(1.0) * rimLight * 0.15);
}
`;
  }
}
