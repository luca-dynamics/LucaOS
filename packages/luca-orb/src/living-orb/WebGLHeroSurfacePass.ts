import {
  LUCA_HERO_ASSEMBLY_V3,
  type HeroRibbonSurface,
  type HeroSurfacePoint,
  type LucaHeroAssembly,
} from '@luca/orb-design';

export interface HeroSurfaceMeshRange {
  readonly id: string;
  readonly firstIndex: number;
  readonly indexCount: number;
}

export interface HeroSurfaceMesh {
  readonly vertices: Float32Array;
  readonly indices: Uint16Array;
  readonly ranges: readonly HeroSurfaceMeshRange[];
  readonly vertexCount: number;
  readonly triangleCount: number;
}

const FLOATS_PER_VERTEX = 18;
const DEFAULT_CURVE_SEGMENTS = 48;
const DEFAULT_CROSS_SEGMENTS = 10;

function clampIndex(index: number, length: number): number {
  return Math.min(length - 1, Math.max(0, index));
}

function catmullRomScalar(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (
    2 * p1
    + (-p0 + p2) * t
    + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2
    + (-p0 + 3 * p1 - 3 * p2 + p3) * t3
  );
}

function sampleOpenPoint(points: readonly HeroSurfacePoint[], progress: number): HeroSurfacePoint {
  const position = Math.min(1, Math.max(0, progress)) * (points.length - 1);
  const index = Math.min(points.length - 2, Math.floor(position));
  const t = position - index;
  const p0 = points[clampIndex(index - 1, points.length)];
  const p1 = points[index];
  const p2 = points[index + 1];
  const p3 = points[clampIndex(index + 2, points.length)];
  return [
    catmullRomScalar(p0[0], p1[0], p2[0], p3[0], t),
    catmullRomScalar(p0[1], p1[1], p2[1], p3[1], t),
    catmullRomScalar(p0[2], p1[2], p2[2], p3[2], t),
  ];
}

function sampleOpenScalar(values: readonly number[], progress: number): number {
  const position = Math.min(1, Math.max(0, progress)) * (values.length - 1);
  const index = Math.min(values.length - 2, Math.floor(position));
  const t = position - index;
  return catmullRomScalar(
    values[clampIndex(index - 1, values.length)],
    values[index],
    values[index + 1],
    values[clampIndex(index + 2, values.length)],
    t,
  );
}

function surfaceKindIndex(surface: HeroRibbonSurface): number {
  switch (surface.kind) {
    case 'crown-sheet': return 0;
    case 'lower-fold': return 1;
    case 'reflection-ribbon': return 2;
  }
}

