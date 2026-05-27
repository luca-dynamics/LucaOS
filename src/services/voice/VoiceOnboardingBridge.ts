import {
  LucaVoiceOnboardingBridgeResult,
  LucaVoiceOnboardingCommand,
  LucaVoiceOnboardingState,
  LucaVoiceOnboardingStep,
  LucaVoiceRuntimeMetadata,
} from "./types";
import { VoiceRuntimeEventBridge } from "./VoiceRuntimeEventBridge";

const onboardingMetadataBase = {
  bridgeKind: "voice_onboarding_scaffold",
  audioApisCalled: false,
  sttApisCalled: false,
  ttsApisCalled: false,
  systemApisCalled: false,
  heavyModelsLoaded: false,
  requiresExplicitOptIn: true,
} as const;

const runtimeMetadata: LucaVoiceRuntimeMetadata = {
  runtimeKind: "voice_scaffold",
  audioApisCalled: false,
  sttApisCalled: false,
  ttsApisCalled: false,
  systemApisCalled: false,
  heavyModelsLoaded: false,
  storageWritesEnabled: false,
  requiresExplicitOptIn: true,
};

const initialState: LucaVoiceOnboardingState = {
  currentStep: "name",
  completed: false,
  metadata: onboardingMetadataBase,
};

export class VoiceOnboardingBridge {
  private state: LucaVoiceOnboardingState = { ...initialState };

  constructor(private readonly eventBridge?: VoiceRuntimeEventBridge, private readonly sessionId = "voice_onboarding_scaffold") {}

  handleTranscript(transcript: string, confidence = 1): LucaVoiceOnboardingBridgeResult {
    return this.handleCommand({ transcript, confidence, metadata: { inputKind: "transcript" } });
  }

  handleText(text: string, confidence = 1): LucaVoiceOnboardingBridgeResult {
    return this.handleCommand({ transcript: text, confidence, metadata: { inputKind: "text" } });
  }

  getState(): LucaVoiceOnboardingState {
    return structuredClone(this.state);
  }

  reset(): LucaVoiceOnboardingState {
    this.state = { ...initialState };
    return this.getState();
  }

  private handleCommand(input: Omit<LucaVoiceOnboardingCommand, "step" | "intent">): LucaVoiceOnboardingBridgeResult {
    const transcript = input.transcript.trim();
    const lowered = transcript.toLowerCase();

    if (!transcript) {
      return this.result("needs_clarification", "Please share a response so I can continue onboarding.");
    }

    switch (this.state.currentStep) {
      case "name":
        return this.handleName(transcript, lowered);
      case "theme":
        return this.handleTheme(lowered);
      case "background_opacity":
        return this.handleOpacity(lowered);
      case "model_mode":
        return this.handleModelMode(lowered);
      case "local_model_scan":
        return this.handleLocalModelScan(lowered);
      case "preferences":
        return this.handlePreferences(transcript, lowered);
      case "complete":
        return this.result("complete", "Onboarding is already complete.");
      default:
        return this.result("rejected", "This onboarding step is not supported yet.");
    }
  }

