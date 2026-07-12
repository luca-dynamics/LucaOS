import { describe, expect, it, vi } from "vitest"; import { SandboxRemoteWorkerClient } from "./SandboxRemoteWorkerClient";
const digest = "a".repeat(64);
describe("SandboxRemoteWorkerClient", () => {
  it("rejects non-TLS endpoints", () => { expect(() => new SandboxRemoteWorkerClient({ endpoint: "http://worker", workerId: "w", attestationDigest: digest, tokenProvider: async () => "t" })).toThrow(/HTTPS/); });
  it("checks response attestation", async () => { const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ runtimeId: "r1" }), { status: 200, headers: { "content-type": "application/json", "x-luca-attestation": digest } })); const client = new SandboxRemoteWorkerClient({ endpoint: "https://worker.example", workerId: "w", attestationDigest: digest, tokenProvider: async () => "token", fetchImpl: fetchImpl as typeof fetch }); const result = await client.create({ sessionId: "s", missionId: "m", backend: {} as never, imageId: "i", capabilities: [] as never, persistence: "ephemeral" }); expect(result.runtimeRef).toEqual({ runtimeId: "r1" }); expect(fetchImpl).toHaveBeenCalledOnce(); });
});