/** Tessellate every authored open surface into one GPU mesh. */
export function buildHeroSurfaceMesh(
  assembly: LucaHeroAssembly = LUCA_HERO_ASSEMBLY_V3,
  curveSegments = DEFAULT_CURVE_SEGMENTS,
  crossSegments = DEFAULT_CROSS_SEGMENTS,
): HeroSurfaceMesh {
  if (curveSegments < 4) throw new Error('Hero surfaces require at least four curve segments.');
  if (crossSegments < 4 || crossSegments % 2 !== 0) {
    throw new Error('Hero surfaces require an even cross-section of at least four segments.');
  }

  const vertices: number[] = [];
  const indices: number[] = [];
  const ranges: HeroSurfaceMeshRange[] = [];

  for (const authoredSurface of assembly.surfaces) {
    const firstVertex = vertices.length / FLOATS_PER_VERTEX;
    const firstIndex = indices.length;
    const kind = surfaceKindIndex(authoredSurface);

    for (let segment = 0; segment <= curveSegments; segment += 1) {
      const along = segment / curveSegments;
      const point = sampleOpenPoint(authoredSurface.controlPoints, along);
      const sampleDistance = 1 / curveSegments;
      const previous = sampleOpenPoint(authoredSurface.controlPoints, Math.max(0, along - sampleDistance));
      const next = sampleOpenPoint(authoredSurface.controlPoints, Math.min(1, along + sampleDistance));
      const tangentX = next[0] - previous[0];
      const tangentY = next[1] - previous[1];
      const tangentLength = Math.hypot(tangentX, tangentY) || 1;
      const normalX = -tangentY / tangentLength;
      const normalY = tangentX / tangentLength;
      const halfWidth = Math.max(0.001, sampleOpenScalar(authoredSurface.widthSamples, along) * 0.5);

      for (let cross = 0; cross <= crossSegments; cross += 1) {
        const across = cross / crossSegments * 2 - 1;
        const {
          color, opacity, edgeGain, centerShade,
          thickness, curvature, roughness,
        } = authoredSurface.material;
        const crossAngle = across * Math.PI * 0.5;
        const crossHeight = Math.cos(crossAngle) * thickness * curvature;
        const crossSlope = -Math.sin(crossAngle) * curvature;
        const normalLength = Math.hypot(crossSlope, 1);
        const normalAcross = -crossSlope / normalLength;
        const normalZ = 1 / normalLength;
        vertices.push(
          point[0] + normalX * halfWidth * across,
          point[1] + normalY * halfWidth * across,
          point[2] + crossHeight,
          across,
          along,
          kind,
          color[0], color[1], color[2],
          opacity,
          edgeGain,
          centerShade,
          normalX * normalAcross,
          normalY * normalAcross,
          normalZ,
          thickness,
          roughness,
          curvature,
        );
      }
    }

    for (let segment = 0; segment < curveSegments; segment += 1) {
      const row = firstVertex + segment * (crossSegments + 1);
      const nextRow = row + crossSegments + 1;
      for (let cross = 0; cross < crossSegments; cross += 1) {
        indices.push(
          row + cross,
          row + cross + 1,
          nextRow + cross + 1,
          row + cross,
          nextRow + cross + 1,
          nextRow + cross,
        );
      }
    }

    ranges.push(Object.freeze({
      id: authoredSurface.id,
      firstIndex,
      indexCount: indices.length - firstIndex,
    }));
  }

  if (vertices.length / FLOATS_PER_VERTEX > 0xffff) {
    throw new Error('Hero surface mesh exceeds the 16-bit index envelope.');
  }

  return {
    vertices: new Float32Array(vertices),
    indices: new Uint16Array(indices),
    ranges: Object.freeze(ranges),
    vertexCount: vertices.length / FLOATS_PER_VERTEX,
    triangleCount: indices.length / 3,
  };
}

const HERO_SURFACE_VERT = /* glsl */`#version 300 es
precision highp float;

in vec3 a_position;
in vec2 a_surfaceUv;
in float a_kind;
in vec3 a_color;
in vec3 a_material;
in vec3 a_normal;
in vec3 a_optics;

uniform vec2 u_resolution;
uniform vec2 u_center;
uniform float u_radius;
uniform float u_breathingScale;
uniform float u_time;
uniform float u_audioEnergy;

out vec2 v_surfaceUv;
out float v_kind;
out float v_depth;
out vec3 v_color;
out vec3 v_material;
out vec3 v_normal;
out vec3 v_optics;
out vec2 v_screenUv;

void main() {
  float aspect = u_resolution.x / u_resolution.y;
  float livingEnergy = sin(u_time * 0.42 + a_surfaceUv.y * 2.4) * 0.002
    + u_audioEnergy * 0.004;
  vec2 local = a_position.xy * (1.0 + livingEnergy);
  vec2 uv = u_center + vec2(
    local.x * u_radius * u_breathingScale / aspect,
    local.y * u_radius * u_breathingScale
  );
  gl_Position = vec4(uv * 2.0 - 1.0, a_position.z * 0.01, 1.0);
  v_surfaceUv = a_surfaceUv;
  v_kind = a_kind;
  v_depth = a_position.z;
  v_color = a_color;
  v_material = a_material;
  v_normal = normalize(a_normal);
  v_optics = a_optics;
  v_screenUv = uv;
}
`;

