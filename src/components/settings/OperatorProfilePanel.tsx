/* eslint-disable react/prop-types */
import React, { useState, useEffect } from "react";
import { Icon } from "../ui/Icon";
import { settingsService } from "../../services/settingsService";
import { memoryService } from "../../services/memoryService";
import { personalityService } from "../../services/personalityService";
import { lucaService } from "../../services/lucaService";
import { apiUrl } from "../../config/api";
import AdminEnrollmentModal from "../AdminEnrollmentModal";
import { OperatorProfile } from "../../types/operatorProfile";
import {
  LucaPersonality,
  RelationshipStage,
} from "../../types/lucaPersonality";
import { MemoryNode } from "../../types";
import { setHexAlpha } from "../../config/themeColors";
import {
  SettingsAdvancedDisclosure,
  SettingsCard,
  SettingsRow,
  SettingsSection,
  SettingsStatusCard,
} from "./SettingsLayout";

// Helper functions from PersonalityDashboard
function getVibeSummary(traits: any) {
  const { warmth, playfulness, empathy, protectiveness, sass, familiarity } =
    traits;

  let vibe = "Neutral";
  let description = "Balanced and ready to assist.";

  if (sass > 70) {
    if (playfulness > 60) {
      vibe = "Playfully Sassy";
      description = "High-energy banter with a sharp edge.";
    } else {
      vibe = "Brutally Honest";
      description = "Direct, clinical, and unapologetically objective.";
    }
  } else if (warmth > 70) {
    if (familiarity > 70) {
      vibe = "Close Companion";
      description = "Warm, intuitive, and highly attuned to you.";
    } else {
      vibe = "Helpful Mentor";
      description = "Encouraging, supportive, and patient.";
    }
  } else if (protectiveness > 80) {
    vibe = "Guardian Path";
    description = "Prioritizing your security and well-being above all.";
  } else if (empathy > 70) {
    vibe = "Empathetic Sync";
    description = "Mirroring your emotional state for deeper support.";
  } else if (playfulness > 70) {
    vibe = "Witty Assistant";
    description = "Lighthearted and prone to clever remarks.";
  }

  return { vibe, description };
}

function getStageProgress(stage: RelationshipStage, days: number): number {
  const stages = {
    [RelationshipStage.NEW]: { min: 0, max: 7 },
    [RelationshipStage.GETTING_COMFORTABLE]: { min: 7, max: 30 },
    [RelationshipStage.ESTABLISHED]: { min: 30, max: 90 },
    [RelationshipStage.TRUSTED]: { min: 90, max: 180 },
    [RelationshipStage.BONDED]: { min: 180, max: 365 },
  };

  const range = stages[stage];
  if (range && days >= range.max) return 100;
  if (!range) return 0;

  const progress = ((days - range.min) / (range.max - range.min)) * 100;
  return Math.max(0, Math.min(100, Math.round(progress)));
}

interface OperatorProfilePanelProps {
  theme: {
    primary: string;
    hex: string;
    themeName: string;
    isLight?: boolean;
  };
  isMobile?: boolean;
}

/**
 * Operator Profile Panel for Settings
 * Displays what Luca has learned about the operator
 */
