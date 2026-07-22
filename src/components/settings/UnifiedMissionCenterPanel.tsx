/**
 * Unified Mission Center — product control surface for active missions.
 *
 * Single place for:
 * - MissionControl live mission + goals
 * - Mission tape / verification summary
 * - Gated complete (completeMissionWithVerification)
 *
 * PI Mission Profile advisory remains a separate read-only panel for alignment
 * context; this center is the control path workforce/CU completion also uses.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  missionControlService,
  type MissionGoal,
  type MissionSnapshot,
} from "../../services/agent/MissionControlService";
import type { MissionTapeRecord } from "../../services/missionTape/types";
import type { CompleteProductMissionResult } from "../../services/missionTape/completeProductMission";
import { settingsSurfaceTokens } from "./settingsLayoutStyles";

function goalTone(status: MissionGoal["status"]): string {
  if (status === "COMPLETED") return "var(--luca-success, #4fbf7a)";
  if (status === "FAILED") return "var(--luca-danger, #f07178)";
  if (status === "IN_PROGRESS") return "var(--luca-info, #4f8cff)";
  return settingsSurfaceTokens.textTertiary;
}

export const UnifiedMissionCenterPanel: React.FC = () => {
  const [snapshot, setSnapshot] = useState<MissionSnapshot | null>(null);
  const [tape, setTape] = useState<MissionTapeRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [allowOverride, setAllowOverride] = useState(false);
  const [bridgeAvailable, setBridgeAvailable] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const live = await missionControlService.getActiveMission();
      setSnapshot(live);
      setBridgeAvailable(
        typeof window !== "undefined" &&
          Boolean(window.luca?.missionControl?.getActive),
      );
      if (live?.mission?.id != null) {
        const t = await missionControlService
          .getMissionTapeRecorder()
          .getTape(String(live.mission.id));
        setTape(t);
      } else {
        setTape(null);
      }
    } catch {
      setSnapshot(null);
      setTape(null);
      setBridgeAvailable(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleComplete = async (success: boolean) => {
    if (!snapshot?.mission?.id || busy) return;
    setBusy(true);
    setNote(null);
    try {
      const result: CompleteProductMissionResult =
        await missionControlService.completeMissionWithVerification(
          snapshot.mission.id,
          {
            success,
            verificationOverride: allowOverride,
            overrideReason: allowOverride
              ? "Operator override from Mission Center"
              : undefined,
          },
        );

      if (result.blockedByVerification) {
        setNote(
          result.reason ||
            "Completion blocked: verification gates did not pass. Enable override only if Origin-approved.",
        );
      } else if (result.completed) {
        setNote(
          result.archived
            ? "Mission verified and archived."
            : "Mission verified (Electron archive bridge unavailable on this host).",
        );
      } else if (!success) {
        setNote("Mission marked failed on the verification tape.");
      } else {
        setNote(result.reason || "Finalize finished.");
      }
      await refresh();
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Completion failed.");
    } finally {
      setBusy(false);
    }
  };

  const goals = snapshot?.goals ?? [];
  const completedGoals = goals.filter((g) => g.status === "COMPLETED").length;
  const failedGoals = goals.filter((g) => g.status === "FAILED").length;

  return (
    <div
      className="mt-2 overflow-hidden rounded-2xl border"
      style={{
        borderColor: settingsSurfaceTokens.borderSubtle,
        background: settingsSurfaceTokens.glass,
      }}
    >
      <div
        className="border-b px-4 py-4"
        style={{ borderColor: settingsSurfaceTokens.borderSubtle }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p
              className="text-sm font-semibold"
              style={{ color: settingsSurfaceTokens.textPrimary }}
            >
              Mission Center
            </p>
            <p
              className="mt-1 text-xs leading-relaxed"
              style={{ color: settingsSurfaceTokens.textSecondary }}
            >
              Unified control for the active MissionControl mission: goals,
              verification tape, and gated complete. Workforce and computer-use
              use the same completion path.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading || busy}
            className="rounded-full border px-2.5 py-1 text-[11px] font-medium disabled:opacity-50"
            style={{
              borderColor: settingsSurfaceTokens.borderSubtle,
              color: settingsSurfaceTokens.textSecondary,
            }}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {!bridgeAvailable && (
          <p
            className="text-[11px] leading-relaxed"
            style={{ color: settingsSurfaceTokens.textTertiary }}
          >
            Mission bridge unavailable (web-safe or no Electron). Completion
            still records a local verification tape when a mission id is known.
          </p>
        )}

        {loading && !snapshot ? (
          <p
            className="text-xs"
            style={{ color: settingsSurfaceTokens.textSecondary }}
          >
            Loading active mission…
          </p>
        ) : !snapshot ? (
          <div
            className="rounded-xl border px-3 py-4 text-xs"
            style={{
              borderColor: settingsSurfaceTokens.borderSubtle,
              color: settingsSurfaceTokens.textSecondary,
            }}
          >
            No active mission. Start one via Mission Control (desktop) or a
            workforce run that attaches to MissionControl.
          </div>
        ) : (
          <>
            <div
              className="rounded-xl border p-3"
              style={{ borderColor: settingsSurfaceTokens.borderSubtle }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p
                    className="text-sm font-semibold"
                    style={{ color: settingsSurfaceTokens.textPrimary }}
                  >
                    {snapshot.mission.title}
                  </p>
                  <p
                    className="mt-0.5 text-[11px] font-mono"
                    style={{ color: settingsSurfaceTokens.textTertiary }}
                  >
                    id {snapshot.mission.id} · {snapshot.mission.status}
                  </p>
                </div>
                <span
                  className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                  style={{
                    borderColor: settingsSurfaceTokens.borderSubtle,
                    color: settingsSurfaceTokens.textSecondary,
                  }}
                >
                  Live
                </span>
              </div>
              <p
                className="mt-2 text-[11px]"
                style={{ color: settingsSurfaceTokens.textSecondary }}
              >
                Goals {completedGoals}/{goals.length} complete
                {failedGoals > 0 ? ` · ${failedGoals} failed` : ""}
              </p>
            </div>

            <div>
              <p
                className="text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: settingsSurfaceTokens.textTertiary }}
              >
                Goals
              </p>
              <ul className="mt-2 space-y-1.5">
                {goals.length === 0 && (
                  <li
                    className="text-[11px]"
                    style={{ color: settingsSurfaceTokens.textTertiary }}
                  >
                    No goals on this mission yet.
                  </li>
                )}
                {goals.map((goal) => (
                  <li
                    key={goal.id}
                    className="flex items-start justify-between gap-2 rounded-lg border px-2.5 py-2 text-[11px]"
                    style={{ borderColor: settingsSurfaceTokens.borderSubtle }}
                  >
                    <span style={{ color: settingsSurfaceTokens.textPrimary }}>
                      {goal.description}
                    </span>
                    <span
                      className="shrink-0 font-mono text-[10px] uppercase"
                      style={{ color: goalTone(goal.status) }}
                    >
                      {goal.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div
              className="rounded-xl border p-3"
              style={{ borderColor: settingsSurfaceTokens.borderSubtle }}
            >
              <p
                className="text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: settingsSurfaceTokens.textTertiary }}
              >
                Verification tape
              </p>
              {tape ? (
                <div
                  className="mt-2 space-y-1 text-[11px]"
                  style={{ color: settingsSurfaceTokens.textSecondary }}
                >
                  <p>
                    Status:{" "}
                    <span className="font-mono font-semibold">{tape.status}</span>
                  </p>
                  <p>
                    Steps {tape.steps.length} · Verifications{" "}
                    {tape.verification.length} · Guards {tape.guard.length} ·
                    Recoveries {tape.recovery.length}
                  </p>
                  {tape.verification.slice(-3).map((v, i) => (
                    <p key={`${v.stepId}-${i}`} className="font-mono text-[10px] opacity-80">
                      {v.passed ? "✓" : "✗"} {v.stepId}:{" "}
                      {(v.details || "").slice(0, 80)}
                    </p>
                  ))}
                </div>
              ) : (
                <p
                  className="mt-2 text-[11px]"
                  style={{ color: settingsSurfaceTokens.textTertiary }}
                >
                  No tape yet — created on first gated complete.
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label
                className="flex items-center gap-1.5 text-[11px]"
                style={{ color: settingsSurfaceTokens.textSecondary }}
              >
                <input
                  type="checkbox"
                  checked={allowOverride}
                  onChange={(e) => setAllowOverride(e.target.checked)}
                  className="rounded"
                />
                Origin override (complete even if gates fail)
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleComplete(true)}
                className="rounded-full border px-3 py-1.5 text-[11px] font-semibold disabled:opacity-50"
                style={{
                  borderColor: "color-mix(in srgb, var(--luca-success, #4fbf7a) 40%, transparent)",
                  color: "var(--luca-success, #4fbf7a)",
                }}
              >
                {busy ? "Working…" : "Complete with verification"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleComplete(false)}
                className="rounded-full border px-3 py-1.5 text-[11px] font-semibold disabled:opacity-50"
                style={{
                  borderColor: settingsSurfaceTokens.borderSubtle,
                  color: settingsSurfaceTokens.textSecondary,
                }}
              >
                Mark failed (gated)
              </button>
            </div>
          </>
        )}

        {note && (
          <p
            className="text-[11px] leading-relaxed"
            style={{ color: settingsSurfaceTokens.textSecondary }}
          >
            {note}
          </p>
        )}

        <p
          className="text-[10px] leading-relaxed"
          style={{ color: settingsSurfaceTokens.textTertiary }}
        >
          Alignment advisory (read-only Mission Profile) lives in the panel
          below. Completion always goes through{" "}
          <span className="font-mono">completeMissionWithVerification</span> —
          the same helper workforce and computer-use use.
        </p>
      </div>
    </div>
  );
};