const HERO_SURFACE_FRAG = /* glsl */`#version 300 es
precision highp float;

in vec2 v_surfaceUv;
in float v_kind;
in float v_depth;
in vec3 v_color;
in vec3 v_material;
in vec3 v_normal;
in vec3 v_optics;
in vec2 v_screenUv;
uniform sampler2D u_thicknessMap;
uniform sampler2D u_pearlDepthMap;
uniform vec2 u_keyLightDirection;
uniform vec3 u_keyLightColor;
uniform float u_structureMode;
out vec4 fragColor;

void main() {
  float across = abs(v_surfaceUv.x);
  float edgeFeather = 1.0 - smoothstep(0.90, 1.0, across);
  float endFeather = smoothstep(0.0, 0.055, v_surfaceUv.y)
    * smoothstep(0.0, 0.075, 1.0 - v_surfaceUv.y);
  vec4 shellSample = texture(u_thicknessMap, v_screenUv);
  float shellThickness = max(shellSample.r - shellSample.g, 0.0)
    * min(shellSample.b, shellSample.a);
  float shellCoverage = smoothstep(0.015, 0.10, shellThickness);
  if (shellCoverage <= 0.001) discard;
  vec4 pearlSample = texture(u_pearlDepthMap, v_screenUv);
  float pearlFront = pearlSample.r;
  float surfaceDepth = 0.5 + v_depth * 0.5;
  float pearlSeparation = pearlSample.b < 0.5
    ? 1.0
    : smoothstep(-0.018, 0.035, surfaceDepth - pearlFront);

  if (u_structureMode > 0.5) {
    vec3 diagnosticColor = v_kind < 0.5
      ? vec3(0.70, 0.72, 0.76)
      : v_kind < 1.5
        ? vec3(0.43, 0.45, 0.49)
        : vec3(0.82, 0.84, 0.87);
    float diagnosticAlpha = (0.48 + across * 0.18)
      * edgeFeather * endFeather * shellCoverage
      * mix(0.58, 1.0, pearlSeparation);
    fragColor = vec4(diagnosticColor * diagnosticAlpha, diagnosticAlpha);
    return;
  }

  vec3 normal = normalize(v_normal);
  vec3 lightDirection = normalize(vec3(u_keyLightDirection, 0.78));
  vec3 viewDirection = vec3(0.0, 0.0, 1.0);
  vec3 halfDirection = normalize(lightDirection + viewDirection);
  float diffuse = max(dot(normal, lightDirection), 0.0);
  float fresnel = pow(1.0 - max(dot(normal, viewDirection), 0.0), 3.4);
  float specularExponent = mix(92.0, 20.0, v_optics.y);
  float specular = pow(max(dot(normal, halfDirection), 0.0), specularExponent);
  float edgeLight = fresnel * v_material.y;
  float centreTone = mix(v_material.z, 1.0, diffuse);
  float depthLight = mix(0.70, 1.05, v_depth);
  float opticalPath = v_optics.x / max(normal.z, 0.25);
  float transmission = exp(-opticalPath * mix(5.5, 2.8, diffuse));

  float crownVeil = 1.0;
  if (v_kind < 0.5) {
    crownVeil = 0.66 + 0.34 * smoothstep(0.0, 0.48, v_surfaceUv.y);
  } else if (v_kind < 1.5) {
    float foldTrough = exp(-pow(v_surfaceUv.x * 2.4, 2.0));
    centreTone *= mix(1.0, 0.82, foldTrough);
    edgeLight *= 1.18;
  } else {
    centreTone = 0.62 + diffuse * 0.30 + across * 0.18;
    edgeLight *= 1.32;
  }

  float alpha = v_material.x * (1.0 - transmission) * 2.0
    * edgeFeather * endFeather * crownVeil * shellCoverage
    * mix(0.42, 1.0, pearlSeparation);
  alpha = clamp(alpha, 0.0, 0.34);
  vec3 subsurface = mix(v_color * 0.60, v_color, transmission);
  vec3 color = subsurface * centreTone * depthLight;
  color += u_keyLightColor * (specular * 0.72 + edgeLight * 0.34);
  color += vec3(0.08, 0.13, 0.20) * shellThickness * (1.0 - transmission);
  fragColor = vec4(color * alpha, alpha);
}
`;

/** Private authored-geometry pass behind OrbRenderer's existing interface. */
export class WebGLHeroSurfacePass {
  private readonly program: WebGLProgram;
  private readonly vao: WebGLVertexArrayObject;
  private readonly vertexBuffer: WebGLBuffer;
  private readonly indexBuffer: WebGLBuffer;
  private readonly indexCount: number;
  private readonly uniformLocations = new Map<string, WebGLUniformLocation | null>();

