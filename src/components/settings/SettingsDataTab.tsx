import React, { useState, useEffect, useMemo } from "react";
import { Icon } from "../ui/Icon";
import { memoryService } from "../../services/memoryService";
import { MemoryNode } from "../../types";
import { cortexUrl } from "../../config/api";
import {
  SettingsCard,
  SettingsDangerZone,
  SettingsRow,
  SettingsSection,
  SettingsStatusCard,
  settingsControlInlineStyle,
  settingsInputClassName,
  settingsSelectClassName,
} from "./SettingsLayout";
import { settingsSurfaceTokens } from "./settingsLayoutStyles";
 
import { PersonalIntelligencePersistencePreview } from "./PersonalIntelligencePersistencePreview";
=======
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
 
interface SettingsDataTabProps {
  theme?: any;
  memoryStats: { count: number };
  loadMemoryStats: () => void;
  isMobile?: boolean;
}

const SettingsDataTab: React.FC<SettingsDataTabProps> = ({
  memoryStats,
  loadMemoryStats,
  isMobile,
}) => {
  const [memories, setMemories] = useState<MemoryNode[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);

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

  return (
    <div className={`space-y-6 flex flex-col h-full ${isMobile ? "px-0" : ""}`}>
      <SettingsSection
        title="Personal Intelligence Preview"
        description="Review privacy, learning, and persistence boundaries without changing current memory behavior."
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

      <SettingsSection
        title="Memory Status"
        description="View and control what Luca remembers. This trust surface keeps memory clear and calm."
        icon="Database"
        isMobile={isMobile}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <SettingsStatusCard
            label="Memory"
            value="On-device"
            detail="Local memory is loaded from Luca's archive."
          />
          <SettingsStatusCard
            label="Total facts"
            value={`${memoryStats.count}`}
            detail="Personal details, preferences, projects, devices, and work context."
          />
          <SettingsStatusCard
            label="Last updated"
            value={
              memories[0]
                ? new Date(memories[0].timestamp).toLocaleDateString()
                : "No memories"
            }
            detail="Sorted by most recent memory."
          />
          <SettingsStatusCard
            label="Sync status"
            value="Local first"
            detail="Backend save is attempted when memory changes."
          />
        </div>
      </SettingsSection>

      <SettingsSection
        title="Personal Intelligence Persistence"
        description="Review proposal-only memory persistence readiness without changing current storage or runtime behavior."
        icon="Shield"
        isMobile={isMobile}
      >
        <PersonalIntelligencePersistencePreview />
      </SettingsSection>

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
            <input
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
            <select
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
            </select>
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
        description="Update memory visibility, refresh the archive, and forget selected memories from the cards above."
        icon="Sliders"
        isMobile={isMobile}
      >
        <SettingsRow
          label="Update memory"
          description="Refresh Luca's local memory archive and backend snapshot when available."
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
        <SettingsRow
          label="Forget selected memory"
          description="Use the delete control on an individual memory card."
        />
        <SettingsRow
          label="Memory visibility"
          description="Search and category filters determine which memories are visible here."
        />
      </SettingsSection>

      <SettingsSection
        title="Data Export"
        description="Export memory and future conversation/context bundles without changing storage behavior."
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
        <SettingsRow
          label="Import memory"
          description="Import and migration flows remain available where the existing product exposes them."
        />
      </SettingsSection>

      <SettingsSection
        title="Privacy"
        description="Local-only memory, cloud sync, encryption, and sensitive-memory rules stay easy to review."
        icon="ShieldCheck"
        isMobile={isMobile}
      >
        <SettingsRow
          label="Local-only memory"
          description="Luca reads the local archive first."
        />
        <SettingsRow
          label="Cloud sync"
          description="Backend save is attempted only through the existing memory endpoint."
        />
        <SettingsRow
          label="Sensitive memory rules"
          description="Review and delete individual memories from What Luca Remembers."
        />
      </SettingsSection>

      <SettingsDangerZone description="Delete memory, reset Luca profile, clear sessions, or wipe local data only after confirmation.">
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
          label="Clear sessions"
          description="Clear active chat history while preserving long-term memory."
          control={
            <button
              onClick={() => {
                if (
                  confirm(
                    "Clear active chat session? (Long-term memory will be preserved)",
                  )
                ) {
                  localStorage.removeItem("LUCA_CHAT_HISTORY_V1");
                  window.location.reload();
                }
              }}
              className="rounded-xl border px-3 py-2 text-sm"
              style={settingsControlInlineStyle}
            >
              Reset Session
            </button>
          }
        />
      </SettingsDangerZone>
    </div>
  );
};

export default SettingsDataTab;
