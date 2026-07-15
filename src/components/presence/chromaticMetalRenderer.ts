import {
  DEFAULT_LUCA_OPTICAL_MATERIAL,
  normalizeLucaOpticalMaterialSettings,
  type LucaChromaticMetalTuning,
} from "../../styles/lucaOpticalMaterialSettings";

export type LucaChromaticMetalShape = "orb" | "rounded" | "capsule";

export interface ChromaticMetalRenderer {
  resize(width: number, height: number): void;
  setTuning(value: Partial<LucaChromaticMetalTuning>): void;
  setShape(shape: LucaChromaticMetalShape): void;
  setPaused(paused: boolean): void;
  dispose(): void;
}

const VERTEX = `#version 300 es
in vec2 a_position;
void main(){ gl_Position=vec4(a_position,0.0,1.0); }`;

const FRAGMENT = `#version 300 es
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform sampler2D u_ramp;
uniform vec4 u_geometry;
uniform vec4 u_surface;
uniform vec4 u_motion;
out vec4 outColor;

float roundedBox(vec2 p, vec2 b, float r){
  vec2 q=abs(p)-b+r;
  return min(max(q.x,q.y),0.0)+length(max(q,0.0))-r;
}

void main(){
  vec2 p=(gl_FragCoord.xy*2.0-u_resolution)/min(u_resolution.x,u_resolution.y);
  float aspect=u_resolution.x/max(u_resolution.y,1.0);
  float shape=u_geometry.x;
  float rounding=u_geometry.y;
  float d;
  if(shape<0.5) d=length(p)-0.91;
  else {
    vec2 bounds=shape<1.5?vec2(max(0.2,aspect-0.08),0.90):vec2(max(0.42,aspect-0.08),0.90);
    float radius=mix(0.08,0.90,shape>1.5?1.0:rounding);
    d=roundedBox(p,bounds,radius);
  }
  float alpha=1.0-smoothstep(-fwidth(d),fwidth(d),d);

  float angle=radians(u_geometry.z);
  mat2 rotate=mat2(cos(angle),-sin(angle),sin(angle),cos(angle));
  vec2 q=rotate*p;
  q.x*=u_geometry.w;
  float wave=q.x*u_surface.x+sin(q.y*2.1+u_time*u_motion.z*6.28318)*u_surface.y;
  float coordinate=fract(wave+u_motion.x+sin(u_time*u_motion.z*6.28318+u_motion.y*6.28318)*0.12);
  float split=0.012*u_surface.w;
  vec3 metal=vec3(
    texture(u_ramp,vec2(fract(coordinate+split),0.5)).r,
    texture(u_ramp,vec2(coordinate,0.5)).g,
    texture(u_ramp,vec2(fract(coordinate-split),0.5)).b
  );

  float radius=length(p);
  float depth=clamp(1.0-radius*radius,0.0,1.0);
  float bands=smoothstep(0.12,0.88,metal);
  metal=mix(metal,bands,1.0-u_surface.z);
  metal*=mix(0.62,1.18,depth*u_motion.w);
  float edge=pow(1.0-clamp(abs(d)*3.0,0.0,1.0),5.0);
  metal+=vec3(0.16,0.7,0.82)*edge*u_surface.w*0.18;
  outColor=vec4(metal*alpha,alpha);
}`;

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn("[ChromaticMetal] shader compile failed:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

const SHAPES: Record<LucaChromaticMetalShape, number> = { orb: 0, rounded: 1, capsule: 2 };

export function createChromaticMetalRenderer(
  canvas: HTMLCanvasElement,
  initialShape: LucaChromaticMetalShape = "orb",
): ChromaticMetalRenderer | null {
  const gl = canvas.getContext("webgl2", { alpha: true, antialias: true, premultipliedAlpha: true });
  if (!gl) return null;
  const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  if (!vs || !fs) {
    if (vs) gl.deleteShader(vs);
    if (fs) gl.deleteShader(fs);
    return null;
  }
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn("[ChromaticMetal] program link failed:", gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return null;
  }
  gl.useProgram(program);
  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const ramp = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, ramp);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  const location = (name: string) => gl.getUniformLocation(program, name);
  const u = {
    resolution: location("u_resolution"), ramp: location("u_ramp"), time: location("u_time"),
    geometry: location("u_geometry"), surface: location("u_surface"), motion: location("u_motion"),
  };
  gl.uniform1i(u.ramp, 0);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let tuning = DEFAULT_LUCA_OPTICAL_MATERIAL.metal;
  let shape = initialShape;
  let paused = false;
  let disposed = false;
  let frame = 0;
  const start = performance.now();

  const uploadRamp = () => {
    const source = document.createElement("canvas");
    source.width = 256;
    source.height = 1;
    const context = source.getContext("2d");
    if (!context) return;
    const gradient = context.createLinearGradient(0, 0, source.width, 0);
    tuning.gradient.forEach((color, index) => gradient.addColorStop(index / (tuning.gradient.length - 1), color));
    context.fillStyle = gradient;
    context.fillRect(0, 0, source.width, 1);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, ramp);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  };
  uploadRamp();

  const draw = (now: number) => {
    if (disposed) return;
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(u.resolution, canvas.width, canvas.height);
    gl.uniform1f(u.time, (now - start) / 1000);
    gl.uniform4f(u.geometry, SHAPES[shape], tuning.rounding, tuning.angle, tuning.stretch);
    gl.uniform4f(u.surface, tuning.repeats * tuning.scale, tuning.scale, tuning.roughness, tuning.rgbSplit);
    gl.uniform4f(u.motion, tuning.offset, tuning.phase, tuning.evolution, tuning.depth);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!paused) frame = requestAnimationFrame(draw);
  };

  const resize = (width: number, height: number) => {
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    gl.viewport(0, 0, canvas.width, canvas.height);
  };
  resize(1, 1);
  draw(performance.now());

  return {
    resize,
    setTuning(value) {
      tuning = normalizeLucaOpticalMaterialSettings({ metal: { ...tuning, ...value } }).metal;
      uploadRamp();
    },
    setShape(value) { shape = value; },
    setPaused(value) {
      if (paused === value || disposed) return;
      paused = value;
      cancelAnimationFrame(frame);
      if (!paused) frame = requestAnimationFrame(draw);
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      gl.deleteTexture(ramp);
      gl.deleteBuffer(quad);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    },
  };
}
