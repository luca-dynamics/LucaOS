import { describe, expect, it, vi } from "vitest";
import { lucaLinkHostRoles } from "./lucaLinkArchitectureMap";
import type {
  LucaHostCapabilities,
  LucaHostHardware,
  LucaHostManifest,
  LucaHostRole,
} from "./lucaHostManifest";
import type { LucaLinkPermissionCategory } from "./lucaLinkArchitectureMap";
import { createDefaultHostManifest } from "./capabilityRegistry";
import {
  DEFAULT_ROUTING_WEIGHTS,
  explainRouteDecision,
  getLaneForTask,
  getRequiredCapabilitiesForTask,
  getRequiredPermissionsForTask,
  isHostEligibleForTask,
  rankLucaLinkHosts,
  routeLucaLinkTask,
  scoreHostForTask,
  type LucaLinkRoutingCandidate,
  type LucaLinkRoutingTask,
} from "./lucaLinkHostRouter";

const NOW = 1_700_000_000_000;

interface ManifestOverrides {
  deviceId?: string;
  deviceName?: string;
  capabilities?: Partial<LucaHostCapabilities>;
  hardware?: LucaHostHardware;
  permissions?: LucaLinkPermissionCategory[];
  trustLevel?: LucaHostManifest["trust"]["trustLevel"];
  requiresApprovalFor?: LucaLinkPermissionCategory[];
}

function makeManifest(
  role: LucaHostRole,
  overrides: ManifestOverrides = {},
): LucaHostManifest {
  const base = createDefaultHostManifest({
    deviceId: overrides.deviceId ?? `${role}-host`,
    deviceName: overrides.deviceName ?? `${role} host`,
    hostRole: role,
    now: NOW,
  });
  return {
    ...base,
    capabilities: { ...base.capabilities, ...(overrides.capabilities ?? {}) },
    hardware: { ...base.hardware, ...(overrides.hardware ?? {}) },
    trust: {
      ...base.trust,
      trustLevel: overrides.trustLevel ?? base.trust.trustLevel,
      permissions: overrides.permissions ?? base.trust.permissions,
      requiresApprovalFor:
        overrides.requiresApprovalFor ?? base.trust.requiresApprovalFor,
    },
  };
}

function candidate(
  manifest: LucaHostManifest,
  extra: Omit<LucaLinkRoutingCandidate, "manifest"> = {},
): LucaLinkRoutingCandidate {
  return { manifest, ...extra };
}

const FULL_EXECUTION_PERMS: LucaLinkPermissionCategory[] = [
  "chat.send",
  "chat.receive",
  "memory.read",
  "files.read",
  "files.write",
  "shell.execute",
  "code.modify",
  "git.create_pr",
  "browser.control",
];

function executionToolHost(deviceId: string): LucaHostManifest {
  return makeManifest("execution", {
    deviceId,
    deviceName: deviceId,
    permissions: FULL_EXECUTION_PERMS,
    capabilities: {
      shellAccess: true,
      codeExecution: true,
      fileAccess: true,
      browserControl: true,
    },
  });
}

const OPTS = { now: NOW } as const;

// ===========================================================================
// Task model helpers
// ===========================================================================

describe("task requirement resolution", () => {
  it("derives lane, capabilities, and permissions per task type", () => {
    expect(getLaneForTask({ id: "t", type: "memory" })).toBe("memory");
    expect(getLaneForTask({ id: "t", type: "voice" })).toBeUndefined();
    expect(getLaneForTask({ id: "t", type: "vision" })).toBeUndefined();

    expect(getRequiredCapabilitiesForTask({ id: "t", type: "conversation" })).toEqual(
      { chat: true },
    );
    expect(
      getRequiredCapabilitiesForTask({ id: "t", type: "vision" }).visionCapture,
    ).toBe(true);

    expect(
      getRequiredPermissionsForTask({ id: "t", type: "conversation" }).sort(),
    ).toEqual(["chat.receive", "chat.send"]);
    expect(
      getRequiredPermissionsForTask({
        id: "t",
        type: "memory",
        description: "write and persist a fact",
      }),
    ).toContain("memory.write");
  });

  it("maps required permissions to required capabilities for tool tasks", () => {
    const caps = getRequiredCapabilitiesForTask({
      id: "t",
      type: "tool",
      requiredPermissions: ["shell.execute", "code.modify"],
    });
    expect(caps.shellAccess).toBe(true);
    expect(caps.codeExecution).toBe(true);
  });
});

