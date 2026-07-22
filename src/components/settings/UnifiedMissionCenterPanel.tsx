/**
 * Unified Mission Center — product control surface for active missions.
 *
 * Single place for:
 * - Start mission / add goals / update goal status (MissionControl)
 * - Mission tape / verification summary
 * - Gated complete (completeMissionWithVerification)
 *
 * PI Mission Profile advisory remains a separate read-only panel for alignment.
 * Workforce and computer-use use the same completion path.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  missionControlService,
  type MissionGoal,
  type MissionSnapshot,
} from "../../services/agent/MissionControlService";
import type { MissionTapeRecord } from "../../services/missionTape/types";
import type { CompleteProductMissionResult } from "../../services/missionTape/completeProductMission";
import {
  assessMissionCompletionReadiness,
  formatGateSnapshotLines,
} from "../../services/missionTape/missionCompletionReadiness";
import {
  getLatestMissionCheckpoint,
  listMissionCheckpoints,
  recordMissionCheckpoint,
  recordMissionRollback,
} from "../../services/missionTape/missionTapeCheckpoint";
import { settingsSurfaceTokens } from "./settingsLayoutStyles";

export interface UnifiedMissionCenterPanelProps {
  /**
   * compact = denser layout for right-panel / Operation Center embedding.
   * full = settings Mission Center section (default).
   */
  variant?: "full" | "compact";
}

function goalTone(status: MissionGoal["status"]): string {
  if (status === "COMPLETED") return "var(--luca-success, #4fbf7a)";
  if (status === "FAILED") return "var(--luca-danger, #f07178)";
  if (status === "IN_PROGRESS") return "var(--luca-info, #4f8cff)";
  return settingsSurfaceTokens.textTertiary;
}

export const UnifiedMissionCenterPanel: React.FC<
  UnifiedMissionCenterPanelProps
