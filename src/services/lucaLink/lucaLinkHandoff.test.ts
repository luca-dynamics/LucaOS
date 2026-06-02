import { describe, expect, it, vi } from "vitest";
import {
  approveLucaLinkHandoff,
  cancelLucaLinkHandoff,
  clearLucaLinkHandoffRegistry,
  createArtifactHandoffPayload,
  createConversationHandoffPayload,
  createLucaLinkHandoffPayloadPreview,
  createLucaLinkHandoffRegistry,
  createLucaLinkHandoffRequest,
  createMemoryIntentHandoffPayload,
  createMissionHandoffPayload,
  createModelContextHandoffPayload,
  createSettingsContextHandoffPayload,
  declineLucaLinkHandoff,
  evaluateLucaLinkHandoffPolicy,
  expireLucaLinkHandoffs,
  getLucaLinkHandoff,
  listLucaLinkHandoffs,
  listPendingLucaLinkHandoffs,
  markLucaLinkHandoffAccepted,
  markLucaLinkHandoffReceived,
  markLucaLinkHandoffSent,
  redactLucaLinkHandoffSecrets,
  registerLucaLinkHandoff,
  sanitizeLucaLinkHandoffPayload,
  summarizeLucaLinkHandoffRegistry,
} from "./lucaLinkHandoff";
import { createTrustedDeviceRecord } from "./lucaLinkDeviceTrustRegistry";

const NOW = 1_700_000_000_000;

function trustedDevice(deviceId = "phone") {
  return createTrustedDeviceRecord({ deviceId, deviceType: "mobile", trustLevel: "trusted", status: "connected" }, { now: NOW });
}

describe("LucaLink handoff registry", () => {
  it("creates a registry with conservative defaults", () => {
    const registry = createLucaLinkHandoffRegistry({ now: NOW });
    expect(registry.requests).toEqual([]);
    expect(registry.defaultTtlMs).toBe(10 * 60 * 1000);
    expect(registry.maxRequests).toBe(100);
  });

  it("creates each handoff kind", () => {
    const kinds = ["conversation", "memory-intent", "mission", "artifact", "settings-context", "model-context"] as const;
    for (const kind of kinds) {
      const request = createLucaLinkHandoffRequest({ kind, payload: { kind, summary: `${kind} preview` } }, { now: NOW });
      expect(request.kind).toBe(kind);
      expect(request.id).toContain(`luca-handoff-${kind}`);
      expect(request.expiresAt).toBe(NOW + 10 * 60 * 1000);
    }
  });

  it("registers, lists, gets, and caps requests", () => {
    const registry = createLucaLinkHandoffRegistry({ maxRequests: 2, now: NOW });
    const first = registerLucaLinkHandoff(registry, { kind: "conversation", title: "one" }, { now: NOW }).request!;
    const second = registerLucaLinkHandoff(registry, { kind: "conversation", title: "two" }, { now: NOW + 1 }).request!;
    const third = registerLucaLinkHandoff(registry, { kind: "artifact", title: "three" }, { now: NOW + 2 }).request!;
    expect(listLucaLinkHandoffs(registry).map((request) => request.id)).toEqual([second.id, third.id]);
    expect(getLucaLinkHandoff(registry, first.id)).toBeUndefined();
    expect(getLucaLinkHandoff(registry, third.id)?.title).toBe("three");
  });

  it("lists pending handoffs and mutates lifecycle state", () => {
    const registry = createLucaLinkHandoffRegistry({ now: NOW });
    const request = registerLucaLinkHandoff(registry, { kind: "memory-intent", title: "memory", requiresPrimaryHostApproval: true }, { now: NOW }).request!;
    expect(listPendingLucaLinkHandoffs(registry, NOW)).toHaveLength(1);
    expect(approveLucaLinkHandoff(registry, request.id, { now: NOW + 1, approvedByDeviceId: "primary" }).request?.status).toBe("approved");
    expect(markLucaLinkHandoffSent(registry, request.id, { now: NOW + 2 }).request?.status).toBe("sent");
    expect(markLucaLinkHandoffReceived(registry, request.id, { now: NOW + 3 }).request?.status).toBe("received");
    expect(markLucaLinkHandoffAccepted(registry, request.id, { now: NOW + 4 }).request?.status).toBe("accepted");
  });

  it("declines, cancels, expires, clears, and summarizes", () => {
    const registry = createLucaLinkHandoffRegistry({ now: NOW });
    const a = registerLucaLinkHandoff(registry, { kind: "conversation", status: "pending" }, { now: NOW }).request!;
    const b = registerLucaLinkHandoff(registry, { kind: "artifact", ttlMs: 1, requiresPrimaryHostApproval: true }, { now: NOW }).request!;
    expect(declineLucaLinkHandoff(registry, a.id).request?.status).toBe("declined");
    expect(cancelLucaLinkHandoff(registry, a.id).request?.status).toBe("cancelled");
    expect(expireLucaLinkHandoffs(registry, NOW + 2).expired?.map((request) => request.id)).toContain(b.id);
    const summary = summarizeLucaLinkHandoffRegistry(registry, NOW + 2);
    expect(summary.cancelled).toBe(1);
    expect(summary.expired).toBe(1);
    expect(summary.byKind.artifact).toBe(1);
    expect(clearLucaLinkHandoffRegistry(registry).valid).toBe(true);
    expect(registry.requests).toEqual([]);
  });

  it("returns structured warnings rather than throwing for unknown ids", () => {
    const registry = createLucaLinkHandoffRegistry();
    expect(approveLucaLinkHandoff(registry, "missing").valid).toBe(false);
    expect(approveLucaLinkHandoff(registry, "missing").warnings[0]).toContain("Unknown LucaLink handoff id");
  });
});

