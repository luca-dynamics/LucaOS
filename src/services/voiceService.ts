import { eventBus } from "./eventBus";
import { settingsService } from "./settingsService";

let activeAudio: HTMLAudioElement | null = null;
let sharedAudioCtx: AudioContext | null = null;

const getSharedAudioCtx = (): AudioContext => {
  if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
    sharedAudioCtx = new (
      window.AudioContext || (window as any).webkitAudioContext
    )();
  }
  return sharedAudioCtx;
};

export const voiceService = {
  speak: async (
    text: string,
    googleApiKey?: string,
    voiceConfig?: { languageCode: string; name: string },
  ): Promise<Blob | null> => {
    const settings = settingsService.get("voice");
    console.log("[VOICE] Speaking:", text.substring(0, 50) + "...");

    // SPECIAL CASE: If Voice ID is "native-browser", force browser TTS
    if (settings.voiceId === "native-browser") {
      console.log("[VOICE] 'native-browser' selected. Forcing Browser TTS.");
      return await speakWithBrowser(text, settings);
    }

    try {
      // Use the CapabilityRouter to get the best provider for the current settings
      const { capabilityRouter } = await import("./CapabilityRouter");
      const ttsProvider = await capabilityRouter.getTtsProvider();

      // Determine voiceId override (Google style)
      const voiceIdOverride = voiceConfig?.name || undefined;

      const audioBuffer = await ttsProvider.synthesize(text, {
        apiKey: googleApiKey,
        voiceId: voiceIdOverride,
      });

      if (audioBuffer) {
        const audioBlob = new Blob([audioBuffer], { type: "audio/mp3" });
        const audioUrl = URL.createObjectURL(audioBlob);
        await analyzeAndPlayAudio(audioUrl, "audio/mp3");
        return audioBlob;
      }
      return null;
    } catch (e) {
      console.error(`[VOICE] Synthesis failed:`, e);
      // Fallback to browser TTS if everything else fails (legacy safety)
      return await speakWithBrowser(text, settings);
    }
  },

  stop: () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (activeAudio) {
      activeAudio.pause();
      activeAudio.currentTime = 0;
      activeAudio = null;
      eventBus.emit("audio-amplitude", { amplitude: 0, source: "tts-stop" });
    }
  },

  // Fetch available voices from Google
  fetchGoogleVoices: async (apiKey: string) => {
    try {
      const response = await fetch(
        `https://texttospeech.googleapis.com/v1/voices?key=${apiKey}`,
      );
      if (!response.ok) throw new Error("Failed to fetch voices");
      const data = await response.json();
      return data.voices || [];
    } catch (e) {
      console.error("[VOICE] Failed to fetch Google voices:", e);
      return [];
    }
  },
};

// Helper for Browser TTS
async function speakWithBrowser(
  text: string,
  settings: any,
): Promise<Blob | null> {
  return new Promise<Blob | null>((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      console.error("[VOICE] Browser SpeechSynthesis not available!");
      return resolve(null);
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    let stopSimulation: (() => void) | null = null;

    utterance.onstart = () => {
      console.log("[VOICE] Browser TTS started speaking!");
      stopSimulation = simulateVoiceActivity();
    };

    utterance.onend = () => {
      console.log("[VOICE] Browser TTS finished speaking.");
      if (stopSimulation) stopSimulation();
      resolve(null);
    };

    utterance.onerror = (e) => {
      console.error("[VOICE] Browser TTS error:", e);
      if (stopSimulation) stopSimulation();
      resolve(null);
    };

    utterance.rate = settings.rate || 1.0;
    utterance.pitch = settings.pitch || 1.0;

    let voices = window.speechSynthesis.getVoices();
    console.log(`[VOICE] Browser TTS: Found ${voices.length} voices`);

    if (voices.length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        voices = window.speechSynthesis.getVoices();
        console.log(`[VOICE] Browser TTS: Voices loaded (${voices.length})`);
        setNativeVoice(utterance, voices, settings.voiceId);
        window.speechSynthesis.speak(utterance);
      };
    } else {
      setNativeVoice(utterance, voices, settings.voiceId);
      console.log("[VOICE] Browser TTS: Calling speechSynthesis.speak()");
      window.speechSynthesis.speak(utterance);
    }
  });
}