// ===========================================================================
// Basic routing
// ===========================================================================

describe("basic routing", () => {
  it("selects a companion for a camera/vision task", () => {
    const companion = makeManifest("companion", {
      deviceId: "phone",
      capabilities: { visionCapture: true },
    });
    const execution = executionToolHost("desktop"); // no vision capability
    const task: LucaLinkRoutingTask = {
      id: "vision-1",
      type: "vision",
      description: "look through the camera",
    };

    const decision = routeLucaLinkTask(
      task,
      [candidate(companion), candidate(execution)],
      OPTS,
    );
    expect(decision.selectedHost?.deviceId).toBe("phone");
    expect(
      decision.blockedHosts.some((b) => b.candidate.manifest.deviceId === "desktop"),
    ).toBe(true);
  });

  it("selects an execution host for a code/tool task and requires Primary Host approval", () => {
    const execution = executionToolHost("workstation");
    const companion = makeManifest("companion", { deviceId: "phone" });
    const task: LucaLinkRoutingTask = {
      id: "tool-1",
      type: "tool",
      requiredPermissions: ["shell.execute", "code.modify"],
    };

    const decision = routeLucaLinkTask(
      task,
      [candidate(execution, { context: { isCurrentHost: true } }), candidate(companion)],
      OPTS,
    );
    expect(decision.selectedHost?.deviceId).toBe("workstation");
    expect(decision.requiresPrimaryHostApproval).toBe(true);
    expect(
      decision.blockedHosts.some((b) => b.candidate.manifest.deviceId === "phone"),
    ).toBe(true);
  });

  it("selects the Primary Host for a safety task", () => {
    const primary = makeManifest("primary", { deviceId: "primary-desktop" });
    const companion = makeManifest("companion", { deviceId: "phone" });
    const task: LucaLinkRoutingTask = {
      id: "safety-1",
      type: "safety",
      risk: "critical",
    };

    const decision = routeLucaLinkTask(
      task,
      [
        candidate(primary, { context: { isPrimaryHost: true, isCurrentHost: true } }),
        candidate(companion),
      ],
      OPTS,
    );
    expect(decision.selectedHost?.deviceId).toBe("primary-desktop");
    expect(decision.explain).toMatch(/Primary Host/);
  });

  it("selects the active user device for a close conversation tie", () => {
    const phoneA = makeManifest("companion", { deviceId: "phone-a" });
    const phoneB = makeManifest("companion", { deviceId: "phone-b" });
    const task: LucaLinkRoutingTask = { id: "conv-1", type: "conversation" };

    const decision = routeLucaLinkTask(
      task,
      [
        candidate(phoneA),
        candidate(phoneB, { context: { isActiveUserDevice: true } }),
      ],
      OPTS,
    );
    expect(decision.selectedHost?.deviceId).toBe("phone-b");
  });
});

// ===========================================================================
// Policy integration
// ===========================================================================

describe("policy integration", () => {
  it("blocks a guest host from the memory lane", () => {
    const guest = makeManifest("guest", { deviceId: "browser" });
    const decision = routeLucaLinkTask(
      { id: "mem-1", type: "memory" },
      [candidate(guest)],
      OPTS,
    );
    expect(decision.selectedHost).toBeUndefined();
    expect(decision.blockedHosts).toHaveLength(1);
    expect(decision.blockedHosts[0].policyDecision).toBe("deny");
  });

  it("blocks a guest host from the tool lane", () => {
    const guest = makeManifest("guest", { deviceId: "browser" });
    const decision = routeLucaLinkTask(
      { id: "tool-2", type: "tool", requiredPermissions: ["shell.execute"] },
      [candidate(guest)],
      OPTS,
    );
    expect(decision.selectedHost).toBeUndefined();
    expect(decision.blockedHosts[0].reasons.join(" ")).toMatch(/guest/i);
  });

  it("allows a guest host for a low-risk conversation when privacy is guest-ok", () => {
    const guest = makeManifest("guest", { deviceId: "browser" });
    const decision = routeLucaLinkTask(
      { id: "conv-2", type: "conversation", risk: "low", privacy: "guest-ok" },
      [candidate(guest)],
      OPTS,
    );
    expect(decision.selectedHost?.deviceId).toBe("browser");
  });

  it("blocks a companion from a shell/code/file-mutation task", () => {
    const companion = makeManifest("companion", { deviceId: "phone" });
    const decision = routeLucaLinkTask(
      { id: "tool-3", type: "tool", requiredPermissions: ["shell.execute"] },
      [candidate(companion)],
      OPTS,
    );
    expect(decision.selectedHost).toBeUndefined();
    expect(decision.blockedHosts[0].reasons.join(" ")).toMatch(
      /companion/i,
    );
  });

  it("can select the Primary Host for an owner-sensitive memory-write task", () => {
    const primary = makeManifest("primary", { deviceId: "primary-desktop" });
    const decision = routeLucaLinkTask(
      { id: "mem-2", type: "memory", description: "write and persist a fact" },
      [candidate(primary, { context: { isPrimaryHost: true, isCurrentHost: true } })],
      OPTS,
    );
    expect(decision.selectedHost?.deviceId).toBe("primary-desktop");
    expect(decision.selectedHost?.trust.trustLevel).toBe("owner");
  });
});

