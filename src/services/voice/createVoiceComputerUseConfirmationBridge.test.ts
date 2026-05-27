import { describe, expect, it } from "vitest";
import { ComputerUseGuardBridge } from "../computerUse/ComputerUseGuardBridge";
import { ComputerUseGuardConfirmationBridge } from "../computerUse/ComputerUseGuardConfirmationBridge";
import { createVoiceComputerUseConfirmationBridge } from "./createVoiceComputerUseConfirmationBridge";

describe("createVoiceComputerUseConfirmationBridge", () => {
  it("exposes expected factory surface", () => {
    const confirmationBridge = new ComputerUseGuardConfirmationBridge();
    const runtime = createVoiceComputerUseConfirmationBridge({ confirmationBridge });
    expect(runtime.bridge).toBeDefined();
    expect(typeof runtime.handleTranscript).toBe("function");
    expect(typeof runtime.handleText).toBe("function");
    expect(typeof runtime.getSnapshot).toBe("function");
    expect(typeof runtime.reset).toBe("function");
  });

  it("handles transcript/text and reset passthrough", () => {
    const confirmationBridge = new ComputerUseGuardConfirmationBridge();
    const request = confirmationBridge.createRequest({ decision: new ComputerUseGuardBridge().needsConfirmation("need", {}, "high") })!;
    const runtime = createVoiceComputerUseConfirmationBridge({ confirmationBridge });

    const approved = runtime.handleTranscript({ transcript: "go ahead", confirmationId: request.confirmationId });
    expect(approved.status).toBe("approved");

    confirmationBridge.createRequest({ decision: new ComputerUseGuardBridge().needsConfirmation("need", {}, "high") });
    expect(runtime.getSnapshot().requests.length).toBeGreaterThan(0);
    runtime.reset();
    expect(runtime.getSnapshot().requests).toHaveLength(0);

    const textResult = runtime.handleText({ transcript: "cancel" });
    expect(textResult.status).toBe("needs_clarification");
  });
});
