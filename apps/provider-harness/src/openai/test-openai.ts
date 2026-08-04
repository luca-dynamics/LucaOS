import { StructuredLogger } from "../../../../packages/protocol/src";
import { OpenAIProviderAdapter, certifyModelProvider } from "../../../../packages/conversation-engine/src";

export async function runOpenAIHarness(): Promise<void> {
  const startTime = Date.now();
  console.log("🧪 Running Isolated Provider Harness: OpenAI Responses Streaming...");

  StructuredLogger.log({
    timestamp: Date.now(),
    sessionId: "sess_harness_openai",
    component: "openai-harness",
    operation: "certify_openai_provider",
    status: "in_progress",
    provider: "OpenAI",
  });

  const adapter = new OpenAIProviderAdapter();

  // Test streaming token generation
  const tokens: string[] = [];
  await adapter.stream({ prompt: "Hello OpenAI" }, (tok) => tokens.push(tok));

  // Run 18-point provider certification gate
  const certReport = await certifyModelProvider(adapter);

  StructuredLogger.log({
    timestamp: Date.now(),
    sessionId: "sess_harness_openai",
    component: "openai-harness",
    operation: "certify_openai_provider",
    status: certReport.passed ? "success" : "failure",
    durationMs: Date.now() - startTime,
    provider: adapter.name,
    metadata: { report: certReport },
  });

  console.log(`\n📋 Certification Version: ${certReport.certificationVersion}`);
  console.log(`⚡ Streamed Tokens Received: ${tokens.length} chunks ("${tokens.join("")}")`);
  console.log(`✅ OpenAI Provider Certification Status: ${certReport.passed ? "PASSED (18/18 Checks)" : "FAILED"}`);
}

runOpenAIHarness();
