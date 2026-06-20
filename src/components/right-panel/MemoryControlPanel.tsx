import React, { useMemo, useState } from "react";
import type { MemoryNode } from "../../types";
import type { LucaExperienceMode } from "../../experience/experienceMode";
import { personalIntelligenceDashboardGraphFixture } from "../../personal-intelligence/dashboard";
import { memoryService } from "../../services/memoryService";
import { memoryGovernanceService } from "../../services/memory/MemoryGovernanceService";
import { memoryProposalService } from "../../services/memory/MemoryProposalService";
import { governedMemoryWriteService } from "../../services/memory/GovernedMemoryWriteService";
import { runtimeDiagnosticsService, type RuntimeDiagnostics } from "../../services/runtime/RuntimeDiagnosticsService";
import { Icon } from "../ui/Icon";
import LucaCloud from "../LucaCloud";
import RightPanelMetric from "./RightPanelMetric";
import RightPanelSection from "./RightPanelSection";
import { formatMemoryValue, isRenderableMemory } from "./rightPanelModel";
import { setHexAlpha } from "../../config/themeColors";
import PersonalIntelligenceReadOnlyPanel from "./PersonalIntelligenceReadOnlyPanel";

interface MemoryControlPanelProps {
  theme: { hex: string; primary: string; border: string };
  memories: MemoryNode[];
  setMemories: React.Dispatch<React.SetStateAction<MemoryNode[]>>;
  experienceMode: LucaExperienceMode;
}

type MemoryViewMode = "Archive" | "Governance" | "Proposals" | "Graph";

