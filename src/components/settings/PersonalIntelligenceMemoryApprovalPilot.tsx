import React, { useMemo, useState } from "react";
import { LucaInput, LucaSelect } from "../ui/luca";
import {
  DEFAULT_MEMORY_APPROVAL_CONFIRMATION_PHRASE,
  buildMemoryApprovalProposal,
  createDefaultMemoryApprovalPilotState,
  createDryRunOnlyMemoryServiceDependency,
  createMemoryApprovalAuditRecord,
  evaluateMemoryApprovalPilotReadiness,
  runGovernedMemoryApprovalDryRun,
  runGovernedMemoryApprovalLiveWrite,
  type MemoryApprovalProposalBundle,
} from "../../personal-intelligence/approval";
import type {
  GovernedMemoryAdapterConfig,
  GovernedMemoryAdapterResult,
  MemoryApprovalAuditSummary,
  MemoryServiceAdapterDependency,
  PersonalIntelligenceMemoryApprovalAuditRecord,
  PersonalIntelligenceMemoryApprovalPilotState,
  PersonalIntelligenceMemoryApprovalAuditEventType,
} from "../../personal-intelligence";
import {
  settingsCardStyle,
  settingsSurfaceTokens,
} from "./settingsLayoutStyles";
import type { MemoryApprovalQueueItem } from "../../services/personalIntelligence/memoryProposalBridge";

/**
 * Controlled Live Memory Write Pilot — the ONLY surface in LucaOS that can
 * write a Personal Intelligence memory to disk. It reviews a real proposal
 * (built by buildMemoryApprovalProposal, not the frozen fixture) and drives
 * the governed adapter through every gate. The write is a staged sequence —
 * enable → dry-run → approve → type the exact phrase → write — where each
 * step is a real pilot-state gate, so a stray click can never persist.
 *
 * Safety architecture preserved: this component imports no service and boots
 * nothing at render. The live memoryService writer is resolved LAZILY, inside
 * the write handler only (dynamic import), and can be overridden for tests.
 * The governed adapter remains the sole write boundary.
 */

const dryRunConfig: GovernedMemoryAdapterConfig = {
  enabled: true,
  dryRun: true,
  allowPrivateWrites: false,
  allowSensitiveWrites: false,
  allowLucaLinkSync: false,
  requireExplicitApproval: true,
  requireRollbackPlan: true,
  requireValidationAudit: true,
  allowedOperations: ["create"],
  blockedPrivacyZones: ["credential", "financial", "health", "enterprise"],
  maxContentLength: 2000,
  sourceLabel: "personal-intelligence-memory-approval-pilot",
};

/**
 * Representative REAL proposal built through slice 2's governed builder. The
 * eventual live-queue source (real pending memories Luca wants to keep) drops
 * in here — the pilot itself is source-agnostic.
 */
function buildDefaultProposalBundle(): MemoryApprovalProposalBundle {
  return buildMemoryApprovalProposal({
    proposalId: "proposal:prefers-dark-mode",
    memory: {
      id: "memory:prefers-dark-mode",
      kind: "preference",
      title: "Prefers dark mode",
      content: "You prefer dark mode across your tools.",
      source: "chat",
      confidence: 0.9,
      privacyZone: "project",
      tags: ["preference", "ui"],
    },
    proposedPath: "memory/preferences/prefers-dark-mode.json",
    approval: {
      approvedBy: "user",
      approvedAt: new Date().toISOString(),
      explicitUserApproval: true,
      approvalNote: "Approved in the governed memory write pilot.",
    },
  });
}

async function resolveLiveDependency(): Promise<MemoryServiceAdapterDependency> {
  const module = await import(
    "../../services/personalIntelligence/liveMemoryAdapterDependency"
  );
  return module.createLiveMemoryServiceDependency();
}

