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

  it("requests a missing checkpoint and resolves when a linked host replies", async () => {
    mocks.sendRelayMessage.mockImplementationOnce((_target, type, payload) => {
      if (type === "CHECKPOINT_REQUEST") {
        mocks.relayListener?.({
          type: "CHECKPOINT_SYNC",
          payload: { checkpoint, requestId: (payload as { requestId: string }).requestId },
        });
      }
      return true;
    });

    const sync = new LucaLinkSync();
    await expect(sync.fetchCheckpoint("workflow-1")).resolves.toEqual(
      checkpoint,
    );
    expect(mocks.sendRelayMessage).toHaveBeenCalledWith(
      "all",
      "CHECKPOINT_REQUEST",
      expect.objectContaining({ workflowId: "workflow-1" }),
    );
  });

  it("answers a checkpoint request from its local continuity cache", async () => {
    const sync = new LucaLinkSync();
    await sync.syncCheckpoint(checkpoint);
    mocks.sendRelayMessage.mockClear();

    mocks.relayListener?.({
      type: "CHECKPOINT_REQUEST",
      source: "companion-1",
      payload: { workflowId: "workflow-1", requestId: "request-1" },
    });

    expect(mocks.sendRelayMessage).toHaveBeenCalledWith(
      "companion-1",
      "CHECKPOINT_SYNC",
      { checkpoint, requestId: "request-1" },
    );
  });

  it("keeps the newest checkpoint when updates arrive out of order", async () => {
    const sync = new LucaLinkSync();
    const newer = { ...checkpoint, id: "checkpoint-newer", timestamp: 200 };
    const older = { ...checkpoint, id: "checkpoint-older", timestamp: 100 };

    await sync.syncCheckpoint(newer);
    mocks.relayListener?.({
      type: "CHECKPOINT_SYNC",
      payload: { checkpoint: older },
    });

    await expect(sync.fetchCheckpoint("workflow-1")).resolves.toEqual(newer);
  });

  it("uses checkpoint ID as a deterministic tie-breaker", async () => {
    const sync = new LucaLinkSync();
    const first = { ...checkpoint, id: "checkpoint-a", timestamp: 200 };
    const second = { ...checkpoint, id: "checkpoint-b", timestamp: 200 };

    await sync.syncCheckpoint(first);
    mocks.relayListener?.({
      type: "CHECKPOINT_SYNC",
      payload: { checkpoint: second },
    });

    await expect(sync.fetchCheckpoint("workflow-1")).resolves.toEqual(second);
  });
});
