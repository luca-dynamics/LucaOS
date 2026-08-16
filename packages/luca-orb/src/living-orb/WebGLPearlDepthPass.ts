import {
  LUCA_HERO_ASSEMBLY_V3,
  sampleOrbContour,
  sampleOrbHalfDepth,
  type HeroPearlVolume,
} from '@luca/orb-design';

export interface PearlVolumeMesh {
  readonly vertices: Float32Array;
  readonly indices: Uint16Array;
  readonly vertexCount: number;
  readonly triangleCount: number;
}

const DEFAULT_RADIAL_RINGS = 36;
const DEFAULT_ANGLE_SEGMENTS = 96;
const TAU = Math.PI * 2;

export function buildPearlVolumeMesh(
  pearl: HeroPearlVolume = LUCA_HERO_ASSEMBLY_V3.innerPearl,
  radialRings = DEFAULT_RADIAL_RINGS,
  angleSegments = DEFAULT_ANGLE_SEGMENTS,
): PearlVolumeMesh {
  if (radialRings < 2) throw new Error('Pearl volume mesh requires at least two radial rings.');
  if (angleSegments < 12) throw new Error('Pearl volume mesh requires at least twelve angle segments.');

  const vertices: number[] = [];
  const indices: number[] = [];
  const verticesPerSurface = 1 + radialRings * angleSegments;
  const { contour, depth } = pearl;

  for (const surface of [1, -1] as const) {
    const base = vertices.length / 4;
    const center = contour.center;
    const centerHalfDepth = sampleOrbHalfDepth(depth, 0, center);
    const centerZ = centerHalfDepth * (surface > 0 ? depth.frontScale : -depth.rearScale);
    vertices.push(center[0], center[1], centerZ, surface);

    for (let ring = 1; ring <= radialRings; ring += 1) {
      const radial = ring / radialRings;
      for (let segment = 0; segment < angleSegments; segment += 1) {
        const angle = segment / angleSegments * TAU;
        const radius = sampleOrbContour(contour, angle);
        const x = center[0] + Math.cos(angle) * radius * contour.axes[0] * radial;
        const y = center[1] + Math.sin(angle) * radius * contour.axes[1] * radial;
        const halfDepth = sampleOrbHalfDepth(depth, radial, [x, y]);
        const z = halfDepth * (surface > 0 ? depth.frontScale : -depth.rearScale);
        vertices.push(x, y, z, surface);
      }
    }

    const firstRing = base + 1;
    for (let segment = 0; segment < angleSegments; segment += 1) {
      const next = (segment + 1) % angleSegments;
      indices.push(base, firstRing + segment, firstRing + next);
    }

    for (let ring = 1; ring < radialRings; ring += 1) {
      const innerStart = base + 1 + (ring - 1) * angleSegments;
      const outerStart = innerStart + angleSegments;
      for (let segment = 0; segment < angleSegments; segment += 1) {
        const next = (segment + 1) % angleSegments;
        indices.push(
          innerStart + segment, outerStart + segment, outerStart + next,
          innerStart + segment, outerStart + next, innerStart + next,
        );
      }
    }

    if (vertices.length / 4 !== base + verticesPerSurface) {
      throw new Error('Pearl volume mesh vertex layout is inconsistent.');
    }
  }

  if (vertices.length / 4 > 0xffff) {
    throw new Error('Pearl volume mesh exceeds the 16-bit index envelope.');
  }

  return {
    vertices: new Float32Array(vertices),
    indices: new Uint16Array(indices),
    vertexCount: vertices.length / 4,
    triangleCount: indices.length / 3,
  };
}

const PEARL_DEPTH_VERT = /* glsl */`#version 300 es
precision highp float;

in vec3 a_position;
in float a_surface;

uniform vec2 u_resolution;
uniform vec2 u_center;
uniform float u_radius;
uniform float u_breathingScale;

out float v_depth;
flat out float v_surface;

void main() {
  float aspect = u_resolution.x / u_resolution.y;
  vec2 scaledLocal = a_position.xy * u_radius * u_breathingScale;
  vec2 uv = u_center + vec2(scaledLocal.x / aspect, scaledLocal.y);
  gl_Position = vec4(uv * 2.0 - 1.0, 0.0, 1.0);
  v_depth = clamp(0.5 + a_position.z * 0.5, 0.0, 1.0);
  v_surface = a_surface;
}
`;

const PEARL_DEPTH_FRAG = /* glsl */`#version 300 es
precision highp float;

in float v_depth;
flat in float v_surface;
out vec4 fragColor;

void main() {
  fragColor = v_surface > 0.0
    ? vec4(v_depth, 0.0, 1.0, 0.0)
    : vec4(0.0, v_depth, 0.0, 1.0);
}
`;

/** Independent suspended-pearl depth pass behind OrbRenderer's interface. */
export class WebGLPearlDepthPass {
  private readonly program: WebGLProgram;
  private readonly vao: WebGLVertexArrayObject;
  private readonly vertexBuffer: WebGLBuffer;
  private readonly indexBuffer: WebGLBuffer;
  private readonly indexCountPerSurface: number;
  private readonly uniformLocations = new Map<string, WebGLUniformLocation | null>();

  constructor(private readonly gl: WebGL2RenderingContext) {
    const mesh = buildPearlVolumeMesh();
    this.indexCountPerSurface = mesh.indices.length / 2;
    this.program = this.createProgram(PEARL_DEPTH_VERT, PEARL_DEPTH_FRAG);
    const vao = gl.createVertexArray();
    const vertexBuffer = gl.createBuffer();
    const indexBuffer = gl.createBuffer();
    if (!vao || !vertexBuffer || !indexBuffer) throw new Error('Failed to allocate pearl volume mesh.');
    this.vao = vao;
    this.vertexBuffer = vertexBuffer;
    this.indexBuffer = indexBuffer;

    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.vertices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
    const stride = 4 * Float32Array.BYTES_PER_ELEMENT;
    const positionLocation = gl.getAttribLocation(this.program, 'a_position');
    const surfaceLocation = gl.getAttribLocation(this.program, 'a_surface');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(surfaceLocation);
    gl.vertexAttribPointer(surfaceLocation, 1, gl.FLOAT, false, stride, 3 * Float32Array.BYTES_PER_ELEMENT);
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
    }
    gl.bindVertexArray(this.vao);
    gl.disable(gl.BLEND);
    gl.colorMask(true, false, true, false);
    gl.drawElements(gl.TRIANGLES, this.indexCountPerSurface, gl.UNSIGNED_SHORT, 0);
    gl.colorMask(false, true, false, true);
    gl.drawElements(
      gl.TRIANGLES,
      this.indexCountPerSurface,
      gl.UNSIGNED_SHORT,
      this.indexCountPerSurface * Uint16Array.BYTES_PER_ELEMENT,
    );
    gl.colorMask(true, true, true, true);
    gl.bindVertexArray(null);
  }

  dispose(): void {
    this.gl.deleteBuffer(this.vertexBuffer);
    this.gl.deleteBuffer(this.indexBuffer);
    this.gl.deleteVertexArray(this.vao);
    this.gl.deleteProgram(this.program);
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
      if (!shader) throw new Error('Failed to create pearl volume shader.');
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const info = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(`Pearl volume shader compile error:\n${info}`);
      }
      return shader;
    };
    const vertex = compile(vertexSource, gl.VERTEX_SHADER);
    const fragment = compile(fragmentSource, gl.FRAGMENT_SHADER);
    const program = gl.createProgram();
    if (!program) throw new Error('Failed to create pearl volume program.');
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`Pearl volume program link error:\n${info}`);
    }
    return program;
  }
}