// Durable audit persistence resolved lazily, so rendering the panel never
// touches storage (the store lives at the services edge).
async function persistAuditRecords(
  records: PersonalIntelligenceMemoryApprovalAuditRecord[],
): Promise<void> {
  const module = await import(
    "../../services/personalIntelligence/memoryApprovalAuditStore"
  );
  module.appendMemoryApprovalAuditRecords(records);
}

interface PersonalIntelligenceMemoryApprovalPilotProps {
  /** Override the reviewed proposal (single / sample fallback). */
  buildProposalBundle?: () => MemoryApprovalProposalBundle;
  /** The reviewable queue for the selector (real pending memories). */
  pendingProposals?: MemoryApprovalQueueItem[];
  /** Build the governed bundle for a chosen queue item. */
  buildBundleForProposal?: (
    proposalId: string,
  ) => MemoryApprovalProposalBundle | null;
  /** Override the live writer (tests inject a stub; production resolves lazily). */
  createWriteDependency?: () => MemoryServiceAdapterDependency;
  /** Persist governed-write audit records (default: durable store, resolved lazily). */
  recordAudit?: (
    records: PersonalIntelligenceMemoryApprovalAuditRecord[],
  ) => void;
  /** Prior durable audit trail, read by the parent at mount. */
  initialAuditSummary?: MemoryApprovalAuditSummary;
}

export const PersonalIntelligenceMemoryApprovalPilot: React.FC<
  PersonalIntelligenceMemoryApprovalPilotProps
