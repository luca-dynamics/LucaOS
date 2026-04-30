/**
 * WavEncoder: Industrial utility for converting raw Float32 audio frames
 * into PCM16 WAV Blobs compatible with OpenAI, Groq, and Deepgram REST.
 */
export class WavEncoder {
  static encode(frames: Float32Array[], sampleRate: number = 16000): Blob {
    const totalLength = frames.reduce((acc, frame) => acc + frame.length, 0);
    const audioData = new Int16Array(totalLength);

    let offset = 0;
    for (const frame of frames) {
      for (let i = 0; i < frame.length; i++) {
        const s = Math.max(-1, Math.min(1, frame[i]));
        audioData[offset++] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
    }

    const buffer = new ArrayBuffer(44 + audioData.length * 2);
    const view = new DataView(buffer);

    // RIFF identifier
    this.writeString(view, 0, "RIFF");
    // RIFF chunk length
    view.setUint32(4, 36 + audioData.length * 2, true);
    // RIFF type
    this.writeString(view, 8, "WAVE");
    // format chunk identifier
    this.writeString(view, 12, "fmt ");
    // format chunk length
    view.setUint32(16, 16, true);
    // sample format (raw)
    view.setUint16(20, 1, true);
    // channel count
    view.setUint16(22, 1, true);
    // sample rate
    view.setUint32(24, sampleRate, true);
    // byte rate (sample rate * block align)
    view.setUint32(28, sampleRate * 2, true);
    // block align (channel count * bytes per sample)
    view.setUint16(32, 2, true);
    // bits per sample
    view.setUint16(34, 16, true);
    // data chunk identifier
    this.writeString(view, 36, "data");
    // data chunk length
    view.setUint32(40, audioData.length * 2, true);

    // Write PCM samples
    let index = 44;
    for (let i = 0; i < audioData.length; i++) {
      view.setInt16(index, audioData[i], true);
      index += 2;
    }

    return new Blob([buffer], { type: "audio/wav" });
  }

  private static writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}
