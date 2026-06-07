import React, { useMemo, useState } from "react";
import {
  DEFAULT_MEMORY_APPROVAL_CONFIRMATION_PHRASE,
  SAFE_MEMORY_APPROVAL_AUDIT_FIXTURES,
  SAFE_MEMORY_APPROVAL_POLICY_FIXTURE,
  SAFE_MEMORY_APPROVAL_PROPOSAL_FIXTURE,
  SAFE_MEMORY_APPROVAL_ROLLBACK_FIXTURES,
  createDefaultMemoryApprovalPilotState,
  createDryRunOnlyMemoryServiceDependency,
  createMemoryApprovalChecklist,
  runGovernedMemoryApprovalDryRun,
} from "../../personal-intelligence/approval";
import type {
  GovernedMemoryAdapterResult,
  PersonalIntelligenceMemoryApprovalPilotState,
} from "../../personal-intelligence";
import {
  settingsCardStyle,
  settingsSurfaceTokens,
} from "./settingsLayoutStyles";

const dryRunConfig = {
  enabled: true,
  dryRun: true,
  allowPrivateWrites: false,
  allowSensitiveWrites: false,
  allowLucaLinkSync: false as const,
  requireExplicitApproval: true,
  requireRollbackPlan: true,
  requireValidationAudit: true,
  allowedOperations: ["create"] as Array<"create">,
  blockedPrivacyZones: [
    "credential",
    "financial",
    "health",
    "enterprise",
  ] as Array<"credential" | "financial" | "health" | "enterprise">,
  maxContentLength: 2000,
  sourceLabel: "personal-intelligence-memory-approval-pilot",
};

export const PersonalIntelligenceMemoryApprovalPilot: React.FC = () => {
  const [pilotState, setPilotState] =
    useState<PersonalIntelligenceMemoryApprovalPilotState>(() =>
      createDefaultMemoryApprovalPilotState({
        selectedProposalId: SAFE_MEMORY_APPROVAL_PROPOSAL_FIXTURE.proposalId,
      }),
    );
  const [dryRunPending, setDryRunPending] = useState(false);

  const checklist = useMemo(
    () =>
      createMemoryApprovalChecklist({
        proposal: SAFE_MEMORY_APPROVAL_PROPOSAL_FIXTURE,
        policy: SAFE_MEMORY_APPROVAL_POLICY_FIXTURE,
        auditRecords: SAFE_MEMORY_APPROVAL_AUDIT_FIXTURES,
        rollbackPlans: SAFE_MEMORY_APPROVAL_ROLLBACK_FIXTURES,
        adapterConfig: dryRunConfig,
        pilotState,
        lastDryRunResult: pilotState.lastDryRunResult,
      }),
    [pilotState],
  );

  const runDryRun = async () => {
    setDryRunPending(true);
    try {
      const result = await runGovernedMemoryApprovalDryRun({
        proposal: SAFE_MEMORY_APPROVAL_PROPOSAL_FIXTURE,
        policy: SAFE_MEMORY_APPROVAL_POLICY_FIXTURE,
        auditRecords: SAFE_MEMORY_APPROVAL_AUDIT_FIXTURES,
        rollbackPlans: SAFE_MEMORY_APPROVAL_ROLLBACK_FIXTURES,
        memoryService: createDryRunOnlyMemoryServiceDependency(),
        configOverrides: {
          sourceLabel: "personal-intelligence-memory-approval-pilot-ui",
        },
      });
      setPilotState((current) => ({
        ...current,
        lastDryRunResult: result,
        approvalChecklist: createMemoryApprovalChecklist({
          proposal: SAFE_MEMORY_APPROVAL_PROPOSAL_FIXTURE,
          policy: SAFE_MEMORY_APPROVAL_POLICY_FIXTURE,
          auditRecords: SAFE_MEMORY_APPROVAL_AUDIT_FIXTURES,
          rollbackPlans: SAFE_MEMORY_APPROVAL_ROLLBACK_FIXTURES,
          adapterConfig: dryRunConfig,
          pilotState: current,
          lastDryRunResult: result,
        }),
        blockers: result.blockers,
        warnings: result.warnings,
        updatedAt: new Date().toISOString(),
      }));
    } finally {
      setDryRunPending(false);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border p-4" style={settingsCardStyle}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p
            className="text-sm font-semibold"
            style={{ color: settingsSurfaceTokens.textPrimary }}
          >
            Controlled Live Memory Write Pilot
          </p>
          <p
            className="mt-1 text-xs leading-relaxed"
            style={{ color: settingsSurfaceTokens.textSecondary }}
          >
            Validate the approved safe fixture through the governed adapter
            before any future live-write control can unlock.
          </p>
        </div>
        <span
          className="rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide"
          style={{
            borderColor: settingsSurfaceTokens.borderSubtle,
            color: settingsSurfaceTokens.textTertiary,
          }}
        >
          Pilot disabled
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Status label="Pilot status" value="Disabled" />
        <Status label="Dry-run required" value="Yes" />
        <Status label="Live write" value="Off" />
        <Status label="Explicit approval" value="Required" />
      </div>

      <div
        className="rounded-xl border p-3"
        style={{ borderColor: settingsSurfaceTokens.borderSubtle }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p
              className="text-xs font-semibold"
              style={{ color: settingsSurfaceTokens.textPrimary }}
            >
              Safe fixture dry-run
            </p>
            <p
              className="mt-1 text-xs"
              style={{ color: settingsSurfaceTokens.textSecondary }}
            >
              Project update preference · project privacy zone · no secrets or
              raw files
            </p>
          </div>
          <button
            type="button"
            onClick={runDryRun}
            disabled={dryRunPending}
            className="rounded-lg border px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              borderColor: settingsSurfaceTokens.accentPrimary,
              color: settingsSurfaceTokens.accentPrimary,
            }}
          >
            {dryRunPending ? "Running dry-run…" : "Run governed dry-run"}
          </button>
        </div>
      </div>

      <div>
        <p
          className="mb-2 text-xs font-semibold uppercase tracking-wide"
          style={{ color: settingsSurfaceTokens.textTertiary }}
        >
          Approval checklist
        </p>
        <div className="grid gap-2 lg:grid-cols-2">
          {checklist.map((entry) => (
            <div
              key={entry.id}
              className="rounded-lg border px-3 py-2"
              style={{ borderColor: settingsSurfaceTokens.borderSubtle }}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className="text-xs font-medium"
                  style={{ color: settingsSurfaceTokens.textPrimary }}
                >
                  {entry.label}
                </span>
                <span
                  className="text-[10px] font-semibold uppercase tracking-wide"
                  style={{ color: checklistColor(entry.status) }}
                >
                  {entry.status}
                </span>
              </div>
              <p
                className="mt-1 text-[11px] leading-relaxed"
                style={{ color: settingsSurfaceTokens.textTertiary }}
              >
                {entry.detail}
              </p>
            </div>
          ))}
        </div>
      </div>

      <ResultPanel
        title="Dry-run result"
        result={pilotState.lastDryRunResult}
        empty="Not run. The safe fixture can be converted without persistence."
      />
      <ResultPanel
        title="Live-write result"
        result={pilotState.lastLiveWriteResult}
        empty="Locked. No live-write action is exposed while the pilot remains disabled."
      />

      <div
        className="rounded-xl border p-3 text-xs leading-relaxed"
        style={{
          borderColor: settingsSurfaceTokens.borderSubtle,
          color: settingsSurfaceTokens.textSecondary,
        }}
      >
        <p>
          No write occurs unless pilot is enabled, live-write is enabled,
          dry-run passed, and explicit approval exists.
        </p>
        <p className="mt-1">This UI does not call memoryService directly.</p>
        <p className="mt-1">
          LucaLink sync remains disabled for Personal Intelligence writes.
        </p>
        <p className="mt-1">
          Confirmation required: {DEFAULT_MEMORY_APPROVAL_CONFIRMATION_PHRASE}
        </p>
      </div>
    </div>
  );
};

