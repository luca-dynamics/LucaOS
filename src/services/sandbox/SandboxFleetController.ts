import type { SandboxFleetOperatorView } from "../../types/sandboxFleet";
import type { SandboxArtifactBridge } from "./SandboxArtifactBridge";
import type { SandboxFleetRegistry } from "./SandboxFleetRegistry";
import type { SandboxFleetSessionBroker } from "./SandboxFleetSessionBroker";
import { SandboxFleetViewModel } from "./SandboxFleetViewModel";

export class SandboxFleetController {
  constructor(private readonly registry: SandboxFleetRegistry, private readonly sessions: SandboxFleetSessionBroker, private readonly artifacts: SandboxArtifactBridge, private readonly viewModel = new SandboxFleetViewModel()) {}
  view(missionId?: string): SandboxFleetOperatorView {
    const sessions = this.sessions.list(missionId); const activeSessionIdByMission: Record<string, string | undefined> = {};
    for (const mission of new Set(sessions.map((session) => session.missionId))) activeSessionIdByMission[mission] = this.sessions.getActiveSession(mission)?.sessionId;
    return this.viewModel.build({ missionId, backends: this.registry.list(), sessions, artifacts: this.artifacts.list(missionId), snapshots: this.sessions.listSnapshots(), activeSessionIdByMission });
  }
  switchSession(missionId: string, sessionId: string) { return this.sessions.activate(missionId, sessionId); }
  snapshotSession(sessionId: string) { return this.sessions.snapshot(sessionId); }
  emergencyDestroy(sessionId: string) { return this.sessions.destroy(sessionId); }
  cleanupExpired() { return this.sessions.cleanupExpiredSessions(); }
  approveArtifact(artifactId: string) { return this.artifacts.approve(artifactId); }
  rejectArtifact(artifactId: string) { return this.artifacts.reject(artifactId); }
}
