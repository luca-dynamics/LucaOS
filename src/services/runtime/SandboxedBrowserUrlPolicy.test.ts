import { describe, expect, it, vi } from "vitest";
import {
  classifyUrlRisk,
  isBlockedBrowserUrl,
  normalizeSandboxedBrowserUrl,
  redactUrlForAudit,
  validateSandboxedBrowserUrl,
} from "./SandboxedBrowserUrlPolicy";

describe("SandboxedBrowserUrlPolicy", () => {
  it("allows a simple https URL", () => {
    const result = validateSandboxedBrowserUrl("https://example.com");
    expect(result.allowed).toBe(true);
    expect(result.normalizedUrl).toBe("https://example.com/");
    expect(result.riskLevel).toBe("low");
    expect(result.blockedBy).toHaveLength(0);
  });

  it("normalizes surrounding whitespace and wrapping characters", () => {
    expect(normalizeSandboxedBrowserUrl("  https://example.com/path  ")).toBe("https://example.com/path");
    expect(normalizeSandboxedBrowserUrl("<https://example.com>")).toBe("https://example.com/");
    const result = validateSandboxedBrowserUrl("   https://example.com   ");
    expect(result.allowed).toBe(true);
  });

  it("blocks dangerous schemes", () => {
    for (const url of [
      "javascript:alert(1)",
      "data:text/html,<script>1</script>",
      "file:///etc/passwd",
      "blob:https://example.com/abc",
      "chrome://settings",
      "about:blank",
      "devtools://devtools",
      "ftp://example.com/file",
    ]) {
      const result = validateSandboxedBrowserUrl(url);
      expect(result.allowed, url).toBe(false);
      expect(result.blockedBy).toContain("blocked_scheme");
    }
  });

  it("blocks URLs with embedded username/password", () => {
    const result = validateSandboxedBrowserUrl("https://user:pass@example.com");
    expect(result.allowed).toBe(false);
    expect(result.blockedBy).toContain("embedded_credentials");
  });

  it("blocks secret-like query/hash params", () => {
    for (const url of [
      "https://example.com?token=abc",
      "https://example.com?access_token=abc",
      "https://example.com?password=abc",
      "https://example.com?api_key=abc",
      "https://example.com?secret=abc",
      "https://example.com?session=abc",
      "https://example.com?cookie=abc",
      "https://example.com?auth=abc",
      "https://example.com#code=abc",
    ]) {
      const result = validateSandboxedBrowserUrl(url);
      expect(result.allowed, url).toBe(false);
      expect(result.blockedBy).toContain("secret_like_params");
    }
  });

  it("blocks wallet/payment/checkout/swap/trade/sign/transaction routes", () => {
    for (const url of [
      "https://example.com/wallet",
      "https://example.com/payment",
      "https://example.com/checkout",
      "https://example.com/swap",
      "https://example.com/trade",
      "https://example.com/sign",
      "https://example.com/transaction",
    ]) {
      const result = validateSandboxedBrowserUrl(url);
      expect(result.allowed, url).toBe(false);
      expect(result.blockedBy).toContain("wallet_or_payment_route");
    }
  });

  it("blocks download/upload/file routes", () => {
    for (const url of [
      "https://example.com/download",
      "https://example.com/upload",
      "https://example.com/attachment",
      "https://example.com/installer.exe",
    ]) {
      const result = validateSandboxedBrowserUrl(url);
      expect(result.allowed, url).toBe(false);
      expect(result.blockedBy).toContain("download_or_upload_route");
    }
  });

  it("blocks empty and invalid URLs", () => {
    expect(validateSandboxedBrowserUrl("").blockedBy).toContain("empty_url");
    expect(validateSandboxedBrowserUrl("not a url").allowed).toBe(false);
  });

  it("redacts query and hash in the audit URL", () => {
    expect(redactUrlForAudit("https://example.com/p?token=abc#frag")).toBe("https://example.com/p?[redacted]#[redacted]");
    const result = validateSandboxedBrowserUrl("https://example.com/page?token=secret");
    expect(result.auditUrl).not.toContain("secret");
    expect(result.auditUrl).toContain("[redacted]");
  });

  it("classifies risk by string only", () => {
    expect(classifyUrlRisk("https://example.com")).toBe("low");
    expect(classifyUrlRisk("javascript:alert(1)")).toBe("critical");
    expect(classifyUrlRisk("https://example.com/wallet")).toBe("critical");
  });

  it("isBlockedBrowserUrl mirrors validation", () => {
    expect(isBlockedBrowserUrl("https://example.com")).toBe(false);
    expect(isBlockedBrowserUrl("javascript:alert(1)")).toBe(true);
  });

  it("never fetches the network", () => {
    const fetchSpy = vi.fn();
    const original = (globalThis as { fetch?: unknown }).fetch;
    (globalThis as { fetch?: unknown }).fetch = fetchSpy;
    try {
      validateSandboxedBrowserUrl("https://example.com/page?token=secret");
      normalizeSandboxedBrowserUrl("https://example.com");
      classifyUrlRisk("https://example.com");
      redactUrlForAudit("https://example.com");
    } finally {
      (globalThis as { fetch?: unknown }).fetch = original;
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
