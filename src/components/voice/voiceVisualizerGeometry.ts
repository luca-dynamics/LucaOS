export interface VoiceVisualizerGeometry {
  centerX: number;
  centerY: number;
  baseRadius: number;
  baseOrbRadius: number;
  spectrumPulse: number;
  edgeMargin: number;
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

export function resolveVoiceVisualizerGeometry(
  width: number,
  height: number,
): VoiceVisualizerGeometry {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const shortSide = Math.min(safeWidth, safeHeight);
  const edgeMargin = clamp(shortSide * 0.05, 12, 32);
  const drawableRadius = Math.max(1, shortSide / 2 - edgeMargin);
  const spectrumPulse = Math.min(20, drawableRadius * 0.08);

  return {
    centerX: safeWidth / 2,
    centerY: safeHeight / 2,
    baseRadius: Math.min(150, drawableRadius / 2.2),
    baseOrbRadius: Math.min(132, (drawableRadius - spectrumPulse) / 2.5),
    spectrumPulse,
    edgeMargin,
  };
}