const MemoryControlPanel: React.FC<MemoryControlPanelProps> = ({ theme, memories, setMemories, experienceMode }) => {
  const [viewMode, setViewMode] = useState<MemoryViewMode>("Archive");
  const [revision, setRevision] = useState(0);
  const [diagnostics, setDiagnostics] = useState<RuntimeDiagnostics | null>(null);
  const visibleMemories = useMemo(() => memories.filter(isRenderableMemory), [memories]);
  const governanceRecords = useMemo(() => memoryGovernanceService.listGovernanceSummaries(memories as unknown as Array<Record<string, unknown>>), [memories, revision]);
  const governanceSummary = useMemo(() => memoryGovernanceService.getDiagnosticsSummary(memories as unknown as Array<Record<string, unknown>>), [memories, revision]);
  const proposals = useMemo(() => memoryProposalService.listProposals(), [revision]);
  const proposalSummary = useMemo(() => memoryProposalService.getDiagnosticsSummary(), [revision]);

  React.useEffect(() => {
    let mounted = true;
    runtimeDiagnosticsService.getDiagnostics().then((next) => mounted && setDiagnostics(next)).catch(() => undefined);
    return () => { mounted = false; };
  }, [revision]);

  const refresh = () => setRevision((value) => value + 1);

  return (
    <div className="space-y-3">
      <PersonalIntelligenceReadOnlyPanel
        graph={personalIntelligenceDashboardGraphFixture}
        mode={experienceMode}
        fixture
      />

      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-2" style={{ color: theme.hex }}>
              <Icon name="Database" size={18} />
            </div>
            <div>
              <div className="text-sm font-black uppercase tracking-[0.18em] text-[var(--app-text-main)]">MEMORY</div>
              <p className="mt-1 text-xs leading-relaxed text-[var(--app-text-muted)]">Memory readiness, archive, governance review, and the preserved cluster graph concept.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              if (!window.confirm("This will permanently erase all memories. Are you sure?")) return;
              await memoryService.wipeMemory();
              setMemories([]);
              refresh();
            }}
            className="rounded-lg border border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)] p-2 text-[var(--luca-danger,#f87171)] transition-colors hover:bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)]"
            title="Dangerous: wipe all memory"
          >
            <Icon name="Trash2" size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <RightPanelMetric label="Readiness" value={diagnostics?.memory.readiness ?? "loading"} tone={diagnostics?.memory.readiness === "ready" ? "good" : "warn"} />
        <RightPanelMetric label="Archive" value={visibleMemories.length} tone="neutral" />
        <RightPanelMetric label="Review" value={governanceSummary.pendingReviewRecords} tone={governanceSummary.pendingReviewRecords > 0 ? "warn" : "good"} />
        <RightPanelMetric label="Quarantine" value={governanceSummary.quarantinedRecords} tone={governanceSummary.quarantinedRecords > 0 ? "danger" : "good"} />
        <RightPanelMetric label="Proposals" value={proposalSummary.proposedProposals + proposalSummary.approvalRequiredProposals} tone={proposalSummary.proposedProposals + proposalSummary.approvalRequiredProposals > 0 ? "warn" : "good"} />
        <RightPanelMetric label="To save" value={proposalSummary.approvedWaitingWriteProposals} tone={proposalSummary.approvedWaitingWriteProposals > 0 ? "warn" : "good"} />
      </div>

      <div className="flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
        {(["Archive", "Governance", "Proposals", "Graph"] as MemoryViewMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setViewMode(mode)}
            className={`flex-1 rounded-lg px-2 py-2 text-[10px] font-black uppercase tracking-widest transition-colors ${viewMode === mode ? "bg-white/10 text-[var(--app-text-main)]" : "text-[var(--app-text-muted)] hover:text-[var(--app-text-main)]"}`}
            style={viewMode === mode ? { color: theme.hex } : undefined}
          >
            {mode}
          </button>
        ))}
      </div>

      {viewMode === "Archive" && (
        <RightPanelSection title="Archive" subtitle="Readable user memories from the existing local archive. System instructions remain filtered out.">
          {visibleMemories.length === 0 ? (
            <div className="text-[10px] italic text-[var(--app-text-muted)]">Memory banks empty.</div>
          ) : (
            <div className="space-y-2">
              {visibleMemories.map((memory) => {
                const formatted = formatMemoryValue(memory.value);
                return (
                  <div key={memory.id} className="group/mem relative rounded-xl border p-3 transition-all" style={{ borderColor: setHexAlpha(theme.hex, 0.2), backgroundColor: setHexAlpha(theme.hex, 0.05) }}>
                    <div className="mb-2 flex justify-between gap-2 text-[9px] opacity-70">
                      <div className="min-w-0">
                        <span className="font-bold uppercase tracking-widest text-slate-300">{memory.category}</span>
                        <span className="mx-2">·</span>
                        <span>{new Date(memory.timestamp).toLocaleString()}</span>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          const success = await memoryService.deleteMemory(memory.id);
                          if (success) setMemories((prev) => prev.filter((item) => item.id !== memory.id));
                        }}
                        className="opacity-0 group-hover/mem:opacity-100 text-[var(--luca-danger,#f87171)] transition-all hover:text-white"
                        title="Delete memory"
                      >
                        <Icon name="Trash" size={10} />
                      </button>
                    </div>
                    {formatted.label && <div className="mb-1 text-[9px] font-bold uppercase tracking-widest" style={{ color: theme.hex }}>{formatted.label}</div>}
                    <div className="max-h-32 overflow-hidden whitespace-pre-wrap text-[10px] leading-snug text-[var(--app-text-muted)]">{formatted.summary}</div>
                    <div className="mt-2 flex flex-wrap gap-2 text-[9px] uppercase tracking-widest text-[var(--app-text-muted)]">
                      <span>Confidence {Math.round((memory.confidence ?? 0) * 100)}%</span>
                      {memory.metadata?.source && <span>Source {memory.metadata.source}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </RightPanelSection>
      )}

      {viewMode === "Governance" && (
        <RightPanelSection title="Governance" subtitle="Review memory governance state without destructively migrating existing memories.">
          {governanceRecords.length === 0 ? (
            <div className="text-[10px] italic text-[var(--app-text-muted)]">No memory governance records.</div>
          ) : (
            <div className="space-y-2">
              {governanceRecords.map((record) => (
                <div key={record.memoryId} className="rounded-xl border border-white/10 bg-black/10 p-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 text-[10px] text-[var(--app-text-muted)]">
                      <div className="font-bold text-[var(--app-text-main)]">{record.category} · {record.reviewState}</div>
                      <div>{record.memoryType} · {record.writePolicy} · {record.retrievalPolicy}</div>
                      <div>Source {record.source} · confidence {Math.round(record.confidence * 100)}%</div>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" className="rounded-lg border border-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_12%,transparent)] px-2 py-1 text-[9px] font-black uppercase tracking-widest text-[var(--luca-success,#4fbf7a)]" onClick={() => { memoryGovernanceService.markUserApproved(record.memoryId); refresh(); }}>approve</button>
                    <button type="button" className="rounded-lg border border-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_12%,transparent)] px-2 py-1 text-[9px] font-black uppercase tracking-widest text-[var(--luca-warning,#f2b23e)]" onClick={() => { memoryGovernanceService.markQuarantined(record.memoryId); refresh(); }}>quarantine</button>
                    <button type="button" className="rounded-lg border border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)] px-2 py-1 text-[9px] font-black uppercase tracking-widest text-[var(--luca-danger,#f87171)]" onClick={() => { memoryGovernanceService.markRejected(record.memoryId); refresh(); }}>reject</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </RightPanelSection>
      )}

      {viewMode === "Proposals" && (
        <RightPanelSection title="Memory proposals" subtitle="Proposals pending approval, approved waiting write, and written history. Approving never writes; saving requires a separate click.">
          {proposals.length === 0 ? (
            <div className="text-[10px] italic text-[var(--app-text-muted)]">No memory proposals.</div>
          ) : (
            <div className="space-y-2">
              {proposals.slice(0, 24).map((proposal) => {
                const canWrite = proposal.status === "approved_waiting_write" ? governedMemoryWriteService.canWriteProposal(proposal.proposalId) : null;
                return (
                  <div key={proposal.proposalId} className="rounded-xl border border-white/10 bg-black/10 p-2 text-[10px] text-[var(--app-text-muted)]">
                    <div className="font-bold text-[var(--app-text-main)]">{proposal.title}</div>
                    <div className="mt-1">{proposal.summary}</div>
                    <div className="mt-1 uppercase tracking-widest">{proposal.kind} · {proposal.riskLevel} · {proposal.status}</div>
                    {proposal.status === "approved_waiting_write" && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {canWrite?.allowed ? (
                          <button type="button" className="rounded-lg border border-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_12%,transparent)] px-2 py-1 text-[9px] font-black uppercase tracking-widest text-[var(--luca-success,#4fbf7a)]" onClick={() => { void governedMemoryWriteService.writeApprovedProposal(proposal.proposalId).then(refresh); }}>Save memory once</button>
                        ) : (
                          <span className="text-[9px] uppercase tracking-widest text-[var(--luca-danger,#f87171)]">Blocked for safety: {canWrite?.reason}</span>
                        )}
                      </div>
                    )}
                    {proposal.blockedBy && proposal.blockedBy.length > 0 && <div className="mt-1 text-[var(--luca-danger,#f87171)]">Blocked: {proposal.blockedBy.join(", ")}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </RightPanelSection>
      )}

      {viewMode === "Graph" && (
        <RightPanelSection title="Memory Cluster / Graph" subtitle="The original 3D memory graph now lives inside Memory and renders real graph/RAG data only.">
          <div className="h-[520px] min-h-[420px] overflow-hidden rounded-xl border border-white/10 bg-black/40">
            <LucaCloud memories={visibleMemories} theme={theme} />
          </div>
        </RightPanelSection>
      )}
    </div>
  );
};

export default MemoryControlPanel;
