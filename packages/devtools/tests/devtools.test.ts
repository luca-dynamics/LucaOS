import { EventBus, InteractionEventType, AudioEventType } from "../../voice-engine/src";
import { LUCA_PLATFORM_PROTOCOL_VERSION } from "../../protocol/src";
import { TraceCollector } from "../src/TraceCollector";
import { TimelineStore } from "../src/TimelineStore";
import { MetricsAggregator } from "../src/MetricsAggregator";
import { ReplayEngine } from "../src/ReplayEngine";

export async function runDevToolsTest(): Promise<void> {
  const eventBus = new EventBus();
  const collector = new TraceCollector(eventBus, "sess_123", "conv_456");
  const store = new TimelineStore();

  // Publish sequence with fully compliant AssistantEvent schemas
  eventBus.publish({
    id: "evt_1",
    sessionId: "sess_123",
    type: InteractionEventType.WakeDetected,
    source: "system",
    timestamp: Date.now(),
    version: LUCA_PLATFORM_PROTOCOL_VERSION,
    payload: {},
  });

  eventBus.publish({
    id: "evt_2",
    sessionId: "sess_123",
    type: AudioEventType.SpeechDetected,
    source: "audio-runtime",
    timestamp: Date.now() + 150,
    version: LUCA_PLATFORM_PROTOCOL_VERSION,
    payload: { transcript: "Hello Luca", isFinal: true },
  });

  const traces = collector.getTraces();
  if (traces.length !== 2) throw new Error(`Expected 2 trace entries, got ${traces.length}`);

  store.setTraces([...traces]);
  const jsonExport = store.exportJson("sess_123", "conv_456");
  if (!jsonExport.includes("interaction.wake.detected")) {
    throw new Error("TimelineStore JSON export failed");
  }

  const metrics = MetricsAggregator.computeMetrics(traces);
  if (metrics.experience.timeToWakeMs <= 0) {
    throw new Error("MetricsAggregator timeToWakeMs failed");
  }

  // Replay
  const replayBus = new EventBus();
  let replayedCount = 0;
  replayBus.subscribe("*", () => replayedCount++);

  const replayEngine = new ReplayEngine(replayBus);
  await replayEngine.replayTraces(traces, 10);

  if (replayedCount !== 2) {
    throw new Error(`ReplayEngine failed: expected 2 replayed events, got ${replayedCount}`);
  }

  console.log("✅ All @luca/devtools Flight Recorder Tests Passed Successfully!");
}

runDevToolsTest();
