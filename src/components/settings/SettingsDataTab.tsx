import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Icon } from "../ui/Icon";
import { LucaInput, LucaSelect } from "../ui/luca";
import { memoryService } from "../../services/memoryService";
import { settingsService } from "../../services/settingsService";
import { memoryProposalService } from "../../services/memory/MemoryProposalService";
import { conversationThreadService } from "../../services/conversation/conversationThreadService";
import {
  buildBundleFromPendingProposals,
  buildBundleFromProposalId,
  listReviewableMemoryProposals,
  type MemoryApprovalQueueItem,
} from "../../services/personalIntelligence/memoryProposalBridge";
import { summarizeStoredMemoryApprovalAudit } from "../../services/personalIntelligence/memoryApprovalAuditStore";
import type { MemoryApprovalProposalBundle } from "../../personal-intelligence/approval";
import { MemoryNode } from "../../types";
import { cortexUrl } from "../../config/api";
import {
  SettingsCard,
  SettingsDangerZone,
  SettingsRow,
  SettingsSection,
  SettingsStatList,
  SettingsToggle,
  settingsControlInlineStyle,
  settingsInputClassName,
  settingsSelectClassName,
} from "./SettingsLayout";
import { settingsSurfaceTokens } from "./settingsLayoutStyles";
import KnowledgeBridgeTab from "./KnowledgeBridgeTab";

import { PersonalIntelligencePersistencePreview } from "./PersonalIntelligencePersistencePreview";
import { PersonalIntelligenceMemoryApprovalPilot } from "./PersonalIntelligenceMemoryApprovalPilot";
import { PersonalIntelligenceRuntimeTracePanel } from "./PersonalIntelligenceRuntimeTracePanel";
import { PersonalIntelligenceMissionRuntimePanel } from "./PersonalIntelligenceMissionRuntimePanel";
import { UnifiedMissionCenterPanel } from "./UnifiedMissionCenterPanel";
import { UnifiedMemoryVaultPanel } from "./UnifiedMemoryVaultPanel";
import { UnifiedSkillMarketplacePanel } from "./UnifiedSkillMarketplacePanel";
import {
  createLearningEventPreview,
  createPrivacyZonesPreview,
  evaluateIntegrationReadinessPreview,
} from "../../personal-intelligence";
import {
  IntegrationReadinessPreviewCard,
  LearningEventPreviewCard,
  PrivacyZonesPreviewCard,
} from "./personalIntelligencePreview";
import { getThinExecutionPilotStatus } from "../../services/runtime/thinExecutionPilot";

interface SettingsDataTabProps {
  theme?: any;
  memoryStats: { count: number };
  loadMemoryStats: () => void;
  isMobile?: boolean;
}

interface PilotQueueSnapshot {
  pendingProposals: MemoryApprovalQueueItem[];
  buildBundleForProposal:
    | ((id: string) => MemoryApprovalProposalBundle | null)
    | undefined;
  buildProposalBundle: (() => MemoryApprovalProposalBundle) | undefined;
}

function readPilotQueue(): PilotQueueSnapshot {
  try {
    const records = memoryProposalService.listProposals();
    const pending = listReviewableMemoryProposals(records);
    const fallback = buildBundleFromPendingProposals(records);
    return {
      pendingProposals: pending,
      buildBundleForProposal: (id: string) =>
        buildBundleFromProposalId(records, id),
      buildProposalBundle: fallback ? () => fallback : undefined,
    };
  } catch {
    return {
      pendingProposals: [],
      buildBundleForProposal: undefined,
      buildProposalBundle: undefined,
    };
  }
}

