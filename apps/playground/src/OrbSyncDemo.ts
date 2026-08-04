import { LucaRuntimeProcess } from "../../../packages/platform-runtime/src";

export async function runOrbSyncDemo(): Promise<void> {
  console.log("🔮 ====================================================== 🔮");
  console.log("🏆 STARTING LUCAOS SPRINT 2 PHASE 1: ORB SYNCHRONIZATION 🏆");
  console.log("🔮 ====================================================== 🔮\n");

  const process = new LucaRuntimeProcess();
  await process.startProcess();

  const states = [
    { name: "Listening", action: () => process.beginListening() },
    { name: "Understanding", action: () => process.beginUnderstanding() },
    { name: "Thinking", action: () => process.beginThinking() },
    { name: "Acting", action: () => process.beginToolExecution() },
    { name: "Speaking", action: () => process.beginSpeaking() },
    { name: "Recovering / Idle", action: () => process.finishTurn() },
  ];

  for (const s of states) {
    const orbParams = s.action();
    console.log(
      `🔮 State: [${s.name.padEnd(16, " ")}] ➔ <LucaOrb /> Expressive Parameters: ` +
      `FlowSpeed: ${orbParams.flowSpeedMultiplier.toFixed(2)}x | Amplitude: ${orbParams.breathingAmplitudeMultiplier.toFixed(2)}x | BloomScale: ${orbParams.bloomScale.toFixed(2)} | FresnelBoost: ${orbParams.fresnelBoost.toFixed(2)}`
    );
    await new Promise((r) => setTimeout(r, 45));
  }

  process.stopProcess();
  console.log("\n🔮 ====================================================== 🔮");
  console.log("✅ LUCAOS ORB SYNCHRONIZATION DEMO COMPLETED SUCCESSFULLY!");
  console.log("🔮 ====================================================== 🔮\n");
}

runOrbSyncDemo();
