import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  relayListener: undefined as ((message: unknown) => void) | undefined,
  sendRelayMessage: vi.fn(() => true),
  getRelayState: vi.fn(() => ({ connected: true })),
}));

vi.mock("../../lucaLink/manager", () => ({
  lucaLinkManager: {
    onRelayMessage: (listener: (message: unknown) => void) => {
      mocks.relayListener = listener;
      return () => {
        mocks.relayListener = undefined;
      };
    },
    sendRelayMessage: mocks.sendRelayMessage,
    getRelayState: mocks.getRelayState,
  },
}));

import { LucaLinkSync } from "./LucaLinkSync";

const checkpoint = {
  id: "checkpoint-1",
  workflowId: "workflow-1",
  timestamp: 100,
  currentStep: 2,
  completedSteps: [0, 1],
  context: { goal: "Finish the task", steps: [] },
};

describe("LucaLinkSync", () => {
  beforeEach(() => {
    mocks.relayListener = undefined;
    mocks.sendRelayMessage.mockClear();
    mocks.getRelayState.mockClear();
  });

  it("publishes and reads local checkpoints through the manager relay", async () => {
    const sync = new LucaLinkSync();

    expect(sync.isConnected()).toBe(true);
    await expect(sync.syncCheckpoint(checkpoint)).resolves.toBe(true);
    expect(mocks.sendRelayMessage).toHaveBeenCalledWith("all", "CHECKPOINT_SYNC", {
      checkpoint,
    });
    await expect(sync.fetchCheckpoint("workflow-1")).resolves.toEqual(
      checkpoint,
    );
  });

  it("accepts valid remote checkpoints and publishes deletions", async () => {
    const sync = new LucaLinkSync();
    mocks.relayListener?.({ type: "CHECKPOINT_SYNC", payload: { checkpoint } });

    await expect(sync.fetchCheckpoint("workflow-1")).resolves.toEqual(
      checkpoint,
    );
    await expect(sync.deleteCheckpoint("checkpoint-1")).resolves.toBe(true);
    expect(mocks.sendRelayMessage).toHaveBeenLastCalledWith(
      "all",
      "CHECKPOINT_DELETE",
      { checkpointId: "checkpoint-1" },
    );
    await expect(sync.fetchCheckpoint("workflow-1")).resolves.toBeNull();
  });
});
