import { describe, expect, it, vi } from "vitest";
import { LocalModelLease } from "../LocalModelLease";

describe("LocalModelLease", () => {
  it("tracks active leases per model", () => {
    const lease = new LocalModelLease();

    lease.acquire("ollama:llama3.2:3b");
    lease.acquire("ollama:llama3.2:3b");

    expect(lease.count("ollama:llama3.2:3b")).toBe(2);
    expect(lease.isActive("ollama:llama3.2:3b")).toBe(true);

    lease.release("ollama:llama3.2:3b");
    expect(lease.count("ollama:llama3.2:3b")).toBe(1);

    lease.release("ollama:llama3.2:3b");
    expect(lease.count("ollama:llama3.2:3b")).toBe(0);
    expect(lease.isActive("ollama:llama3.2:3b")).toBe(false);
  });

  it("records release underflows instead of throwing", () => {
    const lease = new LocalModelLease();

    lease.release("cortex:gemma-2b");

    expect(lease.snapshot().releaseUnderflows).toBe(1);
    expect(lease.count("cortex:gemma-2b")).toBe(0);
  });

  it("waits until a model drains", async () => {
    const lease = new LocalModelLease();
    lease.acquire("webllm:model");

    const drained = lease.waitForZero("webllm:model");
    lease.release("webllm:model");

    await expect(drained).resolves.toBe(true);
  });

  it("times out while waiting for an active model", async () => {
    vi.useFakeTimers();
    const lease = new LocalModelLease();
    lease.acquire("mediapipe:model");

    const drained = lease.waitForZero("mediapipe:model", 250);
    vi.advanceTimersByTime(250);

    await expect(drained).resolves.toBe(false);
    lease.release("mediapipe:model");
    vi.useRealTimers();
  });

  it("rejects empty model ids", () => {
    const lease = new LocalModelLease();

    expect(() => lease.acquire("   ")).toThrow(
      "Local model lease requires a model id.",
    );
  });
});
