export type LucaAtmosphereShape = "mesh" | "flow" | "linear" | "radial" | "conic";

export interface LucaAtmosphereColor {
  hex: string;
  x: number;
  y: number;
}

export interface LucaAtmosphere {
  enabled: boolean;
  shape: LucaAtmosphereShape;
  colors: LucaAtmosphereColor[];
  softnessPx: number;
  noise: number;
  intensity: number;
  motion: "off" | "calm";
}

export const DEFAULT_LUCA_ATMOSPHERE: LucaAtmosphere = {
  enabled: false,
  shape: "mesh",
  colors: [
    { hex: "#7FA6C0", x: 18, y: 20 },
    { hex: "#8B78B8", x: 78, y: 24 },
    { hex: "#D58C83", x: 72, y: 78 },
    { hex: "#4F7F96", x: 22, y: 76 },
  ],
  softnessPx: 36,
  noise: 0.03,
  intensity: 0.72,
  motion: "calm",
};

const clamp = (value: unknown, min: number, max: number, fallback: number) => {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
};

const normalizeHex = (value: unknown, fallback: string) =>
  typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value.toUpperCase() : fallback;

export function normalizeLucaAtmosphere(value: unknown): LucaAtmosphere {
  const input = value && typeof value === "object" ? (value as Partial<LucaAtmosphere>) : {};
  const shapes: LucaAtmosphereShape[] = ["mesh", "flow", "linear", "radial", "conic"];
  const sourceColors = Array.isArray(input.colors) ? input.colors.slice(0, 4) : [];
  const colors = DEFAULT_LUCA_ATMOSPHERE.colors.map((fallback, index) => {
    const source = sourceColors[index] as Partial<LucaAtmosphereColor> | undefined;
    return {
      hex: normalizeHex(source?.hex, fallback.hex),
      x: clamp(source?.x, 0, 100, fallback.x),
      y: clamp(source?.y, 0, 100, fallback.y),
    };
  });

  return {
    enabled: input.enabled === true,
    shape: shapes.includes(input.shape as LucaAtmosphereShape)
      ? (input.shape as LucaAtmosphereShape)
      : DEFAULT_LUCA_ATMOSPHERE.shape,
    colors,
    softnessPx: clamp(input.softnessPx, 0, 64, DEFAULT_LUCA_ATMOSPHERE.softnessPx),
    noise: clamp(input.noise, 0, 0.12, DEFAULT_LUCA_ATMOSPHERE.noise),
    intensity: clamp(input.intensity, 0.2, 1, DEFAULT_LUCA_ATMOSPHERE.intensity),
    motion: input.motion === "off" ? "off" : "calm",
  };
}

const rgba = (hex: string, alpha: number) => {
  const value = hex.slice(1);
  const channels = [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16));
  return `rgba(${channels[0]}, ${channels[1]}, ${channels[2]}, ${alpha})`;
};

export function buildLucaAtmosphereBackground(value: unknown): string {
  const atmosphere = normalizeLucaAtmosphere(value);
  if (!atmosphere.enabled) return "transparent";
  const alpha = Math.min(0.92, atmosphere.intensity);
  const [a, b, c, d] = atmosphere.colors;

  if (atmosphere.shape === "linear") {
    return `linear-gradient(135deg, ${rgba(a.hex, alpha)}, ${rgba(b.hex, alpha)}, ${rgba(c.hex, alpha)}, ${rgba(d.hex, alpha)})`;
  }
  if (atmosphere.shape === "radial") {
    return `radial-gradient(circle at ${a.x}% ${a.y}%, ${rgba(a.hex, alpha)}, transparent 58%), radial-gradient(circle at ${c.x}% ${c.y}%, ${rgba(c.hex, alpha)}, transparent 64%), ${rgba(b.hex, alpha * 0.5)}`;
  }
  if (atmosphere.shape === "conic") {
    return `conic-gradient(from 210deg at 50% 50%, ${rgba(a.hex, alpha)}, ${rgba(b.hex, alpha)}, ${rgba(c.hex, alpha)}, ${rgba(d.hex, alpha)}, ${rgba(a.hex, alpha)})`;
  }

  const radius = atmosphere.shape === "flow" ? 82 : 58;
  return atmosphere.colors
    .map(({ hex, x, y }) => `radial-gradient(circle at ${x}% ${y}%, ${rgba(hex, alpha)} 0%, transparent ${radius}%)`)
    .join(", ");
}
