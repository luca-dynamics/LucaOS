import {
  BrowserRouteContext,
  BrowserRuntimeAdapter,
  BrowserRuntimeLane,
  BrowserRuntimeLaneProvider,
  BrowserRuntimeRequest,
  BrowserRuntimeRouteResult,
} from "./types";

export class BrowserRuntimeRouter {
  constructor(
    private readonly adapters: BrowserRuntimeAdapter[] = [],
    private readonly laneProviders: BrowserRuntimeLaneProvider[] = [],
  ) {}

  registerAdapter(adapter: BrowserRuntimeAdapter): void {
    this.adapters.push(adapter);
  }

  registerLaneProvider(provider: BrowserRuntimeLaneProvider): void {
    this.laneProviders.push(provider);
  }

  async route(request: BrowserRuntimeRequest): Promise<BrowserRuntimeRouteResult> {
    const context = this.buildContext(request);
    const guardDecision = this.evaluateGuardRules(context);
    if (guardDecision) {
      return guardDecision;
    }

    const lane = this.pickLane(context);

    if (this.laneProviders.length > 0) {
      const provider = this.laneProviders.find(
        (candidate) => candidate.lane === lane && candidate.isAvailable(request, context),
      );

      if (provider) {
        return provider.route(request, context);
      }

      return this.deniedUnknown("No browser runtime lane provider matched request", false);
    }

    const adapter = this.adapters.find((candidate) => candidate.canHandle(request));
    if (adapter) {
      return adapter.execute(request);
    }

    return this.deniedUnknown("No browser runtime provider matched request", false);
  }

  private buildContext(request: BrowserRuntimeRequest): BrowserRouteContext {
    return {
      trustTier: request.trustTier ?? "verified",
      riskLevel: request.riskLevel ?? "safe",
      requiresAuthentication: request.requiresAuthentication ?? false,
      hasGuardApproval: request.hasGuardApproval ?? false,
      linkedDeviceTrusted: request.linkedDeviceTrusted ?? false,
      linkedDeviceAvailable: request.linkedDeviceAvailable ?? false,
      preferredLane: request.preferredLane,
    };
  }

  private evaluateGuardRules(context: BrowserRouteContext): BrowserRuntimeRouteResult | null {
    if (context.riskLevel === "dangerous" && !context.hasGuardApproval) {
      return this.deniedUnknown("Dangerous browser action requires guard approval", true);
    }

    if (context.riskLevel === "sensitive" && !context.hasGuardApproval) {
      return this.deniedUnknown("Sensitive browser action requires guard approval", true);
    }

    return null;
  }

  private pickLane(context: BrowserRouteContext): BrowserRuntimeLane {
    if (context.trustTier === "untrusted" || context.riskLevel !== "safe") {
      return "sandbox_browser";
    }

    if (context.preferredLane === "remote_linked_browser") {
      return context.linkedDeviceTrusted && context.linkedDeviceAvailable
        ? "remote_linked_browser"
        : "unknown";
    }

    if (context.requiresAuthentication) {
      return context.trustTier === "trusted" && context.hasGuardApproval
        ? "direct_host_browser"
        : "sandbox_browser";
    }

    if (context.preferredLane === "direct_host_browser") {
      return context.trustTier === "trusted" && context.hasGuardApproval
        ? "direct_host_browser"
        : "sandbox_browser";
    }

    if (context.preferredLane === "custom") {
      return "custom";
    }

    return "ghost_browser";
  }

  private deniedUnknown(reason: string, requiresApproval: boolean): BrowserRuntimeRouteResult {
    return {
      accepted: false,
      lane: "unknown",
      runtime: "unknown",
      reason,
      requiresApproval,
    };
  }
}
