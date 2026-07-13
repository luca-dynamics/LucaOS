import type { SandboxBackendProbe, SandboxCapability } from "../../types/sandboxHost";
import type {
  SandboxFleetBackend,
  SandboxFleetOperatorView,
  SandboxFleetSession,
  SandboxFleetSessionSnapshot,
  SandboxFleetSessionStatus,
  SandboxGuestOs,
  SandboxHostPlatform,
  SandboxIsolationTier,
} from "../../types/sandboxFleet";
import { SandboxFleetViewModel } from "./SandboxFleetViewModel";

/**
 * Live bridge between the renderer fleet view and the desktop sandbox broker.
 *
 * The Electron broker (platforms/electron/sandbox/sandboxBroker.cjs) is the
 * source of truth and is reachable only through the narrow preload surface
 * (window.luca.sandbox). This module maps the broker's records into the
 * SandboxFleetOperatorView the fleet panel renders, reusing the tested
 * SandboxFleetViewModel for session/cleanup semantics. It never widens the
 * bridge: only probe/list/listSnapshots/snapshot/cleanupExpired/destroy.
 */

export interface LiveSandboxSessionRecord {
  sessionId: string;
  missionId: string;
  backend: string;
  status?: string;
  capabilities?: string[];
  createdAt?: string;
  updatedAt?: string;
  expiresAt?: string;
  lastSnapshotId?: string;
  runtime?: { name?: string; containerId?: string } | null;
}

export interface LiveSandboxSnapshotRecord {
  snapshotId: string;
  sessionId: string;
  missionId: string;
  backend: string;
  status?: string;
  createdAt?: string;
  capturedAt?: string;
  expiresAt?: string;
}

export interface LiveSandboxBridge {
  probe(): Promise<SandboxBackendProbe>;
  list(): Promise<LiveSandboxSessionRecord[]>;
  listSnapshots(sessionId?: string): Promise<LiveSandboxSnapshotRecord[]>;
  snapshot(sessionId: string): Promise<unknown>;
  cleanupExpired(): Promise<unknown[]>;
  destroy(sessionId: string): Promise<unknown>;
}

export function getLiveSandboxBridge(): LiveSandboxBridge | null {
  if (typeof window === "undefined") return null;
  const bridge = (window as unknown as { luca?: { sandbox?: LiveSandboxBridge } })
    .luca?.sandbox;
  return bridge ?? null;
}

/**
 * The broker enforces TTLs but no concurrent-session cap; this UI planning cap
 * lets the backend card express headroom ("N free") without inventing broker
 * state. Capacity never reads below the live session count.
 */
const LOCAL_SESSION_SOFT_CAP = 3;

const LOCAL_HOST_ID = "this-device";

const BACKEND_TRAITS: Record<
  string,
  { isolationTier: SandboxIsolationTier; guestOs: SandboxGuestOs }
> = {
  docker: { isolationTier: "container", guestOs: "linux" },
  podman: { isolationTier: "container", guestOs: "linux" },
  wsl2: { isolationTier: "vm", guestOs: "linux" },
  windows_sandbox: { isolationTier: "vm", guestOs: "windows" },
  hyperv: { isolationTier: "vm", guestOs: "windows" },
  firecracker: { isolationTier: "microvm", guestOs: "linux" },
  apple_virtualization: { isolationTier: "vm", guestOs: "macos" },
  remote: { isolationTier: "remote_vm", guestOs: "linux" },
};

const traitsFor = (kind: string) =>
  BACKEND_TRAITS[kind] ?? { isolationTier: "container" as const, guestOs: "linux" as const };

const SESSION_STATUSES = new Set<SandboxFleetSessionStatus>([
  "running",
  "suspended",
  "expired",
  "destroyed",
]);

const normalizeStatus = (status?: string): SandboxFleetSessionStatus =>
  status && SESSION_STATUSES.has(status as SandboxFleetSessionStatus)
    ? (status as SandboxFleetSessionStatus)
    : "running";

const KNOWN_CAPABILITIES = new Set<SandboxCapability>([
  "browser",
  "terminal",
  "workspace_read",
  "workspace_write",
  "network",
  "secrets",
]);

const toCapabilities = (values?: string[]): SandboxCapability[] =>
  (values ?? []).filter((value): value is SandboxCapability =>
    KNOWN_CAPABILITIES.has(value as SandboxCapability),
  );

export function detectHostPlatform(): SandboxHostPlatform {
  const platform = (window as unknown as { luca?: { platform?: string } })?.luca
    ?.platform;
  if (platform === "darwin") return "macos";
  if (platform === "win32") return "windows";
  if (typeof platform === "string") return "linux";
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  if (ua.includes("Mac")) return "macos";
  if (ua.includes("Windows")) return "windows";
  return "linux";
}

