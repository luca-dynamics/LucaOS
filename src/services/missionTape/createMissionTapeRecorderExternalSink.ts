/**
 * Bridges computer-use mission-tape sink records into MissionTapeRecorderService.
 * Opt-in only — callers must set enableExternalMissionTapeSink / settings flag.
 *
 * Absorb Phase 1: completion events finalize via verification gate
 * (`finalizeMissionTapeWithVerification`).
 */

import type {
  ComputerUseMissionTapeExternalSink,
  ComputerUseMissionTapeExternalSinkResult,
  ComputerUseMissionTapeSinkRecord,
} from "../computerUse/types";
import type { MissionTapeRecorderService } from "./MissionTapeRecorder";
import { sharedMissionTapeRecorder } from "./sharedMissionTapeRecorder";
import {
  finalizeMissionTapeWithVerification,
  type FinalizeMissionTapeWithVerificationResult,
} from "./missionTapeCompletionGate";
import type { MissionTapeRecord } from "./types";

export interface CreateMissionTapeRecorderExternalSinkOptions {
  recorder?: MissionTapeRecorderService;
  now?: () => string;
  /**
   * When true (default), mission_* / *_completed / *_failed event types
   * trigger gated finalize.
   */
  autoFinalizeOnTerminalEvents?: boolean;
}

export interface MissionTapeRecorderExternalSink
  extends ComputerUseMissionTapeExternalSink {
  recorder: MissionTapeRecorderService;
  /**
   * Explicit completion with GSD verification gates.
   * Prefer this over raw finalizeTape({ status: "completed" }).
   */
  completeMission: (
    missionId: string,
    options?: {
      success?: boolean;
      verificationOverride?: boolean;
      overrideReason?: string;
      result?: MissionTapeRecord["result"];
    },
  ) => Promise<FinalizeMissionTapeWithVerificationResult>;
}

function isTerminalSuccessEvent(eventType: string): boolean {
  const t = eventType.toLowerCase();
  return (
    t.includes("mission_completed") ||
    t.endsWith("_completed") ||
    t.includes("mission_success")
  ) && !t.includes("failed") && !t.includes("rejected") && !t.includes("aborted");
}

function isTerminalFailureEvent(eventType: string): boolean {
  const t = eventType.toLowerCase();
  return (
    t.includes("mission_failed") ||
    t.includes("mission_aborted") ||
    (t.includes("failed") && t.includes("mission")) ||
    t.endsWith("_aborted")
  );
}

export function createMissionTapeRecorderExternalSink(
  options: CreateMissionTapeRecorderExternalSinkOptions = {},
): MissionTapeRecorderExternalSink {
  const recorder = options.recorder ?? sharedMissionTapeRecorder;
  const now = options.now ?? (() => new Date().toISOString());
  const autoFinalize = options.autoFinalizeOnTerminalEvents !== false;
  const ensured = new Set<string>();

  const ensureTape = async (missionId: string, intent: string): Promise<void> => {
    if (ensured.has(missionId)) return;
    const existing = await recorder.getTape(missionId);
    if (!existing) {
      await recorder.createTape(missionId, intent);
    }
    ensured.add(missionId);
  };

  const completeMission: MissionTapeRecorderExternalSink["completeMission"] =
    async (missionId, completeOptions = {}) => {
      const success = completeOptions.success !== false;
      return finalizeMissionTapeWithVerification(recorder, {
        missionId,
        desiredStatus: success ? "completed" : "failed",
        verificationOverride: completeOptions.verificationOverride,
        overrideReason: completeOptions.overrideReason,
        result: completeOptions.result,
        verificationContext: {
          intentClear: true,
          permissionGranted: true,
          capabilityAvailable: true,
          userConfirmationProvided: true,
          originReviewProvided: Boolean(completeOptions.verificationOverride),
        },
      });
    };

  const sink: MissionTapeRecorderExternalSink = {
    recorder,
    completeMission,
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

        // Absorb: terminal events finalize through verification gate.
        if (autoFinalize) {
          if (isTerminalSuccessEvent(record.eventType)) {
            const completion = await completeMission(missionId, {
              success: true,
              verificationOverride:
                record.payload?.verificationOverride === true,
              overrideReason:
                typeof record.payload?.overrideReason === "string"
                  ? record.payload.overrideReason
                  : undefined,
            });
            return {
              ok: completion.ok,
              reason: completion.blockedByVerification
                ? completion.reason
                : "recorded_and_completion_gated",
            };
          }
          if (isTerminalFailureEvent(record.eventType)) {
            await completeMission(missionId, { success: false });
            return { ok: true, reason: "recorded_and_failed_finalized" };
          }
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
