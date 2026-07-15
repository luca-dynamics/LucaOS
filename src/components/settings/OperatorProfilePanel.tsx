/* eslint-disable react/prop-types */
import React, { useState, useEffect } from "react";
import { Icon } from "../ui/Icon";
import { LucaInput } from "../ui/luca";
import { settingsService } from "../../services/settingsService";
import { memoryService } from "../../services/memoryService";
import { personalityService } from "../../services/personalityService";
import { lucaService } from "../../services/lucaService";
import { apiUrl } from "../../config/api";
import { personaDisplayLabel } from "../../config/personaDisplay";
import AdminEnrollmentModal from "../AdminEnrollmentModal";
import { OperatorProfile } from "../../types/operatorProfile";
import {
  LucaPersonality,
  RelationshipStage,
} from "../../types/lucaPersonality";
import { MemoryNode } from "../../types";
import {
  SettingsAdvancedDisclosure,
  SettingsRow,
  SettingsSection,
  SettingsStatList,
  settingsControlInlineStyle,
} from "./SettingsLayout";
import { settingsSurfaceTokens } from "./settingsLayoutStyles";

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
      <div className="text-center py-20 space-y-6">
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

  const stageProgress = personality
    ? getStageProgress(
        personality.relationship.relationshipStage,
        personality.relationship.daysKnown,
      )
    : 0;
  const vibe = personality
    ? getVibeSummary(personalityService.getEffectiveTraits())
    : null;
  const effectiveTraits = personality
    ? (personalityService.getEffectiveTraits() as unknown as Record<
        string,
        number
      >)
    : null;

  const traitRows = [
    { key: "warmth", label: "Warmth" },
    { key: "playfulness", label: "Playfulness" },
    { key: "empathy", label: "Empathy" },
    { key: "protectiveness", label: "Guardian" },
    { key: "sass", label: "Sharpness" },
    { key: "familiarity", label: "Familiarity" },
  ];

  const inputClassName =
    "w-full rounded-lg border px-2.5 py-1.5 text-[13px] outline-none";

  return (
    <div
      className={`space-y-1 ${isMobile ? "max-w-none" : "max-w-6xl"} mx-auto pb-10`}
    >
      <SettingsSection
        title="Operator Profile"
        description="Who Luca serves: name, role, preferred context, and trusted identity state."
        icon="User"
        accentColor={theme.hex}
        isMobile={isMobile}
      >
        <SettingsStatList
          items={[
            {
              label: "Name",
              value: profile.identity.name || "Set profile",
              detail: "Primary operator identity.",
            },
            {
              label: "Role",
              value: profile.identity.designation || "Personal operator",
              detail: "Used for everyday personalization.",
            },
            {
              label: "Work context",
              value: `${insights.length} signals`,
              detail:
                "Projects, goals, workflows, and preferences remain user-reviewed.",
            },
            {
              label: "Identity lock",
              value: referenceImage ? "Face enrolled" : "Optional",
              detail:
                "Trusted-device and verification controls stay grouped below.",
            },
          ]}
        />
      </SettingsSection>

      <SettingsSection
        title="Identity"
        description={`Last updated ${new Date(profile.metadata.lastUpdated).toLocaleDateString()} · ${profile.metadata.conversationCount || 0} conversations recorded.`}
        icon="Sparkles"
        accentColor={theme.hex}
        isMobile={isMobile}
      >
        <div
          className="flex items-start justify-between gap-4 border-b py-3.5"
          style={{ borderColor: settingsSurfaceTokens.borderSubtle }}
        >
          <div className="flex min-w-0 items-center gap-4">
            <button
              type="button"
              aria-label="Update identity photo"
              onClick={() => setShowEnrollModal(true)}
              className="group/photo relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border"
              style={{ borderColor: settingsSurfaceTokens.borderSubtle }}
            >
              {profile.identity.avatar || referenceImage ? (
                <img
                  src={`data:image/jpeg;base64,${profile.identity.avatar || referenceImage}`}
                  alt="Operator"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center">
                  <Icon
                    name="User"
                    className="h-6 w-6"
                    style={{ color: settingsSurfaceTokens.textTertiary }}
                  />
                </span>
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover/photo:opacity-100">
                <Icon name="Camera" className="h-5 w-5 text-white" />
              </span>
            </button>
            <div className="min-w-0">
              {isEditing ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <LucaInput
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    placeholder="Name"
                    className={inputClassName}
                    style={settingsControlInlineStyle}
                  />
                  <LucaInput
                    type="text"
                    value={editedDesignation}
                    onChange={(e) => setEditedDesignation(e.target.value)}
                    placeholder="Role"
                    className={inputClassName}
                    style={settingsControlInlineStyle}
                  />
                </div>
              ) : (
                <>
                  <p
                    className="truncate text-[15px] font-semibold"
                    style={{ color: settingsSurfaceTokens.textPrimary }}
                  >
                    {profile.identity.name}
                  </p>
                  <p
                    className="mt-0.5 truncate text-[12.5px]"
                    style={{ color: settingsSurfaceTokens.textSecondary }}
                  >
                    {profile.identity.designation || "No role assigned"}
                  </p>
                </>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 pt-0.5">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded-lg px-3 py-1.5 text-[12.5px] font-medium"
                  style={{ color: settingsSurfaceTokens.textSecondary }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="rounded-lg border px-3 py-1.5 text-[12.5px] font-medium"
                  style={{
                    ...settingsControlInlineStyle,
                    color: theme.hex,
                    borderColor: theme.hex,
                  }}
                >
                  Save
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="rounded-lg border px-3 py-1.5 text-[12.5px] font-medium"
                  style={settingsControlInlineStyle}
                >
                  Edit
                </button>
                <button
                  type="button"
                  aria-label="Refresh profile"
                  onClick={handleRefresh}
                  className="rounded-md p-1.5"
                  style={{ color: settingsSurfaceTokens.textSecondary }}
                >
                  <Icon name="RefreshCw" className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
        <SettingsRow
          label="Profession"
          control={
            <span
              className="text-[13px]"
              style={{ color: settingsSurfaceTokens.textPrimary }}
            >
              {profile.workContext?.profession || "Unknown"}
            </span>
          }
        />
        <SettingsRow
          label="Skill level"
          control={
            <span
              className="text-[13px]"
              style={{ color: settingsSurfaceTokens.textPrimary }}
            >
              {profile.workContext?.skillLevel || "Veteran"}
            </span>
          }
        />
        <SettingsRow
          label="Preferred tone"
          control={
            <span
              className="text-[13px]"
              style={{ color: settingsSurfaceTokens.textPrimary }}
            >
              {profile.personality?.tone || "Natural"}
            </span>
          }
        />
      </SettingsSection>

      <SettingsSection
        title="Partnership"
        description={vibe?.description ?? "How the working relationship is developing."}
        icon="Heart"
        accentColor={theme.hex}
        isMobile={isMobile}
      >
        <SettingsRow
          label="Relationship stage"
          description={vibe ? `Current vibe: ${vibe.vibe}.` : undefined}
          control={
            <span
              className="text-[13px] capitalize"
              style={{ color: settingsSurfaceTokens.textPrimary }}
            >
              {personality
                ? personality.relationship.relationshipStage.replace("_", " ")
                : "—"}
            </span>
          }
        />
        <SettingsRow
          label="Stage progress"
          control={
            <div className="flex w-48 items-center gap-3">
              <div
                className="h-1 w-full overflow-hidden rounded-full"
                style={{
                  backgroundColor: settingsSurfaceTokens.borderSubtle,
                }}
              >
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${stageProgress}%`,
                    backgroundColor: theme.hex,
                  }}
                />
              </div>
              <span
                className="w-9 text-right font-mono text-[12.5px]"
                style={{ color: settingsSurfaceTokens.textPrimary }}
              >
                {stageProgress}%
              </span>
            </div>
          }
        />
        <SettingsRow
          label="Profile confidence"
          control={
            <span
              className="font-mono text-[13px]"
              style={{ color: settingsSurfaceTokens.textPrimary }}
            >
              {profile.metadata.confidence}%
            </span>
          }
        />
        <SettingsRow
          label="Total exchanges"
          control={
            <span
              className="font-mono text-[13px]"
              style={{ color: settingsSurfaceTokens.textPrimary }}
            >
              {personality?.relationship.totalInteractions || 0}
            </span>
          }
        />
      </SettingsSection>

      <SettingsSection
        title="Personality traits"
        description={`How Luca's calibration is currently weighted (mode: ${personalityService.getCurrentMode()}).`}
        icon="Brain"
        accentColor={theme.hex}
        isMobile={isMobile}
      >
        <div className="space-y-3 py-1">
          {effectiveTraits &&
            traitRows.map(({ key, label }) => {
              const value = effectiveTraits[key] || 0;
              return (
                <div key={key} className="flex items-center gap-4">
                  <span
                    className="w-28 shrink-0 text-[12.5px]"
                    style={{ color: settingsSurfaceTokens.textSecondary }}
                  >
                    {label}
                  </span>
                  <div
                    className="h-1 flex-1 overflow-hidden rounded-full"
                    style={{
                      backgroundColor: settingsSurfaceTokens.borderSubtle,
                    }}
                  >
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${value}%`,
                        backgroundColor: theme.hex,
                      }}
                    />
                  </div>
                  <span
                    className="w-8 shrink-0 text-right font-mono text-[12.5px]"
                    style={{ color: settingsSurfaceTokens.textPrimary }}
                  >
                    {value}
                  </span>
                </div>
              );
            })}
          {!effectiveTraits && (
            <p
              className="text-[12.5px]"
              style={{ color: settingsSurfaceTokens.textSecondary }}
            >
              Personality calibration has not started yet.
            </p>
          )}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Recent insights"
        description="The latest things Luca has learned about you. Everything stays user-reviewed."
        icon="Sparkles"
        accentColor={theme.hex}
        isMobile={isMobile}
      >
        {insights.length > 0 ? (
          insights.map((insight) => (
            <SettingsRow
              key={insight.id}
              label={insight.key.replace(/_/g, " ")}
              description={insight.value}
            />
          ))
        ) : (
          <p
            className="py-3.5 text-[12.5px]"
            style={{ color: settingsSurfaceTokens.textSecondary }}
          >
            No insights recorded yet.
          </p>
        )}
      </SettingsSection>

      <SettingsSection
        title="Milestones"
        description="Notable moments in the working relationship."
        icon="Award"
        accentColor={theme.hex}
        isMobile={isMobile}
      >
        <div className="max-h-[350px] space-y-0 overflow-y-auto pr-1">
          {personality?.relationship.milestones
            .slice(-10)
            .reverse()
            .map((milestone) => (
              <div
                key={milestone.id}
                className="flex items-start gap-4 border-b py-3 last:border-b-0"
                style={{ borderColor: settingsSurfaceTokens.borderSubtle }}
              >
                <span
                  className="w-24 shrink-0 font-mono text-[11.5px]"
                  style={{ color: settingsSurfaceTokens.textTertiary }}
                >
                  {new Date(milestone.date).toLocaleDateString()}
                </span>
                <span
                  className="text-[12.5px] leading-relaxed"
                  style={{ color: settingsSurfaceTokens.textSecondary }}
                >
                  {milestone.description}
                </span>
              </div>
            ))}
          {(!personality ||
            personality.relationship.milestones.length === 0) && (
            <p
              className="py-3.5 text-[12.5px]"
              style={{ color: settingsSurfaceTokens.textSecondary }}
            >
              No milestones recorded yet.
            </p>
          )}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Assistant preferences"
        description="Defaults Luca applies when responding."
        icon="Settings"
        accentColor={theme.hex}
        isMobile={isMobile}
      >
        <SettingsRow
          label="Preferred persona"
          control={
            <span
              className="text-[13px]"
              style={{ color: settingsSurfaceTokens.textPrimary }}
            >
              {personaDisplayLabel(
                profile.assistantPreferences?.preferredPersona,
              ) || "Neutral"}
            </span>
          }
        />
        <SettingsRow
          label="Detail level"
          control={
            <span
              className="text-[13px]"
              style={{ color: settingsSurfaceTokens.textPrimary }}
            >
              {profile.assistantPreferences?.detailLevel || "Concise"}
            </span>
          }
        />
        <SettingsRow
          label="Observed focus"
          control={
            <div className="flex max-w-[16rem] flex-wrap justify-end gap-1.5">
              {profile.workContext?.interests?.slice(0, 5).map(
                (interest: string, i: number) => (
                  <span
                    key={i}
                    className="rounded-md border px-2 py-0.5 text-[11.5px]"
                    style={{
                      borderColor: settingsSurfaceTokens.borderSubtle,
                      color: settingsSurfaceTokens.textSecondary,
                    }}
                  >
                    {interest}
                  </span>
                ),
              ) || (
                <span
                  className="text-[12.5px]"
                  style={{ color: settingsSurfaceTokens.textSecondary }}
                >
                  No patterns detected yet.
                </span>
              )}
            </div>
          }
        />
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

      {showEnrollModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-6 backdrop-blur-xl">
          <div
            className="flex w-full max-w-xl flex-col overflow-hidden rounded-xl border shadow-2xl"
            style={{
              backgroundColor: "var(--app-bg-tint)",
              borderColor: settingsSurfaceTokens.borderSubtle,
            }}
          >
            <div
              className="flex items-center justify-between border-b p-5"
              style={{ borderColor: settingsSurfaceTokens.borderSubtle }}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  name="Shield"
                  className="h-4 w-4"
                  style={{ color: "var(--luca-success, #4fbf7a)" }}
                />
                <h3
                  className="text-sm font-semibold"
                  style={{ color: settingsSurfaceTokens.textPrimary }}
                >
                  Identity verification
                </h3>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setShowEnrollModal(false)}
                className="rounded-lg p-2"
                style={{ color: settingsSurfaceTokens.textSecondary }}
              >
                <Icon name="CloseCircle" className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
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
    </div>
  );
};

export default OperatorProfilePanel;
