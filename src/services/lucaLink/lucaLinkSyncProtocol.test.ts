import { describe, expect, it, vi } from "vitest";
import type { LucaHostManifest, LucaHostRole } from "./lucaHostManifest";
import type {
  LucaLinkPermissionCategory,
  LucaLinkSyncLaneId,
} from "./lucaLinkArchitectureMap";
import { createDefaultHostManifest } from "./capabilityRegistry";
import {
  createLucaLinkEnvelope,
  evaluateEnvelopePolicy,
  getLaneDescriptor,
  getPayloadKind,
  isEnvelopeExpired,
  isKnownLane,
  LUCA_LINK_ENVELOPE_VERSION,
  requiresEncryptedLane,
  requiresEnvelopeAck,
  requiresSignedLane,
  validateLucaLinkEnvelope,
} from "./lucaLinkSyncProtocol";
import type {
  LucaLinkLanePayloadMap,
  LucaLinkEnvelopeForLane,
} from "./lucaLinkSyncProtocol";

const NOW = 1_700_000_000_000;

function makeManifest(
  hostRole: LucaHostRole,
  permissions: LucaLinkPermissionCategory[],
  opts: {
    requiresApprovalFor?: LucaLinkPermissionCategory[];
    trustLevel?: LucaHostManifest["trust"]["trustLevel"];
  } = {},
): LucaHostManifest {
  const base = createDefaultHostManifest({
    deviceId: `${hostRole}-device`,
    deviceName: `${hostRole} Device`,
    hostRole,
    now: NOW,
  });
  return {
    ...base,
    trust: {
      ...base.trust,
      trustLevel: opts.trustLevel ?? base.trust.trustLevel,
      permissions,
      requiresApprovalFor: opts.requiresApprovalFor ?? [],
    },
  };
}

function envelope<TLane extends LucaLinkSyncLaneId>(
  lane: TLane,
  payload: LucaLinkLanePayloadMap[TLane],
  overrides: Partial<Parameters<typeof createLucaLinkEnvelope<TLane>>[0]> = {},
): LucaLinkEnvelopeForLane<TLane> {
  return createLucaLinkEnvelope({
    id: `env-${lane}`,
    lane,
    type: payload.kind,
    sourceDeviceId: "source-device",
    targetDeviceId: "primary",
    timestamp: NOW,
    payload,
    ...overrides,
  });
}

