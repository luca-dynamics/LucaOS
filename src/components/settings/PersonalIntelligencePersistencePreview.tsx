import React from "react";
import {
  createMemoryPersistenceProposal,
  evaluatePersistencePolicy,
  type MemoryItem,
} from "../../personal-intelligence";

const previewMemoryItem: MemoryItem = {
  id: "memory-preview-project-preference",
  kind: "preference",
  title: "Project update preference",
  content:
    "Prefers concise project updates with explicit decisions and next steps.",
  source: "settings-preview",
  confidence: 0.82,
  privacyZone: "private",
  tags: ["preview", "communication"],
  createdAt: "2026-06-06T00:00:00.000Z",
  updatedAt: "2026-06-06T00:00:00.000Z",
};

export const persistenceProposalPreview = createMemoryPersistenceProposal(
  previewMemoryItem,
  {
    proposalId: "proposal-preview-memory-001",
    proposedPath: "personal-intelligence/memory/project-update-preference.json",
    serializedContentPreview: JSON.stringify(
      {
        id: previewMemoryItem.id,
        title: previewMemoryItem.title,
        privacyZone: previewMemoryItem.privacyZone,
      },
      null,
      2,
    ),
    now: () => new Date("2026-06-06T00:00:00.000Z"),
  },
);

const previewPolicyEvaluation = evaluatePersistencePolicy(
  persistenceProposalPreview,
  { policyId: "settings-preview-policy" },
);

interface PersonalIntelligencePersistencePreviewProps {
  compact?: boolean;
}

export const PersonalIntelligencePersistencePreview: React.FC<
  PersonalIntelligencePersistencePreviewProps
> = ({ compact = false }) => {
  if (compact) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
        <div
          className="space-y-3"
          data-testid="memory-persistence-proposal-preview"
        >
          <div>
            <p className="text-sm font-semibold text-[var(--app-text-main)]">
              Memory persistence proposal
            </p>
            <p className="mt-1 text-xs text-[var(--app-text-muted)]">
              Read-only proposal near the memory preview; no storage operation
              is available.
            </p>
          </div>
          <dl className="grid gap-2 text-xs sm:grid-cols-2">
            <PreviewValue
              label="Proposed path"
              value={persistenceProposalPreview.proposedPath}
            />
            <PreviewValue
              label="Approval"
              value={
                persistenceProposalPreview.explicitUserApprovalRequired
                  ? "Explicit user approval required"
                  : "Governed review required"
              }
            />
          </dl>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <div className="space-y-4" data-testid="persistence-proposal-preview">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[var(--app-text-main)]">
              Persistence Proposal Preview
            </p>
            <p className="mt-1 text-xs text-[var(--app-text-muted)]">
              Inspect a governed memory proposal before any separately reviewed
              future adapter exists.
            </p>
          </div>
          <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-[11px] font-semibold text-amber-300">
            {persistenceProposalPreview.status}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <PreviewStatus
            label="Operation"
            value={persistenceProposalPreview.requestedOperation}
            detail={persistenceProposalPreview.title}
          />
          <PreviewStatus
            label="Write performed"
            value={String(persistenceProposalPreview.writePerformed)}
            detail="Proposal state changes cannot write memory."
          />
          <PreviewStatus
            label="Storage"
            value="Disconnected"
            detail="No storage adapter connected."
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <ProposalMessages
            label="Blockers"
            messages={
              previewPolicyEvaluation.blockers.length
                ? previewPolicyEvaluation.blockers
                : ["Explicit user approval has not been recorded."]
            }
          />
          <ProposalMessages
            label="Warnings"
            messages={previewPolicyEvaluation.warnings}
          />
        </div>
      </div>
    </div>
  );
};

const PreviewStatus: React.FC<{
  label: string;
  value: string;
  detail: string;
}> = ({ label, value, detail }) => (
  <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
    <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--app-text-muted)]">
      {label}
    </p>
    <p className="mt-1 text-sm font-semibold text-[var(--app-text-main)]">
      {value}
    </p>
    <p className="mt-1 text-xs text-[var(--app-text-muted)]">{detail}</p>
  </div>
);

const PreviewValue: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <div>
    <dt className="font-semibold text-[var(--app-text-muted)]">{label}</dt>
    <dd className="mt-1 break-words text-[var(--app-text-main)]">{value}</dd>
  </div>
);

const ProposalMessages: React.FC<{ label: string; messages: string[] }> = ({
  label,
  messages,
}) => (
  <div className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
    <p className="text-xs font-semibold text-[var(--app-text-main)]">{label}</p>
    <ul className="mt-2 space-y-1 text-xs text-[var(--app-text-muted)]">
      {messages.map((message) => (
        <li key={message}>• {message}</li>
      ))}
    </ul>
  </div>
);
