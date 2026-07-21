/**
 * Bridges computer-use mission-tape sink records into MissionTapeRecorderService.
 * Opt-in only — callers must set enableExternalMissionTapeSink / settings flag.
 */

import type {
  ComputerUseMissionTapeExternalSink,
  ComputerUseMissionTapeExternalSinkResult,
  ComputerUseMissionTapeSinkRecord,
} from "../computerUse/types";
import { MissionTapeRecorderService } from "./MissionTapeRecorder";

export interface CreateMissionTapeRecorderExternalSinkOptions {
  recorder?: MissionTapeRecorderService;
  now?: () => string;
}

export interface MissionTapeRecorderExternalSink
  extends ComputerUseMissionTapeExternalSink {
  recorder: MissionTapeRecorderService;
}

export function createMissionTapeRecorderExternalSink(
  options: CreateMissionTapeRecorderExternalSinkOptions = {},
): MissionTapeRecorderExternalSink {
  const recorder = options.recorder ?? new MissionTapeRecorderService();
  const now = options.now ?? (() => new Date().toISOString());
  const ensured = new Set<string>();

  const ensureTape = async (missionId: string, intent: string): Promise<void> => {
    if (ensured.has(missionId)) return;
    const existing = await recorder.getTape(missionId);
    if (!existing) {
      await recorder.createTape(missionId, intent);
    }
    ensured.add(missionId);
  };

  const sink: MissionTapeRecorderExternalSink = {
    recorder,
    async record(
      record: ComputerUseMissionTapeSinkRecord,
    ): Promise<ComputerUseMissionTapeExternalSinkResult> {
      try {
        const missionId = record.missionId || "unknown-mission";
        await ensureTape(missionId, `computer-use:${record.eventType}`);

        const stepId =
          typeof record.payload?.stepId === "string"
            ? record.payload.stepId
            : typeof record.payload?.requestId === "string"
              ? record.payload.requestId
              : record.eventType;

        if (record.eventType.startsWith("computer_use_guard_")) {
          const status = String(record.payload?.status ?? "");
          await recorder.appendGuardDecision(missionId, {
            stepId,
            allowed: status === "allowed" || record.eventType.endsWith("allowed"),
            requiresApproval:
              status === "needs_confirmation" ||
              record.eventType.endsWith("needs_confirmation"),
            reason:
              typeof record.payload?.reason === "string"
                ? record.payload.reason
                : record.eventType,
            timestamp: record.timestamp || now(),
          });
        } else {
          const failed =
            record.eventType.includes("failed") ||
            record.eventType.includes("rejected");
          await recorder.appendStep(missionId, {
            stepId,
            goal: record.eventType,
            status: failed ? "failed" : "executed",
            notes:
              typeof record.payload?.reason === "string"
                ? record.payload.reason
                : JSON.stringify(record.payload ?? {}).slice(0, 500),
            timestamp: record.timestamp || now(),
          });
        }

        return { ok: true, reason: "recorded_to_mission_tape" };
      } catch (error) {
        return {
          ok: false,
          reason:
            error instanceof Error
              ? error.message
              : "mission tape external sink failed",
        };
      }
    },
    getSnapshot: async (missionId?: string) => {
      if (missionId) return recorder.getTape(missionId);
      return recorder.listTapes();
    },
    reset: () => {
      ensured.clear();
      // In-memory recorder has no public clear; new service instances replace it.
    },
  };

  return sink;
}
