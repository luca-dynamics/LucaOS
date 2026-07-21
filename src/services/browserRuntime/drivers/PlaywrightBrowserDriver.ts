/**
 * Real Playwright BrowserDriver for sandbox_browser execution.
 *
 * - Dynamic-imports `playwright` only when ensurePage() runs (no static import).
 * - Default: clean ephemeral Chromium, headless, no user profile / no direct-host.
 * - Tests inject `pageFactory` to avoid launching Chromium in CI.
 */

import type {
  BrowserDriver,
  BrowserDriverActionResult,
} from "../types";

/** Minimal page surface used by this driver (Playwright Page is compatible). */
export interface PlaywrightPageLike {
  goto(
    url: string,
    options?: { timeout?: number; waitUntil?: string },
  ): Promise<unknown>;
  click(
    selector: string,
    options?: { timeout?: number; button?: string },
  ): Promise<void>;
  fill?(selector: string, text: string, options?: { timeout?: number }): Promise<void>;
  type?(
    selector: string,
    text: string,
    options?: { delay?: number; timeout?: number },
  ): Promise<void>;
  locator?(selector: string): {
    fill(text: string, options?: { timeout?: number }): Promise<void>;
    textContent(options?: { timeout?: number }): Promise<string | null>;
    click(options?: { timeout?: number }): Promise<void>;
  };
  textContent?(
    selector: string,
    options?: { timeout?: number },
  ): Promise<string | null>;
  content?(): Promise<string>;
  screenshot(options?: {
    fullPage?: boolean;
    type?: "png" | "jpeg";
  }): Promise<Buffer | Uint8Array>;
  close?(): Promise<void>;
}

export interface PlaywrightBrowserLike {
  newContext(options?: Record<string, unknown>): Promise<{
    newPage(): Promise<PlaywrightPageLike>;
    close?(): Promise<void>;
  }>;
  close(): Promise<void>;
}

export interface PlaywrightBrowserDriverOptions {
  /** Default true — no headed UI unless explicitly set false. */
  headless?: boolean;
  /** Navigation / action timeout in ms. */
  timeoutMs?: number;
  /** Injected page (tests). Skips Playwright launch. */
  page?: PlaywrightPageLike;
  /** Lazy page factory (tests or custom launch). */
  pageFactory?: () => Promise<PlaywrightPageLike>;
  /**
   * Optional launch override. Receives chromium-like launcher.
   * Default: chromium.launch({ headless }) then newContext().newPage().
   */
  launch?: () => Promise<{
    page: PlaywrightPageLike;
    dispose: () => Promise<void>;
  }>;
  /** Max chars returned from extract. */
  maxExtractChars?: number;
}

export class PlaywrightBrowserDriver implements BrowserDriver {
  readonly kind = "playwright" as const;

  private readonly headless: boolean;
  private readonly timeoutMs: number;
  private readonly maxExtractChars: number;
  private readonly pageFactory?: () => Promise<PlaywrightPageLike>;
  private readonly launch?: PlaywrightBrowserDriverOptions["launch"];

  private page: PlaywrightPageLike | undefined;
  private disposeLaunch: (() => Promise<void>) | undefined;
  private ownsPage = false;

  constructor(options: PlaywrightBrowserDriverOptions = {}) {
    this.headless = options.headless !== false;
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.maxExtractChars = options.maxExtractChars ?? 20_000;
    this.pageFactory = options.pageFactory;
    this.launch = options.launch;
    if (options.page) {
      this.page = options.page;
      this.ownsPage = false;
    }
  }

  async navigate(url: string): Promise<BrowserDriverActionResult> {
    try {
      const page = await this.ensurePage();
      await page.goto(url, {
        timeout: this.timeoutMs,
        waitUntil: "domcontentloaded",
      });
      return { ok: true, reason: `navigated:${url}`, data: { url } };
    } catch (error) {
      return this.fail("navigate", error);
    }
  }

  async click(
    target: string | undefined,
    payload?: Record<string, unknown>,
  ): Promise<BrowserDriverActionResult> {
    try {
      const page = await this.ensurePage();
      const selector = target ?? (typeof payload?.selector === "string" ? payload.selector : undefined);
      if (!selector) {
        return { ok: false, reason: "click requires a CSS selector target." };
      }
      const button =
        payload?.button === "right" || payload?.button === "middle"
          ? (payload.button as string)
          : "left";
      await page.click(selector, { timeout: this.timeoutMs, button });
      return { ok: true, reason: `clicked:${selector}`, data: { selector } };
    } catch (error) {
      return this.fail("click", error);
    }
  }

