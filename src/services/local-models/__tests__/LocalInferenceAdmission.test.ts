import { describe, expect, it } from "vitest";
import { LocalInferenceAdmission } from "../LocalInferenceAdmission";

describe("LocalInferenceAdmission", () => {
  it("admits requests below the runtime limit", () => {
    const admission = new LocalInferenceAdmission({
      global: 2,
      byRuntime: { ollama: 2 },
    });

    const first = admission.tryAcquire("ollama");
    const second = admission.tryAcquire("ollama");

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(admission.getActiveCount()).toBe(2);
    expect(admission.getActiveCount("ollama")).toBe(2);
  });

  it("rejects requests over the runtime limit", () => {
    const admission = new LocalInferenceAdmission({
      global: 3,
      byRuntime: { cortex: 1 },
    });

    const first = admission.tryAcquire("cortex");
    const second = admission.tryAcquire("cortex");

    expect(first).not.toBeNull();
    expect(second).toBeNull();
    expect(admission.getActiveCount("cortex")).toBe(1);
  });

  it("rejects requests over the global limit", () => {
    const admission = new LocalInferenceAdmission({
      global: 1,
      byRuntime: { ollama: 2, "openai-compatible": 2 },
    });

    const first = admission.tryAcquire("ollama");
    const second = admission.tryAcquire("openai-compatible");

    expect(first).not.toBeNull();
    expect(second).toBeNull();
    expect(admission.snapshot().globalActive).toBe(1);
  });

  it("releases tokens exactly once", () => {
    const admission = new LocalInferenceAdmission({
      global: 1,
      byRuntime: { webllm: 1 },
    });

    const token = admission.tryAcquire("webllm");
    expect(token).not.toBeNull();

    token?.release();
    token?.release();

    expect(admission.getActiveCount()).toBe(0);
    expect(admission.getActiveCount("webllm")).toBe(0);
    expect(admission.tryAcquire("webllm")).not.toBeNull();
  });
});
