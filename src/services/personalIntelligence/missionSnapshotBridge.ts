import type { MissionSnapshot } from "../agent/MissionControlService";
import { createMissionContextSnapshot } from "../../personal-intelligence/missionRuntime";
import type { PersonalIntelligenceMissionContextSnapshot } from "../../personal-intelligence/missionRuntime";
import type {
  MissionProfile,
  MissionStatus,
} from "../../personal-intelligence/mission/missionTypes";

/**
 * Bridge from the LIVE mission system (MissionControlService — SQLite-backed
 * missions + goals) into Personal Intelligence's advisory mission snapshot.
 *
 * Lives at the services edge so the personal-intelligence subsystem stays pure
 * (it never imports the live mission types). The live mission carries a title
 * and goals-with-statuses; PI's snapshot wants goals, constraints, and success
 * criteria. We map honestly: goals → goals, each goal → a "Complete: …" success
 * criterion (a mission succeeds when its goals are done), and each goal's live
 * status → an operating assumption so real progress is visible. Constraints are
 * left empty (the live model has none), which PI flags as needing user review.
 *
 * The snapshot is built through PI's own createMissionContextSnapshot, so its
 * content-safety and validation gates run on the live data too. Advisory only —
 * no execution authority is created.
 */

const STATUS_MAP: Record<string, MissionStatus> = {
  ACTIVE: "active",
  COMPLETED: "completed",
  ARCHIVED: "cancelled",
};

function statusWords(value: string): string {
  return value.toLowerCase().replace(/_/g, " ");
}

function isoFromEpoch(value: unknown): string {
  const ms = typeof value === "number" ? value : Number(value);
  const date = new Date(Number.isFinite(ms) ? ms : Date.now());
  return date.toISOString();
}

export function buildMissionContextSnapshotFromLive(
  snapshot: MissionSnapshot,
  now: () => Date = () => new Date(),
): PersonalIntelligenceMissionContextSnapshot {
  const { mission, goals } = snapshot;
  const goalTexts = goals.map((goal) => goal.description);

  const profile: MissionProfile = {
    missionId: String(mission.id),
    title: mission.title,
    description:
      (mission.metadata && typeof mission.metadata.description === "string"
        ? mission.metadata.description
        : undefined) ?? `Active mission with ${goalTexts.length} goal(s).`,
    goals: goalTexts,
    // The live model has no explicit constraints; leave empty so PI honestly
    // flags "no constraints — user review required" rather than inventing them.
    constraints: [],
    successCriteria: goalTexts.map((text) => `Complete: ${text}`),
    activeProjectRefs: [],
    operatingMode: "advisory",
    priority: "normal",
    status: STATUS_MAP[mission.status] ?? "active",
    createdAt: isoFromEpoch(mission.created_at),
    updatedAt: isoFromEpoch(mission.updated_at),
  };

  return createMissionContextSnapshot({
    mission: profile,
    mode: "advisory",
    source: "live-mission-control",
    // Surface each goal's real live status as an operating assumption.
    operatingAssumptions: goals.map(
      (goal) => `Goal "${goal.description}" is ${statusWords(goal.status)}.`,
    ),
    now,
  });
}
