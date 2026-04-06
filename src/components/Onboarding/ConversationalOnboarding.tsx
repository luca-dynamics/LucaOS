import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import TypingIndicator from "./TypingIndicator";
import { Icon } from "../ui/Icon";
import { ConversationMode } from "./ModeSelect";
import { Message } from "../../types/conversation";
import { OperatorProfile } from "../../types/operatorProfile";
import { ProfileExtractionService } from "../../services/profileExtractionService";
import { settingsService } from "../../services/settingsService";
import { personalityService } from "../../services/personalityService";
import { InteractionContext } from "../../types/lucaPersonality";
import { liveService } from "../../services/liveService";
import { llmService } from "../../services/llmService";
import { soundService } from "../../services/soundService";
import { useMobile } from "../../hooks/useMobile";

interface ConversationalOnboardingProps {
  mode: ConversationMode;
  userName: string;
  targetBrainModel?: string | null;
  onBack?: () => void;
  onComplete: (profile: Partial<OperatorProfile>) => void;
  theme?: { primary: string; hex: string };
}

/**
 * Main conversational onboarding component
 * Natural conversation with Luca to build operator profile
 */
const ConversationalOnboarding: React.FC<ConversationalOnboardingProps> = ({
  mode,
  userName,
  targetBrainModel,
  onBack,
  onComplete,
  theme = { primary: "cyan", hex: "#06b6d4" },
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messageCount, setMessageCount] = useState(0);
  const extractionServiceRef = useRef<ProfileExtractionService | null>(null);
  const interactionStartTime = useRef<number>(Date.now());
  const openingRef = useRef(false);
  const isMobile = useMobile();

  // Note: lucaMessage state removed - voice model speaks natively in voice-to-voice mode

  // Silence detection for voice mode
  const lastUserResponseTime = useRef<number>(Date.now());
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasHandledSilence = useRef<boolean>(false);

  // Demo Fallback Key (configured via VITE_API_KEY in .env)
  const DEMO_API_KEY = import.meta.env.VITE_API_KEY || "";

  // Helper to get the effective API key (User's or Demo)
  const getEffectiveApiKey = (): string | null => {
    const userKey = localStorage.getItem("GEMINI_API_KEY");
    if (userKey) return userKey;

    const useDemo = localStorage.getItem("LUCA_USES_DEMO_KEY") === "true";
    if (useDemo) return DEMO_API_KEY;

    return null;
  };

  // Generate opening message from Luca (AI-generated in real-time)
  useEffect(() => {
    // If we've started text mode and have no messages, generate the opening
    if (mode === "text" && messages.length === 0 && !isProcessing && !openingRef.current) {
      openingRef.current = true;
      
      const generateOpening = async () => {
        setIsProcessing(true);
        let openingContent = "";

        try {
          // Tell llmService which model we want to use for onboarding specifically
          if (targetBrainModel) {
            llmService.setPreferredModel(targetBrainModel, "ollama");
          }

          const effectiveApiKey = getEffectiveApiKey();
          const hasCloudKey = effectiveApiKey || process.env.VITE_API_KEY;

          // High-level system prompt for LUCA identity
          const systemPrompt = `You are LUCA, a sovereign AI operating system meeting your operator for the first time. 
Your tone is professional, tactile, and warmly efficient. 
Start by greeting the operator ${userName} and briefly introducing yourself. 
Ask them for their preferred name.`;

          if (hasCloudKey || targetBrainModel) {
            try {
              openingContent = await llmService.generate(
                "Generate a warm, professional first greeting for our conversation. Keep it to 2-3 sentences.",
                { systemPrompt, temperature: 0.8 }
              );
            } catch (e) {
              console.error("[ConversationalOnboarding] Greeting generation failed, using fallback:", e);
              openingContent = `Identity Link Established. I am LUCA, your autonomous AI partner. It's a pleasure to meet you, ${userName}. What preferred name should I use for our interactions?`;
            }
          } else {
            // Static fallback if no model/key available
            openingContent = `Identity Link Established. I am LUCA, your autonomous AI partner. It's a pleasure to meet you, ${userName}. What preferred name should I use for our interactions?`;
          }

          const newMessage: Message = {
            id: Date.now().toString(),
            role: "luca",
            content: openingContent,
            timestamp: new Date(),
          };
          setMessages([newMessage]);
          soundService.play("SUCCESS");
        } catch (error) {
          console.error("[ConversationalOnboarding] Critical greeting failure:", error);
        } finally {
          setIsProcessing(false);
        }
      };

      generateOpening();
    }
  }, [mode, messages.length, isProcessing, userName, targetBrainModel]);

  // Generate Luca's response
  const getLucaResponse = async (
    history: Message[],
    userMessage: string,
  ): Promise<string> => {
    try {
      // Build conversation context
      const conversationContext = history
        .slice(-50) // Expanded context window to prevent "amnesia" loop
        .map((m) => `${m.role === "luca" ? "Luca" : userName}: ${m.content}`)
        .join("\n");

      const prompt = `You are Luca, a professional AI agentic companion getting to know ${userName} during onboarding.

**PROGRESSIVE QUESTIONING STRATEGY:**
Ask ONE question at a time. Track what you've learned and naturally progress through topics.

**INFORMATION TO GATHER (in this order):**
1. **Preferred name** - What they want to be called
2. **Communication style** - Direct/casual/formal? Brief/detailed?
3. **Role/occupation** - What they do (briefly)
4. **Primary needs** - What they need help with
5. **AI preferences** - Proactive or wait for commands?

**SKIP DETECTION:**
If user says "skip", "let's start", "I'm in a hurry" or similar:
- Say: "Got it! Let's jump right in."
- Respond with: "ONBOARDING_COMPLETE"

Conversation so far:
${conversationContext}

${userName} just said: "${userMessage}"

**WHAT YOU SHOULD DO:**

FIRST, review the conversation above and identify what you have ALREADY learned:
- Have you learned their preferred name? ${
        conversationContext.toLowerCase().includes(userName.toLowerCase())
          ? "YES"
          : "NO"
      }
- Have you learned their communication style? ${
        conversationContext.toLowerCase().includes("style") ||
        conversationContext.toLowerCase().includes("casual") ||
        conversationContext.toLowerCase().includes("direct")
          ? "YES"
          : "NO"
      }
- Have you learned their role/occupation? ${
        conversationContext.toLowerCase().includes("role") ||
        conversationContext.toLowerCase().includes("occupation") ||
        conversationContext.toLowerCase().includes("do?")
          ? "YES"
          : "NO"
      }
- Have you learned their primary needs? ${
        conversationContext.toLowerCase().includes("need") ||
        conversationContext.toLowerCase().includes("help with")
          ? "YES"
          : "NO"
      }
- Have you learned their AI preferences? ${
        conversationContext.toLowerCase().includes("proactive") ||
        conversationContext.toLowerCase().includes("wait")
          ? "YES"
          : "NO"
      }

THEN, respond by:
1. **Acknowledge their answer** briefly and warmly (1 sentence)
2. **Ask the NEXT UNANSWERED question** from the list above
3. **CRITICAL: Do NOT repeat questions you've already asked**
4. Keep it natural - like a friendly conversation, not an interview

**Examples:**
- After name: "Nice! How do you prefer to communicate - casual and brief, or more detailed?"
- After comm style: "Got it! What do you do? (Your role or occupation)"
- After role: "Interesting! What do you need most help with?"
- After needs: "Perfect! Should I be proactive with suggestions, or wait for you to ask?"

**When you have enough info (after 4-5 answered questions):**
- Summarize: "Great! So you're [name], prefer [style], work as [role], need help with [needs]. I'm ready to assist!"
- Then say: "ONBOARDING_COMPLETE"

**CRITICAL RULES:**
- ONE question per response
- Natural, conversational tone
- 2-3 sentences max
- NEVER ask the same question twice
- If unsure what to ask, move to the next topic

Response:`;

      // Call AI API (This will now use preferred model if set in useEffect)
      const response = await llmService.generate(prompt, {
        temperature: 0.7,
        maxTokens: 150,
      });

      return response || "That's interesting! Tell me more?";
    } catch (error) {
      console.error("[Conversation] Error getting Luca response:", error);
      return "Sorry, I had a moment there. Could you say that again?";
    }
  };

  // Handle sending a message
  const handleSend = async (message: string) => {
    if (!message.trim() || isProcessing) return;

    soundService.play("KEYSTROKE");

    // --- MODE-AWARE ROUTING ---
    // In VOICE mode, liveService handles the full conversation (user speech → AI → voice response)
    // We only use handleSend in text mode where we need to make direct API calls to AI
    if (mode === "voice") {
      // Just add to message history for display/profile extraction purposes
      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: message,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      // Profile extraction can still happen
      const newMessageCount = messageCount + 1;
      setMessageCount(newMessageCount);
      if (newMessageCount >= 6 && newMessageCount % 4 === 0) {
        extractProfile([...messages, userMessage]);
      }
      return; // Don't make separate API call - liveService handles response
    }

    // --- TEXT MODE: Make direct AI API call ---
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: message,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsProcessing(true);

    // Get Luca's response (TEXT MODE ONLY)
    const response = await getLucaResponse([...messages, userMessage], message);

    // Check if Luca wants to complete onboarding (skip detected)
    if (response.includes("ONBOARDING_COMPLETE")) {
      console.log("[Onboarding] Skip detected - completing onboarding");
      // Clean response (remove the trigger)
      const cleanResponse = response.replace("ONBOARDING_COMPLETE", "").trim();

      // Add Luca's final message if there's content
      if (cleanResponse) {
        const lucaMessage: Message = {
          id: Date.now().toString(),
          role: "luca",
          content: cleanResponse,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, lucaMessage]);

        // Note: For voice mode, liveService handles speaking natively
      }

      setIsProcessing(false);

      // Complete onboarding with minimal profile after short delay
      setTimeout(() => {
        const minimalProfile: Partial<OperatorProfile> = {
          identity: {
            name: userName,
          },
          personality: {
            communicationStyle: "mixed",
          },
          metadata: {
            profileCreated: new Date(),
            lastUpdated: new Date(),
            conversationCount: messages.length + 1,
            privacyLevel: "minimal",
            confidence: 0.5,
          },
        };
        // Save to settings
        settingsService.saveOperatorProfile(minimalProfile);
        onComplete(minimalProfile);
      }, 1500);

      return;
    }

    // Simulate typing delay (realistic conversation feel)
    await new Promise((resolve) =>
      setTimeout(resolve, 800 + response.length * 20),
    );

    // Add Luca's response
    const lucaMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "luca",
      content: response,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, lucaMessage]);
    soundService.play("PROCESSING");
    // Note: For voice mode, liveService handles speaking natively (no separate TTS)
    setIsProcessing(false);

    // Track interaction for personality evolution
    const interactionDuration = Date.now() - interactionStartTime.current;
    const timeOfDay = new Date().getHours();
    let timeCategory: "morning" | "afternoon" | "evening" | "night";
    if (timeOfDay >= 5 && timeOfDay < 12) timeCategory = "morning";
    else if (timeOfDay >= 12 && timeOfDay < 17) timeCategory = "afternoon";
    else if (timeOfDay >= 17 && timeOfDay < 21) timeCategory = "evening";
    else timeCategory = "night";

    const interactionContext: InteractionContext = {
      input: message,
      response: response,
      mode: personalityService.getCurrentMode(),
      timestamp: new Date(),
      duration: interactionDuration,
      outcome: "success",
      timeOfDay: timeCategory,
    };

    // Process interaction to evolve personality
    personalityService.processInteraction(interactionContext).catch((err: any) => {
      console.error("[Personality] Error processing interaction:", err);
    });

    // Reset timer for next interaction
    interactionStartTime.current = Date.now();

    // Extract profile every 3-4 messages
    const newMessageCount = messageCount + 2; // +2 because we added 2 messages
    setMessageCount(newMessageCount);

    if (newMessageCount >= 6 && newMessageCount % 4 === 0) {
      // Extract profile in the background
      extractProfile([...messages, userMessage, lucaMessage]);
    }
  };

  // Initialize extraction service
  useEffect(() => {
    extractionServiceRef.current = new ProfileExtractionService();
  }, []);

  // Extract profile from conversation
  const extractProfile = async (conversationMessages: Message[]) => {
    if (!extractionServiceRef.current) return;

    try {
      const extracted =
        await extractionServiceRef.current.extractFromConversation(
          conversationMessages,
          userName,
        );

      if (extracted && extracted.extractedInfo.length > 0) {
        // Get existing profile or create new
        let currentProfile = settingsService.getOperatorProfile();
        if (!currentProfile) {
          currentProfile =
            extractionServiceRef.current.createInitialProfile(userName);
        }

        // Merge extracted data
        const updatedProfile = extractionServiceRef.current.mergeWithProfile(
          currentProfile,
          extracted,
        );

        // Update metadata
        updatedProfile.metadata.conversationCount = conversationMessages.length;

        // Save to settings
        settingsService.saveOperatorProfile(updatedProfile);
      }
    } catch (error) {
      console.error("Error submitting message:", error);
      setIsProcessing(false);
    }
  };

  // Silence detection: If user is silent for 12 seconds in voice mode, Luca continues
  useEffect(() => {
    if (mode !== "voice" || messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    const isLucaLastMessage = lastMessage.role === "luca";

    if (isLucaLastMessage && !isProcessing && !hasHandledSilence.current) {
      silenceTimerRef.current = setTimeout(async () => {
        try {
          hasHandledSilence.current = true;

          // Using the same Progressive Questioning strategy as the main flow
          // but tailored for a gentle nudge
          const conversationContext = messages
            .slice(-50)
            .map(
              (m) => `${m.role === "luca" ? "Luca" : userName}: ${m.content}`,
            )
            .join("\n");

          const proactivePrompt = `You are Luca, an AI agent companion onboarding ${userName}.
You just asked a question, but they have been silent for 15 seconds.

**YOUR GOAL:**
Gently encourage them to answer the PREVIOUS question so we can complete the profile.

**PROGRESSIVE QUESTIONING LIST (Current Status):**
1. Preferred name
2. Communication style
3. Role/occupation
4. Primary needs
5. AI preferences

**CONTEXT:**
${conversationContext}

**INSTRUCTIONS:**
- Do NOT change the topic.
- Re-phrase your last question gently.
- Keep it concise (1-2 sentences).
- Maintain a helpful, patient tone.
- Do NOT say "Are you there?" repeatedly.
- Focus on getting the answer to the step we are on.

**Example:**
(If last asked about Name): "I'm listening. What name would you like me to use?"
(If last asked about Needs): "Take your time. I'd love to know what you need help with most."

Nudge:`;

          const generated = await llmService.generate(proactivePrompt, {
            temperature: 0.7,
            maxTokens: 100,
          });

          if (generated) {
            const lucaContinuation: Message = {
              id: Date.now().toString(),
              role: "luca",
              content: generated.trim(),
              timestamp: new Date(),
            };

            setMessages((prev) => [...prev, lucaContinuation]);
          }
        } catch (error) {
          console.error(
            "[Silence Detection] Error generating continuation:",
            error,
          );
        }
      }, 12000); // 12 seconds
    }

    // Cleanup timer on message change
    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    };
  }, [messages, mode, isProcessing, userName]); // Added userName to dependencies

  // Reset silence flag when user sends a message
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === "user") {
      hasHandledSilence.current = false;
      lastUserResponseTime.current = Date.now();
    }
  }, [messages]);

  // Handle user activity (typing/speaking) to reset silence timer
  const handleUserActivity = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    lastUserResponseTime.current = Date.now();
  };

  // --- RENDER SEPARATION ---
  // Voice Mode: Return Voice view early to avoid being trapped in text-mode container/animations
  if (mode === "voice") {
    return (
      <MessageInput
        userName={userName}
        value={input}
        onChange={setInput}
        onSend={handleSend}
        disabled={isProcessing}
        mode={mode}
        targetBrainModel={targetBrainModel}
        onModeChange={onBack}
        onActivity={handleUserActivity}
        useLocalVoice={settingsService.get("voice")?.provider === "local-luca"}
        onVoiceComplete={async () => {
          console.log(
            "[Onboarding Voice] Completion phrase detected - transitioning to Calibration",
          );

          // Build a minimal profile immediately to avoid any blocking
          let profileToUse: Partial<OperatorProfile> = {
            identity: {
              name: userName,
            },
            personality: {
              communicationStyle: "mixed",
            },
            metadata: {
              profileCreated: new Date(),
              lastUpdated: new Date(),
              conversationCount: messages.length,
              privacyLevel: "minimal",
              confidence: 0.5,
            },
          };

          // Try to get existing profile if available (non-blocking check)
          try {
            const existingProfile = settingsService.getOperatorProfile();
            if (existingProfile && existingProfile.identity?.name) {
              console.log("[Onboarding Voice] Using existing profile");
              existingProfile.metadata.conversationCount = messages.length;
              existingProfile.metadata.lastUpdated = new Date();
              profileToUse = existingProfile;
            }
          } catch (err) {
            console.error(
              "[Onboarding Voice] Error getting existing profile:",
              err,
            );
          }

          // Try async extraction but don't let it block transition
          const extractionService = extractionServiceRef.current;
          if (extractionService && messages.length > 0) {
            try {
              const extractedResult =
                await extractionService.extractFromConversation(
                  messages,
                  userName,
                );
              if (extractedResult) {
                profileToUse = extractionService.mergeWithProfile(
                  profileToUse as any,
                  extractedResult,
                );
                // Also update settings immediately
                settingsService.saveOperatorProfile(profileToUse);
              }
            } catch (err) {
              console.warn("[Onboarding Voice] Extraction failed:", err);
            }
          }

          onComplete(profileToUse);
        }}
      />
    );
  }

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isProcessing]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`flex flex-col h-full w-full max-w-xl sm:max-w-4xl lg:max-w-full mx-auto lg:px-6 ${isMobile ? "px-2" : ""}`}
    >
      {/* Header - Only shown in text mode or when explicit header is needed */}
      {mode === "text" && (
        <div
          className="flex items-center justify-between p-3 sm:p-4 border-b glass-blur"
          style={{ borderColor: "var(--app-border-main)" }}
        >
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={() => {
                  soundService.play("KEYSTROKE");
                  liveService.disconnect();
                  onBack();
                }}
                className="p-2 rounded-full transition-all hover:bg-white/5 opacity-60 hover:opacity-100"
                style={{ color: "var(--app-text-main)" }}
                title="Close"
              >
                <Icon name="CloseCircle" variant="Linear" style={{ width: "1.5vmin", height: "1.5vmin" }} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <h2
              className="text-sm sm:text-lg font-display"
              style={{ color: "var(--app-text-main)" }}
            >
              Quick Intro
            </h2>
          </div>

          {/* Skip Button */}
          <button
            onClick={() => {
              const minimalProfile: Partial<OperatorProfile> = {
                identity: {
                  name: userName,
                },
                personality: {
                  communicationStyle: "mixed",
                },
                metadata: {
                  profileCreated: new Date(),
                  lastUpdated: new Date(),
                  conversationCount: messages.length,
                  privacyLevel: "minimal",
                  confidence: 0.5,
                },
              };
              // Save minimal profile immediately
              settingsService.saveOperatorProfile(minimalProfile);
              onComplete(minimalProfile);
            }}
            className="px-2 sm:px-3 py-1.5 text-xs font-mono rounded-lg transition-all border opacity-80 hover:opacity-100 hover:bg-white/5"
            style={{ 
              color: "var(--app-text-main)",
              borderColor: "var(--app-border-main)"
            }}
          >
            Skip
          </button>
        </div>
      )}
      {/* Messages - Hidden in voice mode (VoiceHud handles conversation) */}
      {mode === "text" && (
        <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4">
          <AnimatePresence mode="popLayout">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", damping: 20, stiffness: 300 }}
              >
                <MessageBubble message={message} theme={theme} />
              </motion.div>
            ))}
          </AnimatePresence>
          {isProcessing && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input - Only for Text Mode (Voice Mode returned early above) */}
      <MessageInput
        userName={userName}
        value={input}
        onChange={setInput}
        onSend={handleSend}
        disabled={isProcessing}
        mode={mode}
        targetBrainModel={targetBrainModel}
        onModeChange={onBack}
        onActivity={handleUserActivity}
        useLocalVoice={settingsService.get("voice")?.provider === "local-luca"}
      />
    </motion.div>
  );
};

export default ConversationalOnboarding;
