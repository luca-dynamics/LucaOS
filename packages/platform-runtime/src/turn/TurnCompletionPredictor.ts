export interface TurnPredictionSignal {
  vadEnergy: number; // 0.0 to 1.0 (acoustic silence level)
  silenceDurationMs: number; // elapsed silence in ms
  transcript: string; // partial or final transcript
  isFinalTranscript: boolean; // STT provider final flag
  sttConfidence: number; // 0.0 to 1.0
}

export interface TurnPredictionResult {
  decision: "INCOMPLETE" | "COMPLETE";
  confidence: number;
  semanticCompleteness: number;
  reason: string;
}

export class TurnCompletionPredictor {
  private minSilenceMs: number;
  private minSemanticThreshold: number;

  constructor(minSilenceMs = 450, minSemanticThreshold = 0.75) {
    this.minSilenceMs = minSilenceMs;
    this.minSemanticThreshold = minSemanticThreshold;
  }

  public predict(signal: TurnPredictionSignal): TurnPredictionResult {
    // 1. Explicit final flag from STT engine
    if (signal.isFinalTranscript) {
      return {
        decision: "COMPLETE",
        confidence: 0.99,
        semanticCompleteness: 1.0,
        reason: "stt_explicit_final_flag",
      };
    }

    // 2. Semantic completeness heuristic evaluation
    const semanticScore = this.evaluateSemanticCompleteness(signal.transcript);

    // 3. Acoustic silence & energy decay evaluation
    const isQuiet = signal.vadEnergy < 0.2;
    const hasSufficientSilence = signal.silenceDurationMs >= this.minSilenceMs;

    if (hasSufficientSilence && isQuiet && semanticScore >= this.minSemanticThreshold) {
      return {
        decision: "COMPLETE",
        confidence: Math.min(1.0, 0.5 + semanticScore * 0.5),
        semanticCompleteness: semanticScore,
        reason: `semantic_complete_with_${signal.silenceDurationMs}ms_silence`,
      };
    }

    return {
      decision: "INCOMPLETE",
      confidence: 1.0 - semanticScore,
      semanticCompleteness: semanticScore,
      reason: semanticScore < this.minSemanticThreshold ? "grammatically_incomplete_sentence" : "insufficient_acoustic_silence",
    };
  }

  private evaluateSemanticCompleteness(text: string): number {
    const trimmed = text.trim();
    if (!trimmed) return 0.0;

    // Ends with incomplete conjunctions/prepositions/verbs
    const incompleteSuffixes = ["to", "a", "an", "the", "and", "or", "because", "I need to", "if", "when", "with"];
    const lower = trimmed.toLowerCase();

    for (const suffix of incompleteSuffixes) {
      if (lower.endsWith(` ${suffix}`) || lower === suffix) {
        return 0.3; // Low semantic score -> hold & listen
      }
    }

    // Complete clause ending with punctuation or complete noun/phrase
    if (/[.!?]$/.test(trimmed) || trimmed.split(" ").length >= 4) {
      return 0.9;
    }

    return 0.6;
  }
}
