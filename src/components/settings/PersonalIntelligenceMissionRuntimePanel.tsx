import React, { useEffect, useState } from "react";
import {
  alignedMissionEvaluationFixture,
  missionAdvisoryRecommendationFixture,
  missionCollaborativeGuidanceFixture,
  safeMissionContextSnapshotFixture,
  summarizeMissionAdvisoryContext,
  summarizeMissionRuntimeReadiness,
  type PersonalIntelligenceMissionContextSnapshot,
} from "../../personal-intelligence/missionRuntime";
import { missionControlService } from "../../services/agent/MissionControlService";
import { buildMissionContextSnapshotFromLive } from "../../services/personalIntelligence/missionSnapshotBridge";
import { settingsSurfaceTokens } from "./settingsLayoutStyles";

export const PersonalIntelligenceMissionRuntimePanel: React.FC = () => {
  // Show the REAL active mission (SQLite via MissionControlService) when one
  // exists; fall back to the illustrative fixture on web / when nothing is
  // active, so the surface still explains itself. The advisory evaluation /
  // recommendation / guidance below stay illustrative — there is no live
  // proposal to evaluate against — so they remain honestly labelled "sample".
  const [snapshot, setSnapshot] =
    useState<PersonalIntelligenceMissionContextSnapshot>(
      safeMissionContextSnapshotFixture,
    );
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    let active = true;
    missionControlService
      .getActiveMission()
      .then((live) => {
        if (!active || !live) return;
        setSnapshot(buildMissionContextSnapshotFromLive(live));
        setIsLive(true);
      })
      .catch(() => {
        /* keep the fixture fallback */
      });
    return () => {
      active = false;
    };
  }, []);

  const evaluation = alignedMissionEvaluationFixture;
  const recommendation = missionAdvisoryRecommendationFixture;
  const guidance = missionCollaborativeGuidanceFixture;
  const readiness = summarizeMissionRuntimeReadiness([snapshot], [evaluation], [recommendation]);

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border" style={{ borderColor: settingsSurfaceTokens.borderSubtle, background: settingsSurfaceTokens.glass }}>
      <div className="border-b px-4 py-4" style={{ borderColor: settingsSurfaceTokens.borderSubtle }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold" style={{ color: settingsSurfaceTokens.textPrimary }}>Mission Profile Advisory Runtime</p>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: settingsSurfaceTokens.textSecondary }}>
              A bounded planning-context preview for working with the user. Advisory only — no autonomous execution.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium"
              style={{ borderColor: settingsSurfaceTokens.borderSubtle, color: settingsSurfaceTokens.textSecondary }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: isLive ? "var(--luca-success, #4fbf7a)" : settingsSurfaceTokens.textTertiary }}
              />
              {isLive ? "Live mission" : "Sample mission"}
            </span>
            <span className="rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide" style={{ borderColor: settingsSurfaceTokens.borderSubtle, color: settingsSurfaceTokens.textSecondary }}>
              Mode: {snapshot.mode}
            </span>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-medium" style={{ color: settingsSurfaceTokens.textSecondary }}>
          <span className="rounded-full border px-2 py-1" style={{ borderColor: settingsSurfaceTokens.borderSubtle }}>Mission alignment is not approval</span>
          <span className="rounded-full border px-2 py-1" style={{ borderColor: settingsSurfaceTokens.borderSubtle }}>No memory write, no model routing change, no tool execution</span>
        </div>
      </div>

      <div className="grid gap-3 p-4 lg:grid-cols-2">
        <PanelCard>
          <SectionLabel>Mission context snapshot</SectionLabel>
          <p className="mt-2 text-sm font-medium" style={{ color: settingsSurfaceTokens.textPrimary }}>{snapshot.title}</p>
          <List title="Goals" values={snapshot.goals} />
          <List title="Constraints" values={snapshot.constraints} />
          <List title="Success criteria" values={snapshot.successCriteria} />
        </PanelCard>

        <PanelCard>
          <SectionLabel>Sample alignment evaluation</SectionLabel>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
            <Metric label="Status" value={evaluation.alignmentStatus} />
            <Metric label="Risk" value={evaluation.riskLevel} />
            <Metric label="Goals matched" value={`${evaluation.matchedGoals.length}/${snapshot.goals.length}`} />
            <Metric label="Success coverage" value={`${Math.round(evaluation.successCriteriaCoverage.coverageRatio * 100)}%`} />
          </dl>
          <p className="mt-3 text-xs leading-relaxed" style={{ color: settingsSurfaceTokens.textSecondary }}>
            {summarizeMissionAdvisoryContext(snapshot, evaluation)}
          </p>
        </PanelCard>

        <PanelCard>
          <SectionLabel>Advisory recommendation</SectionLabel>
          <p className="mt-2 text-sm font-medium" style={{ color: settingsSurfaceTokens.textPrimary }}>{recommendation.title}</p>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: settingsSurfaceTokens.textSecondary }}>{recommendation.summary}</p>
          <List title="Review next steps" values={recommendation.nextSteps} />
          <p className="mt-3 text-xs font-semibold" style={{ color: settingsSurfaceTokens.textSecondary }}>
            Can execute: false · Approval before action: required
          </p>
        </PanelCard>

        <PanelCard>
          <SectionLabel>Collaborative next steps</SectionLabel>
          <List title="Work with the user" values={guidance.suggestedNextSteps} />
          <List title="Approval boundaries" values={guidance.approvalBoundaries} />
        </PanelCard>

        <PanelCard>
          <SectionLabel>Readiness summary</SectionLabel>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
            <Metric label="Snapshots" value={String(readiness.totalSnapshots)} />
            <Metric label="Blocked snapshots" value={String(readiness.blockedSnapshots)} />
            <Metric label="Advisory ready" value={String(readiness.readyForAdvisoryMode)} />
            <Metric label="Collaborative ready" value={String(readiness.readyForCollaborativeMode)} />
          </dl>
          <p className="mt-3 text-xs font-semibold" style={{ color: settingsSurfaceTokens.textSecondary }}>Autonomous execution enabled: false</p>
        </PanelCard>

        <PanelCard>
          <SectionLabel>Evidence-only boundary</SectionLabel>
          <ul className="mt-2 space-y-1 text-xs leading-relaxed" style={{ color: settingsSurfaceTokens.textSecondary }}>
            <li>Runtime trace records doctrine-stage summaries only.</li>
            <li>Learning output remains proposal-ready and unwritten.</li>
            <li>Side effects performed: false.</li>
            <li>No action, persistence, routing, or handoff authority is created.</li>
          </ul>
        </PanelCard>
      </div>
    </div>
  );
};

const SectionLabel: React.FC<React.PropsWithChildren> = ({ children }) => (
  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: settingsSurfaceTokens.textTertiary }}>{children}</p>
);

const List: React.FC<{ title: string; values: string[] }> = ({ title, values }) => (
  <div className="mt-3">
    <p className="text-xs font-semibold" style={{ color: settingsSurfaceTokens.textTertiary }}>{title}</p>
    <ul className="mt-1 space-y-1 text-xs leading-relaxed" style={{ color: settingsSurfaceTokens.textSecondary }}>
      {values.map((value) => <li key={value}>• {value}</li>)}
    </ul>
  </div>
);

const Metric: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <dt style={{ color: settingsSurfaceTokens.textTertiary }}>{label}</dt>
    <dd className="mt-0.5 font-medium" style={{ color: settingsSurfaceTokens.textSecondary }}>{value}</dd>
  </div>
);

const PanelCard: React.FC<React.PropsWithChildren> = ({ children }) => (
  <div className="rounded-xl border p-4" style={{ borderColor: settingsSurfaceTokens.borderSubtle, background: settingsSurfaceTokens.glass }}>
    {children}
  </div>
);
