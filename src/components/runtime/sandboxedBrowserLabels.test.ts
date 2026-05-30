import { describe, expect, it } from "vitest";
import {
  getSandboxedBrowserCapabilityLabel,
  getSandboxedBrowserStatusLabel,
  getSandboxedBrowserStatusTone,
  getSandboxedBrowserSurfaceLabel,
  getSandboxedBrowserNextAction,
  getSandboxedBrowserNoLaunchText,
  getSandboxedBrowserPermissionMatrix,
} from "./sandboxedBrowserLabels";
import type { SandboxedBrowserRequestRecord } from "../../types/sandboxedBrowser";

function makeRecord(overrides: Partial<SandboxedBrowserRequestRecord> = {}): SandboxedBrowserRequestRecord {
  return {
    browserRequestId: "sandboxed-browser-request:test",
    title: "Open website",
    summary: "open this website",
    source: "test",
    surface: "sandboxed_browser",
    capability: "open_url",
    status: "dry_run_only",
    riskLevel: "elevated",
    navigationRisk: "external_unknown",
    credentialBoundary: "no_credentials",
    policyDecision: {} as SandboxedBrowserRequestRecord["policyDecision"],
    provenanceIds: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    metadata: {},
    ...overrides,
  };
}

describe("sandboxedBrowserLabels", () => {
  it("maps labels and tones correctly", () => {
    expect(getSandboxedBrowserSurfaceLabel("sandboxed_browser")).toBe("Sandboxed browser");
    expect(getSandboxedBrowserCapabilityLabel("open_url")).toBe("Open URL");
    expect(getSandboxedBrowserStatusLabel("dry_run_only")).toBe("Dry-run only");
    expect(getSandboxedBrowserStatusTone("blocked")).toBe("danger");
  });

  it("no-launch copy says no launch/read/click/type/submit/scrape/download/upload/automate", () => {
    const text = getSandboxedBrowserNoLaunchText().toLowerCase();
    for (const word of ["launch", "read", "click", "type", "submit", "scrape", "download", "upload", "automate"]) {
      expect(text).toContain(word);
    }
  });

  it("permission matrix blocks login / download / upload / wallet / payment", () => {
    expect(getSandboxedBrowserPermissionMatrix("browser_form", "login").currentState).toBe("blocked");
    expect(getSandboxedBrowserPermissionMatrix("browser_download", "download_file").currentState).toBe("blocked");
    expect(getSandboxedBrowserPermissionMatrix("browser_upload", "upload_file").currentState).toBe("blocked");
    expect(getSandboxedBrowserPermissionMatrix("browser_wallet", "wallet_connect").currentState).toBe("blocked");
    expect(getSandboxedBrowserPermissionMatrix("browser_payment", "payment").currentState).toBe("blocked");
    expect(getSandboxedBrowserPermissionMatrix("sandboxed_browser", "open_url").currentState).toBe("dry_run_only");
  });

  it("next action never says launch / open / click / type / submit", () => {
    for (const status of ["dry_run_only", "waiting_user", "blocked", "proposed", "archived"] as const) {
      const action = getSandboxedBrowserNextAction(makeRecord({ status })).toLowerCase();
      expect(action).not.toMatch(/\blaunch browser\b|\bopen url\b|\bclick the\b|\btype into\b|\bsubmit the form\b/);
    }
  });
});
