export class RippleEngine {
  public static calculateWaveRipple(distance: number, time: number, frequency: number): number {
    return Math.sin(distance * frequency - time * 4.0) * 0.05;
  }
}
