import { describe, expect, it } from "vitest";
import {
  CATEGORY_SECURITY_FLOOR,
  MissionScope,
  SecurityLevel,
  ToolRegistry,
} from "./toolRegistry";
import type { FunctionDeclaration } from "@google/generative-ai";

function fakeTool(name: string): FunctionDeclaration {
  return { name, description: `fake ${name}`, parameters: undefined } as unknown as FunctionDeclaration;
}

describe("category security floor for tools without an explicit config", () => {
  it("floors an unlisted HACKING tool to biometric / SYSTEM", () => {
    // No TOOL_CONFIGS entry: before this floor it would have registered at
    // LEVEL_0 and executed with no confirmation at all.
    ToolRegistry.register(fakeTool("fakeExploitScan"), "HACKING");
    expect(ToolRegistry.getSecurityLevel("fakeExploitScan")).toBe(SecurityLevel.LEVEL_2);
    expect(ToolRegistry.getMissionScope("fakeExploitScan")).toBe(MissionScope.SYSTEM);
  });

  it("floors an unlisted CRYPTO tool to session / FINANCE", () => {
    ToolRegistry.register(fakeTool("fakeCryptoThing"), "CRYPTO");
    expect(ToolRegistry.getSecurityLevel("fakeCryptoThing")).toBe(SecurityLevel.LEVEL_1);
    expect(ToolRegistry.getMissionScope("fakeCryptoThing")).toBe(MissionScope.FINANCE);
  });

  it("floors an unlisted messaging tool to session / SOCIAL", () => {
    ToolRegistry.register(fakeTool("fakeSocialBlast"), "WHATSAPP");
    expect(ToolRegistry.getSecurityLevel("fakeSocialBlast")).toBe(SecurityLevel.LEVEL_1);
    expect(ToolRegistry.getMissionScope("fakeSocialBlast")).toBe(MissionScope.SOCIAL);
  });

  it("leaves an unlisted SYSTEM tool at LEVEL_0 — SYSTEM is the default bucket, not a danger signal", () => {
    ToolRegistry.register(fakeTool("fakeMiscSystemThing"), "SYSTEM");
    expect(ToolRegistry.getSecurityLevel("fakeMiscSystemThing")).toBe(SecurityLevel.LEVEL_0);
    expect(ToolRegistry.getMissionScope("fakeMiscSystemThing")).toBe(MissionScope.NONE);
  });

  it("leaves an unlisted CORE tool at LEVEL_0", () => {
    ToolRegistry.register(fakeTool("fakeCoreThing"), "CORE");
    expect(ToolRegistry.getSecurityLevel("fakeCoreThing")).toBe(SecurityLevel.LEVEL_0);
  });

  it("lets an explicit TOOL_CONFIGS entry win over the category floor", () => {
    // whatsapp_message is explicitly LEVEL_1/SOCIAL; registering it under a
    // higher-floor category must not raise it — the explicit decision governs.
    ToolRegistry.register(fakeTool("whatsapp_message"), "HACKING");
    expect(ToolRegistry.getSecurityLevel("whatsapp_message")).toBe(SecurityLevel.LEVEL_1);
    expect(ToolRegistry.getMissionScope("whatsapp_message")).toBe(MissionScope.SOCIAL);
  });

  it("only floors the three unambiguously-dangerous categories", () => {
    // Guards against scope creep: adding a floor for a broad/noisy category
    // (e.g. SYSTEM or OSINT) would over-prompt and should be a deliberate change.
    expect(Object.keys(CATEGORY_SECURITY_FLOOR).sort()).toEqual([
      "CRYPTO",
      "HACKING",
      "WHATSAPP",
    ]);
  });
});