const OperatorProfilePanel: React.FC<OperatorProfilePanelProps> = ({
  theme,
  isMobile,
}) => {
  const [profile, setProfile] = useState<OperatorProfile | null>(null);
  const [personality, setPersonality] = useState<LucaPersonality | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [editedDesignation, setEditedDesignation] = useState("");
  const [insights, setInsights] = useState<MemoryNode[]>([]);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [showEnrollModal, setShowEnrollModal] = useState(false);

  useEffect(() => {
    loadAllData();
    fetchReferenceImage();
  }, []);

  const fetchReferenceImage = async () => {
    try {
      const res = await fetch(apiUrl("/api/admin/reference-image"));
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.imageBase64) {
          setReferenceImage(data.imageBase64);
        }
      }
    } catch (e) {
      console.error("Failed to fetch reference image:", e);
    }
  };

  const loadAllData = () => {
    setLoading(true);

    // Load Profile
    const storedProfile = settingsService.getOperatorProfile();
    setProfile(storedProfile);
    if (storedProfile) {
      setEditedName(storedProfile.identity.name);
      setEditedDesignation(storedProfile.identity.designation || "");
    }

    // Load Insights (Deduplicated by key)
    const memories = memoryService.getUserState();
    const uniqueMemoriesMap = new Map();
    memories
      .sort((a, b) => b.timestamp - a.timestamp)
      .forEach((m) => {
        if (!uniqueMemoriesMap.has(m.key)) {
          uniqueMemoriesMap.set(m.key, m);
        }
      });
    const latest = Array.from(uniqueMemoriesMap.values()).slice(0, 5);
    setInsights(latest);

    // Load Personality
    const personalityData = personalityService.getPersonality();
    setPersonality(personalityData);

    setLoading(false);
  };

  const handleSave = () => {
    if (!profile) return;

    const updates = {
      identity: {
        ...profile.identity,
        name: editedName,
        designation: editedDesignation,
      },
    };

    settingsService.updateOperatorProfile(updates);
    setProfile({
      ...profile,
      identity: {
        ...profile.identity,
        name: editedName,
        designation: editedDesignation,
      },
      metadata: {
        ...profile.metadata,
        lastUpdated: new Date(),
      },
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    if (profile) {
      setEditedName(profile.identity.name);
      setEditedDesignation(profile.identity.designation || "");
    }
    setIsEditing(false);
  };

  const handleRefresh = () => {
    loadAllData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Icon
          name="RefreshCw"
          className="w-6 h-6 text-[var(--app-text-muted)] animate-spin"
        />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-20 space-y-6 animate-in fade-in zoom-in duration-700">
        <div className="w-24 h-24 mx-auto rounded-lg flex items-center justify-center glass-blur">
          <Icon
            name="User"
            className="w-12 h-12 text-[var(--app-text-muted)] opacity-50"
          />
        </div>
        <div className="space-y-2">
          <h3 className={`text-lg font-semibold text-[var(--app-text-main)]`}>
            Profile setup needed
          </h3>
          <p className="text-sm text-[var(--app-text-muted)] max-w-sm mx-auto opacity-70 leading-relaxed">
            Complete onboarding to build your Luca profile.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`space-y-6 ${isMobile ? "max-w-none" : "max-w-6xl"} mx-auto pb-10`}
    >
      <SettingsSection
        title="Operator Profile"
        description="Who Luca serves: name, role, preferred context, and trusted identity state."
        icon="User"
        accentColor={theme.hex}
        isMobile={isMobile}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <SettingsStatusCard
            label="Name"
            value={profile.identity.name || "Set profile"}
            detail="Primary operator identity."
            accentColor={theme.hex}
          />
          <SettingsStatusCard
            label="Role"
            value={profile.identity.designation || "Personal operator"}
            detail="Used for everyday personalization."
            accentColor={theme.hex}
          />
          <SettingsStatusCard
            label="Work context"
            value={`${insights.length} signals`}
            detail="Projects, goals, workflows, and preferences remain user-reviewed."
            accentColor={theme.hex}
          />
          <SettingsStatusCard
            label="Identity lock"
            value={referenceImage ? "Face enrolled" : "Optional"}
            detail="Trusted-device and verification controls stay grouped below."
            accentColor={theme.hex}
          />
        </div>
      </SettingsSection>

      <SettingsSection
        title="Work Context"
        description="Projects, company context, goals, and workflows remain visible without raw operator-console language."
        icon="Briefcase"
        accentColor={theme.hex}
        isMobile={isMobile}
      >
        <SettingsCard>
          <p className="text-sm font-semibold">Personalization context</p>
          <p className="mt-1 text-xs opacity-70">
            The profile cards below keep Luca&apos;s learned work context
            editable and reviewable.
          </p>
        </SettingsCard>
      </SettingsSection>

      <SettingsSection
        title="Personalization"
        description="Communication preferences, default assistant behavior, notifications, and preferred apps/tools."
        icon="Sparkles"
        accentColor={theme.hex}
        isMobile={isMobile}
      >
        <div
          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2 ${isMobile ? "px-4" : ""}`}
        >
          <div className="space-y-1">
            <h3 className={`text-xl font-semibold text-[var(--app-text-main)]`}>
              Profile details
            </h3>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-[var(--app-text-muted)] opacity-70">
                Last updated:{" "}
                {new Date(profile.metadata.lastUpdated).toLocaleDateString()}
              </span>
              <div className="w-1 h-1 rounded-full bg-[var(--app-text-muted)] opacity-20" />
              <span className="text-xs font-medium text-[var(--app-text-muted)] opacity-70">
                Conversation count: {profile.metadata.conversationCount || 0}
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleRefresh}
              className={`px-5 py-2 bg-[var(--app-bg-tint)] hover:bg-[var(--app-text-main)]/5 rounded-lg flex items-center gap-3 transition-all border border-[var(--app-border-main)] glass-blur group`}
              title="Refresh profile"
            >
              <Icon
                name="RefreshCw"
                className="w-4 h-4 text-[var(--app-text-muted)] group-hover:rotate-180 transition-transform duration-500"
              />
              <span
                className={`text-sm font-medium text-[var(--app-text-main)] opacity-80`}
              >
                Refresh profile
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Row 1: Identity Card - Full Width */}
          <div className="col-span-12">
            <div
              className={`${isMobile ? "p-4 py-8 border-x-0 border-y rounded-none" : "rounded-lg p-6 lg:p-8 rounded-lg border shadow-xl"} relative group overflow-hidden h-full transition-all bg-[var(--app-bg-tint)] glass-blur animate-in slide-in-from-top-4 duration-700`}
              style={{
                backgroundColor: isMobile
                  ? "var(--luca-surface-glass, var(--app-bg-tint))"
                  : "var(--app-bg-tint)",
                borderColor: "var(--luca-border-subtle, var(--app-border-main))",
              }}
            >
              {/* Absolute Decorative Background Elements */}
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-[var(--app-text-main)]/5 rounded-full blur-[80px] pointer-events-none" />

              <div className="absolute top-0 right-0 p-6 z-10">
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className={`p-3 rounded-lg transition-all bg-[var(--app-bg-tint)] hover:bg-[var(--app-text-main)]/10 group/edit`}
                  >
                    <Icon
                      name="Edit3"
                      className={`w-5 h-5 text-[var(--app-text-muted)] group-hover/edit:text-[var(--app-text-main)] group-hover/edit:scale-110 transition-all`}
                    />
                  </button>
                ) : (
                  <div className="flex items-center gap-4">
                    <button
                      onClick={handleCancel}
                      className="text-[10px] uppercase font-black tracking-widest text-[var(--app-text-muted)] hover:text-[var(--app-text-main)] transition-colors"
                    >
                      Abort
                    </button>
                    <button
                      onClick={handleSave}
                      className="px-6 py-2.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all shadow-xl bg-[var(--app-text-main)] text-[var(--app-bg-tint)] hover:scale-105 active:scale-95"
                    >
                      Commit Profile
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-col lg:flex-row gap-10 items-start">
                <div
                  onClick={() => setShowEnrollModal(true)}
                  className="w-32 h-32 rounded-lg flex items-center justify-center relative shrink-0 shadow-2xl group/photo cursor-pointer overflow-hidden transition-all active:scale-95 bg-[var(--luca-surface-glass)]"
                >
                  {profile.identity.avatar || referenceImage ? (
                    <img
                      src={`data:image/jpeg;base64,${profile.identity.avatar || referenceImage}`}
                      alt="Operator"
                      className="w-full h-full object-cover transition-all group-hover/photo:scale-110 group-hover/photo:opacity-50"
                    />
                  ) : (
                    <Icon
                      name="User"
                      className={`w-12 h-12 transition-colors text-[var(--app-text-muted)] group-hover/photo:text-[var(--app-text-main)]`}
                    />
                  )}

                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-opacity">
                    <Icon
                      name="Camera"
                      className="w-8 h-8 text-[var(--app-text-main)]"
                    />
                  </div>

                  <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl flex items-center justify-center shadow-2xl z-10 border bg-[var(--app-bg-tint)] border-[var(--app-border-main)]">
                    <Icon name="Shield" className="w-5 h-5 text-[var(--luca-success,#4fbf7a)]" />
                  </div>
                </div>

                <div className="flex-1 space-y-8 w-full">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-2">
                      <span className="text-[10px] uppercase font-black font-mono tracking-[0.3em] text-[var(--app-text-muted)] opacity-50 block">
                        Operator Designation
                      </span>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedName}
                          onChange={(e) => setEditedName(e.target.value)}
                          className={`w-full rounded-lg px-4 py-3 text-lg outline-none transition-all shadow-inner border font-black tracking-tight bg-[var(--luca-surface-solid)] border-[var(--app-border-main)] text-[var(--app-text-main)] focus:border-[var(--app-text-muted)] focus:bg-[var(--luca-surface-hover)]`}
                        />
                      ) : (
                        <div
                          className={`text-4xl font-black text-[var(--app-text-main)] leading-none tracking-tighter italic uppercase`}
                        >
                          {profile.identity.name}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <span className="text-[10px] uppercase font-black font-mono tracking-[0.3em] text-[var(--app-text-muted)] opacity-50 block">
                        Active Role
                      </span>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedDesignation}
                          onChange={(e) => setEditedDesignation(e.target.value)}
                          className={`w-full rounded-lg px-4 py-3 text-lg outline-none transition-all shadow-inner border font-black tracking-tight bg-[var(--luca-surface-solid)] border-[var(--app-border-main)] text-[var(--app-text-main)] focus:border-[var(--app-text-muted)] focus:bg-[var(--luca-surface-hover)]`}
                        />
                      ) : (
                        <div
                          className={`text-2xl font-black text-[var(--app-text-muted)] opacity-80 tracking-tight uppercase`}
                        >
                          {profile.identity.designation || "NOT ASSIGNED"}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-10 border-t border-[var(--app-border-main)] pt-8 opacity-90">
                    <div className="space-y-2">
                      <span className="block text-[10px] font-black text-[var(--app-text-muted)] opacity-40 uppercase tracking-[0.2em]">
                        Core Domain
                      </span>
                      <span
                        className={`text-sm font-black px-5 py-2 rounded-lg inline-block transition-all text-[var(--app-text-main)] bg-[var(--luca-surface-glass)] border-[var(--app-border-main)] uppercase tracking-widest`}
                      >
                        {profile.workContext?.profession || "UNKNOWN"}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <span className="block text-[10px] font-black text-[var(--app-text-muted)] opacity-40 uppercase tracking-[0.2em]">
                        Expertise Sync
                      </span>
                      <span
                        className={`text-sm font-black px-5 py-2 rounded-lg inline-block transition-all text-[var(--app-text-main)] bg-[var(--luca-surface-glass)] border-[var(--app-border-main)] uppercase tracking-widest`}
                      >
                        {profile.workContext?.skillLevel || "VETERAN"}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <span className="block text-[10px] font-black text-[var(--app-text-muted)] opacity-40 uppercase tracking-[0.2em]">
                        Luca Tone
                      </span>
                      <span
                        className={`text-sm font-black px-5 py-2 rounded-lg inline-block transition-all text-[var(--app-text-main)] bg-[var(--luca-surface-glass)] border-[var(--app-border-main)] uppercase tracking-widest`}
                      >
                        {profile.personality?.tone || "NATURAL"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Partnership Status - Horizontal Layout */}
          <div className="col-span-12">
            <div
              className={`${isMobile ? "p-4 py-6 border-x-0 border-y rounded-none" : "border rounded-xl p-3 lg:p-4"} relative overflow-hidden transition-all bg-[var(--app-bg-tint)] border-[var(--app-border-main)] shadow-xl glass-blur`}
              style={{
                backgroundColor: isMobile
                  ? "var(--luca-surface-glass, var(--app-bg-tint))"
                  : "var(--app-bg-tint)",
                borderColor: "var(--luca-border-subtle, var(--app-border-main))",
              }}
            >
              <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-8">
                {/* Header & Stage */}
                <div className="flex items-center gap-4 shrink-0">
                  <div className="min-w-[120px]">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span
                        className={`${isMobile ? "text-[8px]" : "text-[10px]"} uppercase font-black font-mono tracking-[0.3em] text-[var(--app-text-muted)] opacity-50 truncate`}
                      >
                        Luca Partnership
                      </span>
                      <div className="text-[9px] font-black font-mono text-[var(--luca-success,#4fbf7a)] animate-pulse bg-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_12%,transparent)] px-2 py-0.5 rounded-lg border border-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_32%,transparent)] flex-shrink-0">
                        SYNC ACTIVE
                      </div>
                    </div>
                    {personality && (
                      <h4
                        className={`text-2xl font-black text-[var(--app-text-main)] tracking-tighter capitalize leading-none whitespace-nowrap italic`}
                      >
                        {personality.relationship.relationshipStage.replace(
                          "_",
                          " ",
                        )}
                      </h4>
                    )}
                  </div>
                </div>

                {/* Vibe */}
                <div className="md:border-l md:pl-8 shrink-0 border-[var(--app-border-main)]">
                  <span className="text-[10px] font-black font-mono text-[var(--app-text-muted)] opacity-50 uppercase block mb-1 whitespace-nowrap tracking-widest">
                    Active Vibe
                  </span>
                  <span className="text-lg font-black uppercase whitespace-nowrap tracking-widest text-[var(--luca-info,#4f8cff)]">
                    {personality
                      ? getVibeSummary(personalityService.getEffectiveTraits())
                          .vibe
                      : "—"}
                  </span>
                </div>

                {/* Growth Progress */}
                <div className="flex-1 md:border-l md:pl-8 min-w-[140px] border-[var(--app-border-main)]">
                  <div className="flex justify-between items-center mb-2 gap-4">
                    <span className="text-[10px] font-black font-mono text-[var(--app-text-muted)] opacity-50 uppercase whitespace-nowrap tracking-widest">
                      Bond Strength
                    </span>
                    <span
                      className={`text-xs font-black font-mono whitespace-nowrap text-[var(--luca-info,#4f8cff)]`}
                    >
                      {personality
                        ? getStageProgress(
                            personality.relationship.relationshipStage,
                            personality.relationship.daysKnown,
                          )
                        : 0}
                      %
                    </span>
                  </div>
                  <div
                    className={`h-2 rounded-full overflow-hidden border transition-all shadow-inner bg-[var(--luca-surface-solid)] border-[var(--app-border-main)]`}
                  >
                    <div
                      className="h-full bg-[color-mix(in_srgb,var(--luca-info,#4f8cff)_12%,transparent)] transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                      style={{
                        width: `${personality ? getStageProgress(personality.relationship.relationshipStage, personality.relationship.daysKnown) : 0}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="flex gap-10 md:border-l md:pl-8 shrink-0 border-[var(--app-border-main)]">
                  <div className="space-y-1">
                    <span className="block text-[10px] font-black text-[var(--app-text-muted)] opacity-40 uppercase tracking-[0.2em] whitespace-nowrap">
                      Confidence
                    </span>
                    <span
                      className={`text-lg font-black text-[var(--app-text-main)] font-mono whitespace-nowrap`}
                    >
                      {profile.metadata.confidence}%
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="block text-[10px] font-black text-[var(--app-text-muted)] opacity-40 uppercase tracking-[0.2em] whitespace-nowrap">
                      Exchanges
                    </span>
                    <span
                      className={`text-lg font-black text-[var(--app-text-main)] font-mono whitespace-nowrap`}
                    >
                      {personality?.relationship.totalInteractions || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Matrix - Standalone */}
          <div className="col-span-12">
            <div
              className={`${isMobile ? "p-4 py-8 border-x-0 border-y rounded-none" : "border rounded-2xl p-6 lg:p-8"} transition-all bg-[var(--app-bg-tint)] border-[var(--app-border-main)] shadow-xl glass-blur animate-in slide-in-from-bottom-4 duration-700`}
              style={{
                backgroundColor: isMobile
                  ? "var(--luca-surface-glass, var(--app-bg-tint))"
                  : "var(--app-bg-tint)",
                borderColor: "var(--luca-border-subtle, var(--app-border-main))",
              }}
            >
              <div className="flex items-center justify-between mb-8 gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[color-mix(in_srgb,var(--luca-accent-primary,#9b7cff)_12%,transparent)] border border-[color-mix(in_srgb,var(--luca-accent-primary,#9b7cff)_32%,transparent)] flex items-center justify-center shrink-0">
                    <Icon name="Brain" className="w-6 h-6 text-[var(--luca-accent-primary,#9b7cff)]" />
                  </div>
                  <h4
                    className={`${isMobile ? "text-base" : "text-xl"} font-black text-[var(--app-text-main)] uppercase tracking-[0.2em] italic truncate`}
                  >
                    Evolution Matrix
                  </h4>
                </div>
                <div className="text-[8px] sm:text-[10px] font-black font-mono text-[var(--app-text-muted)] opacity-50 uppercase tracking-[0.3em] flex-shrink-0">
                  LUCA CALIBRATION:{" "}
                  <span className="text-[var(--app-text-main)] opacity-100">
                    {personalityService.getCurrentMode()}
                  </span>
                </div>
              </div>

              <div
                className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-10 gap-x-16`}
              >
                {personality &&
                  [
                    {
                      key: "warmth",
                      label: "Warmth",
                      icon: "Heart",
                      color: "text-[var(--luca-danger,#f87171)]",
                      barColor: "bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)]",
                    },
                    {
                      key: "playfulness",
                      label: "Playfulness",
                      icon: "Smile",
                      color: "text-[var(--luca-warning,#f2b23e)]",
                      barColor: "bg-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_12%,transparent)]",
                    },
                    {
                      key: "empathy",
                      label: "Empathy",
                      icon: "Heart",
                      color: "text-[var(--luca-accent-primary,#9b7cff)]",
                      barColor: "bg-[color-mix(in_srgb,var(--luca-accent-primary,#9b7cff)_12%,transparent)]",
                    },
                    {
                      key: "protectiveness",
                      label: "Guardian",
                      icon: "Shield",
                      color: "text-[var(--luca-info,#4f8cff)]",
                      barColor: "bg-[color-mix(in_srgb,var(--luca-info,#4f8cff)_12%,transparent)]",
                    },
                    {
                      key: "sass",
                      label: "Sharpness",
                      icon: "Flash",
                      color: "text-[var(--luca-accent-primary,#9b7cff)]",
                      barColor: "bg-[color-mix(in_srgb,var(--luca-accent-primary,#9b7cff)_12%,transparent)]",
                    },
                    {
                      key: "familiarity",
                      label: "Familiarity",
                      icon: "Stars",
                      color: "text-[var(--luca-success,#4fbf7a)]",
                      barColor: "bg-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_12%,transparent)]",
                    },
                  ].map(({ key, label, icon: iconName, color, barColor }) => {
                    const effectiveTraits =
                      personalityService.getEffectiveTraits();
                    const value = (effectiveTraits as any)[key] || 0;
                    return (
                      <div key={key} className="space-y-4 group/trait">
                        <div className="flex justify-between items-end">
                          <div className="flex items-center gap-3">
                            <Icon
                              name={iconName}
                              className={`w-4 h-4 ${color} opacity-70 group-hover/trait:opacity-100 transition-opacity`}
                            />
                            <span
                              className={`text-[10px] font-black text-[var(--app-text-muted)] uppercase tracking-widest opacity-60 group-hover/trait:opacity-100 transition-opacity`}
                            >
                              {label}
                            </span>
                          </div>
                          <span
                            className={`text-sm font-black font-mono text-[var(--app-text-main)] group-hover/trait:scale-110 transition-transform`}
                          >
                            {value}
                          </span>
                        </div>
                        <div
                          className={`h-2 rounded-full overflow-hidden border bg-[var(--luca-surface-solid)] border-[var(--app-border-main)]`}
                        >
                          <div
                            className={`h-full ${barColor} transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(255,255,255,0.1)]`}
                            style={{
                              width: `${value}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Row 4: Recent Insights - Standalone List */}
          <div className="col-span-12">
            <div
              className={`border rounded-lg p-4 lg:p-5 transition-all shadow-sm ${theme.isLight || theme.themeName?.toLowerCase() === "lucagent" ? "bg-[var(--app-bg-tint)] border-[var(--luca-border-strong)]" : "bg-[#11111a] border-[var(--luca-border-subtle)]"}`}
              style={{
                borderColor:
                  theme.isLight || theme.themeName?.toLowerCase() === "lucagent"
                    ? undefined
                    : setHexAlpha(theme.hex, 0.15),
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Icon
                  name="Sparkles"
                  className="w-4 h-4"
                  style={{ color: setHexAlpha(theme.hex, 0.6) }}
                />
                <h4
                  className={`text-xs font-bold ${theme.themeName?.toLowerCase() === "lucagent" ? "text-[var(--app-text-muted)]" : "text-[var(--app-text-main)]"} uppercase tracking-widest`}
                >
                  Recent Insights
                </h4>
              </div>
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
                {insights.length > 0 ? (
                  insights.map((insight) => (
                    <div
                      key={insight.id}
                      className={`group flex flex-col sm:flex-row gap-4 p-4 rounded-lg transition-all bg-[var(--luca-surface-glass)] hover:bg-[var(--luca-surface-solid)]`}
                    >
                      <div className="min-w-[140px] shrink-0">
                        <div
                          className={`text-[10px] font-black text-[var(--app-text-main)] uppercase tracking-[0.2em] font-mono italic`}
                        >
                          {insight.key.replace(/_/g, " ")}
                        </div>
                      </div>
                      <div className="w-px bg-[var(--app-border-main)] self-stretch hidden sm:block opacity-30" />
                      <p
                        className={`text-xs text-[var(--app-text-muted)] leading-relaxed font-mono flex-1 opacity-80 group-hover:opacity-100 transition-opacity`}
                      >
                        {insight.value}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="py-10 text-center text-[10px] text-[var(--app-text-muted)] italic font-mono uppercase tracking-widest opacity-20 border border-dashed border-[var(--app-border-main)] rounded-2xl">
                    Synthesizing behavioral patterns...
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Row 5: Development Timeline - Standalone */}
          <div className="col-span-12">
            <div
              className={`border rounded-2xl p-6 lg:p-8 transition-all bg-[var(--app-bg-tint)] border-[var(--app-border-main)] glass-blur animate-in fade-in duration-1000`}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_12%,transparent)] border border-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_32%,transparent)] flex items-center justify-center">
                  <Icon name="Award" className="w-5 h-5 text-[var(--luca-warning,#f2b23e)]" />
                </div>
                <h4
                  className={`text-xs font-black text-[var(--app-text-main)] uppercase tracking-[0.2em] italic`}
                >
                  Development Timeline
                </h4>
              </div>
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 no-scrollbar">
                {personality?.relationship.milestones
                  .slice(-10)
                  .reverse()
                  .map((milestone) => (
                    <div
                      key={milestone.id}
                      className={`flex items-center gap-6 p-4 rounded-lg transition-all bg-[var(--luca-surface-glass)] hover:bg-[var(--luca-surface-solid)]`}
                    >
                      <div className="min-w-[110px] shrink-0">
                        <div className="text-xs font-black font-mono text-[var(--app-text-muted)] text-center border-r border-[var(--app-border-main)] pr-6 opacity-60">
                          {new Date(milestone.date).toLocaleDateString()}
                        </div>
                      </div>
                      <div
                        className={`text-xs text-[var(--app-text-muted)] font-mono leading-relaxed flex-1 opacity-80`}
                      >
                        {milestone.description}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Row 6: Assistant Directives - Standalone */}
          <div className="col-span-12">
            <div
              className={`border rounded-2xl p-6 lg:p-8 transition-all bg-[var(--app-bg-tint)] border-[var(--app-border-main)] glass-blur animate-in slide-in-from-bottom-2 duration-700`}
            >
              <div className="flex items-center gap-3 mb-8">
                <div className="w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--luca-info,#4f8cff)_12%,transparent)] border border-[color-mix(in_srgb,var(--luca-info,#4f8cff)_32%,transparent)] flex items-center justify-center">
                  <Icon name="Settings" className="w-5 h-5 text-[var(--luca-info,#4f8cff)]" />
                </div>
                <h4
                  className={`text-xs font-black text-[var(--app-text-main)] uppercase tracking-[0.2em] italic`}
                >
                  Assistant Directives
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div
                  className={`p-5 rounded-lg flex flex-col items-center justify-center text-center transition-all bg-[var(--luca-surface-glass)] group/directive`}
                >
                  <span className="block text-[10px] font-black text-[var(--app-text-muted)] opacity-50 uppercase tracking-[0.3em] mb-4 font-mono group-hover/directive:opacity-100 transition-opacity">
                    Target Persona
                  </span>
                  <span
                    className={`text-xs font-black px-6 py-2 rounded-xl border shadow-xl bg-[var(--luca-surface-solid)] border-[var(--app-border-main)] text-[var(--app-text-main)] uppercase tracking-[0.2em] italic`}
                  >
                    {profile.assistantPreferences?.preferredPersona ||
                      "NEUTRAL"}
                  </span>
                </div>
                <div
                  className={`p-5 rounded-lg flex flex-col items-center justify-center text-center transition-all bg-[var(--luca-surface-glass)] group/directive`}
                >
                  <span className="block text-[10px] font-black text-[var(--app-text-muted)] opacity-50 uppercase tracking-[0.3em] mb-4 font-mono group-hover/directive:opacity-100 transition-opacity">
                    Cognitive Density
                  </span>
                  <span
                    className={`text-xs font-black px-6 py-2 rounded-xl border shadow-xl bg-[var(--luca-surface-solid)] border-[var(--app-border-main)] text-[var(--app-text-main)] uppercase tracking-[0.2em] italic`}
                  >
                    {profile.assistantPreferences?.detailLevel || "CONCISE"}
                  </span>
                </div>
                <div
                  className={`p-5 rounded-lg flex flex-col items-center justify-center text-center transition-all bg-[var(--luca-surface-glass)] group/directive`}
                >
                  <span className="block text-[10px] font-black text-[var(--app-text-muted)] opacity-50 uppercase tracking-[0.3em] mb-4 font-mono group-hover/directive:opacity-100 transition-opacity">
                    Observed Focus
                  </span>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {profile.workContext?.interests
                      ?.slice(0, 5)
                      .map((interest: string, i: number) => (
                        <span
                          key={i}
                          className="text-[9px] font-black font-mono rounded-lg px-3 py-1 bg-[var(--luca-surface-glass)] border border-[var(--app-border-main)] text-[var(--app-text-muted)] uppercase tracking-wider"
                        >
                          {interest}
                        </span>
                      )) || (
                      <span className="text-[10px] italic text-[var(--app-text-muted)] opacity-20 font-mono uppercase">
                        NO PATTERNS DETECTED
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-10 border-t text-center border-t-[var(--app-border-main)] opacity-30">
          <p className="text-[10px] font-black font-mono text-[var(--app-text-muted)] uppercase tracking-[0.4em]">
            End of Record // Luca Context Layer Secure
          </p>
        </div>

        {showEnrollModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-500">
            <div
              className={`border rounded-lg w-full max-w-xl overflow-hidden flex flex-col bg-[var(--app-bg-tint)] border-[var(--app-border-main)] shadow-2xl animate-in zoom-in-95 duration-500`}
            >
              <div
                className={`p-6 border-b flex items-center justify-between bg-[var(--luca-surface-glass)] border-b-[var(--app-border-main)]`}
              >
                <div className="flex items-center gap-3">
                  <Icon name="Shield" className="w-5 h-5 text-[var(--luca-success,#4fbf7a)]" />
                  <h3 className="text-sm font-black uppercase tracking-[0.3em] italic text-[var(--app-text-main)]">
                    Luca Identity Lock
                  </h3>
                </div>
                <button
                  onClick={() => setShowEnrollModal(false)}
                  className="p-2 hover:bg-[var(--luca-surface-hover)] rounded-lg transition-all"
                >
                  <Icon
                    name="CloseCircle"
                    className="w-6 h-6 text-[var(--app-text-muted)]"
                  />
                </button>
              </div>
              <div className="p-8">
                <AdminEnrollmentModal
                  userName={profile?.identity.name || "Mac"}
                  theme={{
                    hex: theme.hex,
                    primary: theme.primary,
                  }}
                  onClose={() => {
                    setShowEnrollModal(false);
                    fetchReferenceImage();
                  }}
                  onEnrollSuccess={(image: string | undefined) => {
                    if (!image) return;
                    settingsService.saveFaceData(image);
                    const updates = {
                      identity: { ...profile.identity, avatar: image },
                    };
                    settingsService.updateOperatorProfile(updates);
                    setProfile({
                      ...profile,
                      identity: { ...profile.identity, avatar: image },
                    });
                    fetchReferenceImage();
                  }}
                  onVerify={(image) => lucaService.verifyIdentity(image)}
                  onVerifyVoice={(audio) => lucaService.verifyVoice(audio)}
                />
              </div>
            </div>
          </div>
        )}
      </SettingsSection>

      <SettingsSection
        title="Identity Lock"
        description="Verify identity, trusted devices, lock profile changes, and recovery stay grouped as safety controls."
        icon="ShieldCheck"
        accentColor={theme.hex}
        isMobile={isMobile}
      >
        <SettingsRow
          label="Verify identity"
          description="Use the existing enrollment and verification controls below when available."
        />
        <SettingsRow
          label="Trusted device"
          description="Device trust remains part of Luca's existing identity services."
        />
        <SettingsRow
          label="Lock profile changes"
          description="Profile edit controls remain explicit and user initiated."
        />
      </SettingsSection>

      <SettingsAdvancedDisclosure
        title="Advanced Details"
        description="Profile export/import, raw profile JSON, and profile diagnostics."
      >
        <SettingsRow
          label="Profile export/import"
          description="Export and import remain future or existing profile maintenance flows."
        />
        <SettingsRow
          label="Raw profile JSON"
          description="Raw profile data is diagnostic-only and not a primary user control."
        />
        <SettingsRow
          label="Profile diagnostics"
          description="Synchronization metadata stays in Advanced Details."
        />
      </SettingsAdvancedDisclosure>
    </div>
  );
};

export default OperatorProfilePanel;
