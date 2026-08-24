import { Rnnoise } from './rnnoise.js';

class RNNoiseProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.frameSize = 480;
    this.buffer = new Float32Array(this.frameSize);
    this.bufferIndex = 0;
    this.denoiseState = null;
    this.rnnoise = null;
    this.init();
  }

  async init() {
    try {
      this.rnnoise = await Rnnoise.load();
      this.denoiseState = this.rnnoise.createDenoiseState();
      this.port.postMessage({ type: 'initialized' });
    } catch (e) {
      this.port.postMessage({ type: 'error', message: e.message || String(e) });
    }
  }

  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];

    // Fallback if not initialized or no input
    if (!input || !input[0] || !this.denoiseState) {
      if (input && input[0] && output && output[0]) {
        output[0].set(input[0]);
      }
      return true;
    }

    const inputChannel = input[0];
    const outputChannel = output[0];

    for (let i = 0; i < inputChannel.length; i++) {
        // 1. Scale to 16-bit PCM equivalent
        this.buffer[this.bufferIndex++] = inputChannel[i] * 32768;

        if (this.bufferIndex === this.frameSize) {
            // 2. Process frame (modifies buffer in-place in Shiguredo's build)
            this.denoiseState.processFrame(this.buffer);
            this.bufferIndex = 0;
        }
        
        // 3. Scale back to Float32 [-1.0, 1.0]
        // This introduces a 480-sample delay (10ms @ 48kHz)
        outputChannel[i] = this.buffer[this.bufferIndex] / 32768;
    }

    return true;
  }
}

registerProcessor('rnnoise-processor', RNNoiseProcessor);
