import React, { useEffect, useState, useRef } from "react";
import { Send } from "lucide-react";
import { ConversationMode } from "./ModeSelect";
import VoiceHud from "../VoiceHud";
import { liveService } from "../../services/liveService";
import { hybridVoiceService } from "../../services/hybridVoiceService";
// Note: voiceService not needed - Gemini/Local TTS handles speech natively

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (message: string) => void;
  disabled: boolean;
  mode: ConversationMode;
  theme?: { primary: string; hex: string };
  // Note: lucaMessage/onLucaMessageSpoken removed - Gemini speaks natively in voice-to-voice mode
  onModeChange?: () => void; // Callback to return to mode selection
  onActivity?: () => void; // Callback for silence reset
  onVoiceComplete?: () => void; // Callback when voice conversation completes
  onLucaResponse?: (text: string) => void; // Callback when Luca speaks (for profile extraction)
  onUserResponse?: (text: string) => void; // NEW: Callback when user speaks (for profile extraction)
  userName?: string; // NEW: User's name for personalized greeting
  useLocalVoice?: boolean; // NEW: Use hybrid local voice service instead of cloud liveService
}

// Helper to convert hex to rgba (handles 6 or 8 character hex)
const hexToRgba = (hex: string, alpha: number): string => {
  const cleanHex = hex.replace("#", "");
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/**
 * Message input component for text/voice conversation
 */
const MessageInput: React.FC<MessageInputProps> = ({
  value,
  onChange,
  onSend,
  disabled,
  mode,
  theme = { primary: "cyan", hex: "#06b6d4" },
  onModeChange,
  onActivity,
  onVoiceComplete,
  onLucaResponse,
  onUserResponse,
  userName = "Operator", // Default if not provided
  useLocalVoice = false, // Default to cloud voice (liveService)
}) => {
  // Voice state using liveService or hybridVoiceService
  const [amplitude, setAmplitude] = useState(0);
  const [vadActive, setVadActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Transcript state (TTS handled natively by Gemini in voice-to-voice mode)
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [transcriptSource, setTranscriptSource] = useState<"user" | "model">(
    "model",
  );

  // Connection state tracking
  const isConnectedRef = useRef(false);
  const isCompletingRef = useRef(false); // Guard against double completion triggers
  const accumulatedTranscriptRef = useRef(""); // Accumulate transcript for phrase detection

  // Stabilize callbacks to prevent useEffect re-runs
  const onActivityRef = useRef(onActivity);
  const onVoiceCompleteRef = useRef(onVoiceComplete);
  const onLucaResponseRef = useRef(onLucaResponse);
  const onUserResponseRef = useRef(onUserResponse);

  useEffect(() => {
    onActivityRef.current = onActivity;
    onVoiceCompleteRef.current = onVoiceComplete;
    onLucaResponseRef.current = onLucaResponse;
    onUserResponseRef.current = onUserResponse;
  }, [onActivity, onVoiceComplete, onLucaResponse, onUserResponse]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onSend(value);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Connect to liveService OR hybridVoiceService when voice mode starts
  useEffect(() => {
    if (mode === "voice" && !isConnectedRef.current) {
      isConnectedRef.current = true;
      isCompletingRef.current = false; // Reset on new connection
      accumulatedTranscriptRef.current = ""; // Reset accumulated transcript

      // --- LOCAL VOICE MODE (Silero VAD) ---
      if (useLocalVoice) {
        console.log(
          "[Onboarding Voice] Using LOCAL mode (Silero VAD → Cortex)",
        );

        // Connect with liveService-compatible API
        hybridVoiceService.connect({
          sttModel: "whisper-tiny",
          llmModel: "llama-3.2-1b",
          ttsVoice: "amy",
          systemPrompt: `You are Luca, an AI assistant meeting ${userName} for the first time.
Keep responses SHORT (2-3 sentences). Ask ONE question at a time.
Get to know: their name, communication style, role, needs, and AI preferences.
When you have gathered enough info, summarize and say "ONBOARDING_COMPLETE".`,

          onAudioData: (amp) => setAmplitude(amp),
          onVadChange: (active) => {
            setVadActive(active);
            if (active) onActivityRef.current?.();
          },
          onTranscript: (text, source) => {
            setCurrentTranscript(text);
            setTranscriptSource(source);

            if (source === "user") {
              onUserResponseRef.current?.(text);
            } else {
              onLucaResponseRef.current?.(text);

              // Check for completion phrases
              const normalizedText = text
                .toLowerCase()
                .replace(/[^\w\s]/g, "")
                .trim();
              accumulatedTranscriptRef.current += " " + normalizedText;

              const completionPhrases = [
                "lets get started",
                "onboarding complete",
                "profile saved",
                "all set",
                "ready to go",
                "lets begin",
              ];

              const isComplete = completionPhrases.some(
                (p) =>
                  normalizedText.includes(p) ||
                  accumulatedTranscriptRef.current.includes(p),
              );

              if (isComplete && !isCompletingRef.current) {
                isCompletingRef.current = true;
                setTimeout(() => {
                  hybridVoiceService.disconnect();
                  isConnectedRef.current = false;
                  onVoiceCompleteRef.current?.();
                }, 1500);
              }
            }
            onActivityRef.current?.();
          },
          onStatusUpdate: (status) => {
            console.log("[Onboarding Voice] Status:", status);
            if (status.includes("Failed") || status.includes("Error")) {
              setError(status);
            } else {
              setError(null);
            }
          },
          onConnectionChange: (connected) => {
            isConnectedRef.current = connected;
            if (connected) {
              // Kickstart with greeting
              setTimeout(() => {
                if (isConnectedRef.current) {
                  hybridVoiceService.sendText(
                    "Hi! I'm ready to begin the onboarding.",
                  );
                }
              }, 1000);
            }
          },
        });

        // Cleanup for local mode
        return () => {
          hybridVoiceService.disconnect();
          hybridVoiceService.clearHistory();
        };
      }

      // --- CLOUD VOICE MODE (liveService) ---
      console.log("[Onboarding Voice] Using CLOUD mode (Gemini Live API)");

      // Onboarding-specific voice conversation instruction
      const ONBOARDING_VOICE_INSTRUCTION = `You are Luca, an AI assistant meeting your new operator for the first time in a VOICE conversation.

**CRITICAL FORMAT RULE - READ THIS FIRST:**
- Output ONLY the words you will speak aloud
- Do NOT include any asterisks (**), markdown, or formatting
- Do NOT include any thinking, reasoning, or stage directions
- Do NOT say things like "Begin Interacting" or describe what you're doing
- Just speak naturally as if talking to a person

**YOUR GOAL:** Get to know them through natural conversation and summarize their profile.

**STEP 1: GATHER INFORMATION (one at a time):**
1. Preferred name - What should I call you?
2. Communication style - Direct/casual or formal?
3. Role - What do you do?
4. Needs - What do you need help with?
5. AI preferences - Proactive or wait for commands?

**RULES for Step 1:**
- Ask ONE question at a time
- Keep responses SHORT (2-3 sentences)
- Acknowledge answers warmly, then ask next question

**STEP 2: SUMMARY & CONFIRMATION**
Once you have gathered all 5 points, provide a warm summary of their profile.
"So, to recap: You are [Name], a [Occupation] who prefers a [Style] assistant. You're looking for help with [Needs] and you'd like me to be [Proactive/Reactive]. Does that sound correct?"
- You MUST wait for them to confirm.

**STEP 3: EXIT**
- If they confirm (e.g., "Yes", "Exactly", "That's it"), you MUST call the completeOnboarding() tool immediately.
- If they want to change something, go back to Step 1 for that specific item.

**START:** Say "Hi! I'm Luca, your autonomous Ai OS. What preferred name can i call you?"

**SKIP:** If they say "skip" or "let's start", call the completeOnboarding() tool immediately.
`;

      liveService.connect({
        persona: "ASSISTANT",
        // NO suppressOutput - we want Gemini to speak!
        systemInstruction: ONBOARDING_VOICE_INSTRUCTION,
        onToolCall: async (name) => {
          if (name === "completeOnboarding") {
            console.log(
              "[Onboarding Voice] completeOnboarding tool called - triggering transition",
            );
            onVoiceCompleteRef.current?.();
            return { result: "Transitioning to calibration phase" };
          }
          return { result: "Tools restricted in onboarding" };
        },
        onAudioData: (amp) => setAmplitude(amp),
        onTranscript: (text, type) => {
          // STRIP INTERNAL REASONING: Remove text between ** and other formatting
          // This is a tactical cleanup in case Gemini ignores the system instruction
          let processedText = text;
          if (type === "model" && text) {
            // Filter out internal reasoning and metadata
            let filteredText = text;

            // 1. Remove markdown markers (asterisks) but keep the content
            filteredText = filteredText.replace(/\*\*/g, "");
            filteredText = filteredText.replace(/\*/g, "");

            // 2. Remove common "thinking" prefixes that shouldn't be spoken
            // These are phrases seen in reasoning models that often leak to transcript
            const thoughts = [
              /^I see the user.*?\./i,
              /^I'm interpreting.*?\./i,
              /^My next step.*?\./i,
              /^I will start by.*?\./i,
              /^The user said.*?\./i,
            ];

            thoughts.forEach((regex) => {
              filteredText = filteredText.replace(regex, "");
            });

            processedText = filteredText.trim();

            // Remove leading/trailing quotes if Gemini added them
            processedText = processedText.replace(/^["']|["']$/g, "").trim();

            // LOG incoming for debug
            console.log("[Onboarding Voice] Incoming Model Text:", text, "-> Processed:", processedText);

            // Skip ONLY IF truly empty (don't return early if we have something even if short)
            if (!processedText && text.trim()) {
              processedText = text.trim(); // Fallback to raw if logic stripped everything
            }
            
            if (!processedText) return;
          }

          if (type === "user" && processedText) {
            // Pass user response to parent for message history
            onUserResponseRef.current?.(processedText);
          }

          setCurrentTranscript(processedText);
          setTranscriptSource(type);

          // Notify parent of activity (for silence detection)
          onActivityRef.current?.();

          // COMPLETION DETECTION: Check if Gemini said the completion phrase
          if (type === "model" && processedText) {
            // Pass Luca's response to parent for message history and profile extraction
            onLucaResponseRef.current?.(processedText);

            // Accumulate model transcript for better phrase detection
            accumulatedTranscriptRef.current += " " + processedText;
            const fullText = accumulatedTranscriptRef.current.toLowerCase();

            const normalizedText = processedText
              .toLowerCase()
              .replace(/[^\w\s]/g, "")
              .replace(/\s+/g, " ")
              .trim();
            const normalizedFullText = fullText
              .replace(/[^\w\s]/g, "")
              .replace(/\s+/g, " ")
              .trim();

            console.log(
              "[Onboarding Voice] Normalized Text for completion check:",
              normalizedText,
            );

            const completionPhrases = [
              "lets get started",
              "let's get started",
              "let us get started",
              "excellent lets get started",
              "lets jump right in",
              "let's jump right in",
              "jumping right in",
              "skipping to calibration",
              "skipping the setup",
              "saved your profile",
              "ive saved your profile",
              "profile saved",
              "onboarding complete",
              "setup complete",
              "everything is set",
              "all systems go",
              "begin our journey",
              "start the calibration",
              "initializing",
              "onboarding_complete",
            ];

            // Check both current text and accumulated text
            const isComplete = completionPhrases.some(
              (phrase) =>
                normalizedText.includes(phrase) ||
                normalizedFullText.includes(phrase),
            );

            if (isComplete && !isCompletingRef.current) {
              isCompletingRef.current = true; // Set guard
              // Small delay to let AI finish speaking
              setTimeout(() => {
                liveService.disconnect();
                isConnectedRef.current = false;
                onVoiceCompleteRef.current?.();
              }, 1500);
            }
          }
        },
        onVadChange: (active) => {
          setVadActive(active);
          if (active) onActivityRef.current?.(); // Note: Changed to use ref for stability
        },
        onStatusUpdate: (msg) => {
          console.log("[Onboarding Voice Status]:", msg);
          if (msg.includes("Failed") || msg.includes("Error")) {
            setError(msg);
          } else {
            setError(null);
          }
        },
        onConnectionChange: (connected) => {
          isConnectedRef.current = connected; // Update ref immediately

          if (connected) {
            // KICKSTART: Trigger Luca to start speaking immediately
            setTimeout(() => {
              if (isConnectedRef.current) {
                liveService.sendText(
                  "Hi Luca, I'm ready to begin the onboarding. Please introduce yourself and let's get started with the first few questions.",
                );
              }
            }, 1000);
          }
        },
      });
    }
  }, [
    mode,
    // Note: Callbacks moved to refs to prevent unnecessary re-connections
    userName,
  ]);

  // Combined Cleanup Effect: Unmount OR Mode change
  useEffect(() => {
    return () => {
      if (isConnectedRef.current) {
        console.log("[Onboarding Voice] Cleaning up voice session...");
        liveService.disconnect();
        isConnectedRef.current = false;
      }
    };
  }, [mode]);

  // Voice mode: Show VoiceHud (FULL SCREEN)
  if (mode === "voice") {
    return (
      <div className="fixed inset-0 z-50">
        <VoiceHud
          isActive={true}
          isVisible={true}
          transcript={currentTranscript}
          transcriptSource={transcriptSource}
          amplitude={amplitude}
          isSpeaking={transcriptSource === "model"}
          isVadActive={vadActive}
          paused={false}
          persona={(theme?.primary as any) || "ASSISTANT"}
          theme={{
            primary: theme.primary,
            border: hexToRgba(theme.hex, 0.25),
            bg: hexToRgba(theme.hex, 0.08),
            glow: hexToRgba(theme.hex, 0.15),
            coreColor: theme.hex,
            hex: theme.hex,
            themeName: theme.primary, // Required by VoiceHud
            // Onboarding override: Make HUD background transparent to show OnboardingFlow background
          }}
          hideDebugPanels={true}
          hideControls={true}
          transparentBackground={true}
          onClose={() => {
            // Disconnect liveService
            liveService.disconnect();
            isConnectedRef.current = false;
            // Go back to mode selection
            if (onModeChange) {
              onModeChange();
            }
          }}
          onTranscriptChange={() => {
            // Live transcript updates handled by liveService onTranscript callback
          }}
          onTranscriptComplete={(text) => {
            // In voice-to-voice mode, liveService handles the full conversation
            // We just log the transcript for message history
            if (text.trim()) {
              onSend(text.trim()); // Parent's handleSend is mode-aware
            }
          }}
        />

        {/* Error message overlay */}
        {error && (
          <div className="absolute bottom-20 left-0 right-0 flex justify-center">
            <div className="bg-red-500/20 border border-red-500/50 px-4 py-2 rounded-lg text-xs text-red-300 backdrop-blur-xl">
              {error}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Text mode: Show text input
  const isLight = theme?.hex === "#111827" || theme?.primary === "lucagent";

  return (
    <form
      onSubmit={handleSubmit}
      className={`border-t backdrop-blur-xl ${isLight ? "border-black/10" : "border-white/10"}`}
      style={{ padding: "2vmin" }}
    >
      <div
        className={`
        flex items-center
        theme-transition
        backdrop-blur-xl
        transition-all
        ${
          isLight
            ? "bg-black/5 border border-black/10 focus-within:border-black/30 focus-within:bg-black/10"
            : "bg-white/5 border border-white/20 focus-within:border-white/40 focus-within:bg-white/10"
        }
      `}
      style={{
        borderRadius: "1.5vmin",
        padding: "1vmin 2vmin",
        gap: "1.5vmin"
      }}
      >
        {/* Text input */}
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            onActivity?.(); // Reset silence timer on typing
          }}
          onKeyPress={handleKeyPress}
          disabled={disabled}
          placeholder="Type your message..."
          autoFocus
          className={`
            flex-1 
            bg-transparent 
            outline-none
            ${isLight ? "text-gray-900 placeholder-gray-400" : "text-white placeholder-gray-500"}
          `}
          style={{ fontSize: "clamp(0.7rem, 2vmin, 0.9rem)" }}
        />

        {/* Send button */}
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className={`
            rounded-lg
            disabled:opacity-50
            disabled:cursor-not-allowed
            transition-all
            active:scale-95
            ${isLight ? "bg-black/10 hover:bg-black/20" : "bg-white/10 hover:bg-white/20"}
          `}
          style={{ padding: "1vmin" }}
        >
          <Send
            className={isLight ? "text-gray-800" : "text-white"}
            style={{ width: "2.5vmin", height: "2.5vmin" }}
          />
        </button>
      </div>

      {/* Helper text - hidden on very small screens */}
      <div
        className={`hidden sm:block text-center mt-2 ${isLight ? "text-black/40" : "text-white/60"}`}
        style={{ fontSize: "clamp(0.5rem, 1.2vmin, 0.7rem)" }}
      >
        Press Enter to send, Shift+Enter for new line
      </div>
    </form>
  );
};

export default MessageInput;
