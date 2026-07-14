import { approach } from "../../styles/lucaPresenceMotion";
import { hexToRgb, rgbToUnit } from "./presenceColor";

/**
 * Liquid glass — the optical body of Luca's material language.
 *
 * The body is a live signed-distance field: it breathes, stretches along its
 * own motion, and grows a lobe toward the pointer, so it can take any shape
 * and flow between shapes. A curved glass surface is built over that field
 * and its normal is derived numerically every frame — and every optical
 * event follows from that normal, never from painted-on effects:
 *
 *  - refraction bends the background exactly where the surface curves,
 *    and the center stays perfectly clear where the surface is flat;
 *  - internal reflection doubles the content back wherever the surface
 *    turns away from the eye;
 *  - a studio light reflects off the surface with per-channel dispersion,
 *    so the spectral glint is physics, and it travels as the shape flows.
 *
 * Framework-free; the tuning lab drives it directly. Product adoption:
 * Summon overlay chrome, the orb's glass body, and later true desktop
 * refraction through the governed screen capture.
 */

export interface LiquidGlassLensRenderer {
  /** The content the lens refracts. Must visually match what sits behind the canvas. */
  setBackground(source: TexImageSource): void;
  /** Pointer position in canvas fractions (0..1); null lets the body drift home. */
  setPointer(x: number | null, y?: number): void;
  setAccent(hex: string): void;
  /** Resize without rebuilding the WebGL context. CSS pixels, DPR-capped internally. */
  resize(widthPx: number, heightPx?: number): void;
  /** Suspend animation when the surface is hidden or reduced motion is active. */
  setPaused(paused: boolean): void;
  dispose(): void;
}

const VERTEX_SRC = `#version 300 es
in vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const FRAGMENT_SRC = `#version 300 es
precision highp float;

uniform sampler2D u_bg;
uniform vec4 u_bgRect;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_center;
uniform float u_wobble;
uniform vec2 u_stretch;
uniform vec2 u_pull;
uniform vec3 u_accent;

out vec4 outColor;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.55;
  for (int i = 0; i < 3; i++) {
    v += amp * vnoise(p);
    p = p * 2.03 + 17.31;
    amp *= 0.5;
  }
  return v;
}

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

// The liquid body: a breathing blob that stretches with motion and reaches
// toward the pointer. Any shape it takes, the optics below will honor.
float sdBody(vec2 p) {
  float sl = length(u_stretch);
  if (sl > 1e-4) {
    vec2 sd = u_stretch / sl;
    p -= sd * dot(p, sd) * min(sl, 0.35);
  }
  float d = length(p) - 0.50;
  // Perfectly smooth liquid life: low harmonics only — noise kinks the rim
  float bAng = atan(p.y, p.x);
  float lobes = sin(bAng * 2.0 + u_time * 0.31) * 0.35
    + sin(bAng * 3.0 - u_time * 0.23) * 0.25;
  d -= lobes * (0.012 + u_wobble * 0.06);
  float pl = length(u_pull);
  if (pl > 1e-3) {
    float lobe = length(p - u_pull * 0.55) - (0.10 + 0.25 * min(pl, 0.5));
    d = smin(d, lobe, 0.18);
  }
  return d;
}

// Glass surface over the body: flat plateau in the middle, curving down at
// the boundary — a liquid pillow of any silhouette.
float heightAt(vec2 p) {
  float d = sdBody(p);
  float x = clamp(-d / 0.09, 0.0, 1.0);
  return sqrt(1.0 - (1.0 - x) * (1.0 - x));
}

vec3 sampleBg(vec2 uvTop) {
  vec2 uv = u_bgRect.xy + clamp(uvTop, 0.0, 1.0) * u_bgRect.zw;
  return texture(u_bg, uv).rgb;
}