describe("LucaLink handoff payload builders", () => {
  it("conversation handoff excludes hidden system prompts and private reasoning while keeping visible summary", () => {
    const payload = createConversationHandoffPayload({
      conversationTitle: "Plan",
      messages: [
        { role: "system", content: "hidden system prompt", visible: false },
        { role: "assistant", content: "private chain-of-thought", hidden: true },
        { role: "user", content: "Visible task context", visible: true },
      ],
      currentTask: "Continue plan",
      userVisibleContext: { topic: "handoff" },
      timestamp: NOW,
    }) as Record<string, unknown>;
    expect(JSON.stringify(payload)).toContain("Visible task context");
    expect(JSON.stringify(payload)).toContain("Continue plan");
    expect(JSON.stringify(payload)).not.toContain("hidden system prompt");
    expect(JSON.stringify(payload)).not.toContain("chain-of-thought");
  });

  it("memory-intent handoff does not include a raw memory database", () => {
    const payload = createMemoryIntentHandoffPayload({ namespace: "work", rawMemoryDb: { rows: ["secret"] }, memories: ["raw"] }) as Record<string, unknown>;
    expect(payload.rawMemoryDatabaseTransferred).toBe(false);
    expect(JSON.stringify(payload)).not.toContain("rawMemoryDb");
    expect(JSON.stringify(payload)).not.toContain("secret");
  });

  it("mission and artifact handoffs include metadata only", () => {
    const mission = createMissionHandoffPayload({ missionTitle: "Launch", currentStep: "Review", rawMissionState: { internals: true } }) as Record<string, unknown>;
    expect(mission.missionTitle).toBe("Launch");
    expect(JSON.stringify(mission)).not.toContain("rawMissionState");

    const artifact = createArtifactHandoffPayload({ title: "Draft", type: "doc", localReferenceId: "local-1", summary: "Metadata", rawContent: "huge file", fileContents: "raw" }) as Record<string, unknown>;
    expect(artifact.rawLargeFileContentsTransferred).toBe(false);
    expect(JSON.stringify(artifact)).not.toContain("huge file");
  });

  it("settings-context and model-context exclude sensitive keys", () => {
    const settings = createSettingsContextHandoffPayload({ settings: { theme: "dark", apiKey: "abc", sessionToken: "123" } }) as Record<string, unknown>;
    expect(settings.theme).toBe("dark");
    expect(JSON.stringify(settings)).not.toContain("abc");

    const model = createModelContextHandoffPayload({ selectedModelMode: "local", apiKey: "sk-secret", byokSecret: "hidden", token: "bearer" }) as Record<string, unknown>;
    expect(model.selectedModelMode).toBe("local");
    expect(JSON.stringify(model)).not.toContain("sk-secret");
    expect(JSON.stringify(model)).not.toContain("hidden");
  });
});