describe("LucaLink sync protocol envelopes", () => {
  it("factory creates luca-link/v1 envelopes with id, timestamp, routing, and security defaults", () => {
    const created = envelope("conversation", {
      kind: "message",
      threadId: "thread-1",
      text: "hello",
      role: "user",
    });

    expect(created.version).toBe(LUCA_LINK_ENVELOPE_VERSION);
    expect(created.id).toBe("env-conversation");
    expect(created.timestamp).toBe(NOW);
    expect(created.routing).toEqual({
      priority: "normal",
      delivery: "relay",
      retryPolicy: "standard",
    });
    expect(created.security).toEqual({
      encrypted: true,
      signed: true,
      requiresAck: false,
    });
  });

  it("generates an id and timestamp when omitted", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const created = createLucaLinkEnvelope({
      lane: "presence",
      type: "heartbeat",
      sourceDeviceId: "source-device",
      targetDeviceId: "nearby",
      payload: { kind: "heartbeat", online: true, lastSeen: NOW },
    });
    vi.useRealTimers();

    expect(created.id).toMatch(/^ll-presence-1700000000000-/);
    expect(created.timestamp).toBe(NOW);
    expect(created.routing.delivery).toBe("direct");
    expect(created.security.signed).toBe(true);
  });

  it("validates a normal conversation envelope", () => {
    const created = envelope("conversation", {
      kind: "message",
      threadId: "thread-1",
      messageId: "message-1",
      text: "hello",
      role: "user",
    });

    expect(validateLucaLinkEnvelope(created)).toEqual({
      valid: true,
      errors: [],
      warnings: [],
    });
    expect(getPayloadKind(created)).toBe("message");
    expect(getLaneDescriptor("conversation")?.id).toBe("conversation");
  });

  it("rejects unknown lanes and missing required fields", () => {
    const validation = validateLucaLinkEnvelope({
      version: LUCA_LINK_ENVELOPE_VERSION,
      lane: "unknown-lane",
      timestamp: Number.NaN,
      security: {},
      routing: {},
      payload: { kind: "message" },
    });

    expect(isKnownLane("unknown-lane")).toBe(false);
    expect(validation.valid).toBe(false);
    expect(validation.errors).toEqual(
      expect.arrayContaining([
        "id is required",
        "lane must be known",
        "type is required",
        "sourceDeviceId is required",
        "targetDeviceId is required",
        "timestamp must be a finite number",
      ]),
    );
  });

  it("detects expired envelopes", () => {
    const created = envelope(
      "identity",
      { kind: "identity-bootstrap", deviceId: "guest-device" },
      { security: { expiresAt: NOW - 1 } },
    );

    expect(isEnvelopeExpired(created, NOW)).toBe(true);
    expect(validateLucaLinkEnvelope(created, { now: NOW }).warnings).toContain(
      "envelope is expired",
    );
  });

  it("rejects invalid routing priority values", () => {
    const created = envelope("conversation", {
      kind: "message",
      text: "hello",
    });
    const validation = validateLucaLinkEnvelope({
      ...created,
      routing: { ...created.routing, priority: "urgent" },
    });

    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain(
      "routing.priority must be low, normal, high, or critical",
    );
  });

  it("rejects invalid routing delivery values", () => {
    const created = envelope("conversation", {
      kind: "message",
      text: "hello",
    });
    const validation = validateLucaLinkEnvelope({
      ...created,
      routing: { ...created.routing, delivery: "broadcast" },
    });

    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain(
      "routing.delivery must be direct, relay, local, or store-and-forward",
    );
  });

  it("rejects invalid routing retryPolicy values", () => {
    const created = envelope("conversation", {
      kind: "message",
      text: "hello",
    });
    const validation = validateLucaLinkEnvelope({
      ...created,
      routing: { ...created.routing, retryPolicy: "forever" },
    });

    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain(
      "routing.retryPolicy must be none, standard, or persistent",
    );
  });

  it("rejects invalid security boolean fields", () => {
    const created = envelope("conversation", {
      kind: "message",
      text: "hello",
    });
    const validation = validateLucaLinkEnvelope({
      ...created,
      security: {
        ...created.security,
        encrypted: "yes",
        signed: 1,
        requiresAck: "no",
      },
    });

    expect(validation.valid).toBe(false);
    expect(validation.errors).toEqual(
      expect.arrayContaining([
        "security.encrypted must be boolean",
        "security.signed must be boolean",
        "security.requiresAck must be boolean",
      ]),
    );
  });

  it("rejects invalid security trustLevelRequired values", () => {
    const created = envelope("conversation", {
      kind: "message",
      text: "hello",
    });
    const validation = validateLucaLinkEnvelope({
      ...created,
      security: { ...created.security, trustLevelRequired: "super-admin" },
    });

    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain(
      "security.trustLevelRequired must be a known trust level",
    );
  });

  it("rejects invalid security expiresAt values", () => {
    const created = envelope("conversation", {
      kind: "message",
      text: "hello",
    });
    const validation = validateLucaLinkEnvelope({
      ...created,
      security: { ...created.security, expiresAt: Number.NaN },
    });

    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain(
      "security.expiresAt must be a finite number",
    );
  });

  it("valid factory-created envelopes still pass deep routing and security validation", () => {
    const created = createLucaLinkEnvelope({
      lane: "tool",
      type: "tool-request",
      sourceDeviceId: "execution-device",
      targetDeviceId: "primary",
      timestamp: NOW,
      security: { trustLevelRequired: "admin", expiresAt: NOW + 10_000 },
      payload: { kind: "tool-request", permission: "shell.execute" },
    });

    expect(validateLucaLinkEnvelope(created)).toEqual({
      valid: true,
      errors: [],
      warnings: [],
    });
  });
});

