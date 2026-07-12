import { describe, expect, it, vi } from "vitest"; import { ClamAvSandboxArtifactScanner, SandboxAuditLog, SandboxSecretLeaseBroker } from "./SandboxRuntimeGuardrails";
describe("sandbox runtime guardrails", () => {
  it("persists audit events", async () => { let value: string | null = null; const log = new SandboxAuditLog({ read: async () => value, write: async (_key, next) => { value = next; } }, "audit", () => "event-1", () => "2026-01-01T00:00:00.000Z"); await log.append({ type: "session.create", outcome: "completed", details: {} }); expect(await log.list()).toHaveLength(1); });
  it("makes secret leases single use", () => { const broker = new SandboxSecretLeaseBroker(() => "lease", () => 1000); broker.issue("session", "secret"); expect(broker.consume("lease", "session")).toBe("secret"); expect(() => broker.consume("lease", "session")).toThrow(); });
  it("fails artifact scans closed", async () => { const scanner = new ClamAvSandboxArtifactScanner(vi.fn(async () => { throw new Error(); })); expect((await scanner.scan({ artifactId: "a", bytes: new Uint8Array([1]), digest: "d" })).status).toBe("failed"); });
});
