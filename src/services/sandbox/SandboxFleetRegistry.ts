import type { SandboxFleetBackend } from "../../types/sandboxFleet";

export class SandboxFleetRegistry {
  private readonly backends = new Map<string, SandboxFleetBackend>();

  register(backend: SandboxFleetBackend): void {
    if (!backend.backendId.trim()) throw new Error("Sandbox backend id is required.");
    if (backend.capacity < 0 || backend.activeSessions < 0) throw new Error("Sandbox backend capacity is invalid.");
    this.backends.set(backend.backendId, structuredClone(backend));
  }

  remove(backendId: string): boolean {
    return this.backends.delete(backendId);
  }

  get(backendId: string): SandboxFleetBackend | undefined {
    const backend = this.backends.get(backendId);
    return backend ? structuredClone(backend) : undefined;
  }

  list(): SandboxFleetBackend[] {
    return [...this.backends.values()].map((backend) => structuredClone(backend));
  }

  updateHealth(backendId: string, update: Pick<SandboxFleetBackend, "available" | "activeSessions">): void {
    const backend = this.backends.get(backendId);
    if (!backend) throw new Error("Sandbox backend not found.");
    if (update.activeSessions < 0) throw new Error("Sandbox backend active session count is invalid.");
    this.backends.set(backendId, { ...backend, ...update });
  }
}

export const sandboxFleetRegistry = new SandboxFleetRegistry();

