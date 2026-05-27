import { describe, expect, it } from "vitest";
import { ComputerUseGuardBridge } from "../computerUse/ComputerUseGuardBridge";
import { ComputerUseGuardConfirmationBridge } from "../computerUse/ComputerUseGuardConfirmationBridge";
import { VoiceComputerUseConfirmationBridge } from "./VoiceComputerUseConfirmationBridge";
import { VoiceInMemoryTapeSink } from "./VoiceInMemoryTapeSink";
import { VoiceRuntimeEventBridge } from "./VoiceRuntimeEventBridge";

describe("VoiceComputerUseConfirmationBridge", () => {
  const makePending = (bridge: ComputerUseGuardConfirmationBridge, missionId?: string) =>
    bridge.createRequest({
      decision: new ComputerUseGuardBridge().needsConfirmation("needs confirmation", { request: { missionId } }, "high"),
    })!;

  it("approves pending computer-use confirmation by voice", () => {
    const confirmation = new ComputerUseGuardConfirmationBridge();
    const request = makePending(confirmation);
    const bridge = new VoiceComputerUseConfirmationBridge(confirmation);

    const result = bridge.handleTranscript({ transcript: "approve", confirmationId: request.confirmationId });
    expect(result.status).toBe("approved");
    expect(result.intent).toBe("approve");
  });

  it("rejects pending computer-use confirmation by voice", () => {
    const confirmation = new ComputerUseGuardConfirmationBridge();
    const request = makePending(confirmation);
    const bridge = new VoiceComputerUseConfirmationBridge(confirmation);

    const result = bridge.handleText({ transcript: "no", confirmationId: request.confirmationId });
    expect(result.status).toBe("rejected");
    expect(result.intent).toBe("reject");
  });

  it("uses latest pending confirmation when confirmationId omitted", () => {
    const confirmation = new ComputerUseGuardConfirmationBridge();
    const older = makePending(confirmation, "m1");
    const latest = makePending(confirmation, "m2");
    const bridge = new VoiceComputerUseConfirmationBridge(confirmation);

    const result = bridge.handleTranscript({ transcript: "yes" });
    expect(result.status).toBe("approved");
    expect(result.confirmationId).toBe(latest.confirmationId);
    expect(bridge.getSnapshot().requests.find((r) => r.confirmationId === older.confirmationId)?.status).toBe("pending");
  });

  it("required phrase mismatch returns failed", () => {
    const confirmation = new ComputerUseGuardConfirmationBridge({ requiredPhrase: "ALLOW", enforceRequiredPhrase: true });
    const request = makePending(confirmation);
    const bridge = new VoiceComputerUseConfirmationBridge(confirmation);

    const result = bridge.handleTranscript({ transcript: "approve", confirmationId: request.confirmationId, requiredPhrase: "ALLOW" });
    expect(result.status).toBe("failed");
  });

  it("unknown phrase returns needs_clarification", () => {
    const confirmation = new ComputerUseGuardConfirmationBridge();
    makePending(confirmation);
    const bridge = new VoiceComputerUseConfirmationBridge(confirmation);

    const result = bridge.handleTranscript({ transcript: "maybe later" });
    expect(result.status).toBe("needs_clarification");
    expect(result.intent).toBe("unknown");
  });

  it("no pending confirmation returns needs_clarification", () => {
    const bridge = new VoiceComputerUseConfirmationBridge(new ComputerUseGuardConfirmationBridge());
    const result = bridge.handleTranscript({ transcript: "approve" });
    expect(result.status).toBe("needs_clarification");
  });

  it("voice tape recording is non-fatal", () => {
    const confirmation = new ComputerUseGuardConfirmationBridge();
    makePending(confirmation);
    const bridge = new VoiceComputerUseConfirmationBridge(
      confirmation,
      { recordCommandResult: () => { throw new Error("boom"); } } as unknown as VoiceRuntimeEventBridge,
    );

    expect(() => bridge.handleTranscript({ transcript: "approve" })).not.toThrow();
  });

  it("metadata shows no audio/STT/TTS/system/browser/direct-host APIs called", () => {
    const confirmation = new ComputerUseGuardConfirmationBridge();
    makePending(confirmation);
    const sink = new VoiceInMemoryTapeSink();
    const eventBridge = new VoiceRuntimeEventBridge(sink);
    const bridge = new VoiceComputerUseConfirmationBridge(confirmation, eventBridge, "voice-confirm-1");

    const result = bridge.handleTranscript({ transcript: "confirm" });
    expect(result.metadata.audioApisCalled).toBe(false);
    expect(result.metadata.sttApisCalled).toBe(false);
    expect(result.metadata.ttsApisCalled).toBe(false);
    expect(result.metadata.systemApisCalled).toBe(false);
    expect(result.metadata.browserApisCalled).toBe(false);
    expect(result.metadata.directHostAllowed).toBe(false);
    expect(sink.getSnapshot("voice-confirm-1").totalRecords).toBeGreaterThan(0);
  });
});