describe("LucaLink lane payload mapping", () => {
  const manifest = makeManifest("primary", ["chat.send", "chat.receive"]);
  const lanePayloads: {
    [TLane in LucaLinkSyncLaneId]: LucaLinkLanePayloadMap[TLane];
  } = {
    identity: { kind: "host-manifest", manifest },
    presence: { kind: "online", online: true, lastSeen: NOW },
    conversation: {
      kind: "message",
      threadId: "thread-1",
      messageId: "message-1",
      text: "hello",
      role: "user",
    },
    memory: {
      kind: "memory-proposal",
      proposalId: "proposal-1",
      sensitivity: "medium",
      confidence: 0.8,
      summary: "Remember this preference.",
    },
    settings: {
      kind: "settings-diff",
      scope: "appearance",
      diff: { theme: "graphite" },
    },
    mission: {
      kind: "mission-progress",
      missionId: "mission-1",
      status: "running",
      progress: 0.5,
    },
    sensor: {
      kind: "location",
      location: { latitude: 37.7749, longitude: -122.4194, accuracy: 10 },
    },
    tool: {
      kind: "tool-request",
      toolId: "shell",
      requestId: "request-1",
      permission: "shell.execute",
      args: { command: "echo test" },
    },
    artifact: {
      kind: "artifact-transfer",
      artifactId: "artifact-1",
      name: "report.txt",
      sizeBytes: 12,
    },
    notification: {
      kind: "alert",
      title: "Approval needed",
      severity: "warning",
    },
    model: {
      kind: "model-available",
      modelId: "local-chat",
      modelType: "chat",
      available: true,
    },
    safety: {
      kind: "killswitch",
      targetDeviceId: "companion-device",
      severity: "critical",
    },
  };

  it("each lane can produce a typed envelope", () => {
    for (const [lane, payload] of Object.entries(lanePayloads) as [
      LucaLinkSyncLaneId,
      LucaLinkLanePayloadMap[LucaLinkSyncLaneId],
    ][]) {
      const created = createLucaLinkEnvelope({
        id: `env-${lane}`,
        lane,
        type: payload.kind,
        sourceDeviceId: "source-device",
        targetDeviceId: "primary",
        timestamp: NOW,
        payload,
      });
      expect(created.lane).toBe(lane);
      expect(validateLucaLinkEnvelope(created).valid).toBe(true);
    }
  });

  it("lane-specific payloads retain useful typed data", () => {
    expect(envelope("identity", lanePayloads.identity).payload.manifest).toBe(
      manifest,
    );
    expect(envelope("presence", lanePayloads.presence).payload.online).toBe(
      true,
    );
    expect(envelope("presence", lanePayloads.presence).payload.lastSeen).toBe(
      NOW,
    );
    expect(
      envelope("conversation", lanePayloads.conversation).payload.text,
    ).toBe("hello");
    expect(
      envelope("conversation", lanePayloads.conversation).payload.threadId,
    ).toBe("thread-1");
    expect(envelope("memory", lanePayloads.memory).payload.proposalId).toBe(
      "proposal-1",
    );
    expect(envelope("tool", lanePayloads.tool).payload.permission).toBe(
      "shell.execute",
    );
  });

  it("safety envelopes default to critical priority and require ack", () => {
    const created = envelope("safety", lanePayloads.safety);
    expect(created.routing.priority).toBe("critical");
    expect(created.security.requiresAck).toBe(true);
    expect(requiresEnvelopeAck(created)).toBe(true);
  });
});

describe("LucaLink sync security defaults", () => {
  const lanes: LucaLinkSyncLaneId[] = [
    "identity",
    "presence",
    "conversation",
    "memory",
    "settings",
    "mission",
    "sensor",
    "tool",
    "artifact",
    "notification",
    "model",
    "safety",
  ];

  const minimalPayload = (
    lane: LucaLinkSyncLaneId,
  ): LucaLinkLanePayloadMap[LucaLinkSyncLaneId] => {
    switch (lane) {
      case "identity":
        return { kind: "identity-bootstrap" };
      case "presence":
        return { kind: "heartbeat", online: true, lastSeen: NOW };
      case "conversation":
        return { kind: "message", text: "hi" };
      case "memory":
        return { kind: "memory-proposal", summary: "memory" };
      case "settings":
        return { kind: "settings-sync", scope: "lucalink" };
      case "mission":
        return { kind: "mission-state", status: "queued" };
      case "sensor":
        return { kind: "iot-pulse", metadata: { ok: true } };
      case "tool":
        return { kind: "tool-request", permission: "shell.execute" };
      case "artifact":
        return { kind: "artifact-created", artifactId: "artifact-1" };
      case "notification":
        return { kind: "alert", title: "Alert" };
      case "model":
        return { kind: "capability-report", modelType: "chat" };
      case "safety":
        return { kind: "security-alert", severity: "critical" };
    }
  };

  it("signs all factory envelopes", () => {
    for (const lane of lanes) {
      const payload = minimalPayload(lane);
      const created = createLucaLinkEnvelope({
        lane,
        type: payload.kind,
        sourceDeviceId: "source-device",
        targetDeviceId: "primary",
        timestamp: NOW,
        payload,
      });
      expect(created.security.signed).toBe(true);
      expect(requiresSignedLane(lane)).toBe(true);
    }
  });

  it("encrypts factory envelopes by default except presence, and still marks sensitive lanes as encryption-required", () => {
    for (const lane of lanes) {
      const payload = minimalPayload(lane);
      const created = createLucaLinkEnvelope({
        lane,
        type: payload.kind,
        sourceDeviceId: "source-device",
        targetDeviceId: "primary",
        timestamp: NOW,
        payload,
      });
      expect(created.security.encrypted).toBe(lane !== "presence");
      if (requiresEncryptedLane(lane)) {
        expect(created.security.encrypted).toBe(true);
      }
    }
    expect(requiresEncryptedLane("presence")).toBe(false);
  });

  it("requires ack for identity, memory, settings, tool, artifact, and safety lanes", () => {
    const ackLanes: LucaLinkSyncLaneId[] = [
      "identity",
      "memory",
      "settings",
      "tool",
      "artifact",
      "safety",
    ];
    for (const lane of ackLanes) {
      const payload = minimalPayload(lane);
      const created = createLucaLinkEnvelope({
        lane,
        type: payload.kind,
        sourceDeviceId: "source-device",
        targetDeviceId: "primary",
        timestamp: NOW,
        payload,
      });
      expect(created.security.requiresAck).toBe(true);
    }
  });
});

