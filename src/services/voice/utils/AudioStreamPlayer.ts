import { eventBus } from "../../eventBus";

export class AudioStreamPlayer {
  private audioContext: AudioContext;
  private nextStartTime: number = 0;
  private isProcessing: boolean = false;
  private sources: AudioBufferSourceNode[] = [];
  private activeStreams: number = 0;

  constructor(context?: AudioContext) {
    this.audioContext =
      context ||
      new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  get isPlaying(): boolean {
    return this.activeStreams > 0 || this.sources.length > 0;
  }

  /**
   * Enqueues a new audio stream into the playback timeline.
   * Multiple calls to this will result in gapless sequential playback.
   */
  async playStream(
    stream: AsyncIterable<ArrayBuffer>,
    signal?: AbortSignal,
  ): Promise<void> {
    this.activeStreams++;

    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }

    try {
      for await (const chunk of stream) {
        if (signal?.aborted) break;
        await this.playChunk(chunk);
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        console.error("[VOICE] Streaming playback error:", error);
      }
    } finally {
      this.activeStreams--;
    }
  }

  private async playChunk(arrayBuffer: ArrayBuffer): Promise<void> {
    // Decoding is async
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;

    const analyser = this.audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyser.connect(this.audioContext.destination);

    // Monitor amplitude for UI
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let sourceActive = true;
    const monitor = () => {
      if (!this.isPlaying || !sourceActive) return;
      analyser.getByteFrequencyData(dataArray);
      const amp = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      eventBus.emit("audio-amplitude", { amplitude: amp, source: "model" });
      requestAnimationFrame(monitor);
    };

    // Advanced Timing: Ensure no gaps
    const now = this.audioContext.currentTime;
    const startTime = Math.max(now + 0.05, this.nextStartTime);

    source.start(startTime);
    this.nextStartTime = startTime + audioBuffer.duration;
    this.sources.push(source);
    monitor();

    source.onended = () => {
      sourceActive = false;
      this.sources = this.sources.filter((s) => s !== source);
      if (this.sources.length === 0 && this.activeStreams === 0) {
        this.nextStartTime = 0; // Reset timeline if everything is done
      }
    };
  }

  /**
   * Instantly stops all playback and clears the queue.
   */
  stop(): void {
    this.sources.forEach((source) => {
      try {
        source.stop();
      } catch {
        // Already stopped
      }
    });
    this.sources = [];
    this.nextStartTime = 0;
  }
}
