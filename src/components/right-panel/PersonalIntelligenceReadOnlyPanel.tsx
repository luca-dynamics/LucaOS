import React, { useMemo } from "react";
import type { LucaExperienceMode } from "../../experience/experienceMode";
import {
  createPersonalIntelligenceDashboardDisclosure,
  createPersonalIntelligenceDashboardSummary,
} from "../../personal-intelligence/dashboard";
import type { PersonalMemoryReviewReason } from "../../personal-intelligence/memoryControls";
import type { PersonalMemoryGraph } from "../../personal-intelligence/memoryGraph";
import RightPanelMetric from "./RightPanelMetric";
import RightPanelSection from "./RightPanelSection";
import PersonalIntelligenceReviewWorkflowPanel from "./PersonalIntelligenceReviewWorkflowPanel";

interface PersonalIntelligenceReadOnlyPanelProps {
  graph: PersonalMemoryGraph;
  mode: LucaExperienceMode;
  now?: Date;
  fixture?: boolean;
}

const reviewReasonLabels: Readonly<Record<PersonalMemoryReviewReason, string>> = {
  pending_approval: "Pending approval",
  requires_review: "Needs review",
  stale_important: "Stale important",
  conflict: "Conflicts",
  sync_risk: "Privacy / sync",
  sensitive_confirmation: "Sensitive confirmation",
  temporary_near_expiration: "Expiring soon",
  temporary_expired: "Expired context",
};

export const PersonalIntelligenceReadOnlyPanel: React.FC<
  PersonalIntelligenceReadOnlyPanelProps
> = ({ graph, mode, now, fixture = false }) => {
  const disclosure = useMemo(() => {
    const summary = createPersonalIntelligenceDashboardSummary(graph, { mode, now });
    return createPersonalIntelligenceDashboardDisclosure(summary);
  }, [graph, mode, now]);

  const hasContinuity = Boolean(
    disclosure.activeProjectTitle || disclosure.nextActionTitle,
  );

  return (
    <RightPanelSection
      title="Personal Intelligence"
      subtitle="A read-only continuity and memory review summary. No memory changes have been applied."
      action={
        <span className="rounded-full border border-[color-mix(in_srgb,var(--luca-info,#4f8cff)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-info,#4f8cff)_12%,transparent)] px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-[var(--luca-info,#4f8cff)]">
          Preview only
        </span>
      }
    >
      <div className="space-y-3" data-testid="personal-intelligence-read-only-panel">
        {fixture && (
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] text-[var(--app-text-muted)]">
            <span aria-hidden="true">●</span>
            Safe fictional preview — no user or project data is being read.
          </div>
        )}

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--app-text-main)]">
            <span aria-hidden="true">◇</span>
            Continuity
          </div>
          <div className="mt-2 text-sm font-semibold text-[var(--app-text-main)]">
            {disclosure.mode === "basic" ? disclosure.handoffHeadline : "Ready to continue"}
          </div>
          {hasContinuity ? (
            <div className="mt-2 space-y-2 text-[10px] leading-relaxed text-[var(--app-text-muted)]">
              {disclosure.activeProjectTitle && (
                <div>
                  <span className="font-bold text-[var(--app-text-main)]">Active project:</span>{" "}
                  {disclosure.activeProjectTitle}
                </div>
              )}
              {disclosure.nextActionTitle && (
                <div>
                  <span className="font-bold text-[var(--app-text-main)]">Next action:</span>{" "}
                  {disclosure.nextActionTitle}
                </div>
              )}
            </div>
          ) : (
            <p className="mt-2 text-[10px] leading-relaxed text-[var(--app-text-muted)]">
              No supplied continuity context is available yet.
            </p>
          )}
        </div>

        <PersonalIntelligenceReviewWorkflowPanel graph={graph} mode={mode} now={now} />

        {disclosure.mode === "basic" ? (
          <div className="rounded-xl border border-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_12%,transparent)] p-3">
            <div className="text-xs font-bold text-[var(--luca-warning,#f2b23e)]">
              {disclosure.memoryReviewCount > 0
                ? `${disclosure.memoryReviewCount} ${disclosure.memoryReviewCount === 1 ? "memory needs" : "memories need"} your review`
                : "Memory review is clear"}
            </div>
            <p className="mt-1 text-[10px] leading-relaxed text-[var(--luca-warning,#f2b23e)]">
              {disclosure.approvalMessage}. {disclosure.settingsMessage}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <RightPanelMetric label="Open tasks" value={disclosure.openTaskCount} />
              <RightPanelMetric
                label="Blockers"
                value={disclosure.blockerCount}
                tone={disclosure.blockerCount > 0 ? "warn" : "good"}
              />
              <RightPanelMetric
                label="Memory review"
                value={disclosure.memoryReviewCount}
                tone={disclosure.memoryReviewCount > 0 ? "warn" : "good"}
              />
              <RightPanelMetric
                label="Stale context"
                value={disclosure.staleContextCount}
                tone={disclosure.staleContextCount > 0 ? "warn" : "good"}
              />
              <RightPanelMetric
                label="Privacy review"
                value={disclosure.privacyReviewCount}
                tone={disclosure.privacyReviewCount > 0 ? "warn" : "good"}
              />
              <RightPanelMetric label="Side effects" value="None" tone="good" />
            </div>

            {disclosure.mode === "creator" && (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="text-[9px] font-black uppercase tracking-[0.18em] text-[var(--app-text-muted)]">
                  Safe audit view
                </div>
                <dl className="mt-2 space-y-1.5 text-[10px] text-[var(--app-text-muted)]">
                  <div className="flex justify-between gap-3">
                    <dt>Graph</dt>
                    <dd className="truncate text-right text-[var(--app-text-main)]">{disclosure.graphId}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>Generated</dt>
                    <dd className="text-right text-[var(--app-text-main)]">{disclosure.generatedAt}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt>Protected memories</dt>
                    <dd className="text-[var(--app-text-main)]">{disclosure.protectedMemoryCount}</dd>
                  </div>
                </dl>
                {Object.entries(disclosure.reviewCountByReason).length > 0 && (
                  <div className="mt-3 border-t border-white/10 pt-2">
                    <div className="mb-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-[var(--app-text-muted)]">
                      Review reasons
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(disclosure.reviewCountByReason).map(([reason, count]) => (
                        <span
                          key={reason}
                          className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[9px] text-[var(--app-text-main)]"
                        >
                          {reviewReasonLabels[reason as PersonalMemoryReviewReason]}: {count}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <p className="text-[10px] leading-relaxed text-[var(--app-text-muted)]">
              Memory changes require your approval. Manage memory, knowledge, and personality settings in Settings.
            </p>
          </>
        )}
      </div>
    </RightPanelSection>
  );
};

export default PersonalIntelligenceReadOnlyPanel;