function setNativeVoice(
  utterance: SpeechSynthesisUtterance,
  voices: SpeechSynthesisVoice[],
  targetVoiceName?: string,
) {
  let preferredVoice;

  if (targetVoiceName) {
    preferredVoice = voices.find((v) => v.name === targetVoiceName);
  }

  if (!preferredVoice) {
    preferredVoice =
      voices.find((v) => v.name.includes("Google US English")) ||
      voices.find((v) => v.name.includes("Zira")) ||
      voices.find((v) => v.name.includes("Samantha")) ||
      voices.find((v) => v.lang === "en-US");
  }

  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }
}

/**
 * Plays audio from a URL/Blob and emits amplitude events for visualizations.
 */
export async function analyzeAndPlayAudio(
  audioUrl: string,
  mimeType: string = "audio/wav",
): Promise<void> {
  console.log(
    `[VoiceService] Analyzing & Playing (${mimeType}):`,
    audioUrl.substring(0, 50) + "...",
  );

  const audioCtx = getSharedAudioCtx();
  console.log(
    `[VoiceService] AudioContext state (Pre-Resume): ${audioCtx.state}`,
  );

  // MUST resume context to allow playback (macOS policy)
  if (audioCtx.state === "suspended") {
    console.log("[VoiceService] 🔊 Attempting to resume AudioContext...");
    await audioCtx.resume();
    console.log(`[VoiceService] AudioContext resumed: ${audioCtx.state}`);
  }

  return new Promise((resolve) => {
    // 1. Stop any existing audio
    if (activeAudio) {
      activeAudio.pause();
      activeAudio.currentTime = 0;
    }

    const audio = new Audio();
    // Use the provided MIME type if it's a data URL, or let Audio handle it
    audio.src = audioUrl;
    activeAudio = audio;

    const analyser = audioCtx.createAnalyser();

    // Use try-catch for MediaElementSource as it can only be called once per element
    let source: MediaElementAudioSourceNode;
    try {
      source = audioCtx.createMediaElementSource(audio);
    } catch (e) {
      // If we already have a source for this element (unlikely here but safe),
      // we just proceed or fallback to un-analyzed playback.
      console.warn("[VoiceService] RMS analysis setup failed:", e);
      audio.onended = () => {
        if (activeAudio === audio) activeAudio = null;
        resolve();
      };
      audio.play().catch(() => resolve());
      return;
    }

    source.connect(analyser);
    analyser.connect(audioCtx.destination);

    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    let animationId: number;
    let isPlaying = true;

    const analyze = () => {
      if (!isPlaying || activeAudio !== audio) return;

      analyser.getByteFrequencyData(dataArray);

      // Calculate average amplitude
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;

      // Emit scaling factor (0-255 range acceptable, or normalized)
      const amplified = Math.min(255, average * 2.5);

      eventBus.emit("audio-amplitude", {
        amplitude: amplified,
        source: "tts",
      });

      animationId = requestAnimationFrame(analyze);
    };

    audio.onended = () => {
      isPlaying = false;
      cancelAnimationFrame(animationId);
      audioCtx.close();
      if (activeAudio === audio) activeAudio = null;
      // Reset animation
      eventBus.emit("audio-amplitude", { amplitude: 0, source: "tts" });
      resolve();
    };

    audio.onerror = (e) => {
      console.error("Audio Playback Error:", e);
      isPlaying = false;
      cancelAnimationFrame(animationId);
      audioCtx.close();
      if (activeAudio === audio) activeAudio = null;
      resolve();
    };

    audio
      .play()
      .then(() => {
        analyze();
      })
      .catch((e) => {
        console.error("Audio Playback Failed:", e);
        if (activeAudio === audio) activeAudio = null;
        resolve();
      });
  });
}

/**
 * Simulates voice activity for native TTS where we can't analyze the stream.
 * Returns a cleanup function.
 */
function simulateVoiceActivity(): () => void {
  let active = true;
  let animationId: number;

  const loop = () => {
    if (!active) return;

    // Create organic-looking speech pattern
    const time = Date.now() / 100;
    // Varying sine waves to create "syllables"
    const envelope =
      Math.abs(Math.sin(time)) * 0.7 + Math.abs(Math.sin(time * 2.5)) * 0.3;

    // Base amplitude modulated by envelope + random jitter
    // Target range: 50-240
    const amp = envelope * 150 + 50 + Math.random() * 20;

    eventBus.emit("audio-amplitude", {
      amplitude: Math.min(255, amp),
      source: "tts-sim",
    });

    animationId = requestAnimationFrame(loop);
  };

  loop();

  return () => {
    active = false;
    cancelAnimationFrame(animationId);
    eventBus.emit("audio-amplitude", { amplitude: 0, source: "tts-sim" });
  };
}
