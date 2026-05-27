import { describe, expect, it } from "vitest";
import { createComputerUseGuardConfirmationBridge } from "./createComputerUseGuardConfirmationBridge";
import { ComputerUseGuardBridge } from "./ComputerUseGuardBridge";

describe("createComputerUseGuardConfirmationBridge", () => {
  it("returns helper methods bound to bridge", () => {
    const factory = createComputerUseGuardConfirmationBridge();
    const request = factory.createRequest({ decision: new ComputerUseGuardBridge().needsConfirmation("need", {}, "high") });
    const approved = factory.approve(request!.confirmationId);
    expect(approved.status).toBe("approved");
    expect(factory.getSnapshot().metadata.bridgeKind).toBe("guard_confirmation_scaffold");
  });
});
