import { eventBus } from "./eventBus";
import { getGenClient } from "./genAIClient";
import { GoogleGenAI } from "@google/genai";

export enum TranslationMode {
  OFF = "OFF",
  ONE_WAY = "ONE_WAY",
  INTERPRETER = "INTERPRETER",
  TRANSCRIBE = "TRANSCRIBE",
}

export interface TranslationState {
  mode: TranslationMode;
  sourceLanguage: string;
  targetLanguage: string;
  isActive: boolean;
}

class TranslationService {
  private state: TranslationState = {
    mode: TranslationMode.OFF,
    sourceLanguage: "auto",
    targetLanguage: "en",
    isActive: false,
  };

  private ai: GoogleGenAI;

  constructor() {
    this.ai = getGenClient();
  }

  public getState(): TranslationState {
    return { ...this.state };
  }

  public setMode(mode: TranslationMode) {
    this.state.mode = mode;
    this.state.isActive = mode !== TranslationMode.OFF;
    this.notifyStateChange();
  }

  public setLanguages(source: string, target: string) {
    this.state.sourceLanguage = source;
    this.state.targetLanguage = target;
    this.notifyStateChange();
  }

  private notifyStateChange() {
    eventBus.emit("translation-state-changed", { ...this.state });
  }

  /**
   * Translates or transcribes a piece of text based on the current mode.
   */
  public async processTranscript(
    text: string,
    speaker: "user" | "model",
  ): Promise<string | null> {
    if (!this.state.isActive) return null;

    if (this.state.mode === TranslationMode.TRANSCRIBE) {
      this.broadcastResult(text, text, speaker);
      return text;
    }

    try {
      const translated = await this.translateWithAI(text, speaker);
      this.broadcastResult(text, translated, speaker);
      return translated;
    } catch (error) {
      console.error("[TranslationService] Translation failed:", error);
      return null;
    }
  }

  private async translateWithAI(
    text: string,
    speaker: "user" | "model",
  ): Promise<string> {
    const model = this.ai.getGenerativeModel({ model: "gemini-1.5-flash" });

    // In INTERPRETER mode, we need to decide the target language based on speaker
    // For simplicity in MVP, we assume user speaks sourceLanguage and model speaks targetLanguage
    // or vice versa if they are the other person.

    const target = this.state.targetLanguage;
    const source =
      this.state.sourceLanguage === "auto"
        ? "its original language"
        : this.state.sourceLanguage;

    const speakerInfo =
      speaker === "user" ? "The user said: " : "L.U.C.A said: ";

    const prompt = `You are a professional interpreter. Translate the following text from ${source} to ${target}. 
    ${speakerInfo}
    Return ONLY the translated text.
    Text: "${text}"`;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  }

  private broadcastResult(
    original: string,
    translated: string,
    speaker: "user" | "model",
  ) {
    eventBus.emit("translation-result", {
      originalText: original,
      translatedText: translated,
      sourceLanguage: this.state.sourceLanguage,
      targetLanguage: this.state.targetLanguage,
      mode: this.state.mode,
      speaker: speaker,
    });
  }
}

export const translationService = new TranslationService();
