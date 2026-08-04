import { StreamingSpeechRecognizer } from "./SpeechRecognizer";

export class SpeechRecognizerRegistry {
  private static instance: SpeechRecognizerRegistry;
  private recognizers = new Map<string, StreamingSpeechRecognizer>();
  private defaultRecognizerId?: string;

  private constructor() {}

  public static getInstance(): SpeechRecognizerRegistry {
    if (!SpeechRecognizerRegistry.instance) {
      SpeechRecognizerRegistry.instance = new SpeechRecognizerRegistry();
    }
    return SpeechRecognizerRegistry.instance;
  }

  public register(recognizer: StreamingSpeechRecognizer, isDefault = false): void {
    this.recognizers.set(recognizer.id, recognizer);
    if (isDefault || !this.defaultRecognizerId) {
      this.defaultRecognizerId = recognizer.id;
    }
    console.log(`🎙️ Registered STT Recognizer [${recognizer.id}] (${recognizer.name})`);
  }

  public unregister(id: string): boolean {
    const removed = this.recognizers.delete(id);
    if (this.defaultRecognizerId === id) {
      this.defaultRecognizerId = Array.from(this.recognizers.keys())[0];
    }
    return removed;
  }

  public get(id: string): StreamingSpeechRecognizer | undefined {
    return this.recognizers.get(id);
  }

  public resolveDefault(): StreamingSpeechRecognizer | undefined {
    if (!this.defaultRecognizerId) return undefined;
    return this.recognizers.get(this.defaultRecognizerId);
  }

  public list(): StreamingSpeechRecognizer[] {
    return Array.from(this.recognizers.values());
  }

  public clear(): void {
    this.recognizers.clear();
    this.defaultRecognizerId = undefined;
  }
}