export interface LiveFleetViewInput {
  probe: SandboxBackendProbe;
  sessions: LiveSandboxSessionRecord[];
  snapshots?: LiveSandboxSnapshotRecord[];
  hostPlatform?: SandboxHostPlatform;
  missionId?: string;
  now?: string;
}

export function buildLiveFleetView(input: LiveFleetViewInput): SandboxFleetOperatorView {
  const hostPlatform = input.hostPlatform ?? detectHostPlatform();
  const probeTraits = traitsFor(input.probe.backend);
  const ready = input.probe.available && input.probe.isolated;
  const backendId = `local-${input.probe.backend}`;
  const runningCount = input.sessions.filter(
    (session) => normalizeStatus(session.status) === "running",
  ).length;

  const backend: SandboxFleetBackend = {
    backendId,
    // The adapter router reports kinds beyond the base SandboxBackendKind
    // union (podman, hyperv, …) and "none" when every adapter is blocked;
    // the card renders the kind as text, so pass it through.
    kind: input.probe.backend as SandboxFleetBackend["kind"],
    hostId: LOCAL_HOST_ID,
    hostPlatform,
    locality: "local",
    isolationTier: probeTraits.isolationTier,
    guestOs: [probeTraits.guestOs],
    images: [],
    capabilities: toCapabilities(input.probe.capabilities),
    available: ready,
    capacity: Math.max(LOCAL_SESSION_SOFT_CAP, runningCount),
    activeSessions: runningCount,
    appleHardware: hostPlatform === "macos",
    trust: "local_trusted",
  };

  const sessions: SandboxFleetSession[] = input.sessions.map((record) => {
    const traits = traitsFor(record.backend);
    const createdAt = record.createdAt ?? new Date(0).toISOString();
    return {
      sessionId: record.sessionId,
      missionId: record.missionId,
      status: normalizeStatus(record.status),
      backendId: `local-${record.backend}`,
      backendKind: record.backend as SandboxFleetBackend["kind"],
      hostId: LOCAL_HOST_ID,
      hostPlatform,
      locality: "local",
      isolationTier: traits.isolationTier,
      guestOs: traits.guestOs,
      imageId:
        record.runtime?.name ||
        record.runtime?.containerId?.slice(0, 12) ||
        record.backend,
      imageDigest: "",
      capabilities: toCapabilities(record.capabilities),
      persistence: "ephemeral",
      runtimeRef: null,
      createdAt,
      updatedAt: record.updatedAt ?? createdAt,
      expiresAt: record.expiresAt,
      lastSnapshotId: record.lastSnapshotId,
      hostFallbackAllowed: false,
    };
  });

  const snapshots: SandboxFleetSessionSnapshot[] = (input.snapshots ?? []).map(
    (record) => {
      const traits = traitsFor(record.backend);
      return {
        snapshotId: record.snapshotId,
        sessionId: record.sessionId,
        missionId: record.missionId,
        status: normalizeStatus(record.status),
        backendId: `local-${record.backend}`,
        backendKind: record.backend as SandboxFleetBackend["kind"],
        guestOs: traits.guestOs,
        imageId: record.backend,
        imageDigest: "",
        persistence: "ephemeral",
        createdAt: record.createdAt ?? new Date(0).toISOString(),
        capturedAt: record.capturedAt ?? new Date(0).toISOString(),
        expiresAt: record.expiresAt,
        hostFallbackAllowed: false,
      };
    },
  );

  const view = new SandboxFleetViewModel().build({
    missionId: input.missionId,
    backends: [backend],
    sessions,
    snapshots,
    artifacts: [],
    activeSessionIdByMission: {},
    now: input.now,
  });

  if (ready) return view;

  // The live probe carries the precise blocker (e.g. "Docker is not
  // installed."), which beats the view model's generic unavailable copy.
  return {
    ...view,
    backends: view.backends.map((entry) =>
      entry.backendId === backendId
        ? { ...entry, blockedReason: input.probe.reason || entry.blockedReason }
        : entry,
    ),
  };
}

export async function loadLiveFleetView(
  missionId?: string,
): Promise<SandboxFleetOperatorView | null> {
  const bridge = getLiveSandboxBridge();
  if (!bridge) return null;
  const [probe, sessions, snapshots] = await Promise.all([
    bridge.probe(),
    bridge.list(),
    bridge.listSnapshots(),
  ]);
  return buildLiveFleetView({ probe, sessions, snapshots, missionId });
}
