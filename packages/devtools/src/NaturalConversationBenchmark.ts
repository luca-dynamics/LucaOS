export type BenchmarkType = "functional" | "performance" | "behavioral";

export interface BenchmarkScenario {
  id: string;
  type: BenchmarkType;
  category: string;
  prompt: string;
  expectedBehavior: string;
  isFailureScenario?: boolean;
}

export const NATURAL_CONVERSATION_BENCHMARKS: BenchmarkScenario[] = [
  // Functional Benchmarks
  { id: "bench_1", type: "functional", category: "Greeting", prompt: "Hi Luca", expectedBehavior: "Fast warm greeting" },
  { id: "bench_2", type: "functional", category: "Weather Tool", prompt: "Will Abuja rain tomorrow?", expectedBehavior: "Weather tool execution & report" },
  { id: "bench_3", type: "functional", category: "Follow-up Context", prompt: "What about Sunday?", expectedBehavior: "Contextual follow-up forecast" },
  { id: "bench_4", type: "functional", category: "Memory Record", prompt: "Remember I like green tea.", expectedBehavior: "Episodic memory store" },
  { id: "bench_5", type: "functional", category: "Memory Recall", prompt: "What drink do I usually like?", expectedBehavior: "Semantic memory recall" },
  { id: "bench_6", type: "functional", category: "Permission Gate", prompt: "Delete system temp files", expectedBehavior: "User permission prompt & denial handling", isFailureScenario: true },

  // Performance Benchmarks
  { id: "bench_7", type: "performance", category: "First Token Latency", prompt: "What is 2 + 2?", expectedBehavior: "Time-to-first-token < 350ms" },
  { id: "bench_8", type: "performance", category: "Barge-in Interruption", prompt: "Luca...", expectedBehavior: "Playback cancellation < 150ms", isFailureScenario: true },
  { id: "bench_9", type: "performance", category: "Tool Timeout", prompt: "Fetch slow API stats", expectedBehavior: "Graceful timeout notice < 2000ms", isFailureScenario: true },
  { id: "bench_10", type: "performance", category: "Provider Failover", prompt: "Complex query during outage", expectedBehavior: "Secondary provider failover < 500ms", isFailureScenario: true },

  // Behavioral Benchmarks
  { id: "bench_11", type: "behavioral", category: "Silence & Hold", prompt: "...", expectedBehavior: "Calm hold & idle waiting", isFailureScenario: true },
  { id: "bench_12", type: "behavioral", category: "Location Correction", prompt: "No, I meant Lagos.", expectedBehavior: "Turn repair & location correction", isFailureScenario: true },
  { id: "bench_13", type: "behavioral", category: "Background Noise", prompt: "[TV Noise] Luca, what's the time?", expectedBehavior: "Noise filtering & accurate wake" },
  { id: "bench_14", type: "behavioral", category: "Long Pause", prompt: "I was thinking... umm... date?", expectedBehavior: "Patience holding before transcript finalization" },
  { id: "bench_15", type: "behavioral", category: "Ambiguous Query", prompt: "Show me that thing", expectedBehavior: "Polite clarification request" },
  { id: "bench_16", type: "behavioral", category: "Conflicting Memory", prompt: "Actually I hate tea, prefer coffee", expectedBehavior: "Memory update & belief revision" },
  { id: "bench_17", type: "behavioral", category: "Long Reasoning", prompt: "Compare Rust vs Go", expectedBehavior: "Structured technical reasoning" },
  { id: "bench_18", type: "behavioral", category: "Network Recovery", prompt: "Query during WiFi toggle", expectedBehavior: "Auto-reconnect & turn resume", isFailureScenario: true },
];

export class NaturalConversationBenchmark {
  public static listBenchmarks(): readonly BenchmarkScenario[] {
    return NATURAL_CONVERSATION_BENCHMARKS;
  }

  public static listByType(type: BenchmarkType): BenchmarkScenario[] {
    return NATURAL_CONVERSATION_BENCHMARKS.filter((b) => b.type === type);
  }
}
