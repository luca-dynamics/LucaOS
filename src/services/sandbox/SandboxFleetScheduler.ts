import type {
  SandboxFleetBackend,
  SandboxPlacementDecision,
  SandboxPlacementRequest,
} from "../../types/sandboxFleet";
import type { SandboxFleetRegistry } from "./SandboxFleetRegistry";

const trustRank: Record<SandboxFleetBackend["trust"], number> = {
  local_trusted: 0,
  paired_trusted: 1,
  remote_attested: 2,
  unverified: 99,
};

export class SandboxFleetScheduler {
  constructor(private readonly registry: SandboxFleetRegistry) {}

  place(request: SandboxPlacementRequest): SandboxPlacementDecision {
    const reasons: string[] = [];
    if (request.guestOs === "macos" && request.requiresAppleHardware === false) {
      reasons.push("macOS placement cannot disable the Apple hardware requirement.");
    }

    const candidates = this.registry.list().flatMap((backend) => {
      if (!backend.available || backend.activeSessions >= backend.capacity) return [];
      if (backend.trust === "unverified") return [];
      if (request.locality !== "any" && backend.locality !== request.locality) return [];
      if (!request.isolationTiers.includes(backend.isolationTier)) return [];
      if (!backend.guestOs.includes(request.guestOs)) return [];
      if (request.guestOs === "macos" && !backend.appleHardware) return [];
      if (request.capabilities.some((capability) => !backend.capabilities.includes(capability))) return [];

      return backend.images
        .filter((image) => image.guestOs === request.guestOs)
        .filter((image) => image.architecture === request.architecture)
        .filter((image) => !request.distribution || image.distribution === request.distribution)
        .filter((image) => !request.version || image.version === request.version)
        .map((image) => ({ backend, image }));
    });

    candidates.sort((a, b) =>
      trustRank[a.backend.trust] - trustRank[b.backend.trust]
      || a.backend.activeSessions - b.backend.activeSessions
      || a.backend.backendId.localeCompare(b.backend.backendId)
      || a.image.id.localeCompare(b.image.id)
    );

    const selected = reasons.length === 0 ? candidates[0] : undefined;
    if (!selected) reasons.push("No healthy sandbox backend satisfies every placement requirement.");

    return {
      status: selected ? "placed" : "blocked",
      missionId: request.missionId,
      backendId: selected?.backend.backendId ?? null,
      imageId: selected?.image.id ?? null,
      reasons,
      hostFallbackAllowed: false,
    };
  }
}

