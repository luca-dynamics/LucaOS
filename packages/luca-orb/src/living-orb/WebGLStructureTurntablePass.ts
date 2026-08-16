import {
  CANONICAL_LUCA_VOLUME_V2,
  LUCA_HERO_ASSEMBLY_V3,
  sampleOrbContour,
  sampleOrbHalfDepth,
  type OrbContour,
  type OrbDepthProfile,
  type OrbVolumePoint,
} from '@luca/orb-design';
import { buildHeroSurfaceMesh } from './WebGLHeroSurfacePass';

export type StructureStudy = 'turntable' | 'anatomy';

interface StructureMeshData {
  readonly vertices: Float32Array;
  readonly indices: Uint16Array;
}

interface GpuMesh {
  readonly vao: WebGLVertexArrayObject;
  readonly vertexBuffer: WebGLBuffer;
  readonly indexBuffer: WebGLBuffer;
  readonly indexCount: number;
}

const STRUCTURE_VERTEX_STRIDE = 6;
const TAU = Math.PI * 2;

export function buildLoftedVolumeMesh(
  contour: OrbContour,
  depth: OrbDepthProfile,
  axes: OrbVolumePoint = [1, 1],
  latitudeSegments = 64,
  angleSegments = 128,
): { vertices: Float32Array; indices: Uint16Array } {
  if (latitudeSegments < 8 || angleSegments < 12) {
    throw new Error('Lofted structure mesh requires at least 8 latitude and 12 angle segments.');
  }
  const vertices: number[] = [];
  const indices: number[] = [];
  const centerDepth = sampleOrbHalfDepth(depth, 0, contour.center);
  vertices.push(contour.center[0], contour.center[1], -centerDepth * depth.rearScale);

  for (let latitudeIndex = 1; latitudeIndex < latitudeSegments; latitudeIndex += 1) {
    const latitude = latitudeIndex / latitudeSegments * Math.PI - Math.PI * 0.5;
    const latitudeRadius = Math.pow(Math.max(0, Math.cos(latitude)), 0.92);
    const depthDirection = Math.sin(latitude);
    for (let angleIndex = 0; angleIndex < angleSegments; angleIndex += 1) {
      const angle = angleIndex / angleSegments * TAU;
      const contourRadius = sampleOrbContour(contour, angle);
      const boundaryX = contour.center[0] + Math.cos(angle) * contourRadius * axes[0];
      const boundaryY = contour.center[1] + Math.sin(angle) * contourRadius * axes[1];
      const x = contour.center[0] + (boundaryX - contour.center[0]) * latitudeRadius;
      const y = contour.center[1] + (boundaryY - contour.center[1]) * latitudeRadius;
      const boundaryDepth = sampleOrbHalfDepth(depth, 0, [boundaryX, boundaryY]);
      // Perimeter thickness can vary by angle, but every meridian must
      // converge to the same pole depth or it creates a radial pinch.
      const authoredDepth = centerDepth + (boundaryDepth - centerDepth) * latitudeRadius;
      const depthScale = depthDirection >= 0 ? depth.frontScale : depth.rearScale;
      const z = depthDirection * authoredDepth * depthScale;
      vertices.push(x, y, z);
    }
  }
  const frontPole = vertices.length / 3;
  vertices.push(contour.center[0], contour.center[1], centerDepth * depth.frontScale);

  const firstRing = 1;
  for (let angleIndex = 0; angleIndex < angleSegments; angleIndex += 1) {
    const next = (angleIndex + 1) % angleSegments;
    indices.push(0, firstRing + next, firstRing + angleIndex);
  }

  for (let latitudeIndex = 0; latitudeIndex < latitudeSegments - 2; latitudeIndex += 1) {
    const row = firstRing + latitudeIndex * angleSegments;
    const nextRow = row + angleSegments;
    for (let angleIndex = 0; angleIndex < angleSegments; angleIndex += 1) {
      const next = (angleIndex + 1) % angleSegments;
      indices.push(
        row + angleIndex, nextRow + angleIndex, nextRow + next,
        row + angleIndex, nextRow + next, row + next,
      );
    }
  }

  const lastRing = firstRing + (latitudeSegments - 2) * angleSegments;
  for (let angleIndex = 0; angleIndex < angleSegments; angleIndex += 1) {
    const next = (angleIndex + 1) % angleSegments;
    indices.push(frontPole, lastRing + angleIndex, lastRing + next);
  }

  if (vertices.length / 3 > 0xffff) throw new Error('Lofted structure mesh exceeds the 16-bit index envelope.');
  return { vertices: new Float32Array(vertices), indices: new Uint16Array(indices) };
}