> = ({
  buildProposalBundle,
  pendingProposals,
  buildBundleForProposal,
  createWriteDependency,
  recordAudit,
  initialAuditSummary,
}) => {
  const queue = pendingProposals ?? [];
  const [selectedProposalId, setSelectedProposalId] = useState<
    string | undefined
  >(() => queue[0]?.proposalId);

  const bundle = useMemo(() => {
    if (selectedProposalId && buildBundleForProposal) {
      const selected = buildBundleForProposal(selectedProposalId);
      if (selected) return selected;
    }
    return (buildProposalBundle ?? buildDefaultProposalBundle)();
  }, [selectedProposalId, buildBundleForProposal, buildProposalBundle]);
  const { proposal, policy, auditRecords, rollbackPlans } = bundle;

  const [pilotState, setPilotState] =
    useState<PersonalIntelligenceMemoryApprovalPilotState>(() =>
      createDefaultMemoryApprovalPilotState({
        selectedProposalId: proposal.proposalId,
      }),
    );

  // Choosing a different memory is a fresh decision: reset every gate so a
  // dry-run / approval from the previous proposal can never carry over.
  const selectProposal = (proposalId: string) => {
    setSelectedProposalId(proposalId);
    setPilotState(
      createDefaultMemoryApprovalPilotState({ selectedProposalId: proposalId }),
    );
  };

  const [dryRunPending, setDryRunPending] = useState(false);
  const [liveWritePending, setLiveWritePending] = useState(false);
  const [auditTotal, setAuditTotal] = useState(
    initialAuditSummary?.totalRecords ?? 0,
  );

  const logAudit = (
    result: GovernedMemoryAdapterResult,
    eventType: PersonalIntelligenceMemoryApprovalAuditEventType,
  ) => {
    const record = createMemoryApprovalAuditRecord({
      auditId: `${proposal.proposalId}:${eventType}:${result.auditRecord.timestamp}`,
      proposalId: proposal.proposalId,
      eventType,
      summary: result.auditRecord.summary,
      sideEffectsPerformed: result.sideEffectsPerformed,
      adapterResultStatus: result.status,
      blockers: result.blockers,
      warnings: result.warnings,
    });
    (recordAudit ?? ((records) => void persistAuditRecords(records)))([record]);
    setAuditTotal((current) => current + 1);
  };

  const readiness = useMemo(
    () =>
      evaluateMemoryApprovalPilotReadiness({
        proposal,
        policy,
        auditRecords,
        rollbackPlans,
        adapterConfig: dryRunConfig,
        pilotState,
        lastDryRunResult: pilotState.lastDryRunResult,
      }),
    [proposal, policy, auditRecords, rollbackPlans, pilotState],
  );

  const badge: { cls: string; label: string } = pilotState.lastLiveWriteResult
    ?.performed
    ? { cls: "live", label: "Persisted" }
    : readiness.readyForLiveWrite
      ? { cls: "live", label: "Ready to write" }
      : pilotState.pilotEnabled
        ? { cls: "arm", label: "Armed" }
        : { cls: "off", label: "Pilot disabled" };

  const patch = (
    next: Partial<PersonalIntelligenceMemoryApprovalPilotState>,
  ) =>
    setPilotState((current) => ({
      ...current,
      ...next,
      updatedAt: new Date().toISOString(),
    }));

  const runDryRun = async () => {
    setDryRunPending(true);
    try {
      // Dry-run uses the throwing stub: even if a bug flipped dryRun, it
      // structurally cannot reach the real writer.
      const result = await runGovernedMemoryApprovalDryRun({
        proposal,
        policy,
        auditRecords,
        rollbackPlans,
        memoryService: createDryRunOnlyMemoryServiceDependency(),
        configOverrides: {
          sourceLabel: "personal-intelligence-memory-approval-pilot-ui",
        },
      });
      patch({
        lastDryRunResult: result,
        blockers: result.blockers,
        warnings: result.warnings,
      });
      logAudit(result, "dry_run_completed");
    } finally {
      setDryRunPending(false);
    }
  };

  const runLiveWrite = async () => {
    setLiveWritePending(true);
    try {
      const dependency = createWriteDependency
        ? createWriteDependency()
        : await resolveLiveDependency();
      const result = await runGovernedMemoryApprovalLiveWrite({
        proposal,
        policy,
        auditRecords,
        rollbackPlans,
        memoryService: dependency,
        pilotState,
        lastDryRunResult: pilotState.lastDryRunResult,
        requiredConfirmationPhrase: DEFAULT_MEMORY_APPROVAL_CONFIRMATION_PHRASE,
      });
      patch({
        lastLiveWriteResult: result,
        blockers: result.blockers,
        warnings: result.warnings,
      });
      logAudit(
        result,
        result.status === "persisted"
          ? "live_write_completed"
          : result.status === "failed"
            ? "live_write_failed"
            : "live_write_blocked",
      );
    } finally {
      setLiveWritePending(false);
    }
  };

  const dryRunPassed =
    pilotState.lastDryRunResult?.status === "dry_run" &&
    pilotState.lastDryRunResult.sideEffectsPerformed === false;
  const phraseOk =
    pilotState.confirmationPhrase?.trim() ===
    DEFAULT_MEMORY_APPROVAL_CONFIRMATION_PHRASE;

  return (
    <div className="space-y-4 rounded-xl border p-4" style={settingsCardStyle}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p
            className="text-sm font-semibold"
            style={{ color: settingsSurfaceTokens.textPrimary }}
          >
            Governed memory write
          </p>
          <p
            className="mt-1 max-w-[52ch] text-xs leading-relaxed"
            style={{ color: settingsSurfaceTokens.textSecondary }}
          >
            When Luca learns something worth keeping, it asks here first.
            Nothing is written until every gate below is green and you confirm.
          </p>
        </div>
        <span
          className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-medium"
          style={{
            borderColor: settingsSurfaceTokens.borderSubtle,
            color: settingsSurfaceTokens.textSecondary,
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: badgeColor(badge.cls) }}
          />
          {badge.label}
        </span>
      </div>

      {/* The reviewable queue — pick which memory to govern. Only shown when
          there is a real choice to make. */}
      {queue.length > 1 && (
        <div>
          <label
            className="mb-1 block text-[11px]"
            style={{ color: settingsSurfaceTokens.textTertiary }}
          >
            {queue.length} memories waiting for review
          </label>
          <LucaSelect
            aria-label="Select a pending memory to review"
            value={selectedProposalId ?? ""}
            onChange={(e) => selectProposal(e.target.value)}
            className="w-full rounded-lg border bg-transparent px-3 py-2 text-[12.5px]"
            style={{
              borderColor: settingsSurfaceTokens.borderSubtle,
              color: settingsSurfaceTokens.textPrimary,
            }}
          >
            {queue.map((item) => (
              <option key={item.proposalId} value={item.proposalId}>
                {item.title} · {item.kind}
              </option>
            ))}
          </LucaSelect>
        </div>
      )}

      {/* The real proposal under review */}
      <div
        className="rounded-xl border p-3"
        style={{ borderColor: settingsSurfaceTokens.borderSubtle }}
      >
        <p
          className="text-[10.5px] uppercase tracking-wide"
          style={{ color: settingsSurfaceTokens.textTertiary }}
        >
          Luca wants to remember
        </p>
        <p
          className="mt-1 text-[13.5px] font-medium"
          style={{ color: settingsSurfaceTokens.textPrimary }}
        >
          {proposal.memoryItem.content}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Chip>{proposal.memoryItem.kind}</Chip>
          <Chip tone="ok">{proposal.privacyZone} zone · non-sensitive</Chip>
          <Chip>from {proposal.memoryItem.source}</Chip>
          <Chip>confidence {Math.round(proposal.confidence * 100)}%</Chip>
        </div>
      </div>

      {/* The gate ladder — every governance check, made honest */}
      <div
        className="overflow-hidden rounded-xl border"
        style={{ borderColor: settingsSurfaceTokens.borderSubtle }}
      >
        {readiness.checklist.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center gap-2.5 border-b px-3 py-2 last:border-b-0"
            style={{ borderColor: settingsSurfaceTokens.borderSubtle }}
          >
            <span
              className="flex h-3.5 w-3.5 flex-none items-center justify-center rounded-full text-[9px]"
              style={{
                background: `color-mix(in srgb, ${checklistColor(entry.status)} 16%, transparent)`,
                color: checklistColor(entry.status),
              }}
            >
              {entry.status === "passed" ? "✓" : entry.status === "pending" ? "•" : "·"}
            </span>
            <span
              className="text-[12.5px]"
              style={{ color: settingsSurfaceTokens.textPrimary }}
            >
              {entry.label}
            </span>
            <span
              className="ml-auto text-[10.5px]"
              style={{ color: settingsSurfaceTokens.textTertiary }}
            >
              {entry.status}
            </span>
          </div>
        ))}
      </div>

      {/* The staged controls */}
      <div className="space-y-2.5">
        <StepRow
          n={1}
          done={pilotState.pilotEnabled}
          title="Enable the pilot"
          sub="Turns on the governed write path. Still nothing written."
        >
          <Toggle
            on={pilotState.pilotEnabled}
            onClick={() => patch({ pilotEnabled: !pilotState.pilotEnabled })}
            label="Enable pilot"
          />
        </StepRow>

        <StepRow
          n={2}
          done={dryRunPassed}
          title="Run governed dry-run"
          sub="Converts and checks the proposal without touching disk."
        >
          <button
            type="button"
            onClick={runDryRun}
            disabled={!pilotState.pilotEnabled || dryRunPending}
            className="rounded-lg border px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              borderColor: settingsSurfaceTokens.borderSubtle,
              color: settingsSurfaceTokens.textPrimary,
            }}
          >
            {dryRunPending ? "Running…" : dryRunPassed ? "Re-run" : "Run dry-run"}
          </button>
        </StepRow>

        <StepRow
          n={3}
          done={pilotState.approvalConfirmed}
          title="Confirm you approve this memory"
          sub="Your explicit yes — required, per gate."
        >
          <Toggle
            on={pilotState.approvalConfirmed}
            onClick={() =>
              patch({
                approvalConfirmed: !pilotState.approvalConfirmed,
                liveWriteEnabled: !pilotState.approvalConfirmed,
              })
            }
            label="Confirm approval"
          />
        </StepRow>

        <StepRow
          n={4}
          done={phraseOk}
          title="Type the confirmation phrase"
          sub={`Exactly “${DEFAULT_MEMORY_APPROVAL_CONFIRMATION_PHRASE}” to unlock the write.`}
        >
          <LucaInput
            aria-label="Confirmation phrase"
            value={pilotState.confirmationPhrase ?? ""}
            onChange={(e) => patch({ confirmationPhrase: e.target.value })}
            placeholder={DEFAULT_MEMORY_APPROVAL_CONFIRMATION_PHRASE}
            className="w-full rounded-lg border bg-transparent px-3 py-2 font-mono text-[12px]"
            style={{
              borderColor: phraseOk
                ? "color-mix(in srgb, var(--luca-success, #4fbf7a) 40%, transparent)"
                : settingsSurfaceTokens.borderSubtle,
              color: settingsSurfaceTokens.textPrimary,
            }}
          />
        </StepRow>
      </div>

      {/* The one write action */}
      <div
        className="flex items-center gap-3 rounded-xl border p-3.5"
        style={{
          borderColor: readiness.readyForLiveWrite
            ? "color-mix(in srgb, var(--luca-accent-primary, #7aa2ff) 30%, transparent)"
            : settingsSurfaceTokens.borderSubtle,
          background: readiness.readyForLiveWrite
            ? "color-mix(in srgb, var(--luca-accent-primary, #7aa2ff) 6%, transparent)"
            : "transparent",
          opacity: readiness.readyForLiveWrite ? 1 : 0.6,
        }}
      >
        <div className="flex-1">
          <p
            className="text-[13px] font-semibold"
            style={{ color: settingsSurfaceTokens.textPrimary }}
          >
            Write to memory
          </p>
          <p
            className="mt-0.5 text-[11.5px]"
            style={{ color: settingsSurfaceTokens.textTertiary }}
          >
            {readiness.readyForLiveWrite
              ? "All gates green · rollback ready · phrase confirmed."
              : "Locked until every gate above is green."}
          </p>
        </div>
        <button
          type="button"
          onClick={runLiveWrite}
          disabled={!readiness.readyForLiveWrite || liveWritePending}
          className="rounded-lg px-4 py-2.5 text-[12.5px] font-semibold disabled:cursor-not-allowed"
          style={{
            background: readiness.readyForLiveWrite
              ? "var(--luca-accent-primary, #7aa2ff)"
              : "rgba(255,255,255,0.08)",
            color: readiness.readyForLiveWrite
              ? "var(--luca-accent-ink, #0c0e12)"
              : settingsSurfaceTokens.textTertiary,
          }}
        >
          {liveWritePending ? "Writing…" : "Write"}
        </button>
      </div>

      <ResultPanel
        title="Dry-run result"
        result={pilotState.lastDryRunResult}
        empty="Not run. The proposal can be converted without persistence."
      />
      <ResultPanel
        title="Live-write result"
        result={pilotState.lastLiveWriteResult}
        empty="No write yet. It stays locked until every gate is green."
      />

      <div
        className="rounded-xl border p-3 text-xs leading-relaxed"
        style={{
          borderColor: settingsSurfaceTokens.borderSubtle,
          color: settingsSurfaceTokens.textSecondary,
        }}
      >
        <p>
          Nothing runs until you decide. This is the only surface that can write
          a Personal Intelligence memory, always through the governed adapter,
          gate by gate.
        </p>
        <p className="mt-1">
          Sensitive zones (credential, financial, health, enterprise) stay
          blocked here regardless of approval. LucaLink sync stays disabled.
        </p>
        <p className="mt-1">
          Audit trail: {auditTotal} governed event
          {auditTotal === 1 ? "" : "s"} recorded (durable).
        </p>
      </div>
    </div>
  );
};

