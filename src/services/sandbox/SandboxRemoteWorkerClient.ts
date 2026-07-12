import type { SandboxFleetRuntimeAdapter } from "./SandboxFleetSessionBroker";
import type { SandboxCapability } from "../../types/sandboxHost";
import type { SandboxFleetBackend, SandboxFleetCommand } from "../../types/sandboxFleet";

export interface SandboxRemoteWorkerClientOptions {
  endpoint: string;
  workerId: string;
  attestationDigest: string;
  tokenProvider: () => Promise<string>;
  fetchImpl?: typeof fetch;
}

export class SandboxRemoteWorkerClient implements SandboxFleetRuntimeAdapter {
  private readonly endpoint: string;
  private readonly fetchImpl: typeof fetch;
  constructor(private readonly options: SandboxRemoteWorkerClientOptions) {
    const endpoint = new URL(options.endpoint);
    if (endpoint.protocol !== "https:") throw new Error("Sandbox remote workers require HTTPS.");
    if (!/^[a-f0-9]{64}$/i.test(options.attestationDigest)) throw new Error("Sandbox worker attestation digest is invalid.");
    this.endpoint = endpoint.href.replace(/\/$/, ""); this.fetchImpl = options.fetchImpl ?? fetch;
  }
  async create(input: { sessionId: string; missionId: string; backend: SandboxFleetBackend; imageId: string; capabilities: SandboxCapability[]; persistence: "ephemeral" | "mission" | "persistent" }) {
    return { runtimeRef: await this.request("/v1/sessions", { method: "POST", body: { sessionId: input.sessionId, missionId: input.missionId, imageId: input.imageId, capabilities: input.capabilities, persistence: input.persistence } }) };
  }
  async execute(runtimeRef: unknown, command: SandboxFleetCommand) { return this.request(`/v1/sessions/${this.runtimeId(runtimeRef)}/execute`, { method: "POST", body: command }); }
  async suspend(runtimeRef: unknown) { await this.request(`/v1/sessions/${this.runtimeId(runtimeRef)}/suspend`, { method: "POST" }); }
  async resume(runtimeRef: unknown) { await this.request(`/v1/sessions/${this.runtimeId(runtimeRef)}/resume`, { method: "POST" }); }
  async snapshot(runtimeRef: unknown) { return this.request(`/v1/sessions/${this.runtimeId(runtimeRef)}/snapshots`, { method: "POST" }); }
  async destroy(runtimeRef: unknown) { await this.request(`/v1/sessions/${this.runtimeId(runtimeRef)}`, { method: "DELETE" }); }
  private runtimeId(ref: unknown): string { const id = (ref as { runtimeId?: unknown })?.runtimeId; if (typeof id !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(id)) throw new Error("Remote sandbox runtime reference is invalid."); return id; }
  private async request(path: string, input: { method: string; body?: unknown }): Promise<any> {
    const token = await this.options.tokenProvider(); if (!token) throw new Error("Sandbox worker credential is unavailable.");
    const response = await this.fetchImpl(`${this.endpoint}${path}`, { method: input.method, headers: { authorization: `Bearer ${token}`, "content-type": "application/json", "x-luca-worker-id": this.options.workerId, "x-luca-attestation": this.options.attestationDigest }, body: input.body === undefined ? undefined : JSON.stringify(input.body), signal: AbortSignal.timeout(120_000) });
    if (!response.ok) throw new Error(`Sandbox worker request failed (${response.status}).`);
    const proof = response.headers.get("x-luca-attestation"); if (proof !== this.options.attestationDigest) throw new Error("Sandbox worker response attestation mismatch.");
    return response.status === 204 ? undefined : response.json();
  }
}