function projectMembranesOntoShell(source: Float32Array): Float32Array {
  const projected = new Float32Array(source);
  const stride = 18;
  const { outerShell } = LUCA_HERO_ASSEMBLY_V3;
  for (let vertex = 0; vertex < projected.length / stride; vertex += 1) {
    const offset = vertex * stride;
    const x = projected[offset];
    const y = projected[offset + 1];
    const kind = projected[offset + 5];
    const localX = x - outerShell.outer.center[0];
    const localY = y - outerShell.outer.center[1];
    const angle = Math.atan2(localY, localX);
    const contourRadius = sampleOrbContour(outerShell.outer, angle);
    const radial = Math.min(0.985, Math.hypot(localX, localY) / contourRadius);
    const shellDepth = sampleOrbHalfDepth(outerShell.depth, radial, [x, y]) * outerShell.depth.frontScale;
    const lift = kind < 0.5 ? 0.020 : kind < 1.5 ? 0.030 : 0.014;
    projected[offset + 2] = shellDepth + lift;
  }
  return projected;
}

/** Convert an indexed position mesh into a smooth position + normal mesh. */
export function buildStructureMeshData(
  sourceVertices: Float32Array,
  indices: Uint16Array,
  sourceStride: number,
  positionOffset = 0,
  sourceNormalOffset?: number,
): StructureMeshData {
  const vertexCount = sourceVertices.length / sourceStride;
  const normals = new Float32Array(vertexCount * 3);

  if (sourceNormalOffset !== undefined) {
    for (let vertex = 0; vertex < vertexCount; vertex += 1) {
      const source = vertex * sourceStride + sourceNormalOffset;
      normals.set(sourceVertices.subarray(source, source + 3), vertex * 3);
    }
  } else {
    for (let index = 0; index < indices.length; index += 3) {
      const ia = indices[index];
      const ib = indices[index + 1];
      const ic = indices[index + 2];
      const a = ia * sourceStride + positionOffset;
      const b = ib * sourceStride + positionOffset;
      const c = ic * sourceStride + positionOffset;
      const abx = sourceVertices[b] - sourceVertices[a];
      const aby = sourceVertices[b + 1] - sourceVertices[a + 1];
      const abz = sourceVertices[b + 2] - sourceVertices[a + 2];
      const acx = sourceVertices[c] - sourceVertices[a];
      const acy = sourceVertices[c + 1] - sourceVertices[a + 1];
      const acz = sourceVertices[c + 2] - sourceVertices[a + 2];
      let nx = aby * acz - abz * acy;
      let ny = abz * acx - abx * acz;
      let nz = abx * acy - aby * acx;
      const centroidX = (sourceVertices[a] + sourceVertices[b] + sourceVertices[c]) / 3;
      const centroidY = (sourceVertices[a + 1] + sourceVertices[b + 1] + sourceVertices[c + 1]) / 3;
      const centroidZ = (sourceVertices[a + 2] + sourceVertices[b + 2] + sourceVertices[c + 2]) / 3;
      if (nx * centroidX + ny * centroidY + nz * centroidZ < 0) {
        nx *= -1;
        ny *= -1;
        nz *= -1;
      }
      for (const vertex of [ia, ib, ic]) {
        normals[vertex * 3] += nx;
        normals[vertex * 3 + 1] += ny;
        normals[vertex * 3 + 2] += nz;
      }
    }
  }

  const vertices = new Float32Array(vertexCount * STRUCTURE_VERTEX_STRIDE);
  for (let vertex = 0; vertex < vertexCount; vertex += 1) {
    const source = vertex * sourceStride + positionOffset;
    const normal = vertex * 3;
    const length = Math.hypot(normals[normal], normals[normal + 1], normals[normal + 2]) || 1;
    const target = vertex * STRUCTURE_VERTEX_STRIDE;
    vertices[target] = sourceVertices[source];
    vertices[target + 1] = sourceVertices[source + 1];
    vertices[target + 2] = sourceVertices[source + 2];
    vertices[target + 3] = normals[normal] / length;
    vertices[target + 4] = normals[normal + 1] / length;
    vertices[target + 5] = normals[normal + 2] / length;
  }

  return { vertices, indices };
}

