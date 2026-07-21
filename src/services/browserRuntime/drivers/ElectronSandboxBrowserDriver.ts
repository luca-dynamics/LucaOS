/**
 * Electron sandbox IPC BrowserDriver.
 *
 * Speaks the same plan shape as `platforms/electron/sandbox/sandboxBrowserController.cjs`:
 * luca-browser plans with semantic role/name actions (not arbitrary CSS selectors).
 *
 * Requires an injected `invoke` (e.g. ipcRenderer.invoke bound from preload).
 * Does not import Electron or Playwright.
 */

import type {
  BrowserDriver,
  BrowserDriverActionResult,
} from "../types";

const ALLOWED_ROLES = new Set([
  "button",
  "link",
  "textbox",
  "checkbox",
  "radio",
  "combobox",
]);

export type ElectronSandboxInvoke = (
  channel: string,
  ...args: unknown[]
) => Promise<unknown>;

export interface ElectronSandboxBrowserDriverOptions {
  /** ipcRenderer.invoke-compatible function. */
  invoke: ElectronSandboxInvoke;
  /** Existing sandbox session id, or omit to create one via sandbox:create. */
  sessionId?: string;
  /** Default page URL when actions run without a prior navigate. */
  defaultUrl?: string;
  timeoutMs?: number;
  /** Capability list for sandbox:create. */
  createCapabilities?: string[];
}

type SemanticAction =
  | { type: "click"; role: string; name: string }
  | { type: "fill"; role: string; name: string; value: string };

export class ElectronSandboxBrowserDriver implements BrowserDriver {
  readonly kind = "electron_sandbox" as const;

  private readonly invoke: ElectronSandboxInvoke;
  private readonly timeoutMs: number;
  private readonly createCapabilities: string[];
  private sessionId: string | undefined;
  private currentUrl: string | undefined;

  constructor(options: ElectronSandboxBrowserDriverOptions) {
    if (typeof options.invoke !== "function") {
      throw new Error("ElectronSandboxBrowserDriver requires invoke().");
    }
    this.invoke = options.invoke;
    this.sessionId = options.sessionId;
    this.currentUrl = options.defaultUrl;
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.createCapabilities = options.createCapabilities ?? ["browser"];
  }

  async navigate(url: string): Promise<BrowserDriverActionResult> {
    try {
      this.assertHttpUrl(url);
      this.currentUrl = url;
      await this.runPlan({ url, actions: [] });
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
      const action = this.toSemanticClick(target, payload);
      const url = this.requireUrl(payload);
      await this.runPlan({ url, actions: [action] });
      return {
        ok: true,
        reason: `clicked:${action.role}:${action.name}`,
        data: { role: action.role, name: action.name },
      };
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
      const action = this.toSemanticFill(target, text, payload);
      const url = this.requireUrl(payload);
      await this.runPlan({ url, actions: [action] });
      return {
        ok: true,
        reason: `typed:${text.length}`,
        data: { role: action.role, name: action.name, length: text.length },
      };
    } catch (error) {
      return this.fail("type", error);
    }
  }

  async extract(target?: string): Promise<BrowserDriverActionResult> {
    // luca-browser plan returns process output; extract text is not a first-class
    // controller action yet — surface explicit unsupported for honesty.
    void target;
    return {
      ok: false,
      reason:
        "Electron sandbox driver does not support extract yet; use PlaywrightBrowserDriver.",
    };
  }

  async screenshot(target?: string): Promise<BrowserDriverActionResult> {
    void target;
    return {
      ok: false,
      reason:
        "Electron sandbox driver does not support screenshot yet; use PlaywrightBrowserDriver.",
    };
  }

  async dispose(): Promise<void> {
    if (!this.sessionId) return;
    try {
      await this.invoke("sandbox:destroy", this.sessionId);
    } catch {
      // best-effort
    } finally {
      this.sessionId = undefined;
    }
  }

  private async ensureSession(): Promise<string> {
    if (this.sessionId) return this.sessionId;
    const created = (await this.invoke("sandbox:create", {
      capabilities: this.createCapabilities,
    })) as { sessionId?: string; id?: string } | string | null;

    const id =
      typeof created === "string"
        ? created
        : created?.sessionId ?? created?.id;

    if (!id || typeof id !== "string") {
      throw new Error(
        "sandbox:create did not return a session id for Electron sandbox browser.",
      );
    }
    this.sessionId = id;
    return id;
  }

  private async runPlan(plan: {
    url: string;
    actions: SemanticAction[];
  }): Promise<unknown> {
    const sessionId = await this.ensureSession();
    const timeoutMs = Math.min(Math.max(this.timeoutMs, 1_000), 120_000);
    const encoded = Buffer.from(
      JSON.stringify({
        url: plan.url,
        actions: plan.actions,
        timeoutMs,
        maxTextChars: 20_000,
      }),
      "utf8",
    ).toString("base64url");

    return this.invoke("sandbox:execute", sessionId, {
      executable: "/usr/local/bin/luca-browser",
      args: [encoded],
      timeoutMs: timeoutMs + 5_000,
    });
  }

  private requireUrl(payload?: Record<string, unknown>): string {
    const fromPayload =
      typeof payload?.url === "string" ? payload.url : undefined;
    const url = fromPayload ?? this.currentUrl;
    if (!url) {
      throw new Error(
        "Electron sandbox actions require a prior navigate() or payload.url.",
      );
    }
    this.assertHttpUrl(url);
    return url;
  }

  private assertHttpUrl(url: string): void {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error(`Invalid URL: ${url}`);
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error(`Unsupported URL protocol: ${parsed.protocol}`);
    }
  }

  private toSemanticClick(
    target: string | undefined,
    payload?: Record<string, unknown>,
  ): SemanticAction {
    const role =
      typeof payload?.role === "string" ? payload.role : "button";
    const name =
      typeof payload?.name === "string"
        ? payload.name
        : typeof payload?.accessibleName === "string"
          ? payload.accessibleName
          : target;

    if (!name || !name.trim()) {
      throw new Error(
        "Electron sandbox click requires payload.name (or target as accessible name), not a raw CSS-only selector without name.",
      );
    }
    if (!ALLOWED_ROLES.has(role)) {
      throw new Error(`Electron sandbox click role not allowed: ${role}`);
    }
    return { type: "click", role, name: name.slice(0, 200) };
  }

  private toSemanticFill(
    target: string | undefined,
    text: string,
    payload?: Record<string, unknown>,
  ): SemanticAction {
    const role =
      typeof payload?.role === "string" ? payload.role : "textbox";
    const name =
      typeof payload?.name === "string"
        ? payload.name
        : typeof payload?.accessibleName === "string"
          ? payload.accessibleName
          : target;

    if (!name || !name.trim()) {
      throw new Error(
        "Electron sandbox type/fill requires payload.name (accessible name).",
      );
    }
    if (!ALLOWED_ROLES.has(role)) {
      throw new Error(`Electron sandbox fill role not allowed: ${role}`);
    }
    return {
      type: "fill",
      role,
      name: name.slice(0, 200),
      value: text.slice(0, 10_000),
    };
  }

  private fail(action: string, error: unknown): BrowserDriverActionResult {
    const message =
      error instanceof Error ? error.message : String(error ?? "unknown error");
    return { ok: false, reason: `Electron sandbox ${action} failed: ${message}` };
  }
}

export function createElectronSandboxBrowserDriver(
  options: ElectronSandboxBrowserDriverOptions,
): ElectronSandboxBrowserDriver {
  return new ElectronSandboxBrowserDriver(options);
}