const Chip: React.FC<{ children: React.ReactNode; tone?: "ok" }> = ({
  children,
  tone,
}) => (
  <span
    className="rounded-md border px-1.5 py-0.5 text-[10.5px]"
    style={{
      borderColor:
        tone === "ok"
          ? "color-mix(in srgb, var(--luca-success, #4fbf7a) 30%, transparent)"
          : settingsSurfaceTokens.borderSubtle,
      color:
        tone === "ok"
          ? "var(--luca-success, #4fbf7a)"
          : settingsSurfaceTokens.textSecondary,
    }}
  >
    {children}
  </span>
);

const StepRow: React.FC<{
  n: number;
  done: boolean;
  title: string;
  sub: string;
  children: React.ReactNode;
}> = ({ n, done, title, sub, children }) => (
  <div
    className="flex items-center gap-3 rounded-xl border p-3"
    style={{
      borderColor: done
        ? "color-mix(in srgb, var(--luca-success, #4fbf7a) 26%, transparent)"
        : settingsSurfaceTokens.borderSubtle,
    }}
  >
    <span
      className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full border text-[11px] font-semibold"
      style={
        done
          ? {
              background:
                "color-mix(in srgb, var(--luca-success, #4fbf7a) 16%, transparent)",
              color: "var(--luca-success, #4fbf7a)",
              borderColor: "transparent",
            }
          : {
              borderColor: settingsSurfaceTokens.borderSubtle,
              color: settingsSurfaceTokens.textSecondary,
            }
      }
    >
      {done ? "✓" : n}
    </span>
    <div className="min-w-0 flex-1">
      <p
        className="text-[12.5px] font-semibold"
        style={{ color: settingsSurfaceTokens.textPrimary }}
      >
        {title}
      </p>
      <p
        className="text-[11.5px]"
        style={{ color: settingsSurfaceTokens.textTertiary }}
      >
        {sub}
      </p>
    </div>
    <div className="flex-none">{children}</div>
  </div>
);