const STRUCTURE_VERT = /* glsl */`#version 300 es
precision highp float;

in vec3 a_position;
in vec3 a_normal;

uniform vec2 u_resolution;
uniform vec2 u_center;
uniform float u_radius;
uniform float u_structureYaw;
uniform float u_structurePitch;
uniform float u_modelScale;

out vec3 v_normal;
out vec3 v_position;

mat3 rotation(float yaw, float pitch) {
  float cy = cos(yaw);
  float sy = sin(yaw);
  float cx = cos(pitch);
  float sx = sin(pitch);
  mat3 yawMatrix = mat3(
    cy, 0.0, -sy,
    0.0, 1.0, 0.0,
    sy, 0.0, cy
  );
  mat3 pitchMatrix = mat3(
    1.0, 0.0, 0.0,
    0.0, cx, sx,
    0.0, -sx, cx
  );
  return pitchMatrix * yawMatrix;
}

void main() {
  mat3 modelRotation = rotation(u_structureYaw, u_structurePitch);
  vec3 position = modelRotation * (a_position * u_modelScale);
  float aspect = u_resolution.x / u_resolution.y;
  vec2 uv = u_center + vec2(
    position.x * u_radius / aspect,
    position.y * u_radius
  );
  gl_Position = vec4(uv * 2.0 - 1.0, clamp(-position.z * 0.55, -0.98, 0.98), 1.0);
  v_position = position;
  v_normal = normalize(modelRotation * a_normal);
}
`;

const STRUCTURE_FRAG = /* glsl */`#version 300 es
precision highp float;

in vec3 v_normal;
in vec3 v_position;

uniform vec3 u_baseColor;
uniform vec3 u_accentColor;
uniform float u_opacity;
uniform float u_surfaceRole;

out vec4 fragColor;

void main() {
  vec3 viewDirection = vec3(0.0, 0.0, 1.0);
  vec3 faceNormal = normalize(cross(dFdx(v_position), dFdy(v_position)));
  if (dot(faceNormal, viewDirection) < 0.0) faceNormal *= -1.0;
  vec3 smoothNormal = normalize(v_normal);
  if (dot(smoothNormal, viewDirection) < 0.0) smoothNormal *= -1.0;
  vec3 normal = normalize(mix(faceNormal, smoothNormal, 0.58));
  vec3 keyDirection = normalize(vec3(-0.52, 0.64, 0.74));
  vec3 fillDirection = normalize(vec3(0.58, -0.22, 0.50));
  float key = max(dot(normal, keyDirection), 0.0);
  float fill = max(dot(normal, fillDirection), 0.0);
  float rim = pow(1.0 - max(dot(normal, viewDirection), 0.0), 2.2);
  float broadSpecular = pow(max(dot(normal, normalize(keyDirection + viewDirection)), 0.0), 24.0);
  float depthTone = smoothstep(-1.0, 1.0, v_position.z);
  vec3 color = u_baseColor * (0.24 + key * 0.56 + fill * 0.16);
  color = mix(color, u_accentColor, rim * (0.38 + u_surfaceRole * 0.18));
  color += u_accentColor * broadSpecular * (0.18 + u_surfaceRole * 0.10);
  color *= mix(0.78, 1.08, depthTone);
  fragColor = vec4(color * u_opacity, u_opacity);
}
`;

/**
 * Prototype-only clay pass for checking the authored volume from non-front
 * angles. It deliberately avoids glass and uses the real mesh Z coordinates.
 */
export class WebGLStructureTurntablePass {
  private readonly program: WebGLProgram;
  private readonly shell: GpuMesh;
  private readonly pearl: GpuMesh;
  private readonly membranes: GpuMesh;
  private readonly uniformLocations = new Map<string, WebGLUniformLocation | null>();

  constructor(private readonly gl: WebGL2RenderingContext) {
    this.program = this.createProgram(STRUCTURE_VERT, STRUCTURE_FRAG);
    const shell = buildLoftedVolumeMesh(
      CANONICAL_LUCA_VOLUME_V2.outer,
      CANONICAL_LUCA_VOLUME_V2.depth,
    );
    const pearl = buildLoftedVolumeMesh(
      LUCA_HERO_ASSEMBLY_V3.innerPearl.contour,
      LUCA_HERO_ASSEMBLY_V3.innerPearl.depth,
      LUCA_HERO_ASSEMBLY_V3.innerPearl.contour.axes,
      52,
      112,
    );
    const membranes = buildHeroSurfaceMesh();
    this.shell = this.createMesh(buildStructureMeshData(shell.vertices, shell.indices, 3));
    this.pearl = this.createMesh(buildStructureMeshData(pearl.vertices, pearl.indices, 3));
    this.membranes = this.createMesh(buildStructureMeshData(
      projectMembranesOntoShell(membranes.vertices),
      membranes.indices,
      18,
    ));
  }

