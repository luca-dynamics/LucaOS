import React, { useEffect, useRef } from "react";
import { Canvas, Fill, Skia, Shader } from "@shopify/react-native-skia";
import { OrbState } from "../types/OrbState";
import { LIQUID_SKSL } from "../shaders/liquid";
import { ORB_MATERIALS, OrbMaterial } from "../materials/OrbMaterial";
import { OrbAccessibility, createAccessibilityProfile } from "../engine/OrbAccessibility";
import { OrbTheme, validateOrbTheme } from "../engine/OrbTheme";

export interface OrbRendererProps {
  size: number;
  state?: OrbState;
  intensity?: number;
  material?: string | OrbMaterial;
  theme?: OrbTheme;
  accessibility?: OrbAccessibility;
  radius?: number;
}

const source = Skia.RuntimeEffect.Make(LIQUID_SKSL);

function hexToRgbUnit(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  return [
    ((num >> 16) & 255) / 255,
    ((num >> 8) & 255) / 255,
    (num & 255) / 255,
  ];
}

export function OrbRenderer({
  size,
  state: _state = OrbState.Idle,
  intensity = 0.35,
  material = "liquidGlass",
  theme,
  accessibility,
  radius = 0.32,
}: OrbRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const validatedTheme = validateOrbTheme(theme);
  const activeMaterial: OrbMaterial = validatedTheme.material
    ? validatedTheme.material
    : typeof material === "string"
      ? ORB_MATERIALS[material] || ORB_MATERIALS.liquidGlass
      : material;

  const accessProfile = createAccessibilityProfile(accessibility);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2");
    if (!gl) return;

    const vsSource = `#version 300 es
      in vec2 a_position;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
      }`;

    const fsSource = `#version 300 es
      precision highp float;
      out vec4 fragColor;
      ${LIQUID_SKSL}
      void main() {
        fragColor = main(gl_FragCoord.xy);
      }`;

    const compileShader = (type: number, src: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertShader = compileShader(gl.VERTEX_SHADER, vsSource);
    const fragShader = compileShader(gl.FRAGMENT_SHADER, fsSource);
    if (!vertShader || !fragShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const posLoc = gl.getAttribLocation(program, "a_position");
    const resLoc = gl.getUniformLocation(program, "resolution");
    const timeLoc = gl.getUniformLocation(program, "time");
    const radLoc = gl.getUniformLocation(program, "radius");
    const intensityLoc = gl.getUniformLocation(program, "intensity");
    const colCoreLoc = gl.getUniformLocation(program, "colorCore");
    const colPriLoc = gl.getUniformLocation(program, "colorPrimary");
    const colSecLoc = gl.getUniformLocation(program, "colorSec");
    const colRimLoc = gl.getUniformLocation(program, "colorRim");
    const fresnelLoc = gl.getUniformLocation(program, "fresnelStr");
    const refractLoc = gl.getUniformLocation(program, "refractionStr");
    const contrastLoc = gl.getUniformLocation(program, "contrastBoost");
    const opacityLoc = gl.getUniformLocation(program, "opacityBoost");

    const rgb0 = hexToRgbUnit(activeMaterial.baseColors[0]);
    const rgb1 = validatedTheme.glowTint || hexToRgbUnit(activeMaterial.baseColors[1]);
    const rgb2 = hexToRgbUnit(activeMaterial.baseColors[2]);
    const rgb3 = validatedTheme.ambientTint || hexToRgbUnit(activeMaterial.baseColors[3]);

    let animId: number;
    const startTime = performance.now();

    const render = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = size * dpr;
      canvas.height = size * dpr;

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(program);

      gl.enableVertexAttribArray(posLoc);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

      const currentTime = ((performance.now() - startTime) / 1000) * accessProfile.flowScale;

      gl.uniform2f(resLoc, canvas.width, canvas.height);
      gl.uniform1f(timeLoc, currentTime);
      gl.uniform1f(radLoc, radius);
      gl.uniform1f(intensityLoc, intensity * accessProfile.breathingScale);
      gl.uniform3f(colCoreLoc, rgb0[0], rgb0[1], rgb0[2]);
      gl.uniform3f(colPriLoc, rgb1[0], rgb1[1], rgb1[2]);
      gl.uniform3f(colSecLoc, rgb2[0], rgb2[1], rgb2[2]);
      gl.uniform3f(colRimLoc, rgb3[0], rgb3[1], rgb3[2]);
      gl.uniform1f(fresnelLoc, activeMaterial.fresnelStrength * accessProfile.contrastBoost);
      gl.uniform1f(refractLoc, activeMaterial.refractionStrength);
      gl.uniform1f(contrastLoc, accessProfile.contrastBoost);
      gl.uniform1f(opacityLoc, accessProfile.opacityBoost);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      gl.deleteProgram(program);
    };
  }, [size, radius, intensity, activeMaterial, validatedTheme, accessProfile]);

  if (source) {
    const rgb0 = hexToRgbUnit(activeMaterial.baseColors[0]);
    const rgb1 = validatedTheme.glowTint || hexToRgbUnit(activeMaterial.baseColors[1]);
    const rgb2 = hexToRgbUnit(activeMaterial.baseColors[2]);
    const rgb3 = validatedTheme.ambientTint || hexToRgbUnit(activeMaterial.baseColors[3]);

    return (
      <Canvas style={{ width: size, height: size }}>
        <Fill>
          <Shader
            source={source}
            uniforms={{
              resolution: [size, size],
              time: 0,
              radius: radius,
              intensity: intensity * accessProfile.breathingScale,
              colorCore: rgb0,
              colorPrimary: rgb1,
              colorSec: rgb2,
              colorRim: rgb3,
              fresnelStr: activeMaterial.fresnelStrength * accessProfile.contrastBoost,
              refractionStr: activeMaterial.refractionStrength,
              contrastBoost: accessProfile.contrastBoost,
              opacityBoost: accessProfile.opacityBoost,
            }}
          />
        </Fill>
      </Canvas>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: size,
        height: size,
        pointerEvents: "none",
      }}
    />
  );
}