  private handleName(transcript: string, lowered: string): LucaVoiceOnboardingBridgeResult {
    const match = lowered.match(/(?:my name is|i am|i'm|call me)\s+([a-zA-Z][a-zA-Z\-\s']{0,40})/) ?? lowered.match(/^([a-zA-Z][a-zA-Z\-\s']{1,40})$/);
    const userName = match?.[1]?.trim() ?? transcript.trim();

    if (!userName || userName.length < 2) {
      return this.result("needs_clarification", "I didn't catch your name. Please say your preferred name.");
    }

    this.state.userName = userName;
    this.state.currentStep = "theme";
    return this.result("handled", `Nice to meet you, ${userName}. Do you prefer dark, light, or system theme?`);
  }

  private handleTheme(lowered: string): LucaVoiceOnboardingBridgeResult {
    const theme = ["dark", "light", "system"].find((candidate) => lowered.includes(candidate));

    if (!theme) {
      return this.result("needs_clarification", "Please choose dark, light, or system theme.");
    }

    this.state.theme = theme;
    this.state.currentStep = "background_opacity";
    return this.result("handled", "Great. Choose background opacity: low, medium, high, or a number from 0 to 100.");
  }

  private handleOpacity(lowered: string): LucaVoiceOnboardingBridgeResult {
    const wordMap: Record<string, number> = { low: 25, medium: 55, high: 85 };
    const word = Object.keys(wordMap).find((entry) => lowered.includes(entry));
    const numeric = lowered.match(/\b(\d{1,3})\b/);
    const parsed = word ? wordMap[word] : numeric ? Number(numeric[1]) : undefined;

    if (parsed === undefined || Number.isNaN(parsed) || parsed < 0 || parsed > 100) {
      return this.result("needs_clarification", "Please provide low, medium, high, or a number between 0 and 100.");
    }

    this.state.backgroundOpacity = parsed;
    this.state.currentStep = "model_mode";
    return this.result("handled", "Got it. Choose model mode: Luca Prime, Local Models, or BYOK.");
  }

  private handleModelMode(lowered: string): LucaVoiceOnboardingBridgeResult {
    let modelMode: LucaVoiceOnboardingState["modelMode"];
    if (lowered.includes("luca prime") || lowered === "prime") modelMode = "luca_prime";
    if (lowered.includes("local")) modelMode = "local_models";
    if (lowered.includes("byok") || lowered.includes("bring your own")) modelMode = "byok";

    if (!modelMode) {
      return this.result("needs_clarification", "Please choose Luca Prime, Local Models, or BYOK.");
    }

    this.state.modelMode = modelMode;
    this.state.currentStep = modelMode === "local_models" ? "local_model_scan" : "preferences";

    if (modelMode === "local_models") {
      return this.result("handled", "Local Models selected. Should I mark a local model scan request? This is scaffold-only and does not run a real scan.");
    }

    return this.result("handled", "Thanks. Share any onboarding preferences, or say skip to finish.");
  }

  private handleLocalModelScan(lowered: string): LucaVoiceOnboardingBridgeResult {
    if (/(yes|scan|sure|ok|please)/.test(lowered)) {
      this.state.localModelScanRequested = true;
      this.state.currentStep = "preferences";
      return this.result("handled", "Scan request noted as scaffold-only. Share any preferences, or say skip to finish.");
    }

    if (/(no|skip|not now)/.test(lowered)) {
      this.state.localModelScanRequested = false;
      this.state.currentStep = "preferences";
      return this.result("handled", "Okay, no scan request recorded. Share any preferences, or say skip to finish.");
    }

    return this.result("needs_clarification", "Please say yes to request a scaffold scan flag, or no to skip.");
  }

  private handlePreferences(transcript: string, lowered: string): LucaVoiceOnboardingBridgeResult {
    if (/(skip|none|no preferences|done|finish)/.test(lowered)) {
      this.state.preferences = this.state.preferences ?? [];
      this.state.currentStep = "complete";
      this.state.completed = true;
      return this.result("complete", "Great, onboarding is complete.");
    }

    this.state.preferences = [...(this.state.preferences ?? []), transcript];
    this.state.currentStep = "complete";
    this.state.completed = true;
    return this.result("complete", "Preference captured. Onboarding is complete.");
  }

  private result(status: LucaVoiceOnboardingBridgeResult["status"], response: string): LucaVoiceOnboardingBridgeResult {
    const result: LucaVoiceOnboardingBridgeResult = {
      status,
      state: this.getState(),
      spokenResponse: response,
      textResponse: response,
      metadata: onboardingMetadataBase,
    };

    this.recordToTape(result);
    return result;
  }

  private recordToTape(result: LucaVoiceOnboardingBridgeResult): void {
    if (!this.eventBridge) return;
    const mappedStatus = result.status === "complete" ? "handled" : result.status;
    this.eventBridge.recordCommandResult(
      {
        status: mappedStatus as "handled" | "needs_confirmation" | "rejected" | "failed",
        spokenResponse: result.spokenResponse,
        textResponse: result.textResponse,
        metadata: {
          ...runtimeMetadata,
          ...result.metadata,
          onboardingStatus: result.status,
          onboardingStep: result.state.currentStep,
        },
      },
      { sessionId: this.sessionId, source: "voice_onboarding_scaffold" },
    );
  }
}