  constructor(private readonly gl: WebGL2RenderingContext) {
    const mesh = buildHeroSurfaceMesh();
    const program = this.createProgram(HERO_SURFACE_VERT, HERO_SURFACE_FRAG);
    const vao = gl.createVertexArray();
    const vertexBuffer = gl.createBuffer();
    const indexBuffer = gl.createBuffer();
    if (!vao || !vertexBuffer || !indexBuffer) throw new Error('Failed to allocate hero surface mesh.');

    this.program = program;
    this.vao = vao;
    this.vertexBuffer = vertexBuffer;
    this.indexBuffer = indexBuffer;
    this.indexCount = mesh.indices.length;

    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.vertices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);

    const stride = FLOATS_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT;
    this.bindAttribute(program, 'a_position', 3, stride, 0);
    this.bindAttribute(program, 'a_surfaceUv', 2, stride, 3);
    this.bindAttribute(program, 'a_kind', 1, stride, 5);
    this.bindAttribute(program, 'a_color', 3, stride, 6);
    this.bindAttribute(program, 'a_material', 3, stride, 9);
    this.bindAttribute(program, 'a_normal', 3, stride, 12);
    this.bindAttribute(program, 'a_optics', 3, stride, 15);
    gl.bindVertexArray(null);
  }

  draw(uniforms: Record<string, number | readonly number[]>): void {
    const gl = this.gl;
    gl.useProgram(this.program);
    for (const [name, value] of Object.entries(uniforms)) {
      const location = this.loc(name);
      if (location === null) continue;
      if (typeof value === 'number') gl.uniform1f(location, value);
      else if (value.length === 2) gl.uniform2fv(location, value);
      else if (value.length === 3) gl.uniform3fv(location, value);
    }
    gl.bindVertexArray(this.vao);
    gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
  }

  bindThicknessMap(texture: WebGLTexture, unit: number): void {
    this.gl.useProgram(this.program);
    const location = this.loc('u_thicknessMap');
    if (location === null) return;
    this.gl.activeTexture(this.gl.TEXTURE0 + unit);
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.uniform1i(location, unit);
  }

  bindPearlDepthMap(texture: WebGLTexture, unit: number): void {
    this.gl.useProgram(this.program);
    const location = this.loc('u_pearlDepthMap');
    if (location === null) return;
    this.gl.activeTexture(this.gl.TEXTURE0 + unit);
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.uniform1i(location, unit);
  }

  dispose(): void {
    const gl = this.gl;
    gl.deleteBuffer(this.vertexBuffer);
    gl.deleteBuffer(this.indexBuffer);
    gl.deleteVertexArray(this.vao);
    gl.deleteProgram(this.program);
  }

  private bindAttribute(program: WebGLProgram, name: string, size: number, stride: number, floatOffset: number): void {
    const location = this.gl.getAttribLocation(program, name);
    this.gl.enableVertexAttribArray(location);
    this.gl.vertexAttribPointer(location, size, this.gl.FLOAT, false, stride, floatOffset * Float32Array.BYTES_PER_ELEMENT);
  }

  private loc(name: string): WebGLUniformLocation | null {
    if (!this.uniformLocations.has(name)) {
      this.uniformLocations.set(name, this.gl.getUniformLocation(this.program, name));
    }
    return this.uniformLocations.get(name)!;
  }

  private createProgram(vertexSource: string, fragmentSource: string): WebGLProgram {
    const gl = this.gl;
    const compile = (source: string, type: number): WebGLShader => {
      const shader = gl.createShader(type);
      if (!shader) throw new Error('Failed to create hero surface shader.');
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const info = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(`Hero surface shader compile error:\n${info}`);
      }
      return shader;
    };

    const vertex = compile(vertexSource, gl.VERTEX_SHADER);
    const fragment = compile(fragmentSource, gl.FRAGMENT_SHADER);
    const program = gl.createProgram();
    if (!program) throw new Error('Failed to create hero surface program.');
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`Hero surface program link error:\n${info}`);
    }
    return program;
  }
}
