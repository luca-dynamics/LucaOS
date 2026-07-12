import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { SandboxFleetOperatorView } from "../../types/sandboxFleet";
import { SandboxFleetPanel } from "./SandboxFleetPanel";

const view: SandboxFleetOperatorView = {
  missionId: "mission-1", hostFallbackAllowed: false, cleanupCount: 1, snapshots: [],
  backends: [{ backendId: "docker-1", kind: "docker", hostId: "host-1", hostPlatform: "linux", locality: "local", isolationTier: "container", available: true, trust: "local_trusted", capacity: 2, activeSessions: 1, remainingSlots: 1, guestOs: ["linux"], capabilities: ["terminal"] }],
  sessions: [{ sessionId: "session-1", missionId: "mission-1", status: "running", backendId: "docker-1", guestOs: "linux", imageId: "ubuntu", persistence: "mission", active: false, switchable: true, emergencyDestroyAllowed: true, expired: false, needsCleanup: false }],
  artifacts: [{ artifactId: "artifact-1", missionId: "mission-1", sourceSessionId: "session-1", kind: "build_output", name: "build.zip", digest: "sha256:test", scanStatus: "passed", approvalStatus: "pending", importCount: 0, blockedReason: "Artifact transfer is pending approval." }],
};

describe("SandboxFleetPanel", () => {
  it("shows fail-closed fleet state and dispatches guarded actions", () => {
    const onSwitchSession = vi.fn(); const onApproveArtifact = vi.fn();
    render(<SandboxFleetPanel view={view} onSwitchSession={onSwitchSession} onApproveArtifact={onApproveArtifact} />);
    expect(screen.getByText("Host fallback off")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Switch here" })); fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    expect(onSwitchSession).toHaveBeenCalledWith("session-1"); expect(onApproveArtifact).toHaveBeenCalledWith("artifact-1");
  });
  it("disables state-changing actions while another action is running", () => {
    render(<SandboxFleetPanel view={view} busyAction="snapshot" onSwitchSession={vi.fn()} onApproveArtifact={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Switch here" })).toBeDisabled(); expect(screen.getByRole("button", { name: "Approve" })).toBeDisabled();
  });
});
