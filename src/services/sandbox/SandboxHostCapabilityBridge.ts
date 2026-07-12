import type {
  SandboxFleetSession,
  SandboxHostCapability,
  SandboxHostCapabilityRequest,
} from "../../types/sandboxFleet";

export interface SandboxHostCapabilitySessionProvider {
  get(sessionId: string): SandboxFleetSession | undefined;
}

export class SandboxHostCapabilityBridge {
  private readonly requests = new Map<string, SandboxHostCapabilityRequest>();

  constructor(
    private readonly sessions: SandboxHostCapabilitySessionProvider,
    private readonly options: {
      idFactory?: () => string;
      now?: () => string;
      ttlMs?: number;
    } = {},
  ) {}

  request(input: {
    missionId: string;
    sessionId: string;
    capability: SandboxHostCapability;
    reason: string;
    scope?: Record<string, string | number | boolean>;
  }): SandboxHostCapabilityRequest {
    const session = this.sessions.get(input.sessionId);
    if (!session) throw new Error("Sandbox session not found.");
    if (session.missionId !== input.missionId) throw new Error("Sandbox session does not belong to this mission.");
    if (session.status !== "running") throw new Error("Sandbox session is not running.");

    const reason = input.reason.trim();
    if (!reason) throw new Error("Host capability request requires a reason.");
    const createdAtMs = Date.parse(this.now());
    const ttlMs = this.options.ttlMs ?? 10 * 60 * 1000;
    const request: SandboxHostCapabilityRequest = {
      requestId: this.options.idFactory?.() ?? crypto.randomUUID(),
      missionId: input.missionId,
      sessionId: input.sessionId,
      capability: input.capability,
      reason,
      scope: { ...(input.scope ?? {}) },
      status: "pending",
      createdAt: new Date(createdAtMs).toISOString(),
      expiresAt: new Date(createdAtMs + ttlMs).toISOString(),
      hostFallbackAllowed: false,
    };

    this.requests.set(request.requestId, request);
    return structuredClone(request);
  }

  list(missionId?: string): SandboxHostCapabilityRequest[] {
    return [...this.requests.values()]
      .filter((request) => !missionId || request.missionId === missionId)
      .map((request) => this.withExpiry(request))
      .map((request) => structuredClone(request));
  }

  get(requestId: string): SandboxHostCapabilityRequest | undefined {
    const request = this.requests.get(requestId);
    return request ? structuredClone(this.withExpiry(request)) : undefined;
  }

  approve(requestId: string): SandboxHostCapabilityRequest {
    return this.decide(requestId, "approved");
  }

  reject(requestId: string): SandboxHostCapabilityRequest {
    return this.decide(requestId, "rejected");
  }

  consume(requestId: string): SandboxHostCapabilityRequest {
    const request = this.requirePendingOrApproved(requestId);
    if (request.status !== "approved") throw new Error("Host capability request is not approved.");
    const updated = { ...request, status: "consumed" as const, consumedAt: this.now() };
    this.requests.set(requestId, updated);
    return structuredClone(updated);
  }

  private decide(requestId: string, status: "approved" | "rejected"): SandboxHostCapabilityRequest {
    const request = this.requirePendingOrApproved(requestId);
    if (request.status !== "pending") throw new Error("Host capability request is already decided.");
    const updated = { ...request, status, decidedAt: this.now() };
    this.requests.set(requestId, updated);
    return structuredClone(updated);
  }

  private requirePendingOrApproved(requestId: string): SandboxHostCapabilityRequest {
    const request = this.requests.get(requestId);
    if (!request) throw new Error("Host capability request not found.");
    return this.withExpiry(request);
  }

  private withExpiry(request: SandboxHostCapabilityRequest): SandboxHostCapabilityRequest {
    if ((request.status === "pending" || request.status === "approved") && Date.parse(request.expiresAt) <= Date.parse(this.now())) {
      const expired = { ...request, status: "expired" as const };
      this.requests.set(request.requestId, expired);
      return expired;
    }
    return request;
  }

  private now(): string {
    return this.options.now?.() ?? new Date().toISOString();
  }
}

