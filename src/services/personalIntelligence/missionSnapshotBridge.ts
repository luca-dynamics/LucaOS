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
 * criteria. We map honestly: goals → goals, metadata.constraints when present,
 * metadata.successCriteria or goal-derived "Complete: …" criteria otherwise.
 * Each goal's live status → an operating assumption so real progress is visible.
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

/** Pull a string array from mission.metadata when present (honest passthrough). */
export function readMetadataStringList(
  metadata: unknown,
  key: string,
): string[] {
  if (!metadata || typeof metadata !== "object") return [];
  const value = (metadata as Record<string, unknown>)[key];
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function readMetadataString(metadata: unknown, key: string): string | undefined {
  if (!metadata || typeof metadata !== "object") return undefined;
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function buildMissionContextSnapshotFromLive(
  snapshot: MissionSnapshot,
  now: () => Date = () => new Date(),
): PersonalIntelligenceMissionContextSnapshot {
  const { mission, goals } = snapshot;
  const goalTexts = goals.map((goal) => goal.description);
  const metadata = mission.metadata;

  // Prefer explicit metadata lists when the live mission carries them; fall
  // back to goal-derived success criteria so the snapshot is still valid.
  const constraints = readMetadataStringList(metadata, "constraints");
  const metadataCriteria = readMetadataStringList(metadata, "successCriteria");
  const successCriteria =
    metadataCriteria.length > 0
      ? metadataCriteria
      : goalTexts.map((text) => `Complete: ${text}`);
  const projectRefs = readMetadataStringList(metadata, "activeProjectRefs");

  const profile: MissionProfile = {
    missionId: String(mission.id),
    title: mission.title,
    description:
      readMetadataString(metadata, "description") ??
      `Active mission with ${goalTexts.length} goal(s).`,
    goals: goalTexts,
    constraints,
    successCriteria,
    activeProjectRefs: projectRefs,
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
    relatedProjectIds: projectRefs.length > 0 ? projectRefs : undefined,
    now,
  });
}