// ===========================================================================
// Privacy
// ===========================================================================

describe("privacy filtering", () => {
  it("local-only blocks relay-only and guest candidates", () => {
    const primary = makeManifest("primary", { deviceId: "primary-desktop" });
    const guest = makeManifest("guest", { deviceId: "browser" });
    const remote = makeManifest("execution", {
      deviceId: "remote",
      permissions: FULL_EXECUTION_PERMS,
    });

    const decision = routeLucaLinkTask(
      { id: "conv-3", type: "conversation", privacy: "local-only" },
      [
        candidate(primary, {
          context: { isPrimaryHost: true, isCurrentHost: true },
          transport: { delivery: "local", reachable: true, localAvailable: true },
        }),
        candidate(guest, {
          transport: { delivery: "relay", reachable: true, relayAvailable: true },
        }),
        candidate(remote, {
          transport: { delivery: "relay", reachable: true, relayAvailable: true },
        }),
      ],
      OPTS,
    );

    expect(decision.selectedHost?.deviceId).toBe("primary-desktop");
    const blockedIds = decision.blockedHosts.map((b) => b.candidate.manifest.deviceId);
    expect(blockedIds).toContain("browser");
    expect(blockedIds).toContain("remote");
  });

  it("trusted-only blocks guest and low-trust paired candidates", () => {
    const guest = makeManifest("guest", { deviceId: "browser" });
    const paired = makeManifest("companion", { deviceId: "phone" }); // paired by default
    const trusted = makeManifest("execution", {
      deviceId: "trusted-desktop",
      permissions: FULL_EXECUTION_PERMS,
    });

    const decision = routeLucaLinkTask(
      { id: "conv-4", type: "conversation", privacy: "trusted-only", risk: "high" },
      [candidate(guest), candidate(paired), candidate(trusted)],
      OPTS,
    );

    expect(decision.selectedHost?.deviceId).toBe("trusted-desktop");
    const blockedIds = decision.blockedHosts.map((b) => b.candidate.manifest.deviceId);
    expect(blockedIds).toContain("browser");
    expect(blockedIds).toContain("phone");
  });

  it("guest-ok allows guests only for low-risk conversation/display tasks", () => {
    const guest = makeManifest("guest", { deviceId: "browser" });
    const allowed = routeLucaLinkTask(
      { id: "c-low", type: "conversation", risk: "low", privacy: "guest-ok" },
      [candidate(guest)],
      OPTS,
    );
    const blocked = routeLucaLinkTask(
      { id: "c-high", type: "conversation", risk: "high", privacy: "guest-ok" },
      [candidate(guest)],
      OPTS,
    );
    expect(allowed.selectedHost?.deviceId).toBe("browser");
    expect(blocked.selectedHost).toBeUndefined();
  });
});

// ===========================================================================
// Transport
// ===========================================================================

