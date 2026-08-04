import { EventBus } from "../../voice-engine/src";
import { AudioDeviceManager } from "./AudioDeviceManager";
import { VADDetector } from "./VADDetector";
import { WhisperSTTAdapter } from "./WhisperSTTAdapter";

export class AudioPipeline {
  public deviceManager: AudioDeviceManager;
  public vad: VADDetector;
  public sttAdapter: WhisperSTTAdapter;

  constructor(eventBus: EventBus) {
    this.deviceManager = new AudioDeviceManager();
    this.vad = new VADDetector(eventBus);
    this.sttAdapter = new WhisperSTTAdapter(eventBus);
  }

  public async start(): Promise<void> {
    await this.deviceManager.requestPermissions();
    this.deviceManager.startCapture();
    this.sttAdapter.startStreaming();
  }

  public stop(): void {
    this.deviceManager.stopCapture();
    this.sttAdapter.stopStreaming();
  }
}
