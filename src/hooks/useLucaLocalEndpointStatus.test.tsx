// @vitest-environment jsdom
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { describe, expect, it, vi } from "vitest";
import { useLucaLocalEndpointStatus } from "./useLucaLocalEndpointStatus";
import {
  selectServedCuratedModels,
  type LucaLocalEndpointStatus,
} from "../services/llm/lucaLocalEndpointService";

function Probe({
  options,
  onRender,
}: {
  options: Parameters<typeof useLucaLocalEndpointStatus>[0];
  onRender: (r: ReturnType<typeof useLucaLocalEndpointStatus>) => void;
}) {
  const result = useLucaLocalEndpointStatus(options);
  onRender(result);
  return null;
}

async function renderHook(options: Parameters<typeof useLucaLocalEndpointStatus>[0]) {
  const renders: ReturnType<typeof useLucaLocalEndpointStatus>[] = [];
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(<Probe options={options} onRender={(r) => renders.push(r)} />);
  });
  return {
    renders,
    latest: () => renders[renders.length - 1],
    cleanup: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

describe("useLucaLocalEndpointStatus", () => {
  it("skips probing and reports not-configured when disabled", async () => {
    const check = vi.fn();
    const { latest, cleanup } = await renderHook({ enabled: false, check });
    expect(check).not.toHaveBeenCalled();
    expect(latest().loading).toBe(false);
    expect(latest().status.configured).toBe(false);
    cleanup();
  });

  it("probes when enabled and surfaces the resolved status", async () => {
    const online: LucaLocalEndpointStatus = {
      configured: true,
      health: { status: "online", reachable: true, modelIds: ["qwen2.5-7b-instruct"], message: "ok" },
      servedCuratedModels: selectServedCuratedModels(["qwen2.5-7b-instruct"]),
    };
    const check = vi.fn().mockResolvedValue(online);
    const { latest, cleanup } = await renderHook({ check });
    expect(check).toHaveBeenCalledTimes(1);
    expect(latest().loading).toBe(false);
    expect(latest().status.configured).toBe(true);
    expect(latest().status.servedCuratedModels.map((m) => m.id)).toEqual(["qwen2.5-7b-instruct"]);
    cleanup();
  });

  it("falls back to not-configured if the probe rejects", async () => {
    const check = vi.fn().mockRejectedValue(new Error("boom"));
    const { latest, cleanup } = await renderHook({ check });
    expect(latest().loading).toBe(false);
    expect(latest().status.configured).toBe(false);
    cleanup();
  });
});
