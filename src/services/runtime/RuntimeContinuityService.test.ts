import { describe, expect, it } from "vitest";
import { RuntimeContinuityService } from "./RuntimeContinuityService";

class MemoryStorage { private values = new Map<string, string>(); getItem(key: string): string | null { return this.values.get(key) ?? null; } setItem(key: string, value: string): void { this.values.set(key, value); } }

describe("RuntimeContinuityService", () => {
  it("creates, updates, and reads a runtime snapshot", () => {
    const service = new RuntimeContinuityService(new MemoryStorage());
    const created = service.createSnapshot({ runtimeId: "runtime-1", sessionId: "session-1", activeMode: "local" });
    expect(created.lifecycleState).toBe("stopped");
    service.updateSnapshot({ lifecycleState: "idle", scheduledJobCount: 2 });
    const read = service.readSnapshot();
    expect(read?.runtimeId).toBe("runtime-1");
    expect(read?.scheduledJobCount).toBe(2);
  });

  it("summarizes degraded and quarantined resume safety", () => {
    const service = new RuntimeContinuityService(new MemoryStorage());
    service.createSnapshot({ lifecycleState: "degraded", degradedReasons: ["local model offline"] });
    expect(service.getDiagnosticsSummary().canSafelyResume).toBe(true);
    service.updateSnapshot({ lifecycleState: "quarantined", quarantinedItemCount: 1 });
    expect(service.getDiagnosticsSummary().canSafelyResume).toBe(false);
  });
});
