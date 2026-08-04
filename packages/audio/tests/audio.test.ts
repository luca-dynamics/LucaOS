import { EventBus } from "../../voice-engine/src";
import { AudioPipeline } from "../src/AudioPipeline";
import { SentenceAudioQueue } from "../src/SentenceAudioQueue";
import { ElevenLabsTTSAdapter } from "../src/ElevenLabsTTSAdapter";

export async function runAudioPipelineTest(): Promise<void> {
  const eventBus = new EventBus();
  const pipeline = new AudioPipeline(eventBus);

  let speechDetected = false;
  let textPushed = false;
  let ttsEventEmitted = false;

  eventBus.subscribe("*", (evt) => {
    if (evt.type === "audio.speech.detected") speechDetected = true;
    if (evt.type === "interaction.turn.started") textPushed = true;
    if (evt.type === "interaction.response.streaming.started") ttsEventEmitted = true;
  });

  await pipeline.start();
  pipeline.vad.processAudioChunk(0.85); // High energy chunk
  pipeline.sttAdapter.pushPartialText("Hello Luca", true);

  if (!speechDetected) throw new Error("AudioPipeline failed: VAD speech.detected event not published");
  if (!textPushed) throw new Error("AudioPipeline failed: STT transcript event not published");

  // Test Phase E: SentenceAudioQueue & ElevenLabsTTSAdapter
  const audioQueue = new SentenceAudioQueue(eventBus);
  const ttsAdapter = new ElevenLabsTTSAdapter(audioQueue);

  ttsAdapter.streamSentence("The weather in Abuja is rainy.");
  await new Promise((resolve) => setTimeout(resolve, 50));

  if (!ttsEventEmitted) {
    throw new Error("SentenceAudioQueue failed: ResponseStreamingStarted event not published");
  }

  // Interruption
  ttsAdapter.interrupt();

  pipeline.stop();
  console.log("✅ All @luca/audio Phase B & Phase E Tests Passed Successfully!");
}

runAudioPipelineTest();
