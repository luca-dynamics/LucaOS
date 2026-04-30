import { useState, useCallback, useRef, useEffect } from "react";
import { CORTEX_SERVER_URL } from "../config/api";
import { settingsService } from "../services/settingsService";
import { analyzeAndPlayAudio } from "../services/voiceService";
import { eventBus } from "../services/eventBus";

// Configuration
// In production, this should come from env or config
const WS_URL = `${CORTEX_SERVER_URL.replace("http", "ws")}/ws/audio`;

// Wake Word Configuration (Sentry Mode)
const WAKE_WORDS = ["hey luca", "hieluca", "hey lucca", "luca", "hello luca"];
const SILENCE_TIMEOUT_MS = 5000; // 5 seconds to return to IDLE

// Voice State for Sentry Mode
type SentryState = "SENTRY" | "ACTIVE";

interface VoiceInputState {
  isListening: boolean;
  transcript: string;
  status: "IDLE" | "LISTENING" | "THINKING" | "SPEAKING";
  error: string | null;
  volume: number; // Expose volume for UI
  isVadActive: boolean; // Expose VAD state for UI
  sentryState: SentryState; // New: Sentry Mode state
}

export const useVoiceInput = () => {
  const [state, setState] = useState<VoiceInputState>({
    isListening: false,
    transcript: "",
    status: "IDLE",
    error: null,
    volume: 0,
    isVadActive: false,
    sentryState: "SENTRY", // Start in Sentry Mode (waiting for wake word)
  });

  // NEW: Ref to expose stream for WakeWordListener
  const sharedStreamRef = useRef<MediaStream | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const source = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrame = useRef<number | null>(null);
  const intentToListen = useRef(false); // RACE CONDITION GUARD
  const suppressAudioRef = useRef(false); // NEW: Track if audio should be silent

  // --- SENTRY MODE STATE ---
  const silenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sentryStateRef = useRef<SentryState>("SENTRY");
  const wakeWordRecognizer = useRef<any>(null); // Web Speech API for local wake word detection

  // --- ADAPTIVE VAD STATE ---
  const vadState = useRef({
    noiseFloor: 0.002,
    vadHangover: 0,
    isSpeaking: false,
    speechDetectedInChunk: false, // Tracks if *any* speech occurred in current chunk
  });

  // VAD Constants (Matched to LiveService)
  const NOISE_ALPHA = 0.05; // Fast adaptation
  const SNR_THRESHOLD = 1.3;
  const ABSOLUTE_THRESHOLD = 0.005;
  const HANGOVER_FRAMES = 10; // ~600ms at 60fps

  // --- WAKE WORD & DICTATION (Web Speech API) ---
  const dummyStreamRef = useRef<MediaStream | null>(null);

  const startWakeWordDetection = useCallback(async () => {
    // 0. PRIVACY LOCK CHECK
    const settings = settingsService.getSettings();
    if (settings.privacy && settings.privacy.micEnabled === false) {
      console.warn(
        "[VoiceInput] 🔒 WAKE WORD BLOCKED: Mic is locked by Privacy",
      );
      return;
    }

    // 1. FORCE MIC INDICATOR (Trust Signal)
    // We open a real stream just to trigger the OS-level microphone icon.
    // If we don't do this, Chrome hides the usage until speech is detected, which worries users.
    try {
      if (!dummyStreamRef.current || !dummyStreamRef.current.active) {
        // console.log("[VoiceInput] Opening Trust Stream for Wake Word...");
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            // Minimal processing for dummy stream
          },
        });
        dummyStreamRef.current = stream;

        // Mute tracks locally so it doesn't feedback or consume extra processing
        // But keep them "enabled" so the OS thinks it's recording
        stream.getAudioTracks().forEach((track) => {
          track.enabled = true;
          // Note: We don't connect this to any audio context, so it's effectively silent/unused,
          // but the OS sees the "Recording" handle open.
        });
      }
    } catch (e) {
      console.warn("[VoiceInput] Failed to open trust stream:", e);
      // We don't block execution, but we log it.
    }

    if (
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    ) {
      console.warn(
        "[VoiceInput] Web Speech API not available - Sentry/Dictation disabled",
      );
      sentryStateRef.current = "ACTIVE";
      setState((prev) => ({ ...prev, sentryState: "ACTIVE" }));
      return;
    }

    const SpeechRecognition =
      (window as any).webkitSpeechRecognition ||
      (window as any).SpeechRecognition;
    wakeWordRecognizer.current = new SpeechRecognition();
    wakeWordRecognizer.current.continuous = true;
    wakeWordRecognizer.current.interimResults = true;
    wakeWordRecognizer.current.lang = "en-US";

    wakeWordRecognizer.current.onresult = (event: any) => {
      let interimTranscript = "";
      let finalTranscript = "";

      // Process results
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += t;
        } else {
          interimTranscript += t;
        }
      }

      // 1. WAKE WORD CHECK (Sentry Mode)
      const fullStr = (finalTranscript + interimTranscript).toLowerCase();
      const hasWakeWord = WAKE_WORDS.some((word) => fullStr.includes(word));

      if (hasWakeWord && sentryStateRef.current === "SENTRY") {
        console.log(`[VoiceInput] Wake word detected: "${fullStr}"`);

        // 1. SIGNAL ELECTRON TO SHOW WINDOW
        if ((window as any).ipcRenderer) {
          (window as any).ipcRenderer.send("wake-word-triggered");
        }

        // 2. ACTIVATE UI STATE
        sentryStateRef.current = "ACTIVE";
        setState((prev) => ({ ...prev, sentryState: "ACTIVE" }));

        // Reset silence timer
        if (silenceTimer.current) clearTimeout(silenceTimer.current);
        silenceTimer.current = setTimeout(() => {
          sentryStateRef.current = "SENTRY";
          setState((prev) => ({ ...prev, sentryState: "SENTRY" }));
        }, SILENCE_TIMEOUT_MS);
      }

      // 2. DICTATION EXPOSURE (For ChatWidget)
      // If we are actively listening (intentToListen is true), expose the text!
      if (intentToListen.current) {
        // Prefer final, but show interim for speed
        const text = finalTranscript || interimTranscript;
        if (text) {
          setState((prev) => ({ ...prev, transcript: text }));
        }
      }
    };

    wakeWordRecognizer.current.onerror = (event: any) => {
      if (event.error !== "no-speech") {
        console.warn("[VoiceInput] Wake word recognition error:", event.error);
      }
      // Restart on most errors
      if (event.error === "network" || event.error === "aborted") {
        setTimeout(() => {
          if (wakeWordRecognizer.current && state.isListening) {
            wakeWordRecognizer.current.start();
          }
        }, 1000);
      }
    };

    wakeWordRecognizer.current.onend = () => {
      // Restart if still listening (continuous mode)
      if (state.isListening && wakeWordRecognizer.current) {
        try {
          wakeWordRecognizer.current.start();
        } catch {
          // Ignore - already running
        }
      }
    };

    try {
      wakeWordRecognizer.current.start();
      console.log("[VoiceInput] Wake word detection started (SENTRY mode)");
    } catch (e) {
      console.error("[VoiceInput] Failed to start wake word detection:", e);
    }
  }, [state.isListening]);

  const stopWakeWordDetection = useCallback(() => {
    if (wakeWordRecognizer.current) {
      try {
        wakeWordRecognizer.current.stop();
        wakeWordRecognizer.current = null;
      } catch {
        // Ignore
      }
    }
    // STOP DUMMY STREAM
    if (dummyStreamRef.current) {
      dummyStreamRef.current.getTracks().forEach((t) => t.stop());
      dummyStreamRef.current = null;
    }

    if (silenceTimer.current) {
      clearTimeout(silenceTimer.current);
      silenceTimer.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return;

    ws.current = new WebSocket(WS_URL);

    ws.current.onopen = () => {
      console.log("[VoiceInput] Connected to Cortex Ear");
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case "status":
            setState((prev) => ({ ...prev, status: data.message }));
            break;
          case "transcript":
            // Received final text from Gemini
            setState((prev) => ({ ...prev, transcript: data.text }));
            break;
          case "audio":
            // Received audio from YarnGPT (Cloud)
            if (!suppressAudioRef.current) {
              playAudio(data.data, data.mimeType);
            } else {
              console.log(
                "[VoiceInput] Audio received but suppressed (Silent Dictation Mode)",
              );
            }
            break;
          case "error":
            console.error("[VoiceInput] Server Error:", data.message);
            setState((prev) => ({ ...prev, error: data.message }));
            break;
        }
      } catch (e) {
        console.error("[VoiceInput] Failed to parse message", e);
      }
    };

    ws.current.onerror = (e) => {
      console.error("[VoiceInput] WebSocket Error", e);
      setState((prev) => ({ ...prev, error: "Connection Failed" }));
    };
  }, []);

  // Root Mean Square (RMS) Calculation
  const calculateRMS = (dataArray: Uint8Array) => {
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const float = (dataArray[i] - 128) / 128; // Center around 0
      sum += float * float;
    }
    return Math.sqrt(sum / dataArray.length);
  };

  const startListening = useCallback(
    async (
      initialMode: SentryState = "ACTIVE",
      options?: { suppressAudio?: boolean },
    ) => {
      // Clear previous transcript for a fresh session
      setState((prev) => ({ ...prev, transcript: "", error: null }));
      intentToListen.current = true; // Mark intent
      suppressAudioRef.current = !!options?.suppressAudio; // Set silent flag
      try {
        // --- PRIVACY LOCK CHECK ---
        const settings = settingsService.getSettings();
        if (settings.privacy && settings.privacy.micEnabled === false) {
          console.warn(
            "[VoiceInput] 🔒 MIC LOCKED: Blocked by Global Privacy Settings",
          );
          setState((prev) => ({
            ...prev,
            error: "Microphone Locked by Privacy",
          }));
          return;
        }

        if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
          connect();
          // Wait a bit for connection
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        // Check intent again before requesting mic
        if (!intentToListen.current) return;

        // 0. STOP TRUST STREAMS (Local Wake Word) to prevent conflict with Live session
        // This ensures the mic resource is fully available for the high-priority stream
        stopWakeWordDetection();

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        // Store in shared ref for App.tsx access
        sharedStreamRef.current = stream;

        // CRITICAL: Check if user stopped while we were waiting based on intent
        if (!intentToListen.current) {
          console.log(
            "[VoiceInput] Aborting start: User stopped listening during initialization",
          );
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        // --- AUDIO ANALYSIS SETUP ---
        const AudioContextClass =
          window.AudioContext || (window as any).webkitAudioContext;
        audioContext.current = new AudioContextClass();
        analyser.current = audioContext.current.createAnalyser();
        analyser.current.fftSize = 256;
        source.current = audioContext.current.createMediaStreamSource(stream);
        source.current.connect(analyser.current);

        const dataArray = new Uint8Array(analyser.current.frequencyBinCount);
        let currentVolume = 0;

        // Real-time volume monitoring loop
        const frequencyData = new Uint8Array(
          analyser.current.frequencyBinCount,
        );

        const updateVolume = () => {
          if (analyser.current && audioContext.current) {
            analyser.current.getByteTimeDomainData(dataArray); // Use Time Domain for RMS
            const rms = calculateRMS(dataArray);
            currentVolume = rms; // Update for closure access

            // --- REAL dB CALCULATION (Logarithmic) ---
            const dB = rms > 0.001 ? Math.max(-60, 20 * Math.log10(rms)) : -60;

            // --- FFT FREQUENCY DETECTION ---
            analyser.current.getByteFrequencyData(frequencyData);
            let maxBin = 0;
            let maxValue = 0;
            for (let i = 1; i < frequencyData.length; i++) {
              if (frequencyData[i] > maxValue) {
                maxValue = frequencyData[i];
                maxBin = i;
              }
            }
            // Convert bin index to Hz: (binIndex * sampleRate) / fftSize
            const dominantFrequency =
              maxValue > 10
                ? Math.round(
                    (maxBin * audioContext.current.sampleRate) /
                      analyser.current.fftSize,
                  )
                : 0;

            // --- ADAPTIVE VAD LOGIC ---
            const s = vadState.current;

            // 1. Adaptive Noise Floor
            if (rms < s.noiseFloor * 1.5) {
              s.noiseFloor =
                s.noiseFloor * (1 - NOISE_ALPHA) + rms * NOISE_ALPHA;
            } else {
              // Slowly drift up if constantly loud
              s.noiseFloor = s.noiseFloor * 0.999 + rms * 0.001;
            }

            // 2. Signal Detection (SNR Check)
            const isSignal =
              rms > ABSOLUTE_THRESHOLD && rms > s.noiseFloor * SNR_THRESHOLD;

            if (isSignal) {
              s.vadHangover = HANGOVER_FRAMES;
              if (!s.isSpeaking) {
                s.isSpeaking = true;
                console.log(
                  `[VAD] Speech Start (SNR: ${(rms / s.noiseFloor).toFixed(1)})`,
                );
              }
              s.speechDetectedInChunk = true; // Mark chunk as containing speech
            } else {
              if (s.vadHangover > 0) {
                s.vadHangover--;
              } else {
                if (s.isSpeaking) {
                  s.isSpeaking = false;
                  // console.log("[VAD] Speech End");
                }
              }
            }

            // Update React state for UI components
            if (rms > 0.005) {
              setState((prev) => ({ ...prev, volume: rms }));
              // Global broadcast for audio-reactive components (Hologram/Heartbeat)
              // Standardized to 0-255 range for unified visualizers
              eventBus.emit("audio-amplitude", {
                amplitude: Math.min(255, rms * 400), // Scale up for visual impact
                source: "user",
                dB: dB, // Real decibel value (-60 to 0)
                dominantFrequency: dominantFrequency, // Real Hz value
              });
            } else if (currentVolume > 0) {
              setState((prev) => ({ ...prev, volume: 0 }));
              // Emit silent state with baseline values
              eventBus.emit("audio-amplitude", {
                amplitude: 0,
                source: "user",
                dB: -60,
                dominantFrequency: 0,
              });
            }
          }
          animationFrame.current = requestAnimationFrame(updateVolume);
        };
        updateVolume();

        // --- RECORDING SETUP ---
        // Use standard MIME type that Gemini supports
        const mimeType = "audio/webm;codecs=opus";

        mediaRecorder.current = new MediaRecorder(stream, { mimeType });

        mediaRecorder.current.ondataavailable = (event) => {
          if (
            event.data.size > 0 &&
            ws.current?.readyState === WebSocket.OPEN
          ) {
            // GATING CHECK 1: Check if ANY speech occurred in this chunk (VAD)
            // For ACTIVE mode, we assume user intention implies speech, or we trust VAD.
            // Since we are sending one big blob at the end for ACTIVE, we just send it.

            const hasSpeech =
              vadState.current.speechDetectedInChunk ||
              vadState.current.isSpeaking ||
              sentryStateRef.current === "ACTIVE"; // Trust intent in ACTIVE mode

            // GATING CHECK 2: Check Sentry Mode state
            const isActive = sentryStateRef.current === "ACTIVE";

            if (hasSpeech && isActive) {
              console.log(
                `[VoiceInput] Sending Audio Chunk (${event.data.size} bytes)`,
              );

              // Send to Gemini
              const reader = new FileReader();
              reader.onloadend = () => {
                const result = reader.result as string;
                // Strip Data URI prefix (data:audio/webm;base64,) if present
                const base64Audio = result.includes(",")
                  ? result.split(",")[1]
                  : result;

                if (ws.current?.readyState === WebSocket.OPEN) {
                  const voiceSettings = settingsService.get("voice");
                  const activePersona =
                    settingsService.get("general")?.theme || "ASSISTANT";

                  ws.current.send(
                    JSON.stringify({
                      type: "audio_input",
                      data: base64Audio,
                      model: voiceSettings?.sttModel || "whisper-tiny",
                      ttsProvider: voiceSettings?.provider || "local-luca",
                      ttsVoice: voiceSettings?.voiceId || "af_heart",
                      persona: activePersona,
                      context: "Luca AI Assistant",
                    }),
                  );
                }
              };
              reader.readAsDataURL(event.data);
            } else if (!isActive) {
              // Sentry Logic for ignoring noise ...
              if (hasSpeech)
                console.debug(
                  "[VoiceInput] Speech ignored (waiting for wake word)",
                );
            }

            // RESET CHUNK STATE
            vadState.current.speechDetectedInChunk = false;
          }
        };

        // Send audio chunks every 2 seconds for real-time transcription
        // WE MUST USE STOP/START to ensure every chunk has a WebM header.
        // Standard 'timeslice' produces headerless chunks which breaks ffmpeg/Moonshine.
        const chunkDuration = initialMode === "ACTIVE" ? 2000 : 3000;

        mediaRecorder.current.start();
        console.log(
          `[VoiceInput] Started Recording (${initialMode} mode, ${chunkDuration}ms manual chunks)`,
        );

        // Manual Chunking Interval
        const chunkInterval = setInterval(() => {
          if (
            mediaRecorder.current &&
            mediaRecorder.current.state === "recording"
          ) {
            mediaRecorder.current.stop();
            // ondataavailable will fire.
            // Restart immediately
            mediaRecorder.current.start();
          }
        }, chunkDuration);

        // Store interval ID on the recorder object or elsewhere to clear it?
        // We can attach it to the mediaRecorder instance loosely or use a ref.
        (mediaRecorder.current as any)._chunkInterval = chunkInterval;

        // Reset sentry state to requested initial mode
        sentryStateRef.current = initialMode;
        // Start wake word just in case (e.g. for hybrid), but effectively ignored in ACTIVE
        startWakeWordDetection();

        setState((prev) => ({
          ...prev,
          isListening: true,
          status: "LISTENING",
          error: null,
          sentryState: initialMode,
        }));
      } catch (e) {
        console.error("[VoiceInput] Mic Error", e);
        setState((prev) => ({ ...prev, error: "Microphone Access Denied" }));
      }
    },
    [connect, startWakeWordDetection],
  );

  const stopListening = useCallback(() => {
    intentToListen.current = false; // CANCEL ANY PENDING START

    // 1. Stop Media Recorder
    if (mediaRecorder.current) {
      // Clear chunk interval
      if ((mediaRecorder.current as any)._chunkInterval) {
        clearInterval((mediaRecorder.current as any)._chunkInterval);
        (mediaRecorder.current as any)._chunkInterval = null;
      }

      if (mediaRecorder.current.state !== "inactive") {
        mediaRecorder.current.stop();
      }
      // Force track stop
      if (mediaRecorder.current.stream) {
        mediaRecorder.current.stream.getTracks().forEach((track) => {
          track.stop();
          track.enabled = false;
        });
      }
    }

    // 2. Cleanup Audio Context (Critical for "Mic On" indicator)
    if (audioContext.current) {
      try {
        audioContext.current.close();
      } catch (e) {
        console.warn("AudioContext Close Error", e);
      }
      audioContext.current = null;
    }
    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current);
      animationFrame.current = null;
    }

    // 3. Stop wake word detection
    stopWakeWordDetection();
    sentryStateRef.current = "SENTRY";

    setState((prev) => ({
      ...prev,
      isListening: false,
      status: "IDLE",
      sentryState: "SENTRY",
    }));
  }, [stopWakeWordDetection]);

  const playAudio = (base64Data: string, mimeType: string = "audio/wav") => {
    try {
      const audioStr = `data:${mimeType};base64,` + base64Data;
      analyzeAndPlayAudio(audioStr, mimeType);
    } catch (e) {
      console.error("Audio decode failed", e);
    }
  };

  // Startup Auto-Start (Sentry Mode)
  useEffect(() => {
    // Only auto-start if settings allow
    const settings = settingsService.get("voice");
    if (settings?.wakeWordEnabled) {
      startWakeWordDetection();
    } else {
      console.log("[VoiceInput] Wake Word disabled by settings.");
    }

    return () => {
      stopWakeWordDetection();
    };
  }, [startWakeWordDetection, stopWakeWordDetection]);

  // React to Settings Changes (e.g. from Tray)
  useEffect(() => {
    const handleSettingsChange = (newSettings: any) => {
      const enabled = newSettings.voice?.wakeWordEnabled;
      if (enabled) {
        console.log("[VoiceInput] Settings changed: Wake Word ENABLED");
        startWakeWordDetection();
      } else {
        console.log("[VoiceInput] Settings changed: Wake Word DISABLED");
        stopWakeWordDetection();
      }
    };
    settingsService.on("settings-changed", handleSettingsChange);
    return () => {
      settingsService.off("settings-changed", handleSettingsChange);
    };
  }, [startWakeWordDetection, stopWakeWordDetection]);

  // Cleanup
  useEffect(() => {
    return () => {
      stopListening();
      ws.current?.close();
    };
  }, []);

  // --- WATCHDOG: ENSURE TRUST STREAM ALIVE ---
  useEffect(() => {
    const watchdog = setInterval(async () => {
      const settings = settingsService.get("voice") || {};
      const privacy = settingsService.get("privacy");

      // CASE 0: GLOBAL PRIVACY LOCK -> KILL EVERYTHING
      if (privacy && privacy.micEnabled === false) {
        if (dummyStreamRef.current && dummyStreamRef.current.active) {
          console.warn(
            "[VoiceInput] Watchdog: Killing stream due to Privacy Lock",
          );
          dummyStreamRef.current.getTracks().forEach((t) => t.stop());
          dummyStreamRef.current = null;
        }
        return;
      }

      // CASE 1: ENABLED & SENTRY MODE -> Ensure Stream is Active
      if (settings?.wakeWordEnabled && sentryStateRef.current === "SENTRY") {
        try {
          if (!dummyStreamRef.current || !dummyStreamRef.current.active) {
            console.log("[VoiceInput] Watchdog: Re-acquiring Trust Stream...");
            const stream = await navigator.mediaDevices.getUserMedia({
              audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false,
              },
            });
            dummyStreamRef.current = stream;
            stream.getAudioTracks().forEach((t) => (t.enabled = true));
          }
        } catch (e) {
          console.warn("[VoiceInput] Watchdog fail:", e);
        }
      }
      // CASE 2: DISABLED -> Ensure Stream is DEAD
      else if (!settings?.wakeWordEnabled) {
        if (dummyStreamRef.current && dummyStreamRef.current.active) {
          console.log(
            "[VoiceInput] Watchdog: Cleaning up zombie stream (Disabled in Settings)",
          );
          dummyStreamRef.current.getTracks().forEach((t) => t.stop());
          dummyStreamRef.current = null;
        }
      }
    }, 2000); // Check every 2 seconds

    return () => clearInterval(watchdog);
  }, []);

  // Memoize getters/actions to prevent downstream effect loops
  const getSharedStream = useCallback(() => sharedStreamRef.current, []);
  const forceKillWakeWord = useCallback(() => {
    console.log("[VoiceInput] FORCE KILL trigger received");
    stopWakeWordDetection();
  }, [stopWakeWordDetection]);

  return {
    ...state,
    connect,
    startListening,
    stopListening,
    getSharedStream,
    forceKillWakeWord,
  };
};