  draw(
    uniforms: Record<string, number | readonly number[]>,
    study: StructureStudy,
  ): void {
    const gl = this.gl;
    gl.useProgram(this.program);
    this.setUniforms(uniforms);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.CULL_FACE);

    if (study === 'turntable') {
      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(true);
      gl.depthFunc(gl.LEQUAL);
      this.drawMesh(this.shell, [0.54, 0.57, 0.62], [0.86, 0.89, 0.94], 1, 0);
      this.drawMesh(this.membranes, [0.58, 0.61, 0.66], [0.90, 0.93, 0.98], 0.82, 0.72);
    } else {
      gl.disable(gl.DEPTH_TEST);
      gl.depthMask(false);
      this.drawMesh(this.shell, [0.31, 0.34, 0.39], [0.68, 0.73, 0.82], 0.28, 0);
      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(true);
      this.drawMesh(this.pearl, [0.57, 0.60, 0.65], [0.90, 0.92, 0.96], 1, 0.35);
      this.drawMesh(this.membranes, [0.68, 0.70, 0.75], [0.97, 0.98, 1.0], 0.96, 1);
    }

    gl.depthMask(true);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
  }

  dispose(): void {
    const gl = this.gl;
    for (const mesh of [this.shell, this.pearl, this.membranes]) {
      gl.deleteBuffer(mesh.vertexBuffer);
      gl.deleteBuffer(mesh.indexBuffer);
      gl.deleteVertexArray(mesh.vao);
    }
    gl.deleteProgram(this.program);
  }

  private createMesh(data: StructureMeshData): GpuMesh {
    const gl = this.gl;
    const vao = gl.createVertexArray();
    const vertexBuffer = gl.createBuffer();
    const indexBuffer = gl.createBuffer();
    if (!vao || !vertexBuffer || !indexBuffer) throw new Error('Failed to allocate structure turntable mesh.');
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, data.vertices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data.indices, gl.STATIC_DRAW);
    const stride = STRUCTURE_VERTEX_STRIDE * Float32Array.BYTES_PER_ELEMENT;
    const position = gl.getAttribLocation(this.program, 'a_position');
    const normal = gl.getAttribLocation(this.program, 'a_normal');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(normal);
    gl.vertexAttribPointer(normal, 3, gl.FLOAT, false, stride, 3 * Float32Array.BYTES_PER_ELEMENT);
    gl.bindVertexArray(null);
    return { vao, vertexBuffer, indexBuffer, indexCount: data.indices.length };
  }

  private drawMesh(
    mesh: GpuMesh,
    baseColor: readonly number[],
    accentColor: readonly number[],
    opacity: number,
    surfaceRole: number,
  ): void {
    const gl = this.gl;
    gl.uniform3fv(this.loc('u_baseColor'), baseColor);
    gl.uniform3fv(this.loc('u_accentColor'), accentColor);
    gl.uniform1f(this.loc('u_opacity'), opacity);
    gl.uniform1f(this.loc('u_surfaceRole'), surfaceRole);
    gl.bindVertexArray(mesh.vao);
    gl.drawElements(gl.TRIANGLES, mesh.indexCount, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
  }

  private setUniforms(uniforms: Record<string, number | readonly number[]>): void {
    const gl = this.gl;
    for (const [name, value] of Object.entries(uniforms)) {
      const location = this.loc(name);
      if (location === null) continue;
      if (typeof value === 'number') gl.uniform1f(location, value);
      else if (value.length === 2) gl.uniform2fv(location, value);
      else if (value.length === 3) gl.uniform3fv(location, value);
    }
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
      if (!shader) throw new Error('Failed to create structure turntable shader.');
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const info = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(`Structure turntable shader compile error:\n${info}`);
      }
      return shader;
    };
    const vertex = compile(vertexSource, gl.VERTEX_SHADER);
    const fragment = compile(fragmentSource, gl.FRAGMENT_SHADER);
    const program = gl.createProgram();
    if (!program) throw new Error('Failed to create structure turntable program.');
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`Structure turntable program link error:\n${info}`);
    }
    return program;
  }
}
