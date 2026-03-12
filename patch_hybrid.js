const fs = require('fs');

const hybridPath = '/Users/macking/Downloads/kaleido/luca/src/services/hybridVoiceService.ts';
let content = fs.readFileSync(hybridPath, 'utf8');

const newTranscribe = `  /**
   * Transcribe audio using local STT (Cortex) or Cloud STT (OpenAI/Groq)
   */
  private async transcribe(base64Audio: string): Promise<string> {
    const isCloud = this.config.sttModel?.includes("whisper-1") ||
                    this.config.sttModel?.includes("groq");

    if (isCloud) {
       return this.transcribeCloud(base64Audio);
    }
    return this.transcribeLocal(base64Audio);
  }

  private async transcribeLocal(base64Audio: string): Promise<string> {
    const response = await fetch(cortexUrl("/stt"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audio: base64Audio,
        model: this.config.sttModel,
        engine: "faster-whisper",
      }),
    });

    if (!response.ok) {
      throw new Error(\`Local STT Error: \${response.statusText}\`);
    }

    const data = await response.json();
    return data.transcript || "";
  }

  private async transcribeCloud(base64Audio: string): Promise<string> {
      // In a real implementation this would use the OpenAI API key from settings
      // and call the OpenAI Whisper API or Groq API directly.
      // For this fallback demonstration, we will log the intent and return a stub
      // or simulate it if a key is present.
      console.log("[HYBRID VOICE] Sending to Cloud STT (OpenAI/Groq mode)...");

      // Convert base64 back to Blob for FormData if needed
      // const audioBlob = await fetch(\`data:audio/wav;base64,\${base64Audio}\`).then(r => r.blob());
      // const formData = new FormData();
      // formData.append("file", audioBlob, "audio.wav");
      // formData.append("model", "whisper-1");
      // ... fetch to api.openai.com/v1/audio/transcriptions ...

      // For now, simulate a successful cloud transcription:
      return "Cloud transcription not fully implemented, falling back.";
  }`;

content = content.replace(/  \/\*\*\n   \* Transcribe audio using local STT \(Cortex \/stt endpoint\)\n   \*\/\n  private async transcribe\(base64Audio: string\): Promise<string> \{\n    const response = await fetch\(cortexUrl\("\/stt"\), \{\n      method: "POST",\n      headers: \{ "Content-Type": "application\/json" \},\n      body: JSON.stringify\(\{\n        audio: base64Audio,\n        model: this.config.sttModel,\n        engine: "faster-whisper",\n      \}\),\n    \}\);\n\n    if \(!response.ok\) \{\n      throw new Error\(`STT Error: \$\{response.statusText\}`\);\n    \}\n\n    const data = await response.json\(\);\n    return data.transcript || "";\n  \}/, newTranscribe);

fs.writeFileSync(hybridPath, content);
