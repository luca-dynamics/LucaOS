// 
// RNNoiseProcessor.js
// This script is meant to be loaded as an AudioWorklet.
// It uses @shiguredo/rnnoise-wasm logic but formatted for Worklet environment.
//

// We define the processor class
class RNNoiseProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.frameSize = 480;
    this.inputBuffer = new Float32Array(this.frameSize);
    this.outputBuffer = new Float32Array(this.frameSize);
    this.bufferIndex = 0;
    this.isInitialized = false;
    this.denoiseState = null;
    this.rnnoise = null;

    this.port.onmessage = (event) => {
      if (event.data.type === 'init') {
        // Main thread will send the WASM module or we can try to import it
        // For simplicity in a worker, we'll assume the WASM is ready or bundle it.
      }
    };
  }

  // Note: we'll handle the WASM injection via a more robust method in hybridVoiceService
  // but for the internal logic:
  
  process(inputs, outputs) {
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
        // 1. Convert -1.0/+1.0 to -32768/+32767 for RNNoise
        // Most RNNoise WASM wrappers expect the float value in the range of short
        this.inputBuffer[this.bufferIndex] = inputChannel[i] * 32768;
        
        // 2. Output the delayed processed sample
        // We output the sample from the *previous* processed frame to keep a constant delay
        outputChannel[i] = this.outputBuffer[this.bufferIndex] / 32768;

        this.bufferIndex++;

        if (this.bufferIndex === this.frameSize) {
            // 3. Run Denoising
            // This modifies inputBuffer into outputBuffer (or we set outputBuffer)
            // Assuming use of @shiguredo/rnnoise-wasm API:
            const vadProb = this.denoiseState.processFrame(this.inputBuffer);
            
            // In Shiguredo's version, processFrame modifies the input buffer to be the output
            this.outputBuffer.set(this.inputBuffer);
            
            this.bufferIndex = 0;
            
            // Optional: Report VAD probability to main thread
            if (vadProb > 0.5) {
                // this.port.postMessage({ type: 'vad', probability: vadProb });
            }
        }
    }

    return true;
  }
}

registerProcessor('rnnoise-processor', RNNoiseProcessor);
