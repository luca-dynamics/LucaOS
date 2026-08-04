export class AudioEngine {
  private currentAmplitude: number = 0;
  private targetAmplitude: number = 0;

  public setAudioLevel(level: number): void {
    this.targetAmplitude = Math.max(0, Math.min(1, level));
  }

  public update(): number {
    // Smooth Exponential Moving Average filter (under 30ms latency)
    this.currentAmplitude += (this.targetAmplitude - this.currentAmplitude) * 0.25;
    return this.currentAmplitude;
  }
}
