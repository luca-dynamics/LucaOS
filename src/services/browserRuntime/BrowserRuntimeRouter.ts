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
    if (lane === "unknown") {
      return this.deniedUnknown();
    }

    const adapter = this.adapters.find(
      (candidate) => candidate.lane === lane && candidate.canHandle(request),
    );

    if (!adapter) {
      return {
        accepted: false,
        lane,
        runtime: "unknown",
        reason: `No browser runtime adapter matched lane: ${lane}`,
      };
    }

    return adapter.execute(request);
  }

  buildContext(request: BrowserRuntimeRequest): BrowserRouteContext {
    const requiresApproval = request.riskLevel === "dangerous" || request.riskLevel === "sensitive";
    const guardApproved = request.hasGuardApproval === true;

    return {
      request,
      requiresApproval,
      guardApproved,
      shouldSandbox: request.trustTier === "untrusted",
    };
  }

  evaluateGuardRules(context: BrowserRouteContext): BrowserRuntimeRouteResult | null {
    if (context.requiresApproval && !context.guardApproved) {
      return {
        accepted: false,
        lane: "unknown",
        runtime: "unknown",
        reason: "Guard approval required for sensitive or dangerous request",
        requiresApproval: true,
      };
    }

    return null;
  }

  pickLane(context: BrowserRouteContext): BrowserRuntimeLane {
    const { request } = context;

    if (context.shouldSandbox) {
      return "sandbox_browser";
    }

    if (request.preferredLane === "authenticated_direct_host") {
      if (request.trustTier === "trusted" && context.guardApproved) {
        return "authenticated_direct_host";
      }
      return "unknown";
    }

    if (request.preferredLane === "remote_linked_browser") {
      if (request.linkedDeviceTrusted && request.linkedDeviceAvailable) {
        return "remote_linked_browser";
      }
      return "unknown";
    }

    if (this.laneProviders.length > 0) {
      const provider = this.laneProviders.find((candidate) =>
        candidate.canProvide(request, context),
      );
      return provider?.lane ?? "unknown";
    }

    if (request.preferredLane && request.preferredLane !== "unknown") {
      return request.preferredLane;
    }

    const defaultAdapter = this.adapters.find((candidate) => candidate.canHandle(request));
    if (!defaultAdapter) {
      return "unknown";
    }

    return defaultAdapter.lane;
  }

  deniedUnknown(): BrowserRuntimeRouteResult {
    return {
      accepted: false,
      lane: "unknown",
      runtime: "unknown",
      reason: "No browser runtime lane matched request",
    };
  }
}