const Toggle: React.FC<{ on: boolean; onClick: () => void; label: string }> = ({
  on,
  onClick,
  label,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    aria-label={label}
    onClick={onClick}
    className="relative h-[22px] w-[38px] rounded-full transition-colors"
    style={{ background: on ? "var(--luca-accent-primary, #7aa2ff)" : "rgba(255,255,255,0.12)" }}
  >
    <span
      className="absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white transition-all"
      style={{ left: on ? 18 : 2 }}
    />
  </button>
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
        className="text-[10.5px]"
        style={{
          color: result
            ? checklistColor(
                result.status === "dry_run" || result.status === "persisted"
                  ? "passed"
                  : "blocked",
              )
            : settingsSurfaceTokens.textTertiary,
        }}
      >
        {result?.status ?? "not run"}
      </span>
    </div>
    <p
      className="mt-1 text-xs leading-relaxed"
      style={{ color: settingsSurfaceTokens.textSecondary }}
    >
      {result
        ? `${result.auditRecord.summary} Side effects: ${result.sideEffectsPerformed ? "yes" : "no"}.`
        : empty}
    </p>
    {result?.memoryKey && (
      <p
        className="mt-2 break-all font-mono text-[11px]"
        style={{ color: settingsSurfaceTokens.textTertiary }}
      >
        {result.memoryKey} · {result.memoryCategory}
        {result.memoryNodeId ? ` · ${result.memoryNodeId}` : ""}
      </p>
    )}
  </div>
);

function badgeColor(cls: string): string {
  if (cls === "live") return "var(--luca-success, #4fbf7a)";
  if (cls === "arm") return "var(--luca-warning, #e0b15a)";
  return settingsSurfaceTokens.textTertiary;
}

function checklistColor(status: "passed" | "failed" | "pending" | "blocked") {
  if (status === "passed") return "var(--luca-success, #4fbf7a)";
  if (status === "pending") return "var(--luca-warning, #e0b15a)";
  return "var(--luca-danger, #f87171)";
}
