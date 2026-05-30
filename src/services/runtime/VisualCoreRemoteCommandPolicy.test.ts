import { describe, expect, it } from "vitest";
import {
  classifyVisualCoreRemoteCommand,
  evaluateVisualCoreRemoteCommand,
  getVisualCoreRemoteCommandBoundaryLabels,
  getVisualCoreRemoteCommandUserSafeReason,
  toVisualCoreAuditSafeUrl,
} from "./VisualCoreRemoteCommandPolicy";

describe("VisualCoreRemoteCommandPolicy", () => {
  it("classifies BROWSER_NAVIGATE as elevated risk + allowed_record_only (governed adapter)", () => {
    const decision = evaluateVisualCoreRemoteCommand({
      type: "BROWSER_NAVIGATE",
      value: "https://example.com/page",
    });
    expect(decision.kind).toBe("BROWSER_NAVIGATE");
    expect(decision.riskLevel).toBe("elevated");
    expect(decision.status).toBe("allowed_record_only");
    expect(decision.blockedBy).toBeUndefined();
    expect(decision.targetAuditUrl).toBe("https://example.com/page");
  });

  it("allows SET_MODE to low-risk display modes as record-only", () => {
    for (const mode of ["IDLE", "DATA", "REPORTS"]) {
      const decision = evaluateVisualCoreRemoteCommand({ type: "SET_MODE", value: mode });
      expect(decision.status).toBe("allowed_record_only");
      expect(decision.riskLevel).toBe("low");
      expect(decision.targetMode).toBe(mode);
    }
  });

  it("holds or blocks SET_MODE to sensitive modes", () => {
    for (const mode of ["VISION", "RECORDER", "FILES", "WIRELESS", "HACKING"]) {
      const decision = evaluateVisualCoreRemoteCommand({ type: "SET_MODE", value: mode });
      expect(["needs_approval", "blocked"]).toContain(decision.status);
      expect(decision.status).not.toBe("allowed_record_only");
    }
  });

  it("only allows SHOW_DISPLAY for low-risk display target modes", () => {
    const allowed = evaluateVisualCoreRemoteCommand({ type: "SHOW_DISPLAY", mode: "DATA" });
    expect(allowed.status).toBe("allowed_record_only");

    const heldNoTarget = evaluateVisualCoreRemoteCommand({ type: "SHOW_DISPLAY" });
    expect(heldNoTarget.status).toBe("needs_approval");

    const heldSensitive = evaluateVisualCoreRemoteCommand({ type: "SHOW_DISPLAY", mode: "VISION" });
    expect(heldSensitive.status).toBe("needs_approval");
  });

  it("requires a dedicated policy for CAST_SELECT", () => {
    const decision = evaluateVisualCoreRemoteCommand({ type: "CAST_SELECT", value: "tv-1" });
    expect(decision.riskLevel).toBe("high");
    expect(["blocked", "needs_approval"]).toContain(decision.status);
    expect(decision.blockedBy?.join(" ")).toMatch(/dedicated_device_cast_policy/);
  });

  it("records SYNC_APP_STATE and WIDGET_VOICE_DATA as record-only telemetry", () => {
    for (const kind of ["SYNC_APP_STATE", "WIDGET_VOICE_DATA"] as const) {
      const decision = evaluateVisualCoreRemoteCommand({ kind });
      expect(decision.status).toBe("allowed_record_only");
      expect(decision.riskLevel).toBe("low");
    }
  });

  it("records VISUAL_CORE_INTERACTION as record-only feedback", () => {
    const decision = evaluateVisualCoreRemoteCommand({ kind: "VISUAL_CORE_INTERACTION" });
    expect(decision.status).toBe("allowed_record_only");
  });

  it("blocks unknown commands", () => {
    const decision = evaluateVisualCoreRemoteCommand({ type: "DO_SOMETHING_WEIRD" });
    expect(decision.kind).toBe("UNKNOWN");
    expect(decision.status).toBe("blocked");
    expect(decision.blockedBy?.[0]).toBe("unknown_remote_command");
  });

  it("redacts token/password/session-like query params in audit URLs", () => {
    const audit = toVisualCoreAuditSafeUrl(
      "https://site.test/dashboard?token=SUPERSECRET&password=hunter2&session=abc123&view=grid#access_token=zzz",
    );
    expect(audit).toBeDefined();
    expect(audit).toContain("https://site.test/dashboard");
    expect(audit).not.toMatch(/SUPERSECRET/);
    expect(audit).not.toMatch(/hunter2/);
    expect(audit).not.toMatch(/abc123/);
    // Hash fragment (which can carry tokens) is dropped entirely.
    expect(audit).not.toMatch(/zzz/);
    expect(audit).not.toMatch(/#/);
    // Non-sensitive params are preserved.
    expect(audit).toMatch(/view=grid/);
  });

  it("never stores a raw URL for BROWSER_NAVIGATE classification", () => {
    const { targetAuditUrl } = classifyVisualCoreRemoteCommand({
      type: "BROWSER_NAVIGATE",
      value: "https://bank.test/login?password=secretpw",
    });
    expect(targetAuditUrl).toBeDefined();
    expect(targetAuditUrl).not.toMatch(/secretpw/);
  });

  it("exposes fixed boundary labels and a consistent user-safe reason", () => {
    const labels = getVisualCoreRemoteCommandBoundaryLabels();
    expect(labels).toContain("Remote command audit only");
    expect(labels).toContain("Browser navigation governed via LucaBrowser adapter");

    const reason = getVisualCoreRemoteCommandUserSafeReason({
      kind: "SET_MODE",
      status: "allowed_record_only",
      riskLevel: "low",
      targetMode: "DATA",
    });
    expect(reason).toMatch(/record/i);
    expect(reason).toMatch(/DATA/);
  });
});
