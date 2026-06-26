// @vitest-environment jsdom
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  LucaLocalIntelligenceMoment,
  deriveLocalIntelligenceState,
} from "./LucaLocalIntelligenceMoment";
import {
  selectServedCuratedModels,
  type LucaLocalEndpointStatus,
} from "../../services/llm/lucaLocalEndpointService";

const detectedStatus = (servedIds: string[]): LucaLocalEndpointStatus => ({
  configured: true,
  health: { status: "online", reachable: true, modelIds: servedIds, message: "ok" },
  servedCuratedModels: selectServedCuratedModels(servedIds),
});

describe("deriveLocalIntelligenceState", () => {
  it("classifies offer-setup / detected / endpoint-issue", () => {
    expect(deriveLocalIntelligenceState({ configured: false, servedCuratedModels: [] })).toBe("offer-setup");
    expect(deriveLocalIntelligenceState(detectedStatus(["qwen2.5-7b-instruct"]))).toBe("detected");
    expect(
      deriveLocalIntelligenceState({
        configured: true,
        health: { status: "unreachable", reachable: false, modelIds: [], message: "down" },
        servedCuratedModels: [],
      }),
    ).toBe("endpoint-issue");
  });
});

describe("LucaLocalIntelligenceMoment", () => {
  it("offers optional setup with stay-on-Prime and later paths when nothing is configured", () => {
    const markup = renderToStaticMarkup(
      <LucaLocalIntelligenceMoment status={{ configured: false, servedCuratedModels: [] }} onSetUpNow={() => {}} />,
    );
    expect(markup).toContain('data-luca-local-moment-state="offer-setup"');
    expect(markup).toContain("think locally on this device");
    expect(markup).toContain('data-luca-local-cta="setup-now"');
    expect(markup).toContain('data-luca-local-cta="skip"');
    expect(markup).toContain('data-luca-local-cta="later"');
    expect(markup).toContain('data-luca-presence="identity"');
  });

  it("recommends connecting to served models that fit RAM", () => {
    const markup = renderToStaticMarkup(
      <LucaLocalIntelligenceMoment
        status={detectedStatus(["qwen2.5-7b-instruct", "llama-3.2-1b-instruct"])}
        systemRamBytes={4_000_000_000}
      />,
    );
    expect(markup).toContain('data-luca-local-moment-state="detected"');
    // 1B fits 4GB; 7B (8GB min) is filtered out.
    expect(markup).toContain('data-luca-local-model="llama-3.2-1b-instruct"');
    expect(markup).not.toContain('data-luca-local-model="qwen2.5-7b-instruct"');
  });

  it("shows an honest, calm message for an unreachable endpoint", () => {
    const markup = renderToStaticMarkup(
      <LucaLocalIntelligenceMoment
        status={{
          configured: true,
          health: { status: "unreachable", reachable: false, modelIds: [], message: "Couldn't reach the endpoint." },
          servedCuratedModels: [],
        }}
      />,
    );
    expect(markup).toContain('data-luca-local-moment-state="endpoint-issue"');
    expect(markup).toContain("reach the endpoint.");
    expect(markup).toContain('data-luca-local-cta="skip"');
  });

  it("wires the action callbacks", () => {
    const onSetUpNow = vi.fn();
    const onSkipToCloud = vi.fn();
    const onLater = vi.fn();
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() =>
      root.render(
        <LucaLocalIntelligenceMoment
          status={{ configured: false, servedCuratedModels: [] }}
          onSetUpNow={onSetUpNow}
          onSkipToCloud={onSkipToCloud}
          onLater={onLater}
        />,
      ),
    );
    const click = (sel: string) =>
      act(() => (container.querySelector(sel) as HTMLButtonElement).click());
    click('[data-luca-local-cta="setup-now"]');
    click('[data-luca-local-cta="skip"]');
    click('[data-luca-local-cta="later"]');
    expect(onSetUpNow).toHaveBeenCalledTimes(1);
    expect(onSkipToCloud).toHaveBeenCalledTimes(1);
    expect(onLater).toHaveBeenCalledTimes(1);
    act(() => root.unmount());
    container.remove();
  });

  it("connects to a specific served model when its row is chosen", () => {
    const onConnect = vi.fn();
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() =>
      root.render(
        <LucaLocalIntelligenceMoment
          status={detectedStatus(["qwen2.5-7b-instruct"])}
          systemRamBytes={16_000_000_000}
          onConnect={onConnect}
        />,
      ),
    );
    act(() => (container.querySelector('[data-luca-local-model="qwen2.5-7b-instruct"]') as HTMLButtonElement).click());
    expect(onConnect).toHaveBeenCalledWith("qwen2.5-7b-instruct");
    act(() => root.unmount());
    container.remove();
  });
});
