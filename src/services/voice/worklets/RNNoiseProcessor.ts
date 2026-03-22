import { Rnnoise, DenoiseState } from "@shiguredo/rnnoise-wasm";

/**
 * RNNoiseProcessor
 * Real-time neural noise suppression using RNNoise (WASM).
 * Expects 16-bit PCM equivalent Float32 data.
 */

// Satisfy TypeScript for AudioWorklet environment
declare abstract class AudioWorkletProcessor {
  abstract process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>): boolean;
  port: MessagePort;
}

declare function registerProcessor(name: string, processor: any): void;

class RNNoiseProcessor extends AudioWorkletProcessor {
  private denoiseState: DenoiseState | null = null;
  private rnnoise: any = null;
  private buffer: Float32Array;
  private bufferIndex: number = 0;
  private frameSize: number = 480; // RNNoise default (10ms @ 48kHz)

  constructor() {
    super();
    this.buffer = new Float32Array(this.frameSize);
    this.init();
  }

  async init() {
    try {
      // In a real build, this would be bundled. 
      // For now, we assume the ES module is available.
      this.rnnoise = await Rnnoise.load();
      this.denoiseState = this.rnnoise.createDenoiseState();
      this.port.postMessage({ type: "initialized" });
    } catch (e: any) {
      this.port.postMessage({ type: "error", message: e?.message || String(e) });
    }
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const input = inputs[0];
    const output = outputs[0];

    if (!input || !input[0] || !this.denoiseState) {
      if (input && input[0] && output && output[0]) {
        output[0].set(input[0]);
      }
      return true;
    }

    const inputChannel = input[0];
    const outputChannel = output[0];

    for (let i = 0; i < inputChannel.length; i++) {
      // 1. Scale to 16-bit PCM range for RNNoise
      this.buffer[this.bufferIndex++] = inputChannel[i] * 32768;

      if (this.bufferIndex === this.frameSize) {
        // 2. Process the frame (in-place modification)
        this.denoiseState.processFrame(this.buffer);
        this.bufferIndex = 0;
      }
      
      // 3. Scale back to Float32 [-1, 1] for Web Audio
      // This introduces a 480-sample fixed latency (10ms @ 48kHz)
      outputChannel[i] = this.buffer[this.bufferIndex] / 32768;
    }

    return true;
  }
}

registerProcessor("rnnoise-processor", RNNoiseProcessor);
