/**
 * Real-capable sandbox_browser adapter for BrowserRuntimeRouter.
 *
 * Default: disabled (fail closed). When enabled with an injected BrowserDriver,
 * performs navigate/click/type/extract/screenshot only. Never uses direct-host
 * profiles. Playwright/Electron drivers are injected; this module does not
 * import Playwright at the top level so web/renderer bundles stay safe.
 */

import type {
  BrowserDriver,
  BrowserRuntimeAction,
  BrowserRuntimeAdapter,
  BrowserRuntimeExecutionMetadata,
  BrowserRuntimeRequest,
  BrowserRuntimeRouteResult,
  SandboxPlaywrightBrowserRuntimeAdapterOptions,
} from "../types";

const SUPPORTED_ACTIONS: ReadonlySet<BrowserRuntimeAction> = new Set([
  "navigate",
  "click",
  "type",
  "extract",
  "screenshot",
]);

const DEFAULT_PROTOCOLS = ["http:", "https:"];
const DEFAULT_MAX_TEXT = 10_000;

export class SandboxPlaywrightBrowserRuntimeAdapter implements BrowserRuntimeAdapter {
  readonly lane = "sandbox_browser" as const;
  readonly id: string;

  private readonly enabled: boolean;
  private readonly driver: BrowserDriver | undefined;
  private readonly allowedUrlProtocols: Set<string>;
  private readonly maxTextChars: number;

  constructor(options: SandboxPlaywrightBrowserRuntimeAdapterOptions = {}) {
    this.enabled = options.enabled === true;
    this.id = options.adapterId ?? "sandbox-playwright-browser-runtime";
    this.driver = options.driver;
    this.allowedUrlProtocols = new Set(
      options.allowedUrlProtocols ?? DEFAULT_PROTOCOLS,
    );
    this.maxTextChars = options.maxTextChars ?? DEFAULT_MAX_TEXT;
  }

  canHandle(request: BrowserRuntimeRequest): boolean {
    if (!request || typeof request !== "object") return false;
    // Lane is fixed to sandbox_browser on this adapter; preferredLane is only a
    // router hint and must not block untrusted → sandbox routing.
    return SUPPORTED_ACTIONS.has(request.action);
  }

  async execute(request: BrowserRuntimeRequest): Promise<BrowserRuntimeRouteResult> {
    if (!this.enabled) {
      return this.deny(
        "Sandbox Playwright adapter requires explicit enabled: true.",
        { playwrightCalled: false, browserApisCalled: false, driverKind: "none" },
      );
    }

    if (!this.driver) {
      return this.deny(
        "Sandbox Playwright adapter requires an injected BrowserDriver.",
        { playwrightCalled: false, browserApisCalled: false, driverKind: "none" },
      );
    }

    if (!SUPPORTED_ACTIONS.has(request.action)) {
      return this.deny(`Unsupported browser action: ${request.action}`, {
        playwrightCalled: false,
        browserApisCalled: false,
        driverKind: this.driver.kind,
      });
    }

    try {
      const result = await this.dispatch(request, this.driver);
      if (!result.ok) {
        return this.fail(result.reason ?? "Driver action failed.", this.driver.kind);
      }

      return {
        accepted: true,
        lane: this.lane,
        runtime: "playwright",
        reason: result.reason ?? `Sandbox browser executed ${request.action}.`,
        execution: this.executionMeta({
          realBrowserExecutionEnabled: true,
          playwrightCalled:
            this.driver.kind === "playwright" ||
            this.driver.kind === "injected" ||
            this.driver.kind === "electron_sandbox",
          browserApisCalled: true,
          driverKind: this.driver.kind,
        }),
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error ?? "unknown error");
      return this.fail(`Sandbox browser driver error: ${message}`, this.driver.kind);
    }
  }

  private async dispatch(
    request: BrowserRuntimeRequest,
    driver: BrowserDriver,
  ): Promise<{ ok: boolean; reason?: string }> {
    const payload = request.payload ?? {};
    switch (request.action) {
      case "navigate": {
        const url = request.target;
        if (!url || typeof url !== "string") {
          return { ok: false, reason: "navigate requires a target URL." };
        }
        const protocolError = this.validateUrl(url);
        if (protocolError) return { ok: false, reason: protocolError };
        return driver.navigate(url);
      }
      case "click": {
        return driver.click(request.target, payload);
      }
      case "type": {
        const text =
          typeof payload.text === "string"
            ? payload.text
            : typeof payload.value === "string"
              ? payload.value
              : undefined;
        if (text === undefined) {
          return { ok: false, reason: "type requires payload.text or payload.value." };
        }
        if (text.length > this.maxTextChars) {
          return {
            ok: false,
            reason: `type text exceeds maxTextChars (${this.maxTextChars}).`,
          };
        }
        return driver.type(request.target, text, payload);
      }
      case "extract": {
        return driver.extract(request.target);
      }
      case "screenshot": {
        return driver.screenshot(request.target);
      }
      default:
        return { ok: false, reason: `Unsupported action: ${request.action}` };
    }
  }

  private validateUrl(url: string): string | null {
    try {
      const parsed = new URL(url);
      if (!this.allowedUrlProtocols.has(parsed.protocol)) {
        return `Unsupported URL protocol: ${parsed.protocol}`;
      }
      return null;
    } catch {
      return "Invalid URL target for navigate.";
    }
  }

  private executionMeta(partial: {
    realBrowserExecutionEnabled: boolean;
    playwrightCalled: boolean;
    browserApisCalled: boolean;
    driverKind: BrowserRuntimeExecutionMetadata["driverKind"];
  }): BrowserRuntimeExecutionMetadata {
    return {
      adapterId: this.id,
      realBrowserExecutionEnabled: partial.realBrowserExecutionEnabled,
      playwrightCalled: partial.playwrightCalled,
      browserApisCalled: partial.browserApisCalled,
      systemApisCalled: false,
      directHostAllowed: false,
      driverKind: partial.driverKind,
    };
  }

  private deny(
    reason: string,
    meta: {
      playwrightCalled: boolean;
      browserApisCalled: boolean;
      driverKind: BrowserRuntimeExecutionMetadata["driverKind"];
    },
  ): BrowserRuntimeRouteResult {
    return {
      accepted: false,
      lane: this.lane,
      runtime: "unknown",
      reason,
      execution: this.executionMeta({
        realBrowserExecutionEnabled: this.enabled,
        playwrightCalled: meta.playwrightCalled,
        browserApisCalled: meta.browserApisCalled,
        driverKind: meta.driverKind,
      }),
    };
  }

  private fail(
    reason: string,
    driverKind: BrowserRuntimeExecutionMetadata["driverKind"],
  ): BrowserRuntimeRouteResult {
    return {
      accepted: false,
      lane: this.lane,
      runtime: "playwright",
      reason,
      execution: this.executionMeta({
        realBrowserExecutionEnabled: true,
        playwrightCalled: driverKind === "playwright" || driverKind === "injected",
        browserApisCalled: true,
        driverKind,
      }),
    };
  }
}