describe("LucaLink handoff redaction and preview", () => {
  it("redacts token, secret, password, apiKey, privateKey, authorization, credential, seed, mnemonic, key, cookie, and session", () => {
    const source = {
      token: "t",
      secret: "s",
      password: "p",
      apiKey: "a",
      privateKey: "pk",
      authorization: "bearer token",
      credential: "c",
      seed: "seed",
      mnemonic: "words",
      key: "generic",
      cookie: "cookie",
      session: "session",
      safe: "visible",
    };
    const redacted = redactLucaLinkHandoffSecrets(source);
    expect(redacted.redacted).toBe(true);
    expect(redacted.payload).toMatchObject({ token: "[redacted-secret]", safe: "visible" });
    expect(source.token).toBe("t");
    expect(JSON.stringify(redacted.payload)).not.toContain("bearer token");
  });

  it("truncates long strings, arrays, and depth without mutating originals", () => {
    const source = { long: "x".repeat(1200), array: Array.from({ length: 25 }, (_, index) => index), nested: { a: { b: { c: { d: { e: "deep" } } } } } };
    const result = sanitizeLucaLinkHandoffPayload(source, { maxStringLength: 10, maxArrayItems: 3, maxDepth: 3 });
    expect(result.truncated).toBe(true);
    expect(JSON.stringify(result.payload)).toContain("[truncated]");
    expect(JSON.stringify(result.payload)).toContain("[truncated-depth]");
    expect(source.long).toHaveLength(1200);
    expect(source.array).toHaveLength(25);
  });

  it("creates bounded redacted payload preview", () => {
    const preview = createLucaLinkHandoffPayloadPreview({ kind: "conversation", summary: "hello", token: "secret" }, { kind: "conversation" });
    expect(preview.kind).toBe("conversation");
    expect(preview.redacted).toBe(true);
    expect(preview.fields.token).toBe("[redacted-secret]");
  });
});

describe("LucaLink handoff policy", () => {
  it("denies guest targets except explicit limited conversation preview", () => {
    const guest = createTrustedDeviceRecord({ deviceId: "guest", deviceType: "guest web" }, { now: NOW });
    expect(evaluateLucaLinkHandoffPolicy({ kind: "artifact", targetDevice: guest, risk: "low" }).decision).toBe("deny");
    expect(evaluateLucaLinkHandoffPolicy({ kind: "conversation", targetDevice: guest, risk: "low", explicitGuestPreview: true, allowGuestConversationPreview: true }).decision).toBe("sanitize");
  });

  it("denies revoked or blocked devices", () => {
    const blocked = createTrustedDeviceRecord({ deviceId: "blocked", deviceType: "mobile", status: "blocked" }, { now: NOW });
    expect(evaluateLucaLinkHandoffPolicy({ kind: "conversation", targetDevice: blocked, risk: "low" }).blocked).toBe(true);
  });

  it("requires approval for unknown high-risk, memory-intent, artifact high-risk, and redacted secrets", () => {
    expect(evaluateLucaLinkHandoffPolicy({ kind: "conversation", risk: "high" }).requiresPrimaryHostApproval).toBe(true);
    expect(evaluateLucaLinkHandoffPolicy({ kind: "memory-intent", targetDevice: trustedDevice(), risk: "medium" }).decision).toBe("require-primary-host-approval");
    expect(evaluateLucaLinkHandoffPolicy({ kind: "artifact", targetDevice: trustedDevice(), risk: "high" }).decision).toBe("require-primary-host-approval");
    const preview = createLucaLinkHandoffPayloadPreview({ token: "secret" }, { kind: "conversation" });
    expect(evaluateLucaLinkHandoffPolicy({ kind: "conversation", targetDevice: trustedDevice(), risk: "low", payloadPreview: preview }).decision).toBe("redact");
  });

  it("allows trusted low-risk conversation and settings-context", () => {
    expect(evaluateLucaLinkHandoffPolicy({ kind: "conversation", targetDevice: trustedDevice(), risk: "low" }).decision).toBe("allow");
    expect(evaluateLucaLinkHandoffPolicy({ kind: "settings-context", targetDevice: trustedDevice(), risk: "low" }).allowed).toBe(true);
  });

  it("denies physical/payment/safety payloads and admin does not bypass high-risk approval", () => {
    const admin = createTrustedDeviceRecord({ deviceId: "admin", deviceType: "mobile", trustLevel: "admin" }, { now: NOW });
    expect(evaluateLucaLinkHandoffPolicy({ kind: "mission", targetDevice: admin, containsPhysicalPaymentOrSafetyAction: true }).decision).toBe("deny");
    expect(evaluateLucaLinkHandoffPolicy({ kind: "artifact", targetDevice: admin, risk: "high" }).requiresPrimaryHostApproval).toBe(true);
  });

  it("respects owner/Primary Host boundaries and never emits reserved authority text", () => {
    const owner = createTrustedDeviceRecord({ deviceId: "local", deviceType: "desktop", isCurrentPrimaryHost: true }, { now: NOW });
    const result = evaluateLucaLinkHandoffPolicy({ kind: "model-context", targetDevice: owner, risk: "medium" });
    expect(result.requiresPrimaryHostApproval).toBe(true);
    expect(JSON.stringify(result)).not.toContain("Origin");
  });
});

describe("LucaLink handoff module side effects", () => {
  it("does not touch storage, fetch, or sockets during import-time use", async () => {
    const fetchMock = vi.fn();
    const localStorageSpy = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("localStorage", { getItem: localStorageSpy, setItem: localStorageSpy, removeItem: localStorageSpy });
    await import("./lucaLinkHandoff");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(localStorageSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
