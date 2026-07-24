import { describe, expect, it, beforeEach } from "vitest";
import { CredentialPoolService } from "./credentialPoolService";

describe("CredentialPoolService", () => {
  let poolService: CredentialPoolService;

  beforeEach(() => {
    poolService = new CredentialPoolService();
    poolService.registerPool("anthropic", [
      "sk-ant-key1-1234567890",
      "sk-ant-key2-1234567890",
      "sk-ant-key3-1234567890",
    ]);
  });

  it("registers key pool and retrieves active key", () => {
    const key = poolService.getActiveKey("anthropic");
    expect(key).toBe("sk-ant-key1-1234567890");
  });

  it("marks key exhausted on 429 and auto-rotates to next healthy key", () => {
    const currentKey = poolService.getActiveKey("anthropic");
    expect(currentKey).toBe("sk-ant-key1-1234567890");

    const rotatedKey = poolService.markExhausted("anthropic", currentKey!, 60000);
    expect(rotatedKey).toBe("sk-ant-key2-1234567890");

    const status = poolService.getPoolStatus("anthropic");
    expect(status.anthropic.healthyKeysCount).toBe(2);
    expect(status.anthropic.exhaustedKeysCount).toBe(1);
  });

  it("recovers exhausted key after TTL cooldown expires", () => {
    const currentKey = poolService.getActiveKey("anthropic")!;
    // Set 10ms cooldown
    poolService.markExhausted("anthropic", currentKey, 10);

    // Immediately after, key2 is active
    expect(poolService.getActiveKey("anthropic")).toBe("sk-ant-key2-1234567890");

    // Wait 20ms for cooldown to expire
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const recoveredKey = poolService.getActiveKey("anthropic");
        expect(recoveredKey).toBe("sk-ant-key1-1234567890");
        resolve();
      }, 25);
    });
  });

  it("marks invalid key dead and skips it permanently in rotation", () => {
    poolService.markDead("anthropic", "sk-ant-key1-1234567890");
    const nextKey = poolService.getActiveKey("anthropic");
    expect(nextKey).toBe("sk-ant-key2-1234567890");

    const status = poolService.getPoolStatus("anthropic");
    expect(status.anthropic.deadKeysCount).toBe(1);
    expect(status.anthropic.healthyKeysCount).toBe(2);
  });

  it("falls back gracefully to single key when pool is empty", () => {
    const fallback = poolService.getActiveKey("gemini", "fallback-gemini-key");
    expect(fallback).toBe("fallback-gemini-key");
  });
});
