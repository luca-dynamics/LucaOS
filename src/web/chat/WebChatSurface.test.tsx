// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WebChatSurface } from "./WebChatSurface";
import {
  WEB_CHAT_RUNTIME_UNAVAILABLE,
  type WebChatRuntime,
} from "./webChatRuntime";

let container: HTMLDivElement | null = null;

afterEach(() => {
  container?.remove();
  container = null;
});

async function renderSurface(runtime: WebChatRuntime) {
  container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(<WebChatSurface runtime={runtime} />);
  });
  return { container, root };
}

describe("WebChatSurface", () => {
  it("renders LucaOS welcome and unavailable runtime states", async () => {
    const runtime: WebChatRuntime = {
      sendMessage: vi.fn(),
    };
    const rendered = await renderSurface(runtime);

    expect(rendered.container.textContent).toContain(
      "LucaOS is running in browser-safe mode",
    );
    expect(rendered.container.textContent).toContain(
      WEB_CHAT_RUNTIME_UNAVAILABLE,
    );
    await act(async () => rendered.root.unmount());
  });

  it("sends through the adapter, displays pending, and renders its result", async () => {
    let resolveResponse!: (value: {
      id: string;
      role: "assistant";
      content: string;
      timestamp: number;
    }) => void;
    const runtime: WebChatRuntime = {
      sendMessage: vi.fn(
        () =>
          new Promise((resolve) => {
            resolveResponse = resolve;
          }),
      ),
    };
    const rendered = await renderSurface(runtime);
    const input = rendered.container.querySelector("textarea")!;
    const form = rendered.container.querySelector("form")!;

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value",
      )?.set;
      setter?.call(input, "Hello Luca");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });

    expect(runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ text: "Hello Luca", mode: "chat" }),
    );
    expect(rendered.container.textContent).toContain(
      "LucaOS runtime adapter is processing",
    );

    await act(async () => {
      resolveResponse({
        id: "adapter-result",
        role: "assistant",
        content: WEB_CHAT_RUNTIME_UNAVAILABLE,
        timestamp: Date.now(),
      });
      await Promise.resolve();
    });
    expect(rendered.container.textContent).toContain(
      WEB_CHAT_RUNTIME_UNAVAILABLE,
    );
    await act(async () => rendered.root.unmount());
  });
});
