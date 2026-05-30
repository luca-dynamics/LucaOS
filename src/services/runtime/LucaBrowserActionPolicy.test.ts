import { describe, expect, it } from "vitest";
import {
  classifyLucaBrowserAction,
  detectCredentialLikeText,
  evaluateLucaBrowserActionRequest,
  sanitizeBrowserActionInput,
} from "./LucaBrowserActionPolicy";
import { MAX_LUCA_BROWSER_TYPED_TEXT_PREVIEW } from "../../types/lucaBrowserActions";

describe("LucaBrowserActionPolicy", () => {
  it("treats propose_click as eligible for future execution but never executable", () => {
    const decision = evaluateLucaBrowserActionRequest({ kind: "propose_click", targetDescriptor: "the search button" });
    expect(decision.allowedForExecution).toBe(false);
    expect(decision.allowedForFutureHumanConfirmedExecution).toBe(true);
    expect(decision.requiresHumanConfirmation).toBe(true);
    expect(decision.blockedBy).toHaveLength(0);
  });

  it("treats non-secret propose_type as eligible but never executable", () => {
    const decision = evaluateLucaBrowserActionRequest({ kind: "propose_type", typedText: "hello world" });
    expect(decision.allowedForExecution).toBe(false);
    expect(decision.allowedForFutureHumanConfirmedExecution).toBe(true);
    expect(decision.blockedBy).toHaveLength(0);
  });

  it("blocks propose_type when typed text is credential-like", () => {
    for (const secret of ["my password is hunter2", "seed phrase: abandon ability able about above absent absorb abstract absurd abuse access accident", "api_key=EXAMPLEPLACEHOLDERtokenABCDEFGHIJKLMNOP"]) {
      const decision = evaluateLucaBrowserActionRequest({ kind: "propose_type", typedText: secret });
      expect(decision.allowedForFutureHumanConfirmedExecution).toBe(false);
      expect(decision.riskLevel).toBe("critical");
      expect(decision.blockedBy).toContain("credential_like_text");
    }
  });

  it("blocks submit/login/payment/wallet/download/upload kinds", () => {
    for (const kind of ["submit_form", "login", "enter_password", "payment", "checkout", "wallet_connect", "wallet_transaction", "download", "upload", "file_attach"] as const) {
      const decision = evaluateLucaBrowserActionRequest({ kind });
      expect(decision.allowedForExecution).toBe(false);
      expect(decision.allowedForFutureHumanConfirmedExecution).toBe(false);
      expect(decision.blockedBy.length).toBeGreaterThan(0);
    }
  });

  it("blocks DOM/scrape/screenshot/OCR/script kinds", () => {
    for (const kind of ["read_dom", "scrape", "screenshot", "ocr", "execute_script"] as const) {
      const decision = evaluateLucaBrowserActionRequest({ kind });
      expect(decision.allowedForFutureHumanConfirmedExecution).toBe(false);
      expect(decision.blockedBy).toContain(`blocked_kind:${kind}`);
    }
  });

  it("blocks allowed kinds that carry payment/wallet/login/dom context", () => {
    const payment = evaluateLucaBrowserActionRequest({ kind: "propose_click", targetDescriptor: "the connect wallet button" });
    expect(payment.allowedForFutureHumanConfirmedExecution).toBe(false);
    expect(payment.blockedBy).toContain("payment_or_wallet_context");

    const login = evaluateLucaBrowserActionRequest({ kind: "propose_click", context: "click to sign in" });
    expect(login.allowedForFutureHumanConfirmedExecution).toBe(false);
    expect(login.blockedBy).toContain("login_or_submit_context");

    const dom = evaluateLucaBrowserActionRequest({ kind: "propose_scroll", context: "scroll then scrape the page" });
    expect(dom.allowedForFutureHumanConfirmedExecution).toBe(false);
    expect(dom.blockedBy).toContain("dom_scrape_or_capture_context");
  });

  it("classifies lifecycle proposals as low risk and click/type as elevated", () => {
    expect(classifyLucaBrowserAction({ kind: "propose_back" })).toBe("low");
    expect(classifyLucaBrowserAction({ kind: "propose_refresh" })).toBe("low");
    expect(classifyLucaBrowserAction({ kind: "propose_click", targetDescriptor: "a link" })).toBe("elevated");
    expect(classifyLucaBrowserAction({ kind: "propose_type", typedText: "search term" })).toBe("elevated");
  });

  it("every decision keeps execution false and human confirmation true", () => {
    for (const kind of ["propose_click", "propose_type", "propose_scroll", "propose_back", "submit_form", "login", "payment", "read_dom", "screenshot"] as const) {
      const decision = evaluateLucaBrowserActionRequest({ kind });
      expect(decision.allowedForExecution).toBe(false);
      expect(decision.requiresHumanConfirmation).toBe(true);
      expect(decision.requiresAuditLog).toBe(true);
      expect(decision.automationEnabled).toBe(false);
      expect(decision.domReadEnabled).toBe(false);
      expect(decision.credentialsEnabled).toBe(false);
    }
  });

  it("detectCredentialLikeText flags secrets and ignores plain text", () => {
    expect(detectCredentialLikeText("password: abc")).toBe(true);
    expect(detectCredentialLikeText("4111 1111 1111 1111")).toBe(true);
    expect(detectCredentialLikeText("just a normal sentence")).toBe(false);
    expect(detectCredentialLikeText(undefined)).toBe(false);
  });

  it("sanitizeBrowserActionInput caps length and drops credential-like text", () => {
    expect(sanitizeBrowserActionInput("  hello   world  ")).toBe("hello world");
    expect(sanitizeBrowserActionInput("my password is 12345")).toBeUndefined();
    const long = Array.from({ length: 60 }, (_, i) => `word${i}`).join(" ");
    const out = sanitizeBrowserActionInput(long);
    expect(typeof out).toBe("string");
    expect((out as string).length).toBeLessThanOrEqual(MAX_LUCA_BROWSER_TYPED_TEXT_PREVIEW);
  });
});
