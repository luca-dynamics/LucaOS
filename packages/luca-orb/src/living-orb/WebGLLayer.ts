/**
 * WebGLLayer — manages a single shader program (one layer of the orb).
 *
 * Each layer owns:
 *  - Its fragment shader source
 *  - A compiled WebGL program
 *  - A fullscreen quad VAO
 *  - A uniform location cache
 *
 * Usage:
 *   const layer = new WebGLLayer(gl, COMMON_VERT, GLASS_FRAG);
 *   layer.use();
 *   layer.setUniforms({ u_time: 1.0, ... });
 *   layer.draw();
 */
import { COMMON_VERT, FULLSCREEN_QUAD_VERTS } from './shaders/common.vert';

export class WebGLLayer {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private vao: WebGLVertexArrayObject;
  private uniformLocations: Map<string, WebGLUniformLocation | null> = new Map();
  private _isReady = false;

  constructor(
    gl: WebGL2RenderingContext,
    fragSource: string,
  ) {
    this.gl = gl;
    this.program = this.compileProgram(COMMON_VERT, fragSource);
    this.vao = this.createQuadVAO();
    this._isReady = true;
  }

  get isReady(): boolean { return this._isReady; }

  private compileShader(source: string, type: number): WebGLShader {
    const gl = this.gl;
    const shader = gl.createShader(type);
    if (!shader) throw new Error('Failed to create shader');
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader compile error:\n${info}`);
    }
    return shader;
  }

  private compileProgram(vertSource: string, fragSource: string): WebGLProgram {
    const gl = this.gl;
    const vert = this.compileShader(vertSource, gl.VERTEX_SHADER);
    const frag = this.compileShader(fragSource, gl.FRAGMENT_SHADER);
    const program = gl.createProgram();
    if (!program) throw new Error('Failed to create program');
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      throw new Error(`Program link error:\n${info}`);
    }
    gl.deleteShader(vert);
    gl.deleteShader(frag);
    return program;
  }

  private createQuadVAO(): WebGLVertexArrayObject {
    const gl = this.gl;
    const vao = gl.createVertexArray();
    if (!vao) throw new Error('Failed to create VAO');
    gl.bindVertexArray(vao);

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, FULLSCREEN_QUAD_VERTS, gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(this.program, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
    return vao;
  }

  /** Activate this layer's shader program */
  use(): void {
    this.gl.useProgram(this.program);
  }

  /** Cache-friendly uniform location lookup */
  private loc(name: string): WebGLUniformLocation | null {
    if (!this.uniformLocations.has(name)) {
      this.uniformLocations.set(name, this.gl.getUniformLocation(this.program, name));
    }
    return this.uniformLocations.get(name)!;
  }

  /** Set a flat collection of uniforms */
  setUniforms(uniforms: Record<string, number | readonly number[] | boolean>): void {
    const gl = this.gl;
    for (const [name, value] of Object.entries(uniforms)) {
      const location = this.loc(name);
      if (location === null) continue; // Uniform not used — skip silently
      if (typeof value === 'number') {
        gl.uniform1f(location, value);
      } else if (typeof value === 'boolean') {
        gl.uniform1i(location, value ? 1 : 0);
      } else if (Array.isArray(value)) {
        switch (value.length) {
          case 2: gl.uniform2fv(location, value); break;
          case 3: gl.uniform3fv(location, value); break;
          case 4: gl.uniform4fv(location, value); break;
          default: gl.uniform1fv(location, value);
        }
      }
    }
  }

  /** Set a single integer uniform (for profile index etc.) */
  setInt(name: string, value: number): void {
    const location = this.loc(name);
    if (location !== null) this.gl.uniform1i(location, value);
  }

  /** Draw the fullscreen quad */
  draw(): void {
    const gl = this.gl;
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
  }

  dispose(): void {
    this.gl.deleteProgram(this.program);
  }
}