  async type(
    target: string | undefined,
    text: string,
    payload?: Record<string, unknown>,
  ): Promise<BrowserDriverActionResult> {
    try {
      const page = await this.ensurePage();
      const selector =
        target ??
        (typeof payload?.selector === "string" ? payload.selector : undefined);

      if (selector) {
        if (typeof page.fill === "function") {
          const clear = payload?.clear !== false;
          if (clear) {
            await page.fill(selector, text, { timeout: this.timeoutMs });
          } else if (typeof page.type === "function") {
            await page.type(selector, text, { timeout: this.timeoutMs });
          } else {
            await page.fill(selector, text, { timeout: this.timeoutMs });
          }
        } else if (page.locator) {
          await page.locator(selector).fill(text, { timeout: this.timeoutMs });
        } else {
          return {
            ok: false,
            reason: "Playwright page does not support fill/type.",
          };
        }
      } else if (typeof page.type === "function") {
        // Type into focused element (Playwright keyboard path is page-specific;
        // without a selector we require fill API via locator body).
        return {
          ok: false,
          reason: "type requires a CSS selector target for sandbox safety.",
        };
      } else {
        return { ok: false, reason: "type requires a CSS selector target." };
      }

      return {
        ok: true,
        reason: `typed:${text.length}`,
        data: { selector, length: text.length },
      };
    } catch (error) {
      return this.fail("type", error);
    }
  }

  async extract(target?: string): Promise<BrowserDriverActionResult> {
    try {
      const page = await this.ensurePage();
      let text: string | null | undefined;

      if (target) {
        if (typeof page.textContent === "function") {
          text = await page.textContent(target, { timeout: this.timeoutMs });
        } else if (page.locator) {
          text = await page.locator(target).textContent({ timeout: this.timeoutMs });
        }
      } else if (typeof page.content === "function") {
        text = await page.content();
      }

      const value = (text ?? "").slice(0, this.maxExtractChars);
      return {
        ok: true,
        reason: "extracted",
        data: { text: value, truncated: (text ?? "").length > this.maxExtractChars },
      };
    } catch (error) {
      return this.fail("extract", error);
    }
  }

  async screenshot(target?: string): Promise<BrowserDriverActionResult> {
    try {
      const page = await this.ensurePage();
      // Element screenshots would need locator; full page for now.
      void target;
      const buffer = await page.screenshot({ fullPage: true, type: "png" });
      const bytes =
        buffer instanceof Buffer
          ? buffer
          : Buffer.from(buffer);
      return {
        ok: true,
        reason: "screenshot",
        data: {
          byteLength: bytes.byteLength,
          // Base64 only for small captures; keep bound to avoid huge payloads.
          ...(bytes.byteLength <= 200_000
            ? { base64Png: bytes.toString("base64") }
            : { base64PngOmitted: true }),
        },
      };
    } catch (error) {
      return this.fail("screenshot", error);
    }
  }

  async dispose(): Promise<void> {
    try {
      if (this.disposeLaunch) {
        await this.disposeLaunch();
      } else if (this.ownsPage && this.page?.close) {
        await this.page.close();
      }
    } catch {
      // best-effort
    } finally {
      this.page = undefined;
      this.disposeLaunch = undefined;
      this.ownsPage = false;
    }
  }

  private async ensurePage(): Promise<PlaywrightPageLike> {
    if (this.page) return this.page;

    if (this.pageFactory) {
      this.page = await this.pageFactory();
      this.ownsPage = true;
      return this.page;
    }

    if (this.launch) {
      const launched = await this.launch();
      this.page = launched.page;
      this.disposeLaunch = launched.dispose;
      this.ownsPage = true;
      return this.page;
    }

    // Dynamic import keeps this module free of static playwright deps for web bundlers.
    const playwrightMod = await import("playwright").catch((error) => {
      throw new Error(
        `Failed to import playwright: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    });

    const chromium = (playwrightMod as { chromium?: { launch: (opts?: object) => Promise<PlaywrightBrowserLike> } })
      .chromium;
    if (!chromium?.launch) {
      throw new Error("playwright.chromium.launch is unavailable.");
    }

    const browser = await chromium.launch({
      headless: this.headless,
      args: ["--disable-blink-features=AutomationControlled"],
    });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    const page = await context.newPage();

    this.page = page;
    this.ownsPage = true;
    this.disposeLaunch = async () => {
      try {
        await context.close?.();
      } catch {
        /* ignore */
      }
      try {
        await browser.close();
      } catch {
        /* ignore */
      }
    };

    return page;
  }

  private fail(action: string, error: unknown): BrowserDriverActionResult {
    const message =
      error instanceof Error ? error.message : String(error ?? "unknown error");
    return { ok: false, reason: `Playwright ${action} failed: ${message}` };
  }
}

export function createPlaywrightBrowserDriver(
  options: PlaywrightBrowserDriverOptions = {},
): PlaywrightBrowserDriver {
  return new PlaywrightBrowserDriver(options);
}
