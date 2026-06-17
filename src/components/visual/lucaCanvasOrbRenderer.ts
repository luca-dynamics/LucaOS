export type LucaCanvasOrbVisualState =
  | "idle"
  | "preparing"
  | "listening"
  | "thinking"
  | "speaking"
  | "ready"
  | "error";

export interface LucaCanvasOrbFrame {
  state: LucaCanvasOrbVisualState;
  amplitude: number;
  themeColor: string;
  secondaryColor: string;
  darkColor: string;
  lowPower: boolean;
  visualCoreActive: boolean;
  time: number;
}

const withAlpha = (color: string, alpha: number) => {
  if (/^#[\da-f]{6}$/i.test(color)) {
    const value = Math.round(alpha * 255)
      .toString(16)
      .padStart(2, "0");
    return `${color}${value}`;
  }
  return color;
};

/**
 * Presentation-only extraction of Luca's established Dictation and voice
 * liquid-plasma canvas drawing. Runtime state remains caller-owned.
 */
export function drawLucaCanvasOrb(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: LucaCanvasOrbFrame,
) {
  const {
    state,
    amplitude,
    themeColor,
    secondaryColor,
    darkColor,
    lowPower,
    visualCoreActive,
    time,
  } = frame;
  const level = Math.max(0, Math.min(1, amplitude > 1 ? amplitude / 255 : amplitude));
  const listening = state === "listening";
  const speaking = state === "speaking";
  const active = ["preparing", "listening", "thinking", "speaking"].includes(state);
  const color = state === "error" ? "#f87171" : themeColor;
  const secondary = state === "error" ? "#fecaca" : secondaryColor;
  const centerX = width / 2;
  const centerY = height / 2;
  const baseRadius = Math.min(width, height) * 0.19;
  const activeScale = listening ? 1.14 : active ? 1.06 : 1;

  context.clearRect(0, 0, width, height);
  context.save();
  context.translate(centerX, centerY);
  context.beginPath();

  const points = lowPower ? 36 : 72;
  for (let index = 0; index <= points; index += 1) {
    const angle = (index / points) * Math.PI * 2;
    const waveOne = Math.sin(angle * 3 + time) * baseRadius * 0.13;
    const waveTwo = lowPower
      ? 0
      : Math.cos(angle * 6 - time * 1.5) * baseRadius * 0.1;
    const waveThree =
      Math.sin(angle * 12 + time * 5) * level * baseRadius * 0.48;
    const pulse = level * baseRadius * 0.24;
    const radius =
      (baseRadius + waveOne + waveTwo + waveThree + pulse) * activeScale;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.closePath();

  const gradient = context.createRadialGradient(
    0,
    0,
    baseRadius * 0.2,
    0,
    0,
    baseRadius * 1.55,
  );
  if (listening) {
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.4, secondary);
    gradient.addColorStop(1, withAlpha(color, 0));
  } else if (speaking || state === "thinking") {
    gradient.addColorStop(0, secondary);
    gradient.addColorStop(0.5, color);
    gradient.addColorStop(1, withAlpha(color, 0));
  } else {
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.6, withAlpha(darkColor, 0.5));
    gradient.addColorStop(1, "rgba(0,0,0,0)");
  }
  context.fillStyle = gradient;
  context.fill();

  if (!lowPower) {
    context.shadowBlur = Math.max(3, baseRadius * 0.35 + level * baseRadius);
    context.shadowColor = listening ? secondary : color;
  }
  context.strokeStyle = listening ? "#ffffff" : withAlpha(color, 0.55);
  context.lineWidth = Math.max(1, width / 80);
  context.stroke();
  context.shadowBlur = 0;
  context.restore();

  context.save();
  context.translate(centerX, centerY);
  context.rotate(time * 0.2);
  context.beginPath();
  context.arc(0, 0, baseRadius * 1.75, 0, Math.PI * 2);
  context.strokeStyle = withAlpha(color, 0.24);
  context.lineWidth = Math.max(0.75, width / 110);
  context.setLineDash([Math.max(2, width / 20), Math.max(4, width / 10)]);
  context.stroke();
  context.restore();

  context.save();
  context.translate(centerX, centerY);
  context.beginPath();
  context.arc(0, 0, baseRadius * 2.25 + level * baseRadius * 0.3, 0, Math.PI * 2);
  context.strokeStyle = withAlpha(color, 0.2);
  context.lineWidth = Math.max(0.75, width / 120);
  context.stroke();
  context.restore();

  if (visualCoreActive) {
    context.save();
    context.translate(centerX, centerY);
    context.rotate(-time * 0.4);
    context.beginPath();
    context.arc(0, 0, baseRadius * 2.5, 0, Math.PI * 1.5);
    context.strokeStyle = color;
    context.lineWidth = Math.max(1, width / 70);
    context.stroke();
    context.restore();
  }
}
