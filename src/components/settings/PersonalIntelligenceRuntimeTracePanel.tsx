import React from "react";
import {
  PERSONAL_INTELLIGENCE_DOCTRINE_STAGES,
  SAFE_BLOCKED_LIVE_WRITE_TRACE_FIXTURE,
  SAFE_MEMORY_APPROVAL_DRY_RUN_TRACE_FIXTURE,
  SAFE_RUNTIME_TRACE_READINESS_FIXTURE,
  SAFE_USER_FEEDBACK_LEARNING_EVENT_FIXTURE,
} from "../../personal-intelligence/runtime";
import { SettingsCard } from "./SettingsLayout";
import { settingsSurfaceTokens } from "./settingsLayoutStyles";

const stageLabel = (stage: string) =>
  stage.charAt(0).toUpperCase() + stage.slice(1);

export const PersonalIntelligenceRuntimeTracePanel: React.FC = () => {
  const trace = SAFE_MEMORY_APPROVAL_DRY_RUN_TRACE_FIXTURE;
  const blockedTrace = SAFE_BLOCKED_LIVE_WRITE_TRACE_FIXTURE;
  const learningEvent = SAFE_USER_FEEDBACK_LEARNING_EVENT_FIXTURE;
  const readiness = SAFE_RUNTIME_TRACE_READINESS_FIXTURE;

  return (
    <div className="space-y-3" data-testid="personal-intelligence-runtime-trace-panel">
      <SettingsCard>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold" style={{ color: settingsSurfaceTokens.textPrimary }}>
              Runtime Trace + Learning Events
            </p>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: settingsSurfaceTokens.textSecondary }}>
              Recording evidence only — no memory write, no prompt update, no model routing change.
            </p>
          </div>
          <span
            className="rounded-full border px-2.5 py-1 text-[11px] font-semibold"
            style={{ borderColor: settingsSurfaceTokens.borderSubtle, color: settingsSurfaceTokens.accentPrimary }}
          >
            Side effects performed: false
          </span>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-1.5" aria-label="Personal Intelligence execution doctrine stages">
          {PERSONAL_INTELLIGENCE_DOCTRINE_STAGES.map((stage, index) => (
            <React.Fragment key={stage}>
              <span
                className="rounded-lg border px-2 py-1 text-[11px] font-medium"
                style={{ borderColor: settingsSurfaceTokens.borderSubtle, color: settingsSurfaceTokens.textSecondary }}
              >
                {stageLabel(stage)}
              </span>
              {index < PERSONAL_INTELLIGENCE_DOCTRINE_STAGES.length - 1 && (
                <span style={{ color: settingsSurfaceTokens.textTertiary }}>→</span>
              )}
            </React.Fragment>
          ))}
        </div>
      </SettingsCard>

      <div className="grid gap-3 lg:grid-cols-2">
        <SettingsCard>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: settingsSurfaceTokens.textTertiary }}>
                Sample trace
              </p>
              <p className="mt-1 text-sm font-semibold" style={{ color: settingsSurfaceTokens.textPrimary }}>{trace.title}</p>
            </div>
            <span className="text-xs font-semibold" style={{ color: settingsSurfaceTokens.accentPrimary }}>{trace.status}</span>
          </div>
          <div className="mt-3 space-y-2">
            {trace.stages.map((stage) => (
              <div key={stage.stage} className="rounded-lg border px-3 py-2" style={{ borderColor: settingsSurfaceTokens.borderSubtle }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold" style={{ color: settingsSurfaceTokens.textPrimary }}>{stageLabel(stage.stage)}</span>
                  <span className="text-[11px]" style={{ color: settingsSurfaceTokens.textTertiary }}>{stage.status}</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: settingsSurfaceTokens.textSecondary }}>{stage.summary}</p>
              </div>
            ))}
          </div>
        </SettingsCard>

        <div className="space-y-3">
          <SettingsCard>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: settingsSurfaceTokens.textTertiary }}>
              Learning event preview
            </p>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: settingsSurfaceTokens.textPrimary }}>
              {learningEvent.userFeedback}
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div><dt style={{ color: settingsSurfaceTokens.textTertiary }}>Verification</dt><dd style={{ color: settingsSurfaceTokens.textSecondary }}>{learningEvent.verificationStatus}</dd></div>
              <div><dt style={{ color: settingsSurfaceTokens.textTertiary }}>Proposal-ready</dt><dd style={{ color: settingsSurfaceTokens.textSecondary }}>{learningEvent.proposalReady ? "Yes — review only" : "No"}</dd></div>
              <div><dt style={{ color: settingsSurfaceTokens.textTertiary }}>Persisted</dt><dd style={{ color: settingsSurfaceTokens.textSecondary }}>false</dd></div>
              <div><dt style={{ color: settingsSurfaceTokens.textTertiary }}>Privacy zone</dt><dd style={{ color: settingsSurfaceTokens.textSecondary }}>{learningEvent.privacyZone}</dd></div>
            </dl>
          </SettingsCard>

          <SettingsCard>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: settingsSurfaceTokens.textTertiary }}>
              Readiness summary
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <p style={{ color: settingsSurfaceTokens.textSecondary }}>Traces: {readiness.totalTraces}</p>
              <p style={{ color: settingsSurfaceTokens.textSecondary }}>Verified: {readiness.verifiedTraces}</p>
              <p style={{ color: settingsSurfaceTokens.textSecondary }}>Blocked: {readiness.blockedTraces}</p>
              <p style={{ color: settingsSurfaceTokens.textSecondary }}>Proposal-ready events: {readiness.learningEventsReadyForProposal}</p>
            </div>
            <p className="mt-3 text-xs leading-relaxed" style={{ color: settingsSurfaceTokens.textSecondary }}>
              Runtime recording ready: {String(readiness.readyForRuntimeRecording)}. Persistence proposal ready: {String(readiness.readyForPersistenceProposal)}. Neither status grants execution or write authority.
            </p>
          </SettingsCard>

          <SettingsCard>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: settingsSurfaceTokens.textTertiary }}>
              Warnings + blockers
            </p>
            <ul className="mt-2 space-y-1 text-xs leading-relaxed" style={{ color: settingsSurfaceTokens.textSecondary }}>
              {readiness.warnings.map((warning) => <li key={warning}>Warning: {warning}</li>)}
              <li>Blocked sample: {blockedTrace.blockers[0] ?? "Live-write approval and pilot gates remain closed."}</li>
            </ul>
          </SettingsCard>
        </div>
      </div>
    </div>
  );
};
