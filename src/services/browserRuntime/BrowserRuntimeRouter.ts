import {
  BrowserRuntimeLane,
  BrowserRuntimePolicy,
  BrowserRuntimeProvider,
  BrowserRuntimeRouteDecision,
  BrowserRuntimeRouteRequest,
} from "./types";

const DEFAULT_LANES: BrowserRuntimeLane[] = [
  "sandbox_browser",
  "ghost_browser",
  "direct_host_browser",
  "remote_linked_browser",
  "custom",
];

const baseDecision = (): BrowserRuntimeRouteDecision => ({
  allowed: false,
  requiresApproval: false,
  reason: "no route",
});

export class BrowserRuntimeRouter {
  private readonly providers: BrowserRuntimeProvider[] = [];

  constructor(private readonly policies: BrowserRuntimePolicy[] = []) {}

  registerProvider(provider: BrowserRuntimeProvider): void {
    this.providers.push(provider);
  }

  listProviders(): BrowserRuntimeProvider[] {
    return [...this.providers];
  }

  preferSandboxForRisk(request: BrowserRuntimeRouteRequest): BrowserRuntimeLane {
    if (request.context.trustTier === "untrusted") return "sandbox_browser";
    if (request.context.riskLevel !== "safe") return "sandbox_browser";
    return request.preferredLane ?? "ghost_browser";
  }

  requireGuardForSensitiveAction(request: BrowserRuntimeRouteRequest): boolean {
    return request.context.riskLevel === "dangerous" || request.context.riskLevel === "sensitive";
  }

  async route(request: BrowserRuntimeRouteRequest): Promise<BrowserRuntimeRouteDecision> {
    let decision: BrowserRuntimeRouteDecision = baseDecision();

    if (request.context.riskLevel === "dangerous" && !request.context.hasGuardApproval) {
      return {
        allowed: false,
        requiresApproval: true,
        reason: "dangerous browser action requires Luca Guard approval",
      };
    }

    if (request.context.requiresAuthentication) {
      const allowed = request.context.trustTier === "trusted" && !!request.context.hasGuardApproval;
      if (!allowed) {
        return {
          allowed: false,
          requiresApproval: true,
          reason: "authenticated session requires trusted context and approval",
        };
      }
    }

    if (request.preferredLane === "remote_linked_browser") {
      const linkedAllowed = request.context.linkedDeviceAvailable && request.context.linkedDeviceTrusted && request.context.trustTier === "trusted";
      if (!linkedAllowed) {
        return {
          allowed: false,
          requiresApproval: false,
          reason: "remote linked browser allowed only for trusted linked-device context",
        };
      }
    }

    const preferred = this.preferSandboxForRisk(request);
    const candidateLanes = [preferred, ...(request.preferredLane ? [request.preferredLane] : []), ...DEFAULT_LANES]
      .filter((v, i, a) => a.indexOf(v) === i);

    for (const lane of candidateLanes) {
      const provider = await this.findAvailableProvider(lane);
      if (provider) {
        decision = {
          allowed: true,
          lane,
          providerId: provider.id,
          requiresApproval: this.requireGuardForSensitiveAction(request),
          reason: lane === "sandbox_browser" ? "sandbox preferred for untrusted/high-risk/uncertain context" : "routed by available provider",
        };
        break;
      }
    }

    for (const policy of this.policies) {
      const override = policy.evaluate(request);
      if (override) {
        decision = { ...decision, ...override };
      }
    }

    if (!decision.allowed) {
      return {
        ...decision,
        reason: decision.reason || "no provider available; denied",
      };
    }

    return decision;
  }

  private async findAvailableProvider(lane: BrowserRuntimeLane): Promise<BrowserRuntimeProvider | null> {
    const providers = this.providers.filter((p) => p.lane === lane);
    for (const p of providers) {
      if (await p.isAvailable()) return p;
    }
    return null;
  }
}