> = ({ variant = "full" }) => {
  const compact = variant === "compact";
  const [snapshot, setSnapshot] = useState<MissionSnapshot | null>(null);
  const [tape, setTape] = useState<MissionTapeRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [allowOverride, setAllowOverride] = useState(false);
  const [bridgeAvailable, setBridgeAvailable] = useState(true);
  const [newMissionTitle, setNewMissionTitle] = useState("");
  const [newGoalText, setNewGoalText] = useState("");
  const [lastCompletion, setLastCompletion] =
    useState<CompleteProductMissionResult | null>(null);

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
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
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Light poll while a mission is active so workforce/CU goal progress appears live.
  useEffect(() => {
    if (!snapshot?.mission || snapshot.mission.status !== "ACTIVE") return;
    const id = window.setInterval(() => {
      void refresh({ silent: true });
    }, 3000);
    return () => window.clearInterval(id);
  }, [snapshot?.mission?.id, snapshot?.mission?.status, refresh]);

  const handleStartMission = async () => {
    const title = newMissionTitle.trim();
    if (!title || busy) return;
    setBusy(true);
    setNote(null);
    try {
      const id = await missionControlService.startMission(title, {
        source: "mission_center",
      });
      setNewMissionTitle("");
      setNote(`Started mission ${id}.`);
      await refresh();
    } catch (error) {
      setNote(
        error instanceof Error
          ? error.message
          : "Could not start mission (desktop MissionControl required).",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleAddGoal = async () => {
    const text = newGoalText.trim();
    if (!text || !snapshot?.mission?.id || busy) return;
    setBusy(true);
    setNote(null);
    try {
      await missionControlService.addGoal(snapshot.mission.id, text);
      setNewGoalText("");
      setNote("Goal added.");
      await refresh();
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Could not add goal.");
    } finally {
      setBusy(false);
    }
  };

  const handleGoalStatus = async (
    goalId: number,
    status: MissionGoal["status"],
  ) => {
    if (busy) return;
    setBusy(true);
    setNote(null);
    try {
      await missionControlService.updateGoalStatus(goalId, status);
      await refresh();
    } catch (error) {
      setNote(
        error instanceof Error ? error.message : "Could not update goal status.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleComplete = async (success: boolean) => {
    if (!snapshot?.mission?.id || busy) return;
    setBusy(true);
    setNote(null);
    setLastCompletion(null);
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

      setLastCompletion(result);

      if (result.blockedByVerification) {
        const gateLines = formatGateSnapshotLines(result.gateSnapshot, 3);
        setNote(
          [
            result.reason ||
              "Completion blocked: verification gates did not pass. Enable override only if Origin-approved.",
            ...gateLines,
          ].join(" "),
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
  const readiness = useMemo(
    () =>
      assessMissionCompletionReadiness({
        goals: snapshot?.goals,
        tape,
      }),
    [snapshot?.goals, tape],
  );
  const lastGateLines = useMemo(
    () => formatGateSnapshotLines(lastCompletion?.gateSnapshot, 6),
    [lastCompletion],
  );
  const checkpoints = useMemo(() => listMissionCheckpoints(tape), [tape]);
  const latestCheckpoint = useMemo(
    () => getLatestMissionCheckpoint(tape),
    [tape],
  );

  const handleCheckpoint = async () => {
    if (!snapshot?.mission?.id || busy) return;
    setBusy(true);
    setNote(null);
    try {
      const result = await recordMissionCheckpoint({
        missionId: String(snapshot.mission.id),
        intent: snapshot.mission.title,
        label: `Operator checkpoint · goals ${completedGoals}/${goals.length}`,
        goals: goals.map((g) => ({
          id: g.id,
          description: g.description,
          status: g.status,
        })),
        recorder: missionControlService.getMissionTapeRecorder(),
      });
      setNote(
        result.ok
          ? `Checkpoint recorded (${result.checkpointId}).`
          : "Checkpoint failed.",
      );
      await refresh({ silent: true });
    } catch (error) {
      setNote(
        error instanceof Error ? error.message : "Could not record checkpoint.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleRollback = async () => {
    if (!snapshot?.mission?.id || busy) return;
    setBusy(true);
    setNote(null);
    try {
      const result = await recordMissionRollback({
        missionId: String(snapshot.mission.id),
        reason: "Operator rollback from Mission Center (tape-level)",
        recorder: missionControlService.getMissionTapeRecorder(),
      });
      if (result.ok) {
        setNote(
          `Rollback recorded to checkpoint ${result.checkpointId}. Tape-level only — host state is not restored.`,
        );
      } else {
        setNote(result.reason || "Rollback failed.");
      }
      await refresh({ silent: true });
    } catch (error) {
      setNote(
        error instanceof Error ? error.message : "Could not record rollback.",
      );
    } finally {
      setBusy(false);
    }
  };
  const inputClass =
    "w-full rounded-lg border bg-transparent px-2.5 py-1.5 text-[11px] outline-none";
  const inputStyle: React.CSSProperties = {
    borderColor: settingsSurfaceTokens.borderSubtle,
    color: settingsSurfaceTokens.textPrimary,
  };

  return (
    <div
      className={compact ? "mt-0 overflow-hidden rounded-xl border" : "mt-2 overflow-hidden rounded-2xl border"}
      style={{
        borderColor: settingsSurfaceTokens.borderSubtle,
        background: settingsSurfaceTokens.glass,
      }}
    >
      <div
        className={compact ? "border-b px-3 py-3" : "border-b px-4 py-4"}
        style={{ borderColor: settingsSurfaceTokens.borderSubtle }}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p
              className={compact ? "text-xs font-semibold" : "text-sm font-semibold"}
              style={{ color: settingsSurfaceTokens.textPrimary }}
            >
              Mission Center
            </p>
            {!compact && (
              <p
                className="mt-1 text-xs leading-relaxed"
                style={{ color: settingsSurfaceTokens.textSecondary }}
              >
                Unified control for MissionControl: start mission, goals, tape,
                gated complete. Workforce and computer-use share this completion
                path.
              </p>
            )}
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
            {loading ? "…" : "Refresh"}
          </button>
        </div>
      </div>

      <div className={compact ? "space-y-3 p-3" : "space-y-4 p-4"}>
        {!bridgeAvailable && (
          <p
            className="text-[11px] leading-relaxed"
            style={{ color: settingsSurfaceTokens.textTertiary }}
          >
            Mission bridge unavailable (web-safe or no Electron). Start/add goal
            need desktop MissionControl; gated complete still uses local tape
            when a mission id is known.
          </p>
        )}

        {/* Start mission when none active */}
        {!snapshot && !loading && (
          <div
            className="rounded-xl border p-3 space-y-2"
            style={{ borderColor: settingsSurfaceTokens.borderSubtle }}
          >
            <p
              className="text-[11px]"
              style={{ color: settingsSurfaceTokens.textSecondary }}
            >
              No active mission. Start one here (desktop), or let workforce /
              computer-use attach to MissionControl automatically.
            </p>
            <input
              className={inputClass}
              style={inputStyle}
              placeholder="Mission title…"
              value={newMissionTitle}
              onChange={(e) => setNewMissionTitle(e.target.value)}
              disabled={busy || !bridgeAvailable}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleStartMission();
              }}
            />
            <button
              type="button"
              disabled={busy || !bridgeAvailable || !newMissionTitle.trim()}
              onClick={() => void handleStartMission()}
              className="rounded-full border px-3 py-1.5 text-[11px] font-semibold disabled:opacity-50"
              style={{
                borderColor: settingsSurfaceTokens.borderSubtle,
                color: settingsSurfaceTokens.textPrimary,
              }}
            >
              Start mission
            </button>
          </div>
        )}

        {loading && !snapshot ? (
          <p
            className="text-xs"
            style={{ color: settingsSurfaceTokens.textSecondary }}
          >
            Loading active mission…
          </p>
        ) : snapshot ? (
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
                    {typeof snapshot.mission.metadata?.source === "string"
                      ? ` · ${snapshot.mission.metadata.source}`
                      : ""}
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
                    No goals yet — add one below.
                  </li>
                )}
                {goals.map((goal) => (
                  <li
                    key={goal.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-[11px]"
                    style={{ borderColor: settingsSurfaceTokens.borderSubtle }}
                  >
                    <span style={{ color: settingsSurfaceTokens.textPrimary }}>
                      {goal.description}
                    </span>
                    <div className="flex flex-wrap items-center gap-1">
                      <span
                        className="font-mono text-[10px] uppercase"
                        style={{ color: goalTone(goal.status) }}
                      >
                        {goal.status}
                      </span>
                      {goal.status !== "COMPLETED" && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void handleGoalStatus(goal.id, "COMPLETED")
                          }
                          className="rounded border px-1.5 py-0.5 text-[10px] disabled:opacity-50"
                          style={{
                            borderColor: settingsSurfaceTokens.borderSubtle,
                            color: "var(--luca-success, #4fbf7a)",
                          }}
                        >
                          Done
                        </button>
                      )}
                      {goal.status !== "FAILED" && goal.status !== "COMPLETED" && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void handleGoalStatus(goal.id, "FAILED")
                          }
                          className="rounded border px-1.5 py-0.5 text-[10px] disabled:opacity-50"
                          style={{
                            borderColor: settingsSurfaceTokens.borderSubtle,
                            color: settingsSurfaceTokens.textTertiary,
                          }}
                        >
                          Fail
                        </button>
                      )}
                      {goal.status === "PENDING" && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void handleGoalStatus(goal.id, "IN_PROGRESS")
                          }
                          className="rounded border px-1.5 py-0.5 text-[10px] disabled:opacity-50"
                          style={{
                            borderColor: settingsSurfaceTokens.borderSubtle,
                            color: "var(--luca-info, #4f8cff)",
                          }}
                        >
                          Start
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-2 flex flex-wrap gap-2">
                <input
                  className={`${inputClass} min-w-[160px] flex-1`}
                  style={inputStyle}
                  placeholder="New goal…"
                  value={newGoalText}
                  onChange={(e) => setNewGoalText(e.target.value)}
                  disabled={busy || !bridgeAvailable}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleAddGoal();
                  }}
                />
                <button
                  type="button"
                  disabled={busy || !bridgeAvailable || !newGoalText.trim()}
                  onClick={() => void handleAddGoal()}
                  className="rounded-full border px-3 py-1.5 text-[11px] font-semibold disabled:opacity-50"
                  style={{
                    borderColor: settingsSurfaceTokens.borderSubtle,
                    color: settingsSurfaceTokens.textPrimary,
                  }}
                >
                  Add goal
                </button>
              </div>
            </div>

            <div
              className="rounded-xl border p-3"
              style={{ borderColor: settingsSurfaceTokens.borderSubtle }}
            >
              <p
                className="text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: settingsSurfaceTokens.textTertiary }}
              >
                Completion readiness
              </p>
              <p
                className="mt-2 text-[11px] font-semibold"
                style={{
                  color: readiness.likelyCompletable
                    ? "var(--luca-success, #4fbf7a)"
                    : "var(--luca-warning, #e6b450)",
                }}
              >
                {readiness.likelyCompletable
                  ? "Goals look ready for gated complete"
                  : "Not ready — finish goals or use Origin override carefully"}
              </p>
              <p
                className="mt-1 text-[11px]"
                style={{ color: settingsSurfaceTokens.textSecondary }}
              >
                Goals {readiness.goalsCompleted}/{readiness.goalsTotal} complete
                {readiness.goalsInProgress > 0
                  ? ` · ${readiness.goalsInProgress} in progress`
                  : ""}
                {readiness.goalsFailed > 0
                  ? ` · ${readiness.goalsFailed} failed`
                  : ""}
              </p>
              {readiness.blockers.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {readiness.blockers.map((b) => (
                    <li
                      key={b}
                      className="text-[10px] leading-relaxed"
                      style={{ color: "var(--luca-warning, #e6b450)" }}
                    >
                      · {b}
                    </li>
                  ))}
                </ul>
              )}
              {!compact && readiness.signals.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {readiness.signals.map((s) => (
                    <li
                      key={s}
                      className="text-[10px] leading-relaxed"
                      style={{ color: settingsSurfaceTokens.textTertiary }}
                    >
                      · {s}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div
              className="rounded-xl border p-3"
              style={{ borderColor: settingsSurfaceTokens.borderSubtle }}
            >
              <p
                className="text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: settingsSurfaceTokens.textTertiary }}
              >
                Checkpoint / rollback
              </p>
              <p
                className="mt-1 text-[10px] leading-relaxed"
                style={{ color: settingsSurfaceTokens.textTertiary }}
              >
                Tape-level restore points for absorb verification (does not
                reverse host side-effects).
              </p>
              <p
                className="mt-2 text-[11px]"
                style={{ color: settingsSurfaceTokens.textSecondary }}
              >
                {checkpoints.length === 0
                  ? "No checkpoints yet."
                  : `${checkpoints.length} checkpoint(s) · latest: ${latestCheckpoint?.label ?? "—"}`}
              </p>
              {!compact && checkpoints.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {checkpoints.slice(-3).map((cp) => (
                    <li
                      key={cp.checkpointId}
                      className="font-mono text-[10px]"
                      style={{ color: settingsSurfaceTokens.textTertiary }}
                    >
                      {cp.checkpointId}: {cp.label}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleCheckpoint()}
                  className="rounded-full border px-3 py-1.5 text-[11px] font-semibold disabled:opacity-50"
                  style={{
                    borderColor: settingsSurfaceTokens.borderSubtle,
                    color: settingsSurfaceTokens.textPrimary,
                  }}
                >
                  Record checkpoint
                </button>
                <button
                  type="button"
                  disabled={busy || !latestCheckpoint}
                  onClick={() => void handleRollback()}
                  className="rounded-full border px-3 py-1.5 text-[11px] font-semibold disabled:opacity-50"
                  style={{
                    borderColor: settingsSurfaceTokens.borderSubtle,
                    color: "var(--luca-warning, #e6b450)",
                  }}
                >
                  Rollback to latest
                </button>
              </div>
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
                    {tape.verification.length} · Guards {tape.guard.length}
                  </p>
                  {tape.steps.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <p
                        className="text-[10px] font-semibold uppercase tracking-wide"
                        style={{ color: settingsSurfaceTokens.textTertiary }}
                      >
                        Step timeline (tape replay)
                      </p>
                      {(compact ? tape.steps.slice(-4) : tape.steps).map(
                        (step, i) => {
                          const ver = tape.verification.find(
                            (v) => v.stepId === step.stepId && v.passed,
                          );
                          return (
                            <p
                              key={`${step.stepId}-${i}`}
                              className="font-mono text-[10px] leading-relaxed opacity-90"
                            >
                              <span
                                style={{
                                  color:
                                    step.status === "failed"
                                      ? "var(--luca-danger, #f07178)"
                                      : step.status === "verified" || ver
                                        ? "var(--luca-success, #4fbf7a)"
                                        : settingsSurfaceTokens.textSecondary,
                                }}
                              >
                                [{step.status}]
                              </span>{" "}
                              {step.stepId}: {(step.goal || "").slice(0, 72)}
                            </p>
                          );
                        },
                      )}
                      {compact && tape.steps.length > 4 && (
                        <p
                          className="text-[10px]"
                          style={{ color: settingsSurfaceTokens.textTertiary }}
                        >
                          +{tape.steps.length - 4} earlier steps
                        </p>
                      )}
                    </div>
                  )}
                  {!compact &&
                    tape.verification.slice(-3).map((v, i) => (
                      <p
                        key={`${v.stepId}-v-${i}`}
                        className="font-mono text-[10px] opacity-80"
                      >
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

            {lastCompletion?.blockedByVerification && lastGateLines.length > 0 && (
              <div
                className="rounded-xl border p-3"
                style={{
                  borderColor:
                    "color-mix(in srgb, var(--luca-danger, #f07178) 35%, transparent)",
                }}
              >
                <p
                  className="text-[11px] font-semibold uppercase tracking-wide"
                  style={{ color: "var(--luca-danger, #f07178)" }}
                >
                  Last complete blocked by gates
                </p>
                <ul className="mt-2 space-y-1">
                  {lastGateLines.map((line) => (
                    <li
                      key={line}
                      className="font-mono text-[10px] leading-relaxed"
                      style={{ color: settingsSurfaceTokens.textSecondary }}
                    >
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            )}

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
                Origin override
              </label>
              {!readiness.likelyCompletable && !allowOverride && (
                <span
                  className="text-[10px]"
                  style={{ color: settingsSurfaceTokens.textTertiary }}
                >
                  Goals incomplete — complete will likely block
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleComplete(true)}
                className="rounded-full border px-3 py-1.5 text-[11px] font-semibold disabled:opacity-50"
                style={{
                  borderColor:
                    "color-mix(in srgb, var(--luca-success, #4fbf7a) 40%, transparent)",
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
                Mark failed
              </button>
            </div>
          </>
        ) : null}

        {note && (
          <p
            className="text-[11px] leading-relaxed"
            style={{ color: settingsSurfaceTokens.textSecondary }}
          >
            {note}
          </p>
        )}

        {!compact && (
          <p
            className="text-[10px] leading-relaxed"
            style={{ color: settingsSurfaceTokens.textTertiary }}
          >
            Alignment advisory (read-only Mission Profile) stays separate.
            Completion always uses{" "}
            <span className="font-mono">completeMissionWithVerification</span>.
          </p>
        )}
      </div>
    </div>
  );
};
