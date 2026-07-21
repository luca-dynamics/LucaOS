import { describe, expect, it, vi } from "vitest";
import {
  createPlaywrightBrowserDriver,
  type PlaywrightPageLike,
} from "./PlaywrightBrowserDriver";

function createMockPage(
  overrides: Partial<PlaywrightPageLike> = {},
): PlaywrightPageLike {
  return {
    goto: vi.fn(async () => undefined),
    click: vi.fn(async () => undefined),
    fill: vi.fn(async () => undefined),
    type: vi.fn(async () => undefined),
    textContent: vi.fn(async () => "hello world"),
    content: vi.fn(async () => "<html>hi</html>"),
    screenshot: vi.fn(async () => Buffer.from("png")),
    close: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe("PlaywrightBrowserDriver", () => {
  it("navigates, clicks, types via injected page", async () => {
    const page = createMockPage();
    const driver = createPlaywrightBrowserDriver({ page });

    expect(driver.kind).toBe("playwright");

    const nav = await driver.navigate("https://example.com");
    expect(nav.ok).toBe(true);
    expect(page.goto).toHaveBeenCalledWith(
      "https://example.com",
      expect.objectContaining({ waitUntil: "domcontentloaded" }),
    );

    const click = await driver.click("#go");
    expect(click.ok).toBe(true);
    expect(page.click).toHaveBeenCalledWith(
      "#go",
      expect.objectContaining({ button: "left" }),
    );

    const typed = await driver.type("#input", "hi");
    expect(typed.ok).toBe(true);
    expect(page.fill).toHaveBeenCalledWith(
      "#input",
      "hi",
      expect.any(Object),
    );
  });

  it("extracts text and screenshots", async () => {
    const page = createMockPage();
    const driver = createPlaywrightBrowserDriver({ page });

    const extracted = await driver.extract("body");
    expect(extracted.ok).toBe(true);
    expect(extracted.data?.text).toBe("hello world");

    const shot = await driver.screenshot();
    expect(shot.ok).toBe(true);
    expect(shot.data?.byteLength).toBe(3);
  });

  it("fails click without selector", async () => {
    const driver = createPlaywrightBrowserDriver({ page: createMockPage() });
    const result = await driver.click(undefined);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/selector/i);
  });

  it("surfaces page errors", async () => {
    const page = createMockPage({
      click: vi.fn(async () => {
        throw new Error("timeout");
      }),
    });
    const driver = createPlaywrightBrowserDriver({ page });
    const result = await driver.click("#missing");
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/timeout/);
  });

  it("dispose closes owned page from factory", async () => {
    const page = createMockPage();
    const driver = createPlaywrightBrowserDriver({
      pageFactory: async () => page,
    });
    await driver.navigate("https://example.com");
    await driver.dispose();
    expect(page.close).toHaveBeenCalled();
  });
});
