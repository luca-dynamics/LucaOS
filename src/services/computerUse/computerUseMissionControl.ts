/**
 * Link computer-use runSteps mission ids to MissionControl when the bridge
 * is available. Soft-fails on web. Complements workforce mission attach.
 */

import { missionControlService } from "../agent/MissionControlService";

export interface EnsureComputerUseMissionControlResult {
  linked: boolean;
  missionControlId?: number;
  reason?: string;
}

/**
 * Ensure a MissionControl mission exists for a computer-use run.
 * - If missionId is numeric, ensure goals can be updated on that mission.
 * - Otherwise start a new MissionControl mission titled from the CU mission id.
 */
export async function ensureComputerUseMissionControl(
  missionId: string,
  options?: {
    intent?: string;
    hasBridge?: () => boolean;
    startMission?: typeof missionControlService.startMission;
    getActiveMission?: typeof missionControlService.getActiveMission;
  },
): Promise<EnsureComputerUseMissionControlResult> {
  const hasBridge =
    options?.hasBridge ??
    (() =>
      typeof window !== "undefined" &&
      Boolean(window.luca?.missionControl?.start));

  if (!hasBridge()) {
    return { linked: false, reason: "MissionControl bridge unavailable" };
  }

  const start =
    options?.startMission?.bind(missionControlService) ??
    ((title: string, metadata?: unknown) =>
      missionControlService.startMission(title, metadata));
  const getActive =
    options?.getActiveMission?.bind(missionControlService) ??
    (() => missionControlService.getActiveMission());

  const numeric = Number(missionId);
  if (Number.isFinite(numeric) && String(numeric) === missionId.trim()) {
    const active = await getActive();
    if (active?.mission.id === numeric) {
      return { linked: true, missionControlId: numeric };
    }
    // Prefer existing active only if ids match; otherwise start titled mission.
  }

  const intent =
    options?.intent?.trim() || `computer-use:${missionId}`;
  const missionControlId = await start(intent, {
    source: "computer_use",
    computerUseMissionId: missionId,
  });

  return { linked: true, missionControlId };
}