const SettingsDataTab: React.FC<SettingsDataTabProps> = ({
  memoryStats,
  loadMemoryStats,
  isMobile,
  theme,
}) => {
  const [memories, setMemories] = useState<MemoryNode[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);

  // Consent gate for memory the agent proposes about the operator. Off by
  // default; when on, storeMemory stages a proposal instead of writing.
  const [memoryWriteApproval, setMemoryWriteApproval] = useState<boolean>(
    () => settingsService.get("memory")?.writeApproval === true,
  );

  const toggleMemoryWriteApproval = useCallback(() => {
    setMemoryWriteApproval((previous) => {
      const next = !previous;
      void settingsService.saveSettings({
        memory: { ...settingsService.get("memory"), writeApproval: next },
      });
      return next;
    });
  }, []);

  // Feed the governed write pilot the REAL reviewable queue from the live
  // proposal service. Refreshed after a successful pilot write so the written
  // item leaves the selector and the memory list updates.
  const [pilotQueue, setPilotQueue] = useState<PilotQueueSnapshot>(readPilotQueue);

  // The durable governed-write audit trail (persisted across sessions), read
  // once at mount so the pilot can show prior history.
  const initialAuditSummary = useMemo(() => {
    try {
      return summarizeStoredMemoryApprovalAudit();
    } catch {
      return undefined;
    }
  }, []);

  useEffect(() => {
    loadAllMemories();
  }, []);

  const loadAllMemories = () => {
    setLoading(true);
    const allMems = memoryService.getAllMemories();
    // Sort by timestamp descending
    setMemories([...allMems].sort((a, b) => b.timestamp - a.timestamp));
    setLoading(false);
    loadMemoryStats();
  };

  const handlePilotLiveWriteSuccess = useCallback(() => {
    setPilotQueue(readPilotQueue());
    loadAllMemories();
  }, [loadMemoryStats]);

  const deleteMemory = (id: string) => {
    if (confirm("Permanently delete this memory?")) {
      const allMems = memoryService.getAllMemories();
      const updated = allMems.filter((m) => m.id !== id);
      localStorage.setItem("LUCA_LUCA_ARCHIVE_V1", JSON.stringify(updated));

      // Also notify backend if possible
      fetch(cortexUrl("/api/memory/save"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      }).catch(() => {});

      loadAllMemories();
    }
  };

  const filteredMemories = useMemo(() => {
    return memories.filter((m) => {
      const matchesSearch =
        m.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.value.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        categoryFilter === "ALL" || m.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [memories, searchQuery, categoryFilter]);

  const categories = [
    "ALL",
    "SEMANTIC",
    "USER_STATE",
    "SESSION_STATE",
    "AGENT_STATE",
  ];

  const privacyZonesPreview = createPrivacyZonesPreview();
  const learningEventPreview = createLearningEventPreview({
    eventId: "learning-preview",
    timestamp: "2026-06-06T00:00:00.000Z",
    inputSummary: "User reviewed a Personal Intelligence settings preview.",
    actionTaken: "Propose a bounded preference adjustment for review.",
    outcome: "partial",
    verificationStatus: "pending",
    nextAdjustment:
      "Wait for explicit approval and a future persistence adapter.",
  });
  const persistenceReadinessPreview = evaluateIntegrationReadinessPreview();

  // Governance previews are Pro/Creator surfaces; Basic stays calm.
  const showGovernancePreviews =
    settingsService.get("general").experienceMode !== "basic";

  return (
    <div className={`space-y-6 flex flex-col h-full ${isMobile ? "px-0" : ""}`}>
      {showGovernancePreviews && (
        <SettingsSection
          title="Personal Intelligence Preview"
          description="Inspect privacy, learning, and persistence boundaries. Nothing is written."
          icon="Eye"
          isMobile={isMobile}
        >
          <div className="space-y-3">
            <PrivacyZonesPreviewCard zones={privacyZonesPreview} />
            <LearningEventPreviewCard event={learningEventPreview} />
            <IntegrationReadinessPreviewCard
              readiness={persistenceReadinessPreview}
            />
          </div>
        </SettingsSection>
      )}

      <SettingsSection
        title="Memory Status"
        description="What Luca currently remembers, and where it is kept."
        icon="Database"
        isMobile={isMobile}
      >
        <SettingsStatList
          items={[
            {
              label: "Storage",
              value: "On-device",
              detail: "Memory is read from the local archive first.",
            },
            {
              label: "Total facts",
              value: `${memoryStats.count}`,
              detail: "Details, preferences, projects, devices, work context.",
            },
            {
              label: "Last updated",
              value: memories[0]
                ? new Date(memories[0].timestamp).toLocaleDateString()
                : "No memories",
              detail: "Timestamp of the most recent memory.",
            },
            {
              label: "Write approval",
              value: memoryWriteApproval ? "Required" : "Automatic",
              detail: "Set under Privacy below.",
            },
          ]}
        />
      </SettingsSection>

      {showGovernancePreviews && (
        <SettingsSection
          title="Personal Intelligence Persistence"
          description="Governed memory adapter status and write prerequisites."
          icon="Shield"
          isMobile={isMobile}
        >
          <div className="space-y-4">
            <PersonalIntelligencePersistencePreview />
            <UnifiedMemoryWriteSummaryCard />
            <PersonalIntelligenceMemoryApprovalPilot
              pendingProposals={pilotQueue.pendingProposals}
              buildBundleForProposal={pilotQueue.buildBundleForProposal}
              buildProposalBundle={pilotQueue.buildProposalBundle}
              initialAuditSummary={initialAuditSummary}
              onLiveWriteSuccess={handlePilotLiveWriteSuccess}
            />
          </div>
          <PersonalIntelligenceRuntimeTracePanel />
          <PersonalIntelligenceMissionRuntimePanel />
        </SettingsSection>
      )}

      {showGovernancePreviews && (
        <SettingsSection
          title="Mission Center"
          description="Goals, verification tape, and gated completion for the active mission."
          icon="Flag"
          isMobile={isMobile}
        >
          <UnifiedMissionCenterPanel />
        </SettingsSection>
      )}

      {showGovernancePreviews && (
        <SettingsSection
          title="Memory Vault"
          description="Read and edit the local archive, with export and import."
          icon="Database"
          isMobile={isMobile}
        >
          <UnifiedMemoryVaultPanel />
        </SettingsSection>
      )}

      {showGovernancePreviews && (
        <SettingsSection
          title="Skill Marketplace"
          description="Import tool catalogs and manage skills. Auto-execution stays off."
          icon="Package"
          isMobile={isMobile}
        >
          <UnifiedSkillMarketplacePanel />
        </SettingsSection>
      )}

      <SettingsSection
        title="What Luca Remembers"
        description="Search personal details, preferences, projects, devices, and work context."
        icon="Brain"
        isMobile={isMobile}
      >
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="relative flex-1 min-w-[200px]">
            <Icon
              name="Search"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--app-text-muted)] opacity-60"
            />
            <LucaInput
              type="text"
              placeholder="Search memories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`${settingsInputClassName} pl-9`}
              style={settingsControlInlineStyle}
            />
          </div>

          <div className="flex items-center gap-2">
            <Icon
              name="Filter"
              className="w-4 h-4 text-[var(--app-text-muted)] opacity-60"
            />
            <LucaSelect
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className={settingsSelectClassName}
              style={settingsControlInlineStyle}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.replace("_", " ")}
                </option>
              ))}
            </LucaSelect>
            <button
              onClick={loadAllMemories}
              className="rounded-xl border px-3 py-2 text-sm transition-all"
              style={settingsControlInlineStyle}
            >
              <Icon
                name="Refresh"
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        <div className="max-h-[420px] overflow-y-auto no-scrollbar space-y-2">
          {loading ? (
            <SettingsCard>
              <div className="flex items-center gap-3 opacity-70">
                <Icon name="Refresh" className="w-5 h-5 animate-spin" />
                <span className="text-sm font-medium">Loading memories…</span>
              </div>
            </SettingsCard>
          ) : filteredMemories.length > 0 ? (
            filteredMemories.map((m) => (
              <SettingsCard key={m.id} className="group relative">
                <button
                  onClick={() => deleteMemory(m.id)}
                  className="absolute right-3 top-3 rounded-lg p-2 opacity-0 transition-opacity group-hover:opacity-100"
                  style={{ color: settingsSurfaceTokens.textTertiary }}
                  title="Delete memory"
                >
                  <Icon name="Trash" className="w-4 h-4" />
                </button>

                <div className="flex items-start gap-4 pr-10">
                  <span
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                    style={{
                      backgroundColor: settingsSurfaceTokens.accentPrimary,
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="truncate text-sm font-semibold"
                        style={{ color: settingsSurfaceTokens.textPrimary }}
                      >
                        {m.key}
                      </span>
                      {m.metadata?.source && (
                        <span
                          className="rounded-full border px-2 py-0.5 text-[10px]"
                          style={{
                            borderColor: settingsSurfaceTokens.borderSubtle,
                            color: settingsSurfaceTokens.textTertiary,
                          }}
                        >
                          {m.metadata.source}
                        </span>
                      )}
                    </div>
                    <p
                      className="mt-1 break-words text-sm leading-relaxed"
                      style={{ color: settingsSurfaceTokens.textSecondary }}
                    >
                      {m.value}
                    </p>
                    <div
                      className="mt-3 flex flex-wrap items-center gap-3 text-[10px]"
                      style={{ color: settingsSurfaceTokens.textTertiary }}
                    >
                      <span>{new Date(m.timestamp).toLocaleString()}</span>
                      <span>{m.category.replace("_", " ")}</span>
                    </div>
                  </div>
                </div>
              </SettingsCard>
            ))
          ) : (
            <SettingsCard>
              <div className="py-8 text-center">
                <Icon
                  name="Database"
                  variant="BoldDuotone"
                  className="mx-auto mb-3 h-12 w-12 opacity-30"
                />
                <p className="text-sm font-semibold">No memories found</p>
                <p className="mt-1 text-xs opacity-70">
                  Try a different search or connect more knowledge.
                </p>
              </div>
            </SettingsCard>
          )}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Memory Controls"
        description="Refresh Luca's local memory archive."
        icon="Sliders"
        isMobile={isMobile}
      >
        <SettingsRow
          label="Update memory"
          description="Reload the local archive and backend snapshot."
          control={
            <button
              onClick={loadAllMemories}
              className="rounded-xl border px-3 py-2 text-sm"
              style={settingsControlInlineStyle}
            >
              Refresh
            </button>
          }
        />
      </SettingsSection>

      <SettingsSection
        title="Data Export"
        description="Take a copy of what Luca remembers about you."
        icon="Download"
        isMobile={isMobile}
      >
        <SettingsRow
          label="Export memory"
          description="Download Luca's current memory archive as JSON."
          control={
            <button
              onClick={() => {
                const blob = new Blob([JSON.stringify(memories, null, 2)], {
                  type: "application/json",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `luca_memory_dump_${Date.now()}.json`;
                a.click();
              }}
              className="rounded-xl border px-3 py-2 text-sm"
              style={settingsControlInlineStyle}
            >
              Export JSON
            </button>
          }
        />
      </SettingsSection>

      <SettingsSection
        title="Privacy"
        description="Decide what Luca is allowed to remember about you."
        icon="ShieldCheck"
        isMobile={isMobile}
      >
        <SettingsRow
          label="Approve what Luca remembers"
          description="Hold proposed memories for review instead of saving them."
          control={
            <SettingsToggle
              checked={memoryWriteApproval}
              onChange={toggleMemoryWriteApproval}
              ariaLabel="Require approval before Luca saves a memory"
            />
          }
        />
      </SettingsSection>

      {/* What Luca is given to read and what Luca remembers are one question.
          Knowledge Base was its own destination and made neither answerable. */}
      <div data-settings-anchor="knowledge-bridge">
        <KnowledgeBridgeTab theme={theme} isMobile={isMobile} />
      </div>

      <SettingsDangerZone description="Irreversible. Both actions ask for confirmation first.">
        <SettingsRow
          label="Delete memory"
          description="Wipe everything Luca has learned from the local memory store."
          control={
            <button
              onClick={() => {
                if (
                  confirm(
                    "DANGER: Wiping memory will erase everything Luca has learned. Continue?",
                  )
                ) {
                  memoryService.wipeMemory();
                  loadAllMemories();
                }
              }}
              className="rounded-xl border px-3 py-2 text-sm"
              style={settingsControlInlineStyle}
            >
              Wipe Store
            </button>
          }
        />
        <SettingsRow
          label="Clear conversations"
          description="Delete every conversation thread. Long-term memory is preserved."
          control={
            <button
              onClick={() => {
                if (
                  confirm(
                    "Delete all conversation threads? (Long-term memory will be preserved)",
                  )
                ) {
                  // Goes through the service so the pre-threads key is removed
                  // too — otherwise the migration would read it on the next
                  // launch and resurrect exactly what was just cleared.
                  conversationThreadService.clearAllThreads();
                  window.location.reload();
                }
              }}
              className="rounded-xl border px-3 py-2 text-sm"
              style={settingsControlInlineStyle}
            >
              Clear conversations
            </button>
          }
        />
      </SettingsDangerZone>
    </div>
  );
};

/** Read-only unified write timeline (pilot + proposal + governed write paths). */
const UnifiedMemoryWriteSummaryCard: React.FC = () => {
  const snapshot = useMemo(() => {
    try {
      return getThinExecutionPilotStatus(5);
    } catch {
      return null;
    }
  }, []);

  if (!snapshot) return null;
  const { summary } = snapshot;

  return (
    <div
      className="rounded-xl border p-4 text-xs"
      style={{
        borderColor: settingsSurfaceTokens.borderSubtle,
        color: settingsSurfaceTokens.textSecondary,
      }}
    >
      <p
        className="text-sm font-semibold"
        style={{ color: settingsSurfaceTokens.textPrimary }}
      >
        Unified memory write audit
      </p>
      <p className="mt-1 leading-relaxed">
        Thin execution pilot: {snapshot.label}. Side-effecting writes:{" "}
        {summary.sideEffectingWrites} · pilot live: {summary.pilotLiveWrites} ·
        proposal written: {summary.proposalWritten} · governed succeeded:{" "}
        {summary.governedSucceeded} · blocked/failed: {summary.blockedOrFailed}.
      </p>
      <p className="mt-2" style={{ color: settingsSurfaceTokens.textTertiary }}>
        Skills, tools, shell, browser, and LucaLink remote actions stay blocked
        outside this memory-write pilot.
      </p>
      {snapshot.recentEvents.length > 0 && (
        <ul className="mt-2 space-y-1">
          {snapshot.recentEvents.map((event) => (
            <li key={event.id}>
              • {event.kind.replace(/_/g, " ")} — {event.title}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SettingsDataTab;
