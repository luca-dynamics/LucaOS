import { describe, expect, it } from "vitest";
import {
  blockIfSecretLike,
  classifyGatewayIntent,
  sanitizeGatewayInput,
} from "./BrowserDesktopGatewayPolicy";

describe("BrowserDesktopGatewayPolicy", () => {
  it("classifies screen observe as elevated dry-run only with safeguards", () => {
    const decision = classifyGatewayIntent({ message: "look at my screen" });
    expect(decision.surface).toBe("screen");
    expect(decision.capability).toBe("observe_screen");
    expect(decision.riskLevel).toBe("elevated");
    expect(decision.allowedForDryRun).toBe(true);
    expect(decision.allowedForExecution).toBe(false);
    expect(decision.requiresApproval).toBe(true);
    expect(decision.requiresSandbox).toBe(true);
    expect(decision.requiresHumanConfirmation).toBe(true);
  });

  it("classifies browser click/type/submit as high risk with execution disabled", () => {
    expect(classifyGatewayIntent({ message: "click this browser button" }).riskLevel).toBe("high");
    expect(classifyGatewayIntent({ message: "type into browser" }).capability).toBe("browser_type");
    const submit = classifyGatewayIntent({ message: "submit the browser form" });
    expect(submit.capability).toBe("browser_submit");
    expect(submit.allowedForExecution).toBe(false);
  });

  it("blocks browser login and requires credential boundary", () => {
    const decision = classifyGatewayIntent({ message: "login to the website with my password" });
    expect(decision.capability).toBe("browser_login");
    expect(decision.riskLevel).toBe("critical");
    expect(decision.allowedForDryRun).toBe(false);
    expect(decision.blockedBy).toContain("secret_like_input");
    expect(decision.requiresCredentialBoundary).toBe(true);
  });

  it("classifies desktop click/type and app launch as high risk", () => {
    expect(classifyGatewayIntent({ message: "click on desktop" }).capability).toBe("desktop_click");
    expect(classifyGatewayIntent({ message: "type on desktop" }).riskLevel).toBe("high");
    expect(classifyGatewayIntent({ message: "launch app Chrome" }).capability).toBe("desktop_open_app");
  });

  it("classifies file, network, wallet, and MCP requests without execution", () => {
    expect(classifyGatewayIntent({ message: "read file config" }).riskLevel).toBe("high");
    expect(classifyGatewayIntent({ message: "write file config" }).blockedBy).toContain("blocked_capability:file_write");
    expect(classifyGatewayIntent({ message: "delete file config" }).blockedBy).toContain("blocked_capability:file_delete");
    expect(classifyGatewayIntent({ message: "make an API call" }).capability).toBe("network_request");
    expect(classifyGatewayIntent({ message: "send wallet transaction" }).blockedBy).toContain("blocked_capability:wallet_transaction");
    expect(classifyGatewayIntent({ message: "MCP call the tool" }).capability).toBe("mcp_call");
  });

  it("redacts secret-like input and always disables execution", () => {
    expect(blockIfSecretLike("token=abc123")).toBe(true);
    const sanitized = sanitizeGatewayInput({ message: "open https://x.test?token=abc123", metadata: { apiKey: "abc123" } });
    expect(sanitized.message).toContain("[redacted-url]");
    expect(Object.values(sanitized.metadata)).toContain("[redacted]");
    expect(classifyGatewayIntent({ message: "open https://x.test?token=abc123" }).allowedForExecution).toBe(false);
  });
});
