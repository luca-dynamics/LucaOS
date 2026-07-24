import type { MissionTapeRecord, MissionTapeStepRecord } from "./types";

export interface CompressorOptions {
  targetMaxTokens?: number;
  format?: "sharegpt" | "alpaca";
  sanitizeSensitiveData?: boolean;
  filterCompletedOnly?: boolean;
  systemPromptOverride?: string;
}

export interface ShareGPTMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ShareGPTTrajectory {
  messages: ShareGPTMessage[];
  metadata: {
    missionId: string;
    intent: string;
    originalTokenCount: number;
    compressedTokenCount: number;
    stepsCount: number;
  };
}

export interface AlpacaTrajectory {
  instruction: string;
  input: string;
  output: string;
  metadata: {
    missionId: string;
  };
}

export interface CompressionResult {
  formattedTrajectory: ShareGPTTrajectory | AlpacaTrajectory;
  jsonlRow: string;
  originalTokens: number;
  compressedTokens: number;
  reductionPercentage: number;
}

export class MissionTapeCompressor {
  private static DEFAULT_MAX_TOKENS = 8000;
  private static DEFAULT_SYSTEM_PROMPT =
    "You are Luca, a host-native personal AI OS agent. Perform actions safely and accurately.";

  // Privacy Redaction RegEx Rules
  private static REDACTION_RULES: { pattern: RegExp; replacement: string }[] = [
    // OpenAI / Anthropic / Groq / Gemini API Keys
    { pattern: /sk-[a-zA-Z0-9_-]{20,}/g, replacement: "[REDACTED_API_KEY]" },
    { pattern: /AIzaSy[a-zA-Z0-9_-]{33}/g, replacement: "[REDACTED_GEMINI_KEY]" },
    { pattern: /gsk_[a-zA-Z0-9_-]{20,}/g, replacement: "[REDACTED_GROQ_KEY]" },
    // Bearer / Authorization headers
    { pattern: /Bearer\s+[a-zA-Z0-9._-]+/gi, replacement: "Bearer [REDACTED_TOKEN]" },
    // Private Keys
    {
      pattern: /-----BEGIN [A-Z ]+ PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+ PRIVATE KEY-----/g,
      replacement: "[REDACTED_PRIVATE_KEY]",
    },
    // Passwords and Secrets in JSON / strings
    {
      pattern: /"(password|secret|apiKey|access_token)"\s*:\s*"[^"]+"/gi,
      replacement: '"$1":"[REDACTED]"',
    },
  ];

  /**
   * Sanitizes text by stripping sensitive keys, passwords, and private tokens
   */
  public sanitize(text: string): string {
    if (!text) return "";
    let sanitized = text;
    for (const rule of MissionTapeCompressor.REDACTION_RULES) {
      sanitized = sanitized.replace(rule.pattern, rule.replacement);
    }
    return sanitized;
  }

  /**
   * Estimates token count using standard 4-character heuristic
   */
  public estimateTokens(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
  }

  /**
   * Post-processes and compresses a single MissionTapeRecord into a token-budgeted trajectory
   */
  public compressTape(
    tape: MissionTapeRecord,
    options: CompressorOptions = {}
  ): CompressionResult {
    const sanitizeData = options.sanitizeSensitiveData !== false;
    const targetMaxTokens = options.targetMaxTokens ?? MissionTapeCompressor.DEFAULT_MAX_TOKENS;
    const format = options.format || "sharegpt";
    const systemPrompt = options.systemPromptOverride || MissionTapeCompressor.DEFAULT_SYSTEM_PROMPT;

    // 1. Extract raw intent & steps
    const rawIntent = sanitizeData ? this.sanitize(tape.intent) : tape.intent;
    const steps = tape.steps || [];

    // Calculate raw uncompressed token estimation
    const rawContentStr = `${systemPrompt} ${rawIntent} ${JSON.stringify(steps)} ${JSON.stringify(tape.verification)}`;
    const originalTokens = this.estimateTokens(rawContentStr);

    // 2. Build compressed intermediate tool step summaries
    const compressedStepSummaries: string[] = [];
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const goalText = sanitizeData ? this.sanitize(step.goal) : step.goal;
      const notesText = step.notes ? (sanitizeData ? this.sanitize(step.notes) : step.notes) : "";

      let stepSummary = `Step ${i + 1} [${step.status.toUpperCase()}]: ${goalText}`;
      if (notesText) {
        stepSummary += ` (Notes: ${notesText})`;
      }
      compressedStepSummaries.push(stepSummary);
    }

    // 3. Build final verification summary
    const verifications = tape.verification || [];
    const verificationSummary = verifications
      .map((v) => `Verification [${v.passed ? "PASSED" : "FAILED"}]: ${sanitizeData ? this.sanitize(v.details || "") : v.details || ""}`)
      .join("\n");

    const finalResultStr = tape.result
      ? typeof tape.result === "object"
        ? JSON.stringify(tape.result, null, 2)
        : String(tape.result)
      : "Mission executed successfully.";

    const sanitizedResult = sanitizeData ? this.sanitize(finalResultStr) : finalResultStr;

    // 4. Assemble target format
    let formattedTrajectory: ShareGPTTrajectory | AlpacaTrajectory;

    if (format === "alpaca") {
      formattedTrajectory = {
        instruction: rawIntent,
        input: compressedStepSummaries.join("\n"),
        output: `${verificationSummary}\n\nFinal Output:\n${sanitizedResult}`,
        metadata: {
          missionId: tape.missionId,
        },
      };
    } else {
      // Default: ShareGPT format
      const messages: ShareGPTMessage[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: rawIntent },
      ];

      if (compressedStepSummaries.length > 0) {
        messages.push({
          role: "assistant",
          content: `I will execute the following plan:\n${compressedStepSummaries.join("\n")}`,
        });
      }

      messages.push({
        role: "assistant",
        content: `Execution Result:\n${sanitizedResult}\n\n${verificationSummary}`.trim(),
      });

      const compressedTokens = messages.reduce((acc, m) => acc + this.estimateTokens(m.content), 0);

      formattedTrajectory = {
        messages,
        metadata: {
          missionId: tape.missionId,
          intent: rawIntent,
          originalTokenCount: originalTokens,
          compressedTokenCount: compressedTokens,
          stepsCount: steps.length,
        },
      };
    }

    const jsonlRow = JSON.stringify(formattedTrajectory);
    const compressedTokens = this.estimateTokens(jsonlRow);
    const reductionPercentage =
      originalTokens > 0 ? Math.max(0, Math.round(((originalTokens - compressedTokens) / originalTokens) * 100)) : 0;

    return {
      formattedTrajectory,
      jsonlRow,
      originalTokens,
      compressedTokens,
      reductionPercentage,
    };
  }

  /**
   * Compresses an array of MissionTapeRecords and generates a multiline JSONL dataset string
   */
  public exportDataset(tapes: MissionTapeRecord[], options: CompressorOptions = {}): string {
    const filterCompleted = options.filterCompletedOnly !== false;
    const targetTapes = filterCompleted ? tapes.filter((t) => t.status === "completed") : tapes;

    const rows: string[] = [];
    for (const tape of targetTapes) {
      const result = this.compressTape(tape, options);
      rows.push(result.jsonlRow);
    }

    return rows.join("\n");
  }
}

export const missionTapeCompressor = new MissionTapeCompressor();
