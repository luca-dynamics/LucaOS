export interface AudioDevice {
  id: string;
  label: string;
  isDefault: boolean;
}

export class AudioDeviceManager {
  private activeDeviceId = "default";
  private sampleRate = 16000;
  private isCapturing = false;

  public async enumerateDevices(): Promise<AudioDevice[]> {
    return [
      { id: "default", label: "System Default Microphone", isDefault: true },
      { id: "mic_headset", label: "Studio USB Headset Mic", isDefault: false },
    ];
  }

  public async requestPermissions(): Promise<boolean> {
    return true; // Granted
  }

  public setSampleRate(rate: number): void {
    this.sampleRate = rate;
  }

  public getSampleRate(): number {
    return this.sampleRate;
  }

  public startCapture(): void {
    this.isCapturing = true;
  }

  public stopCapture(): void {
    this.isCapturing = false;
  }

  public isActive(): boolean {
    return this.isCapturing;
  }
}
