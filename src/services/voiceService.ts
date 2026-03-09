import { settingsService } from "./settingsService";
import { getGenClient } from "./genAIClient"; // Import from shared client logic
import { eventBus } from "./eventBus";
import { cortexUrl } from "../config/api";
import { BRAIN_CONFIG } from "../config/brain.config.ts";

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
    console.log("[VOICE] Configured Provider:", settings.provider);

    // 1. Determine Configuration (Arguments override Settings)
    const apiKey = googleApiKey || settings.googleApiKey;
    const provider = settings.provider;

    // SPECIAL CASE: If Voice ID is "native-browser", force browser TTS regardless of provider
    // This handles the UI case where "native-browser" is nested under "Local Offline"
    if (settings.voiceId === "native-browser") {
      console.log(
        "[VOICE] 'native-browser' voice selected. Forcing Browser TTS.",
      );
      return await speakWithBrowser(text, settings);
    }

    try {
      switch (provider) {
        case "local-luca":
          // Try Local Piper/Kokoro (Cortex)
          return await speakWithLocalLuca(text, settings);

        case "gemini-genai":
          // Try Gemini GenAI
          return await speakWithGeminiGenAI(text, settings);

        case "google": {
          // Try Google Cloud
          const googleVoiceName =
            voiceConfig?.name || settings.voiceId || "en-US-Journey-F";

          const safeGoogleVoiceName = googleVoiceName.startsWith("en-")
            ? googleVoiceName
            : "en-US-Journey-F";

          const targetVoice = voiceConfig || {
            languageCode: safeGoogleVoiceName.substring(0, 5),
            name: safeGoogleVoiceName,
          };

          return await speakWithGoogle(text, apiKey, targetVoice, settings);
        }

        case "native":
        default:
          // Default to Browser TTS
          console.log("[VOICE] Using Native Browser TTS (Explicit or Default)");
          return await speakWithBrowser(text, settings);
      }
    } catch (e) {
      console.error(`[VOICE] Provider '${provider}' failed:`, e);
      // User requested NO FALLBACKS.
      // If the selected provider fails, we behave silently or show a notification (but here we just return null).
      return null;
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

// Helper for Local Luca TTS (Python Cortex)
async function speakWithLocalLuca(
  text: string,
  settings: any,
): Promise<Blob | null> {
  // Target the Piper TTS endpoint on Cortex
  const url = cortexUrl("/tts");

  const payload = {
    text: text,
    voice: settings.voiceId || "amy",
    speed: settings.rate || 1.0,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Piper API Error: ${response.statusText}`);
  }

  // Cortex returns JSON with base64 audio data
  const data = await response.json();
  if (data.type === "audio" && data.data) {
    // Convert base64 to Blob
    const audioBytes = Uint8Array.from(atob(data.data), (c) => c.charCodeAt(0));
    const audioBlob = new Blob([audioBytes], { type: "audio/wav" });
    const audioUrl = URL.createObjectURL(audioBlob);

    await analyzeAndPlayAudio(audioUrl);
    return audioBlob;
  }

  throw new Error("Invalid TTS response format");
}

// Helper for Google Cloud TTS
async function speakWithGoogle(
  text: string,
  apiKey: string,
  voice: { languageCode: string; name: string },
  settings: any,
): Promise<Blob | null> {
  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;

  const payload = {
    input: { text },
    voice: { languageCode: voice.languageCode, name: voice.name },
    audioConfig: {
      audioEncoding: "MP3",
      speakingRate: settings.rate || 1.0,
      pitch: settings.pitch ? (settings.pitch - 1) * 20 : 0, // Google pitch is -20.0 to 20.0
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Unknown Google TTS error");
  }

  const data = await response.json();
  if (data.audioContent) {
    // Convert base64 to Blob
    const audioBytes = Uint8Array.from(atob(data.audioContent), (c) =>
      c.charCodeAt(0),
    );
    const audioBlob = new Blob([audioBytes], { type: "audio/mp3" });
    const audioUrl = `data:audio/mp3;base64,${data.audioContent}`;

    await analyzeAndPlayAudio(audioUrl);
    return audioBlob;
  }
  return null;
}

// Helper for Gemini 2.5 Generative TTS
async function speakWithGeminiGenAI(
  text: string,
  settings: any,
): Promise<Blob | null> {
  const genAI = getGenClient();
  const contents: any[] = [
    {
      role: "user",
      parts: [
        {
          text: `
# AUDIO PROFILE: Luca ## "The Sentient Core"
# THE SCENE: Inside a quantum digital interface. The environment is cool, sleek, and hyper-modern.
# DIRECTOR'S NOTES
Style: ${settings.style || "Feminine, sophisticated, calm, highly intelligent, slightly synthetic but warm."}
Pacing: ${settings.pacing || "Normal"} - Precise and articulate.
Dynamics: Smooth, level tone with subtle modulation indicating processing depth.
Accent: Neutral, Global English (Transatlantic).
# SAMPLE CONTEXT: Luca is the operating system for a high-level agent, providing data and insights to the Operator.

#### TRANSCRIPT
"${text}"
  `,
        },
      ],
    },
  ];

  // --- VOICE CLONING INTEGRATION ---
  if (settings.activeClonedVoiceId) {
    try {
      // Lazy load service to avoid circular dependencies if any
      const { voiceCloneService } = await import("./VoiceCloneService");
      const clonedVoice = await voiceCloneService.getVoice(
        settings.activeClonedVoiceId,
      );

      if (clonedVoice && clonedVoice.audioBlob) {
        console.log(`[VOICE] Using Cloned Voice: ${clonedVoice.name}`);
        const base64Audio = await voiceCloneService.blobToBase64(
          clonedVoice.audioBlob,
        );
        const cleanBase64 = base64Audio.split(",")[1]; // Remove data URL prefix

        // Insert audio prompt for mimicry
        // Note: For Gemini 2.0/2.5 Flash, passing audio input alongside text acts as context.
        // We explicitly instruct it to mimic this voice.
        contents[0].parts.unshift({
          inlineData: {
            mimeType: "audio/mp3", // Assuming recorded format
            data: cleanBase64,
          },
        });
        contents[0].parts.unshift({
          text: "Use the following audio clip as a reference for the voice tone, timbre, and accent. MIMIC this voice exactly when speaking the transcript below.",
        });
      }
    } catch (e) {
      console.warn("[VOICE] Failed to load cloned voice reference:", e);
    }
  }

  // Use the specific model selected in Brain Settings (via Voice Tab now), or default to Flash
  // settings.brain is not directly available here, usually we read 'voice' settings.
  // We need to access global settings for the model choice if it was moved to brain.voiceModel or just voice.voiceModel?
  // In the refactor, we stored it in 'brain.voiceModel'.

  // We need to fetch the full settings object to access 'brain' section
  const fullSettings = settingsService.getSettings();
  const targetModel =
    fullSettings.brain.voiceModel || BRAIN_CONFIG.defaults.voice;

  const result = await genAI.models.generateContent({
    model: targetModel,
    contents: contents,
    config: {
      // responseMimeType: "audio/mp3",
    },
  });

  if (!result.candidates || result.candidates.length === 0)
    throw new Error("No audio candidate generated");

  const part = result.candidates[0].content?.parts?.find(
    (p: any) => p.inlineData,
  );

  if (part && part.inlineData && part.inlineData.data) {
    const base64 = part.inlineData.data;
    const audioBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const audioBlob = new Blob([audioBytes], { type: "audio/mp3" });
    const audioUrl = `data:audio/mp3;base64,${base64}`;

    await analyzeAndPlayAudio(audioUrl);
    return audioBlob;
  }

  throw new Error("No audio data found in response");
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
