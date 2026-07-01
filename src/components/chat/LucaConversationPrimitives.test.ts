import { describe, expect, it } from "vitest";

const { readFileSync } = process.getBuiltinModule("node:fs");

const primitiveSource = readFileSync(
  "src/components/chat/LucaConversationPrimitives.tsx",
  "utf8",
);
const cssSource = readFileSync("src/index.css", "utf8");

describe("Luca conversation primitives", () => {
  it("keeps reader-intent scroll engineering wired into the message scroller", () => {
    expect(primitiveSource).toContain("pauseFollowing");
    expect(primitiveSource).toContain("jumpToLatest");
    expect(primitiveSource).toContain("ResizeObserver");
    expect(primitiveSource).toContain("aria-live");
    expect(primitiveSource).toContain("onPointerDown");
    expect(primitiveSource).toContain("onKeyDown");
    expect(primitiveSource).toContain("onFocusCapture");
    expect(primitiveSource).toContain("onClickCapture");
    expect(primitiveSource).toContain("restoreAnchorId");
    expect(primitiveSource).toContain("turnAnchorId");
    expect(primitiveSource).toContain("preserveContext");
    expect(primitiveSource).toContain("luca:chat-scroll");
    expect(primitiveSource).toContain("findTopVisibleMessageId");
    expect(primitiveSource).toContain("Link to this message");
    expect(primitiveSource).toContain("navigationItems");
    expect(primitiveSource).toContain("visibleMessageIds");
    expect(primitiveSource).toContain("currentAnchorId");
    expect(primitiveSource).toContain("Conversation navigation");
    expect(primitiveSource).toContain("aria-current");
    expect(primitiveSource).toContain("data-luca-message-label");
    expect(primitiveSource).toContain("left-2 top-4 bottom-16");
    expect(primitiveSource).toContain("group-hover/rail:w-4");
  });

  it("exposes the chat utility classes used by the conversation layer", () => {
    for (const utility of [
      ".scroll-fade",
      ".scroll-fade-y",
      ".scroll-fade-x",
      ".scroll-fade-s",
      ".scroll-fade-e",
      ".scroll-fade-4",
      ".scroll-fade-none",
      ".shimmer",
      ".shimmer-once",
      ".shimmer-reverse",
      ".shimmer-color-accent",
      ".shimmer-spread-tight",
      ".shimmer-duration-slow",
      ".shimmer-dutation-slow",
      ".shimmer-angle-horizontal",
    ]) {
      expect(cssSource).toContain(utility);
    }

    expect(primitiveSource).toContain("scroll-fade-y");
    expect(primitiveSource).toContain("shimmer-once");
    expect(primitiveSource).toContain("shimmer-duration-slow");
  });
});