describe("transport scoring", () => {
  it("blocks an unreachable candidate", () => {
    const primary = makeManifest("primary", { deviceId: "primary-desktop" });
    const decision = routeLucaLinkTask(
      { id: "conv-5", type: "conversation" },
      [
        candidate(primary, {
          context: { isPrimaryHost: true },
          transport: { delivery: "direct", reachable: false },
        }),
      ],
      OPTS,
    );
    expect(decision.selectedHost).toBeUndefined();
    expect(decision.blockedHosts[0].reasons.join(" ")).toMatch(/unreachable/i);
  });

  it("prefers local/direct over relay for a realtime voice task", () => {
    const localPhone = makeManifest("companion", {
      deviceId: "phone-local",
      capabilities: { voiceOutput: true },
    });
    const relayPhone = makeManifest("companion", {
      deviceId: "phone-relay",
      capabilities: { voiceOutput: true },
    });
    const task: LucaLinkRoutingTask = {
      id: "voice-1",
      type: "voice",
      latencySensitivity: "realtime",
    };

    const decision = routeLucaLinkTask(
      task,
      [
        candidate(localPhone, {
          transport: { delivery: "local", reachable: true, latencyMs: 20, localAvailable: true },
        }),
        candidate(relayPhone, {
          transport: { delivery: "relay", reachable: true, latencyMs: 800, relayAvailable: true },
        }),
      ],
      OPTS,
    );
    expect(decision.selectedHost?.deviceId).toBe("phone-local");
  });

  it("does not select store-and-forward unless the task allows it", () => {
    const phone = makeManifest("companion", {
      deviceId: "phone",
      capabilities: { voiceOutput: true },
    });
    const saf = {
      delivery: "store-and-forward" as const,
      reachable: true,
      localAvailable: false,
      relayAvailable: false,
    };

    const blocked = routeLucaLinkTask(
      { id: "v-saf", type: "voice" },
      [candidate(phone, { transport: saf })],
      OPTS,
    );
    expect(blocked.selectedHost).toBeUndefined();

    const allowed = routeLucaLinkTask(
      { id: "v-saf-ok", type: "voice", allowStoreAndForward: true },
      [candidate(phone, { transport: saf })],
      OPTS,
    );
    expect(allowed.selectedHost?.deviceId).toBe("phone");
  });
});

// ===========================================================================
// Battery / thermal
// ===========================================================================

describe("battery and thermal", () => {
  it("penalizes low battery for non-critical heavy tasks", () => {
    const charged = executionToolHost("desktop-charged");
    const lowBattery = executionToolHost("desktop-low");
    const task: LucaLinkRoutingTask = {
      id: "tool-4",
      type: "tool",
      requiredPermissions: ["shell.execute"],
      estimatedCompute: "high",
    };

    const charm = { ...charged, hardware: { ...charged.hardware, batteryLevel: 95 } };
    const low = { ...lowBattery, hardware: { ...lowBattery.hardware, batteryLevel: 10 } };

    const decision = routeLucaLinkTask(
      task,
      [candidate(charm), candidate(low)],
      OPTS,
    );
    expect(decision.selectedHost?.deviceId).toBe("desktop-charged");
  });

  it("blocks a thermally critical host from a heavy compute task", () => {
    const hot = makeManifest("execution", {
      deviceId: "hot-desktop",
      permissions: FULL_EXECUTION_PERMS,
      capabilities: { shellAccess: true, codeExecution: true, fileAccess: true, browserControl: true },
      hardware: { thermalState: "critical" },
    });
    const decision = routeLucaLinkTask(
      { id: "tool-5", type: "tool", requiredPermissions: ["shell.execute"], estimatedCompute: "high" },
      [candidate(hot, { context: { isCurrentHost: true } })],
      OPTS,
    );
    expect(decision.selectedHost).toBeUndefined();
    expect(decision.blockedHosts[0].reasons.join(" ")).toMatch(/thermal/i);
  });

  it("still routes a safety task to a low-battery Primary Host when no better option exists", () => {
    const primary = makeManifest("primary", {
      deviceId: "primary-desktop",
      hardware: { batteryLevel: 3 },
    });
    const decision = routeLucaLinkTask(
      { id: "safety-2", type: "safety", risk: "critical" },
      [candidate(primary, { context: { isPrimaryHost: true, isCurrentHost: true } })],
      OPTS,
    );
    expect(decision.selectedHost?.deviceId).toBe("primary-desktop");
  });
});

// ===========================================================================
// Scoring invariants
// ===========================================================================