describe("LucaLink envelope policy helper", () => {
  it("allows guest conversation envelopes when chat permissions are present", () => {
    const guest = makeManifest("guest", ["chat.send", "chat.receive"]);
    const result = evaluateEnvelopePolicy(
      guest,
      envelope("conversation", { kind: "message", text: "hello" }),
      { now: NOW },
    );
    expect(result.allowed).toBe(true);
    expect(result.lanePolicy.decision).toBe("allow");
  });

  it("requires Primary Host approval for guest identity envelopes and denies guest memory envelopes", () => {
    const guest = makeManifest("guest", ["chat.send", "chat.receive"]);
    expect(
      evaluateEnvelopePolicy(
        guest,
        envelope("identity", { kind: "identity-bootstrap" }),
        { now: NOW },
      ).requiresApproval,
    ).toBe(true);
    expect(
      evaluateEnvelopePolicy(
        guest,
        envelope("memory", { kind: "memory-proposal", summary: "memory" }),
        { now: NOW },
      ).lanePolicy.decision,
    ).toBe("deny");
  });

  it("allows companion sensor envelopes when sensor permissions are granted and denies companion tool envelopes", () => {
    const companion = makeManifest("companion", [
      "chat.send",
      "chat.receive",
      "voice.capture",
      "camera.capture",
      "location.read",
    ]);

    expect(
      evaluateEnvelopePolicy(
        companion,
        envelope("sensor", { kind: "iot-pulse", metadata: { battery: 90 } }),
        { now: NOW },
      ).allowed,
    ).toBe(true);
    expect(
      evaluateEnvelopePolicy(
        companion,
        envelope("tool", {
          kind: "tool-request",
          permission: "shell.execute",
        }),
        { now: NOW },
      ).lanePolicy.decision,
    ).toBe("deny");
  });

  it("routes execution tool shell/code/file-write permissions to Primary Host approval", () => {
    const execution = makeManifest("execution", [
      "chat.send",
      "chat.receive",
      "memory.read",
      "files.read",
      "files.write",
      "shell.execute",
      "browser.control",
      "code.modify",
    ]);

    for (const permission of [
      "shell.execute",
      "code.modify",
      "files.write",
    ] as LucaLinkPermissionCategory[]) {
      const result = evaluateEnvelopePolicy(
        execution,
        envelope("tool", { kind: "tool-request", permission }),
        { now: NOW },
      );
      expect(result.requiresApproval).toBe(true);
      expect(result.permissionPolicy?.decision).toBe(
        "requires-primary-host-approval",
      );
    }
  });

  it("allows local Primary Host safety envelopes", () => {
    const primary = makeManifest(
      "primary",
      ["chat.send", "chat.receive", "memory.read", "memory.write"],
      { trustLevel: "owner" },
    );
    const result = evaluateEnvelopePolicy(
      primary,
      envelope("safety", { kind: "security-alert", severity: "critical" }),
      { now: NOW, isPrimaryHost: true, allowCriticalForPrimaryHost: true },
    );

    expect(result.allowed).toBe(true);
    expect(result.lanePolicy.decision).toBe("allow");
  });
});

describe("LucaLink sync protocol module side effects", () => {
  it("does not touch localStorage, fetch, network, or permission prompts at import time", async () => {
    const getItem = vi.fn();
    const setItem = vi.fn();
    const removeItem = vi.fn();
    const fetch = vi.fn();
    const permissionsQuery = vi.fn();

    vi.stubGlobal("localStorage", { getItem, setItem, removeItem });
    vi.stubGlobal("fetch", fetch);
    vi.stubGlobal("navigator", { permissions: { query: permissionsQuery } });
    vi.resetModules();

    await import("./lucaLinkSyncProtocol");

    expect(getItem).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
    expect(removeItem).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(permissionsQuery).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
