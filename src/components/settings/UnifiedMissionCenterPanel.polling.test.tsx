// @vitest-environment jsdom
import React from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getActiveMission = vi.fn();
const getTape = vi.fn(async () => null);

vi.mock("../../services/agent/MissionControlService", () => ({
  missionControlService: {
    getActiveMission: (...args: unknown[]) => getActiveMission(...args),
    getMissionTapeRecorder: () => ({ getTape }),
    startMission: vi.fn(),
    addGoal: vi.fn(),
    updateGoalStatus: vi.fn(),
    completeMissionWithVerification: vi.fn(),
  },
}));

import { UnifiedMissionCenterPanel } from "./UnifiedMissionCenterPanel";

function missionSnapshot(title: string, status = "ACTIVE") {
  return {
    mission: { id: 7, title, status, created_at: 1, updated_at: 2 },
    goals: [],
  };
}

/** Let pending promises settle while fake timers are installed. */
async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function advance(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
  await flush();
}

describe("UnifiedMissionCenterPanel polling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    getActiveMission.mockReset();
    getTape.mockClear();
    (window as unknown as { luca: unknown }).luca = {
      missionControl: { getActive: vi.fn() },
    };
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    delete (window as unknown as { luca?: unknown }).luca;
  });

  it("discovers a mission started after the panel mounted", async () => {
    // Panel opens with nothing running, then a workforce run starts a mission.
    getActiveMission.mockResolvedValue(null);
    render(<UnifiedMissionCenterPanel />);
    await flush();
    expect(screen.queryByText(/Ship the revamp/)).toBeNull();

    getActiveMission.mockResolvedValue(missionSnapshot("Ship the revamp"));
    await advance(10000);

    expect(screen.getByText("Ship the revamp")).toBeTruthy();
  });

  it("polls faster once a mission is active", async () => {
    getActiveMission.mockResolvedValue(missionSnapshot("Live mission"));
    render(<UnifiedMissionCenterPanel />);
    await flush();

    const afterMount = getActiveMission.mock.calls.length;
    await advance(3000);
    expect(getActiveMission.mock.calls.length).toBeGreaterThan(afterMount);
  });

  it("ignores a slow response that a newer request superseded", async () => {
    let releaseFirst: (v: unknown) => void = () => {};
    getActiveMission.mockImplementationOnce(
      () => new Promise((resolve) => (releaseFirst = resolve)),
    );
    render(<UnifiedMissionCenterPanel />);
    await flush();

    // A newer request resolves first with the current mission.
    getActiveMission.mockResolvedValue(missionSnapshot("Newer mission"));
    await advance(10000);
    expect(screen.getByText("Newer mission")).toBeTruthy();

    // The original slow request now lands with stale data — it must not win.
    await act(async () => {
      releaseFirst(missionSnapshot("Stale mission"));
    });
    await flush();

    expect(screen.queryByText(/Stale mission/)).toBeNull();
    expect(screen.getByText("Newer mission")).toBeTruthy();
  });

  it("stops polling when the mission bridge is unavailable", async () => {
    delete (window as unknown as { luca?: unknown }).luca;
    getActiveMission.mockResolvedValue(null);
    render(<UnifiedMissionCenterPanel />);
    await flush();

    const afterMount = getActiveMission.mock.calls.length;
    await advance(30000);
    expect(getActiveMission.mock.calls.length).toBe(afterMount);
  });
});
