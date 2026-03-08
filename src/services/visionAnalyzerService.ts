import { visionManager } from "./visionManager";
import { screenCaptureService } from "./screenCaptureService";

export interface VisionEvent {
  type:
    | "error"
    | "warning"
    | "success"
    | "info"
    | "opportunity"
    | "security"
    | "activity"
    | "safety"
    | "user_alert"
    | "focus_alert"
    | "dev_error";
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  message: string;
  application?: string;
  context: {
    application?: string;
    timestamp: number;
    screenshot: string;
  };
  actionSuggested?: string;
  metadata?: any;
}

export interface AnalyzeScreenOptions {
  mode?: string;
  customInstruction?: string;
  model?: string;
  priorities?: string;
}

/**
 * Vision Analyzer Service
 * Analyzes screenshots using AI Vision APIs to detect events
 */
class VisionAnalyzerService {
  private analysisPrompt: string;
  private focusGuardPrompt: string;
  private developerGuardPrompt: string;

  constructor() {
    this.analysisPrompt = `Analyze this screenshot carefully. Look for:
1. **ERRORS**: Red text, error dialogs, crash messages
2. **WARNINGS**: Yellow warnings, caution messages
3. **SUCCESS**: Success messages, "completed" indicators
4. **SECURITY ALERTS**: Login prompts, permission requests, firewall alerts
5. **OPPORTUNITIES**: Empty screens, stuck states

Format as JSON:
{
    "events": [
        {
            "type": "error|warning|success|info|opportunity",
            "priority": "CRITICAL|HIGH|MEDIUM|LOW",
            "message": "Description",
            "application": "App Name",
            "actionSuggested": "Action"
        }
    ],
    "confidence": 0.0-1.0
}`;

    this.focusGuardPrompt = `You are the Focus Guard.
Analyze the screenshot and compare it with the USER PRIORITIES: {priorities}.
Detect misalignment, stuck states, or productivity opportunities.

Return JSON:
{
    "type": "focus_alert",
    "priority": "HIGH|MEDIUM|LOW",
    "message": "Direct observation",
    "actionSuggested": "Pivot step"
}`;

    this.developerGuardPrompt = `You are a Senior Developer Assistant.
Look for terminal errors, IDE issues, or build hangs.

Return JSON:
{
    "type": "dev_error",
    "priority": "CRITICAL|HIGH",
    "message": "Explanation of the error",
    "actionSuggested": "Fix to try"
}`;
  }

  async analyzeScreen(
    imageBuffer: any,
    options: AnalyzeScreenOptions = {},
  ): Promise<VisionEvent[]> {
    try {
      let base64Image: string;
      if (typeof imageBuffer === "string" && !imageBuffer.includes("base64,")) {
        base64Image = `data:image/jpeg;base64,${imageBuffer}`;
      } else if (typeof imageBuffer === "string") {
        base64Image = imageBuffer;
      } else {
        base64Image = (screenCaptureService as any).imageBufferToBase64(
          imageBuffer,
        );
      }

      const { customInstruction, mode } = options;
      let effectivePrompt = this.analysisPrompt;

      if (mode === "FOCUS_GUARD") {
        effectivePrompt = this.focusGuardPrompt.replace(
          "{priorities}",
          options.priorities || "None",
        );
      } else if (mode === "DEVELOPER_GUARD") {
        effectivePrompt = this.developerGuardPrompt;
      } else if (mode === "ROOM_GUARD" || customInstruction) {
        effectivePrompt = `Analyze camera feed for security/safety. User said: ${customInstruction || "Detect everything"}. Return JSON {events: [...]}`;
      }

      const intent = "insight";
      const targetModel = options.model || "gemini-2.0-flash";

      // Standardizing Gemini config for analysis
      (visionManager as any).updateConfig({
        insight: {
          ...(visionManager as any).config?.insight,
          provider: "gemini",
          model: targetModel,
          baseUrl: "https://generativelanguage.googleapis.com/v1beta",
        },
      });

      const result = await (visionManager as any).analyze(
        base64Image,
        effectivePrompt,
        intent,
      );
      return this.parseAnalysis(result.prediction, base64Image);
    } catch (error) {
      console.error("[VISION_ANALYZER] Analysis failed:", error);
      return [];
    }
  }

  private parseAnalysis(
    analysis: string,
    screenshotBase64: string,
  ): VisionEvent[] {
    try {
      const jsonMatch = analysis.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return [];
      const parsed = JSON.parse(jsonMatch[0]);

      const events = parsed.events || (parsed.type ? [parsed] : []);
      return events.map((event: any) => ({
        type: event.type || "info",
        priority: event.priority || "MEDIUM",
        message: event.message || "Observation",
        context: {
          application: event.application,
          timestamp: Date.now(),
          screenshot: screenshotBase64.substring(0, 100),
        },
        actionSuggested: event.actionSuggested,
        metadata: { confidence: parsed.confidence || 0.5 },
      }));
    } catch {
      return [];
    }
  }
}

export const visionAnalyzerService = new VisionAnalyzerService();
export default visionAnalyzerService;