void main() {
  vec2 uvTop = vec2(gl_FragCoord.x / u_resolution.x, 1.0 - gl_FragCoord.y / u_resolution.y);
  vec2 p = (uvTop - u_center) * 2.0;
  float t = u_time;

  float d = sdBody(p);
  float aa = fwidth(d) * 1.5;
  float inside = 1.0 - smoothstep(-aa, aa, d);

  // Surface normal, numerically, from the instantaneous shape
  vec2 e = vec2(0.010, 0.0);
  float hX = heightAt(p + e.xy) - heightAt(p - e.xy);
  float hY = heightAt(p + e.yx) - heightAt(p - e.yx);
  vec3 nrm = normalize(vec3(-hX / (2.0 * e.x) * 0.30, -hY / (2.0 * e.x) * 0.30, 1.0));

  float grazing = 1.0 - nrm.z;
  float fres = pow(clamp(grazing * 1.9, 0.0, 1.0), 2.2);

  // Refraction: dead clear where flat, bending exactly where it curves
  vec3 col;
  {
    float k = 0.12;
    vec2 offR = -nrm.xy * grazing * k * 1.06;
    vec2 offG = -nrm.xy * grazing * k;
    vec2 offB = -nrm.xy * grazing * k * 0.94;
    col.r = sampleBg(uvTop + offR * 0.5).r;
    col.g = sampleBg(uvTop + offG * 0.5).g;
    col.b = sampleBg(uvTop + offB * 0.5).b;
  }

  // Internal reflection: content doubles back where the surface turns away
  float wrapAmt = smoothstep(0.45, 0.85, grazing);
  if (wrapAmt > 0.0) {
    vec3 wrap = sampleBg(uvTop - nrm.xy * grazing * 0.45);
    col = mix(col, wrap * 0.97, wrapAmt * 0.55);
  }

  // Studio light reflected off the surface, dispersed per channel — the
  // spectral glint that travels with the shape
  vec3 view = vec3(0.0, 0.0, -1.0);
  vec3 L = normalize(vec3(0.25, -0.65, 0.40));
  vec3 rr = reflect(view, normalize(nrm + vec3(0.006, 0.0, 0.0)));
  vec3 rg = reflect(view, nrm);
  vec3 rb = reflect(view, normalize(nrm + vec3(-0.006, 0.0, 0.0)));
  float specPow = 50.0;
  vec3 spec = vec3(
    pow(clamp(dot(rr, L), 0.0, 1.0), specPow),
    pow(clamp(dot(rg, L), 0.0, 1.0), specPow),
    pow(clamp(dot(rb, L), 0.0, 1.0), specPow)
  );
  col += spec * 0.85;

  // Soft sky sheen on upward-facing curvature
  float sheen = smoothstep(0.1, 0.8, -rg.y) * fres;
  col += vec3(1.0) * sheen * 0.10;

  // Clarity discipline: a whisper of saturation, thickness shade, no milk
  float lumV = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(lumV), col, 1.06);
  col *= 1.0 - fres * 0.10;

  // Hairline at the very boundary, lit from above
  float rimLine = exp(-pow((d + 0.008) / 0.010, 2.0));
  col += vec3(1.0) * rimLine * (0.18 + 0.25 * clamp(dot(nrm.xy, vec2(-0.35, -0.8)), 0.0, 1.0));

  // A trace of identity: Luca's accent lives in the glass
  col = mix(col, col * (0.85 + 0.3 * u_accent), 0.06);

  col += (hash(gl_FragCoord.xy + fract(t)) - 0.5) * (1.5 / 255.0) * inside;
  outColor = vec4(col * inside, inside);
}`;

function compile(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn("[LiquidGlassLens] shader compile failed:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/**
 * @param bgRect Which sub-rectangle of the background texture the canvas
 * covers, as top-left-origin fractions [x, y, w, h]. Refraction only reads
 * as real when this mapping matches what the eye sees behind the canvas.
 */
export function createLiquidGlassLensRenderer(
  canvas: HTMLCanvasElement,
  sizePx: number,
  bgRect: [number, number, number, number] = [0, 0, 1, 1],
): LiquidGlassLensRenderer | null {
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
  });
  if (!gl) return null;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const resize = (widthPx: number, heightPx = widthPx) => {
    const width = Math.max(1, Math.round(widthPx * dpr));
    const height = Math.max(1, Math.round(heightPx * dpr));
    if (canvas.width === width && canvas.height === height) return;
    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, width, height);
  };
  resize(sizePx);

  const vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SRC);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SRC);
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn("[LiquidGlassLens] link failed:", gl.getProgramInfoLog(program));
    return null;
  }
  gl.useProgram(program);

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const positionLoc = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(positionLoc);
  gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

  const texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    1,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    new Uint8Array([16, 19, 24, 255]),
  );

  const u = (name: string) => gl.getUniformLocation(program, name);
  const locations = {
    bg: u("u_bg"),
    bgRect: u("u_bgRect"),
    resolution: u("u_resolution"),
    time: u("u_time"),
    center: u("u_center"),
    wobble: u("u_wobble"),
    stretch: u("u_stretch"),
    pull: u("u_pull"),
    accent: u("u_accent"),
  };
  gl.uniform1i(locations.bg, 0);
  gl.uniform4f(locations.bgRect, bgRect[0], bgRect[1], bgRect[2], bgRect[3]);

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.disable(gl.BLEND);
  gl.clearColor(0, 0, 0, 0);

  // Liquid dynamics: the body has mass. It glides on a damped spring,
  // stretches along its own velocity, and reaches toward where it's pulled.
  const center = { x: 0.5, y: 0.5 };
  const velocity = { x: 0, y: 0 };
  let target: { x: number; y: number } | null = null;
  let accent: [number, number, number] = [138 / 255, 143 / 255, 152 / 255];
  let wobble = 0;
  const pull = { x: 0, y: 0 };

  let lastTime = performance.now();
  const startTime = lastTime;
  let animationId = 0;
  let disposed = false;
  let paused = false;

  const draw = (now: number) => {
    if (disposed) return;
    const dt = Math.min(now - lastTime, 64) / 1000;
    lastTime = now;

    const home = target ?? { x: 0.5, y: 0.5 };
    const stiffness = 60;
    const damping = 11;
    velocity.x += ((home.x - center.x) * stiffness - velocity.x * damping) * dt;
    velocity.y += ((home.y - center.y) * stiffness - velocity.y * damping) * dt;
    center.x += velocity.x * dt;
    center.y += velocity.y * dt;

    const speed = Math.hypot(velocity.x, velocity.y);
    wobble = approach(wobble, Math.min(1, speed * 2.2), dt * 1000, 140);

    // Pull lobe toward the spring's stretch (in shape space, top-origin ×2)
    const pullTarget = {
      x: Math.max(-0.6, Math.min(0.6, (home.x - center.x) * 2)),
      y: Math.max(-0.6, Math.min(0.6, (home.y - center.y) * 2)),
    };
    pull.x = approach(pull.x, pullTarget.x, dt * 1000, 120);
    pull.y = approach(pull.y, pullTarget.y, dt * 1000, 120);

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(locations.resolution, canvas.width, canvas.height);
    gl.uniform1f(locations.time, (now - startTime) / 1000);
    gl.uniform2f(locations.center, center.x, center.y);
    gl.uniform1f(locations.wobble, wobble);
    gl.uniform2f(locations.stretch, velocity.x * 0.4, velocity.y * 0.4);
    gl.uniform2f(locations.pull, pull.x, pull.y);
    gl.uniform3f(locations.accent, accent[0], accent[1], accent[2]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    if (!paused) animationId = requestAnimationFrame(draw);
  };

  draw(performance.now());

  return {
    setBackground(source: TexImageSource) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    },
    setPointer(x: number | null, y = 0.5) {
      target =
        x === null
          ? null
          : {
              x: Math.min(0.85, Math.max(0.15, x)),
              y: Math.min(0.85, Math.max(0.15, y)),
            };
    },
    setAccent(hex: string) {
      const rgb = hexToRgb(hex);
      if (rgb) accent = rgbToUnit(rgb);
    },
    resize,
    setPaused(nextPaused: boolean) {
      if (disposed || paused === nextPaused) return;
      paused = nextPaused;
      cancelAnimationFrame(animationId);
      if (!paused) {
        lastTime = performance.now();
        animationId = requestAnimationFrame(draw);
      }
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(animationId);
      gl.deleteTexture(texture);
      gl.deleteBuffer(quad);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    },
  };
}
