import { describe, expect, it } from "vitest";
import {
  evaluateSandboxedBrowserRequest,
  classifySandboxedBrowserIntent,
} from "./SandboxedBrowserPolicy";

function evaluate(message: string) {
  return evaluateSandboxedBrowserRequest({ message, source: "test" });
}

describe("SandboxedBrowserPolicy", () => {
  it("treats open URL / navigate as dry-run or waiting-user with launch & automation false", () => {
    const decision = evaluate("open this website and navigate to the homepage");
    expect(decision.capability === "open_url" || decision.capability === "navigate").toBe(true);
    expect(decision.allowedForLaunch).toBe(false);
    expect(decision.allowedForAutomation).toBe(false);
    expect(decision.blockedBy).toHaveLength(0);
    expect(decision.allowedForDryRun).toBe(true);
  });

  it("treats click/type/submit as high risk, automation disabled, dry-run only at most", () => {
    for (const message of ["click this button", "type into this field", "submit this form"]) {
      const decision = evaluate(message);
      expect(decision.riskLevel).toBe("high");
      expect(decision.allowedForAutomation).toBe(false);
      expect(decision.allowedForLaunch).toBe(false);
      // High risk is never auto-dry-run; never executable.
      expect(decision.allowedForDryRun).toBe(false);
    }
  });

  it("blocks login / password entry with a credential boundary", () => {
    const decision = evaluate("log in and enter my password");
    expect(decision.capability).toBe("login");
    expect(decision.blockedBy).toContain("login_credentials_blocked");
    expect(decision.credentialBoundary).toBe("credential_like_blocked");
    expect(decision.riskLevel).toBe("critical");
  });

  it("disables DOM reading and scraping", () => {
    for (const message of ["read the DOM of this page", "scrape this page"]) {
      const decision = evaluate(message);
      expect(decision.allowedForDomRead).toBe(false);
      expect(decision.blockedBy).toContain("dom_reading_disabled");
    }
  });

  it("blocks download and upload", () => {
    expect(evaluate("download this file").blockedBy).toContain("download_blocked");
    expect(evaluate("upload this file").blockedBy).toContain("upload_blocked");
  });

  it("blocks payment and wallet actions", () => {
    expect(evaluate("checkout and pay now").blockedBy).toContain("payment_blocked");
    expect(evaluate("connect wallet").blockedBy).toContain("wallet_blocked");
    expect(evaluate("sign this wallet transaction").blockedBy).toContain("wallet_blocked");
  });

  it("blocks secret-like URLs / tokens", () => {
    const decision = evaluate("open https://x.test?api_key=sk-abcdefghij1234567890");
    expect(decision.blockedBy).toContain("secret_like_content");
    expect(decision.riskLevel).toBe("critical");
    expect(decision.navigationRisk).toBe("credential_or_secret");
  });

  it("keeps launch / automation / DOM / network disabled on every decision", () => {
    for (const message of ["open url", "click", "login", "scrape page", "download", "connect wallet", "checkout"]) {
      const decision = evaluate(message);
      expect(decision.allowedForLaunch).toBe(false);
      expect(decision.allowedForAutomation).toBe(false);
      expect(decision.allowedForDomRead).toBe(false);
      expect(decision.allowedForNetworkRequest).toBe(false);
    }
  });

  it("requires approval, visible boundary, sandbox, human confirmation, audit, revocation on every decision", () => {
    const decision = classifySandboxedBrowserIntent({ message: "open website", source: "test" });
    expect(decision.requiresExplicitApproval).toBe(true);
    expect(decision.requiresVisibleBrowserBoundary).toBe(true);
    expect(decision.requiresSandbox).toBe(true);
    expect(decision.requiresHumanConfirmation).toBe(true);
    expect(decision.requiresCredentialBoundary).toBe(true);
    expect(decision.requiresAuditLog).toBe(true);
    expect(decision.requiresDownloadUploadBlock).toBe(true);
    expect(decision.requiresWalletPaymentBlock).toBe(true);
    expect(decision.revocable).toBe(true);
  });
});
