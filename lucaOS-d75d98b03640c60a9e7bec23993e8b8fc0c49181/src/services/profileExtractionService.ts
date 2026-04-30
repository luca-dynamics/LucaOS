import { Message } from "../types/conversation";
import {
  OperatorProfile,
  ProfileExtractionResult,
} from "../types/operatorProfile";
import { llmService } from "./llmService";

/**
 * Profile Extraction Service
 * Analyzes conversation to extract operator profile information
 */
export class ProfileExtractionService {
  constructor() {}

  /**
   * Extract profile information from conversation history
   */
  async extractFromConversation(
    messages: Message[],
    userName: string,
  ): Promise<ProfileExtractionResult | null> {
    if (messages.length < 2) {
      return null; // Need at least some conversation
    }

    try {
      const conversationText = messages
        .map((m) => `${m.role === "luca" ? "Luca" : userName}: ${m.content}`)
        .join("\n");

      const prompt = `Analyze this conversation between Luca (AI assistant) and ${userName} (operator) to extract personality and preference information.

Conversation:
${conversationText}

Extract ONLY information that was clearly stated or strongly implied. Return a JSON object with this structure:
{
  "personality": {
    "communicationStyle": "direct" | "detailed" | "casual" | "mixed" (or null),
    "workStyle": "focused" | "multitasking" | "flexible" (or null),
    "tone": "formal" | "casual" | "professional" (or null),
    "preferences": ["list of stated preferences"],
    "traits": ["personality traits mentioned"]
  },
  "assistantPreferences": {
    "helpStyle": "proactive" | "reactive" | "balanced" (or null),
    "detailLevel": "minimal" | "balanced" | "verbose" (or null),
    "communicationFormat": ["bullet points", "concise", etc.]
  },
  "workContext": {
    "profession": "if mentioned",
    "interests": ["list of interests mentioned"],
    "skillLevel": "beginner" | "intermediate" | "expert" (if determinable)
  },
  "confidence": 0-100 (how confident you are in the extraction),
  "extractedInfo": ["list of key facts extracted"]
}

Rules:
- If information wasn't mentioned, use null or empty array
- Don't infer too much - stick to what was actually said
- Confidence should reflect how explicit the information was
- extractedInfo should be specific facts, not interpretations

Return ONLY valid JSON, no explanation.`;

      const generated = await llmService.generate(prompt, {
        temperature: 0.3,
        maxTokens: 800,
      });

      if (!generated) {
        console.error("[ProfileExtraction] No response from AI");
        return null;
      }

      // Clean and parse JSON - more robust regex to handle various LLM formatting quirks
      const cleanJson = generated
        .replace(/```(?:json|markdown)?\n?/gi, "")
        .replace(/```\n?/g, "")
        .trim();

      // Attempt to find the outermost JSON object if the LLM hallucinated conversational text before/after
      const startIndex = cleanJson.indexOf("{");
      const endIndex = cleanJson.lastIndexOf("}");

      let safeJson = cleanJson;
      if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
        safeJson = cleanJson.substring(startIndex, endIndex + 1);
      }

      const result: ProfileExtractionResult = JSON.parse(safeJson);
      return result;
    } catch (error) {
      console.error("[ProfileExtraction] Error extracting profile:", error);
      return null;
    }
  }

  /**
   * Merge extracted data into existing profile
   */
  mergeWithProfile(
    existing: OperatorProfile,
    extracted: ProfileExtractionResult,
  ): OperatorProfile {
    return {
      ...existing,
      personality: {
        ...existing.personality,
        ...(extracted.personality?.communicationStyle && {
          communicationStyle: extracted.personality.communicationStyle as any,
        }),
        ...(extracted.personality?.workStyle && {
          workStyle: extracted.personality.workStyle as any,
        }),
        ...(extracted.personality?.tone && {
          tone: extracted.personality.tone as any,
        }),
        preferences: [
          ...(existing.personality?.preferences || []),
          ...(extracted.personality?.preferences || []),
        ],
        traits: [
          ...(existing.personality?.traits || []),
          ...(extracted.personality?.traits || []),
        ],
      },
      assistantPreferences: {
        ...existing.assistantPreferences,
        ...(extracted.assistantPreferences?.helpStyle && {
          helpStyle: extracted.assistantPreferences.helpStyle as any,
        }),
        ...(extracted.assistantPreferences?.detailLevel && {
          detailLevel: extracted.assistantPreferences.detailLevel as any,
        }),
        communicationFormat: [
          ...(existing.assistantPreferences?.communicationFormat || []),
          ...(extracted.assistantPreferences?.communicationFormat || []),
        ],
      },
      workContext: {
        ...existing.workContext,
        ...(extracted.workContext?.profession && {
          profession: extracted.workContext.profession,
        }),
        interests: [
          ...(existing.workContext?.interests || []),
          ...(extracted.workContext?.interests || []),
        ],
        ...(extracted.workContext?.skillLevel && {
          skillLevel: extracted.workContext.skillLevel,
        }),
      },
      metadata: {
        ...existing.metadata,
        lastUpdated: new Date(),
        confidence: extracted.confidence,
      },
    };
  }

  /**
   * Create initial profile from basic info
   */
  createInitialProfile(userName: string): OperatorProfile {
    return {
      identity: {
        name: userName,
      },
      personality: {},
      assistantPreferences: {},
      metadata: {
        profileCreated: new Date(),
        lastUpdated: new Date(),
        conversationCount: 0,
        privacyLevel: "balanced",
        confidence: 0,
      },
    };
  }
}
