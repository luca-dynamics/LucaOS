import type { PresenceMarkState } from "../../presence/presenceMark";
import {
  LUCA_CADENCE,
  LUCA_SMOOTHING,
  approach,
  attentionPulse,
} from "../../styles/lucaPresenceMotion";
import { hexToRgb, rgbToUnit } from "./presenceColor";

/**
 * The liquid presence renderer: Luca's body as lit glass. A WebGL2 fragment
 * shader draws a small liquid orb — a noise-warped surface, internal light
 * currents, a thin bright rim, and a soft outer bloom. States change the
 * liquid's tempo and light, never its identity; the palette is always one
 * hue family (the skin accent) shifting to amber only when Luca needs you.
 *
 * Framework-free on purpose: the React mark and the tuning lab
 * (labs/presence-lab.html) drive the same renderer.
 */

export interface LiquidPresenceInput {
  state: PresenceMarkState;
  /** Live voice energy 0..1. */
  amplitude?: number;
  /** Identity hex; defaults to the neutral silver accent. */
  identityColor?: string;
  /** Attention hex; defaults to the shared warning amber. */
  attentionColor?: string;
}

export interface LiquidPresenceRenderer {
  setInput(input: LiquidPresenceInput): void;
  dispose(): void;
}

interface LiquidParams {
  flow: number;
  ripple: number;
  glow: number;
  halo: number;
  bright: number;
  attention: number;
  breathAmp: number;
  energy: number;
}

const LIQUID_STATE_TARGETS: Record<
  PresenceMarkState,
  Omit<LiquidParams, "energy">
> = {
  idle: {
    flow: 0.35,
    ripple: 0.006,
    glow: 0.35,
    halo: 0.1,
    bright: 0.72,
    attention: 0,
    breathAmp: 0.03,
  },
  listening: {
    flow: 0.7,
    ripple: 0.018,
    glow: 0.6,
    halo: 0.22,
    bright: 1,
    attention: 0,
    breathAmp: 0,
  },
  speaking: {
    flow: 0.6,
    ripple: 0.012,
    glow: 0.5,
    halo: 0.18,
    bright: 0.9,
    attention: 0,
    breathAmp: 0,
  },
  thinking: {
    flow: 1.1,
    ripple: 0.01,
    glow: 0.52,
    halo: 0.15,
    bright: 0.85,
    attention: 0,
    breathAmp: 0.015,
  },
  acting: {
    flow: 1.9,
    ripple: 0.014,
    glow: 0.65,
    halo: 0.24,
    bright: 1,
    attention: 0,
    breathAmp: 0,
  },
  "needs-you": {
    flow: 0.5,
    ripple: 0.008,
    glow: 0.55,
    halo: 0.2,
    bright: 1,
    attention: 1,
    breathAmp: 0,
  },
};

const FALLBACK_IDENTITY = "#8a8f98";
const FALLBACK_ATTENTION = "#d9a441";