describe("scoring invariants", () => {
  const candidates = [
    candidate(makeManifest("primary", { deviceId: "primary-desktop" }), {
      context: { isPrimaryHost: true, isCurrentHost: true },
      transport: { delivery: "local", reachable: true, latencyMs: 10, localAvailable: true },
    }),
    candidate(makeManifest("companion", { deviceId: "phone" }), {
      context: { isActiveUserDevice: true },
      transport: { delivery: "direct", reachable: true, latencyMs: 120 },
    }),
  ];
  const task: LucaLinkRoutingTask = { id: "conv-6", type: "conversation" };

  it("keeps all subscores within 0–1 and total within 0–100", () => {
    for (const cand of candidates) {
      const score = scoreHostForTask(cand, task, OPTS);
      for (const [key, value] of Object.entries(score)) {
        if (key === "total") {
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(100);
        } else {
          expect(value, key).toBeGreaterThanOrEqual(0);
          expect(value, key).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it("sums default weights to 1.0", () => {
    const sum = Object.values(DEFAULT_ROUTING_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 10);
  });

  it("ranks candidates in descending total order", () => {
    const ranked = rankLucaLinkHosts(task, candidates, OPTS);
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].score.total).toBeGreaterThanOrEqual(ranked[i].score.total);
    }
  });

  it("never selects a blocked host and excludes selected/blocked from fallbacks", () => {
    const guest = makeManifest("guest", { deviceId: "browser" });
    const primary = makeManifest("primary", { deviceId: "primary-desktop" });
    const execution = executionToolHost("workstation");
    const decision = routeLucaLinkTask(
      { id: "mem-3", type: "memory" },
      [
        candidate(guest),
        candidate(primary, { context: { isPrimaryHost: true, isCurrentHost: true } }),
        candidate(execution, { context: { isCurrentHost: false } }),
      ],
      OPTS,
    );

    const blockedIds = new Set(
      decision.blockedHosts.map((b) => b.candidate.manifest.deviceId),
    );
    expect(blockedIds.has(decision.selectedHost?.deviceId ?? "")).toBe(false);
    for (const fallback of decision.fallbackHosts) {
      expect(fallback.manifest.deviceId).not.toBe(decision.selectedHost?.deviceId);
      expect(blockedIds.has(fallback.manifest.deviceId)).toBe(false);
    }
  });

  it("reports eligibility details via isHostEligibleForTask", () => {
    const guest = makeManifest("guest", { deviceId: "browser" });
    const result = isHostEligibleForTask(candidate(guest), { id: "m", type: "memory" }, OPTS);
    expect(result.eligible).toBe(false);
    expect(result.reasons.length).toBeGreaterThan(0);
  });
});

// ===========================================================================
// Terminology (Origin vs Primary Host boundary)
// ===========================================================================

describe("terminology preserves Origin vs Primary Host boundary", () => {
  it("never emits 'Origin approval' and uses 'Primary Host approval'", () => {
    const execution = executionToolHost("workstation");
    const decision = routeLucaLinkTask(
      { id: "tool-6", type: "tool", requiredPermissions: ["shell.execute"] },
      [candidate(execution, { context: { isCurrentHost: true } })],
      OPTS,
    );

    expect(explainRouteDecision(decision)).not.toMatch(/origin approval/i);
    expect(decision.approvalReasons.join(" ")).not.toMatch(/origin/i);
    expect(decision.approvalReasons.join(" ")).toMatch(/Primary Host approval/);
  });

  it("does not define 'origin' as a normal host role", () => {
    expect(lucaLinkHostRoles.map((r) => r.id)).not.toContain("origin");
  });
});

// ===========================================================================
// No side effects at import
// ===========================================================================

describe("module side effects", () => {
  it("does not touch storage, fetch, sensors, or shell at import time", async () => {
    const getItem = vi.fn();
    const setItem = vi.fn();
    const removeItem = vi.fn();
    const fetch = vi.fn();
    const permissionsQuery = vi.fn();
    const getUserMedia = vi.fn();
    const getCurrentPosition = vi.fn();

    vi.stubGlobal("localStorage", { getItem, setItem, removeItem });
    vi.stubGlobal("sessionStorage", { getItem, setItem, removeItem });
    vi.stubGlobal("fetch", fetch);
    vi.stubGlobal("navigator", {
      permissions: { query: permissionsQuery },
      mediaDevices: { getUserMedia },
      geolocation: { getCurrentPosition },
    });
    vi.resetModules();

    await import("./lucaLinkHostRouter");

    expect(getItem).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
    expect(removeItem).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(permissionsQuery).not.toHaveBeenCalled();
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(getCurrentPosition).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