const Status: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div
    className="rounded-lg border px-3 py-2"
    style={{ borderColor: settingsSurfaceTokens.borderSubtle }}
  >
    <p className="text-[11px]" style={{ color: settingsSurfaceTokens.textTertiary }}>
      {label}
    </p>
    <p
      className="mt-0.5 text-sm font-semibold"
      style={{ color: settingsSurfaceTokens.textPrimary }}
    >
      {value}
    </p>
  </div>
);

const ResultPanel: React.FC<{
  title: string;
  result?: GovernedMemoryAdapterResult;
  empty: string;
}> = ({ title, result, empty }) => (
  <div
    className="rounded-xl border p-3"
    style={{ borderColor: settingsSurfaceTokens.borderSubtle }}
  >
    <div className="flex items-center justify-between gap-3">
      <p
        className="text-xs font-semibold"
        style={{ color: settingsSurfaceTokens.textPrimary }}
      >
        {title}
      </p>
      <span
        className="text-[10px] font-semibold uppercase tracking-wide"
        style={{
          color: result
            ? checklistColor(result.status === "dry_run" || result.status === "persisted" ? "passed" : "blocked")
            : settingsSurfaceTokens.textTertiary,
        }}
      >
        {result?.status ?? "Not available"}
      </span>
    </div>
    <p
      className="mt-1 text-xs leading-relaxed"
      style={{ color: settingsSurfaceTokens.textSecondary }}
    >
      {result
        ? `${result.auditRecord.summary} Side effects performed: ${result.sideEffectsPerformed ? "yes" : "no"}.`
        : empty}
    </p>
    {result?.memoryKey && (
      <p
        className="mt-2 break-all font-mono text-[11px]"
        style={{ color: settingsSurfaceTokens.textTertiary }}
      >
        {result.memoryKey} · {result.memoryCategory}
      </p>
    )}
  </div>
);

function checklistColor(status: "passed" | "failed" | "pending" | "blocked") {
  if (status === "passed") return "#34d399";
  if (status === "pending") return "#fbbf24";
  return "#fb7185";
}
