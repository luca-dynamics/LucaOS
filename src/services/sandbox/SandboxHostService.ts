import type {
  SandboxBackendKind,
  SandboxBackendProbe,
  SandboxCapability,
  SandboxSessionPlan,
  SandboxSessionRequest,
} from "../../types/sandboxHost";

export interface SandboxBackendAdapter {
  readonly kind: SandboxBackendKind;
  probe(): Promise<SandboxBackendProbe>;
}

const DEFAULT_BACKEND_ORDER: SandboxBackendKind[] = ["docker", "wsl2", "windows_sandbox", "remote"];

const unique = <T>(values: readonly T[]): T[] => [...new Set(values)];

const safeId = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-|-$/g, "") || "mission";

export class SandboxHostService {
  constructor(private readonly adapters: readonly SandboxBackendAdapter[] = []) {}

  async probeBackends(): Promise<SandboxBackendProbe[]> {
    return Promise.all(this.adapters.map(async (adapter) => {
      try {
        return await adapter.probe();
      } catch (error) {
        return {
          backend: adapter.kind,
          available: false,
          isolated: false,
          reason: error instanceof Error ? error.message : "Sandbox backend probe failed.",
          capabilities: [],
        };
      }
    }));
  }

  async planSession(request: SandboxSessionRequest): Promise<SandboxSessionPlan> {
    const probes = await this.probeBackends();
    const preference = unique(request.backendPreference ?? DEFAULT_BACKEND_ORDER);
    const requestedCapabilities = unique(request.capabilities);
    const blockers: string[] = [];

    const selected = preference
      .map((kind) => probes.find((probe) => probe.backend === kind))
      .find((probe) => probe?.available && probe.isolated && this.supports(probe, requestedCapabilities));

    if (!selected) {
      blockers.push("No available isolated sandbox backend satisfies the requested capabilities.");
    }
    if (request.persistence === "persistent" && !request.workspacePath) {
      blockers.push("Persistent sandbox sessions require an explicit workspace path.");
    }
    if (requestedCapabilities.includes("secrets") && !(request.secretIds?.length)) {
      blockers.push("Secret capability requires explicit secret identifiers.");
    }

    return {
      planId: `sandbox-plan-${safeId(request.missionId)}`,
      missionId: request.missionId,
      backend: blockers.length === 0 ? selected?.backend ?? null : null,
      status: blockers.length === 0 ? "ready" : "blocked",
      persistence: request.persistence,
      capabilities: requestedCapabilities,
      workspacePath: request.workspacePath,
      networkAllowlist: unique(request.networkAllowlist ?? []),
      secretIds: unique(request.secretIds ?? []),
      blockers,
      hostFallbackAllowed: false,
    };
  }

  private supports(probe: SandboxBackendProbe, requested: SandboxCapability[]): boolean {
    return requested.every((capability) => probe.capabilities.includes(capability));
  }
}

export const sandboxHostService = new SandboxHostService();

