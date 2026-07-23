// @vitest-environment jsdom
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ShellCommandBar from "./ShellCommandBar";
import { intentRoutingModeService } from "../../services/runtime/IntentRoutingModeService";

/**
 * The workspace variant IS the target design's bar — these tests pin its
 * anatomy so it cannot quietly grow back the legacy control clutter, and pin
 * the behaviours borrowed from the embedded composer (Enter sends, stop while
 * processing, one routing service under both surfaces).
 */

const mount = (ui: React.ReactElement) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(ui));
  return {
    container,
    cleanup: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
};

const makeProps = (overrides: Record<string, unknown> = {}) => ({
  variant: "workspace" as const,
  input: "",
  setInput: vi.fn(),
  handleSend: vi.fn(),
  isProcessing: false,
  messages: [] as any[],
  setMessages: vi.fn(),
  theme: { hex: "#4a9eff", themeName: "carbon", primary: "" },
  isMobile: false,
  attachedImage: null,
  setAttachedImage: vi.fn(),
  fileInputRef: React.createRef<HTMLInputElement>(),
  handleFileSelect: vi.fn(),
  isVoiceMode: false,
  toggleVoiceMode: vi.fn(),
  showCamera: false,
  setShowCamera: vi.fn(),
  handleClearChat: vi.fn(),
  handleStop: vi.fn(),
  currentCwd: "",
  isKernelLocked: false,
  opsecStatus: "ACTIVE",
  persona: "ASSISTANT",
  ...overrides,
});

beforeEach(() => {
  // jsdom lacks matchMedia; the bar must default to the floating layout.
  // @ts-expect-error deliberate removal
  delete window.matchMedia;
});

describe("ShellCommandBar workspace variant", () => {
  it("renders exactly the target anatomy — and none of the legacy clutter", () => {
    const { container, cleanup } = mount(<ShellCommandBar {...makeProps()} />);

    expect(
      container.querySelector('[data-luca-command-bar-variant="workspace"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('textarea[placeholder="Ask Luca anything…"]'),
    ).not.toBeNull();
    expect(container.querySelector('[data-luca-command-bar-model]')?.textContent).toContain(
      "Luca Prime",
    );

    const modes = container.querySelector('[role="group"][aria-label="Response mode"]');
    expect(modes?.textContent).toBe("FastPlanning");
    expect(container.querySelector('[aria-label="Send"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="Attach a file"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="Talk to Luca"]')).not.toBeNull();

    // The clutter the design removed must STAY removed.
    expect(container.textContent).not.toContain("OPSEC");
    expect(container.textContent).not.toContain("MCP");
    expect(container.querySelector('[aria-label*="amera"]')).toBeNull();

    cleanup();
  });

  it("sends on Enter through the routed path, and newlines on Shift+Enter", () => {
    const handleSend = vi.fn();
    const { container, cleanup } = mount(
      <ShellCommandBar {...makeProps({ input: "hello", handleSend })} />,
    );
    const field = container.querySelector("textarea") as HTMLTextAreaElement;

    act(() => {
      field.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", shiftKey: true, bubbles: true }),
      );
    });
    expect(handleSend).not.toHaveBeenCalled();

    act(() => {
      field.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    expect(handleSend).toHaveBeenCalledTimes(1);

    cleanup();
  });

  it("swaps send for stop while processing, and says so beneath the bar", () => {
    const handleStop = vi.fn();
    const { container, cleanup } = mount(
      <ShellCommandBar {...makeProps({ isProcessing: true, handleStop })} />,
    );

    expect(container.querySelector('[aria-label="Send"]')).toBeNull();
    const stop = container.querySelector('[aria-label="Stop responding"]') as HTMLButtonElement;
    expect(stop).not.toBeNull();
    expect(
      container.querySelector("[data-luca-command-bar-thinking]")?.textContent,
    ).toBe("Luca is thinking");

    act(() => stop.click());
    expect(handleStop).toHaveBeenCalledTimes(1);

    cleanup();
  });

  it("writes Fast|Planning through the shared routing service", () => {
    const { container, cleanup } = mount(<ShellCommandBar {...makeProps()} />);
    const buttons = Array.from(
      container.querySelectorAll('[aria-label="Response mode"] button'),
    ) as HTMLButtonElement[];
    const planning = buttons.find((b) => b.textContent === "Planning")!;

    act(() => planning.click());
    expect(intentRoutingModeService.getMode()).toBe("plan");
    expect(planning.getAttribute("aria-pressed")).toBe("true");

    const fast = buttons.find((b) => b.textContent === "Fast")!;
    act(() => fast.click());
    expect(intentRoutingModeService.getMode()).toBe("fast");

    cleanup();
  });

  it("shows the editing chip only when a canvas has granted scope", () => {
    const without = mount(<ShellCommandBar {...makeProps()} />);
    expect(without.container.querySelector("[data-luca-command-bar-editing]")).toBeNull();
    without.cleanup();

    const withScope = mount(
      <ShellCommandBar {...makeProps({ editingScope: "Strategy Sprint Plan v7" })} />,
    );
    expect(
      withScope.container.querySelector("[data-luca-command-bar-editing]")?.textContent,
    ).toContain("Editing enabled");
    withScope.cleanup();
  });
});