const VERTEX_SRC = `#version 300 es
in vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const FRAGMENT_SRC = `#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec3 u_color;
uniform vec3 u_attentionColor;
uniform float u_attention;
uniform float u_pulse;
uniform float u_energy;
uniform float u_flow;
uniform float u_ripple;
uniform float u_swell;
uniform float u_glow;
uniform float u_halo;
uniform float u_bright;

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

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution) / min(u_resolution.x, u_resolution.y);
  float r = length(uv);
  float ang = atan(uv.y, uv.x);
  float t = u_time;

  vec3 base = mix(u_color, u_attentionColor, u_attention);

  vec2 rimSeed = vec2(cos(ang), sin(ang));

  // Fluid boundary: broad slow lobes, finer counter-wave, voice tremor
  float w1 = sin(ang * 3.0 + t * 0.9 * u_flow) * 0.045;
  float w2 = cos(ang * 6.0 - t * 1.4 * u_flow) * 0.035;
  float w3 = sin(ang * 12.0 + t * 4.5 * u_flow) * u_energy * 0.16;
  float drift = fbm(rimSeed * 1.5 + t * 0.06 * u_flow) - 0.5;
  float R = 0.55 * (1.0 + u_swell) + w1 + w2 + w3
    + drift * (0.05 + u_ripple) + u_energy * 0.07;

  float g = r / max(R, 1e-3);

  // Internal plasma currents
  float rot = t * 0.15 * u_flow;
  mat2 spin = mat2(cos(rot), -sin(rot), sin(rot), cos(rot));
  float c1 = fbm(uv * 2.2 + vec2(t * 0.07, -t * 0.09) * u_flow);
  float c2 = fbm(spin * uv * 3.0 + vec2(-t * 0.05, t * 0.08) * u_flow + c1 * 1.1);

  // Emission layers: heart, body of light, fluid skin, outer bloom
  float core = exp(-g * g * 2.4);
  float fill = smoothstep(1.05, 0.3, g);
  float sheath = exp(-pow((g - 1.0) / 0.07, 2.0));
  float tail = g > 1.0 ? exp(-(g - 1.0) * 4.5) : 0.0;

  float activity = clamp(u_glow + u_energy * 0.8, 0.0, 1.2);
  vec3 coreC = mix(base, vec3(1.0), clamp(0.35 + 0.6 * activity, 0.0, 0.95));
  vec3 bodyC = mix(base * 0.7, mix(base, vec3(1.0), 0.3), smoothstep(0.2, 0.9, c2));

  vec3 col = bodyC * fill * (0.55 + 0.45 * c1);
  col += coreC * core * (0.75 + 0.5 * u_energy);
  col += mix(base, vec3(1.0), 0.5) * sheath * (0.4 + 0.5 * u_pulse + 0.3 * u_energy);
  col += base * tail * (u_halo * 2.2 + u_pulse * 0.5);
  col *= u_bright;

  // The light must die out well before the canvas edge — no square ghost
  float edge = max(abs(uv.x), abs(uv.y));
  float edgeFade = 1.0 - smoothstep(0.82, 0.98, edge);
  col *= edgeFade;

  // Alpha follows light — plasma is energy, not matter
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  float alpha = clamp(lum * 1.4, 0.0, 1.0);
  alpha = max(alpha, fill * 0.28 * u_bright * edgeFade);

  // Dither scaled by coverage: bare pixels must stay perfectly dark
  col += (hash(gl_FragCoord.xy + fract(t)) - 0.5) * (1.5 / 255.0) * clamp(alpha * 6.0, 0.0, 1.0);

  outColor = vec4(col, alpha);
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
    console.warn("[LiquidPresence] shader compile failed:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/** Returns null when WebGL2 is unavailable; callers fall back to the 2D mark. */
export function createLiquidPresenceRenderer(
  canvas: HTMLCanvasElement,
  sizePx: number,
): LiquidPresenceRenderer | null {
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
  });
  if (!gl) return null;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = sizePx * dpr;
  canvas.height = sizePx * dpr;

  const vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SRC);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SRC);
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn("[LiquidPresence] program link failed:", gl.getProgramInfoLog(program));
    return null;
  }
  gl.useProgram(program);

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW,
  );
  const positionLoc = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(positionLoc);
  gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

  const u = (name: string) => gl.getUniformLocation(program, name);
  const locations = {
    resolution: u("u_resolution"),
    time: u("u_time"),
    color: u("u_color"),
    attentionColor: u("u_attentionColor"),
    attention: u("u_attention"),
    pulse: u("u_pulse"),
    energy: u("u_energy"),
    flow: u("u_flow"),
    ripple: u("u_ripple"),
    swell: u("u_swell"),
    glow: u("u_glow"),
    halo: u("u_halo"),
    bright: u("u_bright"),
  };

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.disable(gl.BLEND);
  gl.clearColor(0, 0, 0, 0);

  const input: Required<LiquidPresenceInput> = {
    state: "idle",
    amplitude: 0,
    identityColor: FALLBACK_IDENTITY,
    attentionColor: FALLBACK_ATTENTION,
  };
  const params: LiquidParams = { ...LIQUID_STATE_TARGETS.idle, energy: 0 };

  let lastTime = performance.now();
  const startTime = lastTime;
  let animationId = 0;
  let disposed = false;

  const draw = (now: number) => {
    if (disposed) return;
    const dt = Math.min(now - lastTime, 64);
    lastTime = now;

    const target = LIQUID_STATE_TARGETS[input.state];
    params.flow = approach(params.flow, target.flow, dt, LUCA_SMOOTHING.state);
    params.ripple = approach(params.ripple, target.ripple, dt, LUCA_SMOOTHING.state);
    params.glow = approach(params.glow, target.glow, dt, LUCA_SMOOTHING.state);
    params.halo = approach(params.halo, target.halo, dt, LUCA_SMOOTHING.state);
    params.bright = approach(params.bright, target.bright, dt, LUCA_SMOOTHING.state);
    params.attention = approach(params.attention, target.attention, dt, LUCA_SMOOTHING.state);
    params.breathAmp = approach(params.breathAmp, target.breathAmp, dt, LUCA_SMOOTHING.state);

    const wantsEnergy = input.state === "listening" || input.state === "speaking";
    const energyTarget = wantsEnergy ? Math.max(0, Math.min(1, input.amplitude)) : 0;
    params.energy = approach(
      params.energy,
      energyTarget,
      dt,
      energyTarget > params.energy
        ? LUCA_SMOOTHING.amplitudeRise
        : LUCA_SMOOTHING.amplitudeFall,
    );

    const swell =
      params.breathAmp * Math.sin((now / LUCA_CADENCE.breath) * Math.PI * 2);
    const pulse = params.attention > 0.01 ? attentionPulse(now) * params.attention : 0;

    const identity = rgbToUnit(
      hexToRgb(input.identityColor) ?? hexToRgb(FALLBACK_IDENTITY)!,
    );
    const attention = rgbToUnit(
      hexToRgb(input.attentionColor) ?? hexToRgb(FALLBACK_ATTENTION)!,
    );

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(locations.resolution, canvas.width, canvas.height);
    gl.uniform1f(locations.time, (now - startTime) / 1000);
    gl.uniform3f(locations.color, identity[0], identity[1], identity[2]);
    gl.uniform3f(locations.attentionColor, attention[0], attention[1], attention[2]);
    gl.uniform1f(locations.attention, params.attention);
    gl.uniform1f(locations.pulse, pulse);
    gl.uniform1f(locations.energy, params.energy);
    gl.uniform1f(locations.flow, params.flow);
    gl.uniform1f(locations.ripple, params.ripple);
    gl.uniform1f(locations.swell, swell);
    gl.uniform1f(locations.glow, params.glow);
    gl.uniform1f(locations.halo, params.halo);
    gl.uniform1f(locations.bright, params.bright);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    animationId = requestAnimationFrame(draw);
  };

  // First frame synchronously — the presence must exist the moment it's created
  draw(performance.now());

  return {
    setInput(next: LiquidPresenceInput) {
      input.state = next.state;
      input.amplitude = next.amplitude ?? 0;
      if (next.identityColor) input.identityColor = next.identityColor;
      if (next.attentionColor) input.attentionColor = next.attentionColor;
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(animationId);
      gl.deleteBuffer(quad);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    },
  };
}
