import { LucaRuntimeProcess, TurnCoordinator } from "../../../packages/platform-runtime/src";
import { QualityMetricsTracker } from "../../../packages/performance/src";

export async function runSmartTurnDemo(): Promise<void> {
  console.log("🎯 ====================================================== 🎯");
  console.log("🏆 STARTING LUCAOS SPRINT 2 PHASE 5: SMART TURN PREDICTOR 🏆");
  console.log("🎯 ====================================================== 🎯\n");

  const process = new LucaRuntimeProcess();
  const coordinator = new TurnCoordinator(process);
  const qualityMetrics = new QualityMetricsTracker();

  // Test 1: Incomplete Phrase ("I need to book a...")
  console.log("🎙️ Signal 1: \"I need to book a...\" (Silence: 200ms)");
  const pred1 = coordinator.evaluateSpeechTurn({
    vadEnergy: 0.1,
    silenceDurationMs: 200,
    transcript: "I need to book a...",
    isFinalTranscript: false,
    sttConfidence: 0.95,
  });
  console.log(`   ➔ Predictor Decision: [${pred1.decision}] | Reason: ${pred1.reason} | Semantic Score: ${pred1.semanticCompleteness}`);

  // Test 2: Complete Phrase ("I need to book a flight to Abuja tomorrow.")
  console.log("\n🎙️ Signal 2: \"I need to book a flight to Abuja tomorrow.\" (Silence: 500ms)");
  const pred2 = coordinator.evaluateSpeechTurn({
    vadEnergy: 0.05,
    silenceDurationMs: 500,
    transcript: "I need to book a flight to Abuja tomorrow.",
    isFinalTranscript: false,
    sttConfidence: 0.98,
  });
  console.log(`   ➔ Predictor Decision: [${pred2.decision}] | Reason: ${pred2.reason} | Semantic Score: ${pred2.semanticCompleteness}`);

  qualityMetrics.recordTurnResult(pred2.decision === "COMPLETE", pred2.confidence);

  const report = qualityMetrics.getReport();
  console.log("\n📊 CONVERSATION QUALITY METRICS REPORT:");
  console.log(`   • Turn Success Rate: ${report.turnSuccessPercentage}%`);
  console.log(`   • Average Completion Confidence: ${(report.averageCompletionConfidence * 100).toFixed(1)}%`);
  console.log(`   • Memory Recall Precision: ${(report.memoryRecallPrecision * 100).toFixed(1)}%`);

  process.stopProcess();
  console.log("\n🎯 ====================================================== 🎯");
  console.log("✅ LUCAOS SMART TURN PREDICTOR & TURN COORDINATOR DEMO COMPLETED!");
  console.log("🎯 ====================================================== 🎯\n");
}

runSmartTurnDemo();
