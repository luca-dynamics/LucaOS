/* eslint-disable react/prop-types */
import React, { useState, useEffect } from "react";
import {
  User,
  Brain,
  Settings,
  Edit3,
  RefreshCw,
  Sparkles,
  Heart,
  Award,
  Shield,
  Zap,
  Smile,
  X,
  Camera,
} from "lucide-react";
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
  };
}

/**
 * Operator Profile Panel for Settings
 * Displays what Luca has learned about the operator
 */
const OperatorProfilePanel: React.FC<OperatorProfilePanelProps> = ({
  theme,
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
        <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="w-16 h-16 mx-auto bg-white/10 border border-white/20 rounded-full flex items-center justify-center">
          <User className="w-8 h-8 text-gray-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white mb-2">No Profile Yet</h3>
          <p className="text-sm text-gray-400 max-w-md mx-auto">
            Complete the conversational onboarding to let Luca learn about you.
            Your profile will be built automatically as you chat.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-4">
        <div>
          <h3
            className={`text-xl font-bold ${theme.themeName?.toLowerCase() === "lucagent" ? "text-gray-900" : "text-white"} tracking-tight uppercase`}
          >
            Identity Records
          </h3>
          <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest mt-1 opacity-70">
            Synchronization:{" "}
            {new Date(profile.metadata.lastUpdated).toLocaleDateString()} {"//"}{" "}
            v{profile.metadata.conversationCount || 0}.0
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            className={`px-3 py-1.5 ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-black/5 hover:bg-black/10 border-black/10" : "bg-white/5 hover:bg-white/10 border-white/10"} rounded border flex items-center gap-2 transition-all opacity-80 hover:opacity-100`}
            title="Re-sync data"
          >
            <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
            <span
              className={`text-[10px] font-bold ${theme.themeName?.toLowerCase() === "lucagent" ? "text-gray-600" : "text-gray-300"} uppercase tracking-wider`}
            >
              Sync
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3 lg:gap-4">
        {/* Row 1: Identity Card - Full Width */}
        <div className="col-span-12">
          <div
            className={`${theme.themeName?.toLowerCase() === "lucagent" ? "glass-panel-light border-black/10 shadow-sm" : "bg-[#0b0606]/40 border-white/10 backdrop-blur-xl"} border rounded-xl p-4 lg:p-5 relative group overflow-hidden h-full shadow-2xl shadow-black/40`}
          >
            <div className="absolute top-0 right-0 p-4 z-10">
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className={`p-2 rounded-lg transition-all opacity-40 group-hover:opacity-100 ${theme.themeName?.toLowerCase() === "lucagent" ? "hover:bg-black/5 bg-black/[0.02]" : "hover:bg-white/10 bg-white/5"}`}
                >
                  <Edit3
                    className={`w-4 h-4 ${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-600" : "text-gray-300"}`}
                  />
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleCancel}
                    className="text-[10px] uppercase font-bold text-gray-500 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-4 py-1.5 text-[10px] font-bold rounded-lg bg-white text-black hover:bg-gray-200 transition-all shadow-lg shadow-white/10"
                  >
                    Save Profile
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-6 items-start">
              <div
                onClick={() => setShowEnrollModal(true)}
                className="w-20 h-20 rounded-2xl bg-gradient-to-br from-white/10 to-transparent border border-white/10 flex items-center justify-center relative shrink-0 shadow-inner group/photo cursor-pointer overflow-hidden transition-transform active:scale-95 translate-y-2"
              >
                {referenceImage ? (
                  <img
                    src={`data:image/jpeg;base64,${referenceImage}`}
                    alt="Operator"
                    className="w-full h-full object-cover transition-opacity group-hover/photo:opacity-60"
                  />
                ) : (
                  <User
                    className={`w-10 h-10 transition-colors ${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-400 group-hover/photo:text-slate-600" : "text-gray-400 group-hover/photo:text-white"}`}
                  />
                )}

                <div className="absolute inset-0 bg-black/40 opacity-40 group-hover/photo:opacity-100 flex items-center justify-center transition-opacity">
                  <Camera className="w-6 h-6 text-white" />
                </div>

                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-[#121212] border border-white/10 flex items-center justify-center shadow-lg z-10">
                  <Shield className="w-3 h-3 text-green-500" />
                </div>
              </div>

              <div className="flex-1 space-y-5">
                <div className="flex gap-8">
                  <div className="flex-1">
                    <span className="text-[10px] uppercase font-mono tracking-widest text-gray-500 block mb-1">
                      Operator ID
                    </span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        className={`w-full rounded-lg px-3 py-2 text-sm outline-none transition-all shadow-inner ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-black/[0.03] border-black/10 text-slate-900 focus:ring-black/5" : "bg-white/5 border-white/10 text-white focus:ring-white/20"} border focus:ring-1`}
                      />
                    ) : (
                      <div
                        className={`text-xl font-bold ${theme.themeName?.toLowerCase() === "lucagent" ? "text-gray-900" : "text-white"} leading-none tracking-tight`}
                      >
                        {profile.identity.name}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <span className="text-[10px] uppercase font-mono tracking-widest text-gray-500 block mb-1">
                      Designation
                    </span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedDesignation}
                        onChange={(e) => setEditedDesignation(e.target.value)}
                        className={`w-full rounded-lg px-3 py-2 text-sm outline-none transition-all shadow-inner ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-black/[0.03] border-black/10 text-slate-900 focus:ring-black/5" : "bg-white/5 border-white/10 text-white focus:ring-white/20"} border focus:ring-1`}
                      />
                    ) : (
                      <div
                        className={`text-sm font-medium ${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-600 font-bold" : "text-gray-400"}`}
                      >
                        {profile.identity.designation || "Not Assigned"}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-6 border-t border-white/5 pt-5">
                  <div>
                    <span className="block text-[9px] text-gray-600 uppercase tracking-widest mb-1">
                      Profession
                    </span>
                    <span
                      className={`text-[11px] font-bold ${theme.themeName?.toLowerCase() === "lucagent" ? "text-gray-700 bg-black/5 border-black/10" : "text-gray-200 bg-white/5 border-white/10"} px-3 py-1 rounded-full border inline-block`}
                    >
                      {profile.workContext?.profession || "Unknown"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[9px] text-gray-600 uppercase tracking-widest mb-1">
                      Experience
                    </span>
                    <span
                      className={`text-[11px] font-bold ${theme.themeName?.toLowerCase() === "lucagent" ? "text-gray-700 bg-black/5 border-black/10" : "text-gray-200 bg-white/5 border-white/10"} px-3 py-1 rounded-full border inline-block`}
                    >
                      {profile.workContext?.skillLevel || "Veteran"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[9px] text-gray-600 uppercase tracking-widest mb-1">
                      Tone
                    </span>
                    <span
                      className={`text-[11px] font-bold ${theme.themeName?.toLowerCase() === "lucagent" ? "text-gray-700 bg-black/5 border-black/10" : "text-gray-200 bg-white/5 border-white/10"} px-3 py-1 rounded-full border capitalize inline-block`}
                    >
                      {profile.personality?.tone || "Natural"}
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
            className={`${theme.themeName?.toLowerCase() === "lucagent" ? "glass-panel-light border-black/10" : "bg-white/5 border-white/10"} border rounded-xl p-3 lg:p-4 relative overflow-hidden shadow-xl`}
          >
            <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-8">
              {/* Header & Stage */}
              <div className="flex items-center gap-4 shrink-0">
                <div className="min-w-[120px]">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] uppercase font-mono tracking-widest text-gray-500 font-bold whitespace-nowrap">
                      Partnership
                    </span>
                    <div className="text-[8px] font-mono text-green-500 animate-pulse bg-green-500/10 px-1.5 py-0.5 rounded-full border border-green-500/20 whitespace-nowrap">
                      LIVE
                    </div>
                  </div>
                  {personality && (
                    <h4
                      className={`text-lg font-bold ${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-900" : "text-white"} tracking-tight capitalize leading-none whitespace-nowrap`}
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
              <div className="md:border-l md:border-white/10 md:pl-8 shrink-0">
                <span className="text-[9px] font-mono text-gray-500 uppercase block mb-1 whitespace-nowrap">
                  Vibe
                </span>
                <span
                  className="text-sm font-bold uppercase whitespace-nowrap"
                  style={{
                    color:
                      theme.themeName?.toLowerCase() === "lucagent" ? "#4f46e5" : theme.hex,
                  }}
                >
                  {personality
                    ? getVibeSummary(personalityService.getEffectiveTraits())
                        .vibe
                    : "—"}
                </span>
              </div>

              {/* Growth Progress */}
              <div className="flex-1 md:border-l md:border-white/10 md:pl-8 min-w-[140px]">
                <div className="flex justify-between items-center mb-1.5 gap-4">
                  <span className="text-[9px] font-mono text-gray-500 uppercase whitespace-nowrap">
                    Growth Progress
                  </span>
                  <span
                    className={`text-xs font-bold font-mono whitespace-nowrap ${theme.themeName?.toLowerCase() === "lucagent" ? "text-gray-700" : ""}`}
                    style={{
                      color:
                        theme.themeName?.toLowerCase() === "lucagent" ? undefined : theme.hex,
                    }}
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
                  className={`h-1.5 ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-black/5" : "bg-white/5"} rounded-full overflow-hidden border border-white/5`}
                >
                  <div
                    className="h-full transition-all duration-1000 ease-out"
                    style={{
                      width: `${personality ? getStageProgress(personality.relationship.relationshipStage, personality.relationship.daysKnown) : 0}%`,
                      backgroundColor: theme.hex,
                    }}
                  />
                </div>
              </div>

              {/* Stats */}
              <div className="flex gap-10 md:border-l md:border-white/10 md:pl-8 shrink-0">
                <div>
                  <span className="block text-[9px] text-gray-500 uppercase tracking-widest mb-1 whitespace-nowrap">
                    Confidence
                  </span>
                  <span
                    className={`text-base font-bold ${theme.themeName?.toLowerCase() === "lucagent" ? "text-gray-900" : "text-white"} font-mono whitespace-nowrap`}
                  >
                    {profile.metadata.confidence}%
                  </span>
                </div>
                <div>
                  <span className="block text-[9px] text-gray-500 uppercase tracking-widest mb-1 whitespace-nowrap">
                    Interactions
                  </span>
                  <span
                    className={`text-base font-bold ${theme.themeName?.toLowerCase() === "lucagent" ? "text-gray-900" : "text-white"} font-mono whitespace-nowrap`}
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
            className={`${theme.themeName?.toLowerCase() === "lucagent" ? "glass-panel-light shadow-xl shadow-black/5" : "bg-white/5 border-white/10"} border rounded-lg p-4 lg:p-5`}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-gray-400" />
                <h4
                  className={`text-xs font-bold ${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-800" : "text-white"} uppercase tracking-widest`}
                >
                  Evolution Matrix
                </h4>
              </div>
              <div className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">
                System Calibration:{" "}
                <span
                  className={`${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-600 font-bold" : "text-gray-300"}`}
                >
                  {personalityService.getCurrentMode()}
                </span>
              </div>
            </div>

            <div
              className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-8 gap-x-12 ${theme.themeName?.toLowerCase() === "lucagent" ? "opacity-90" : ""}`}
            >
              {personality &&
                [
                  { key: "warmth", label: "Warmth", icon: Heart },
                  { key: "playfulness", label: "Playfulness", icon: Smile },
                  { key: "empathy", label: "Empathy", icon: Heart },
                  { key: "protectiveness", label: "Protecting", icon: Shield },
                  { key: "sass", label: "Sass", icon: Zap },
                  { key: "familiarity", label: "Familiarity", icon: Sparkles },
                ].map(({ key, label, icon: Icon }) => {
                  const effectiveTraits =
                    personalityService.getEffectiveTraits();
                  const value = (effectiveTraits as any)[key] || 0;
                  return (
                    <div key={key} className="space-y-3">
                      <div className="flex justify-between items-end text-[11px] font-mono">
                        <div className="flex items-center gap-2">
                          <Icon
                            className={`w-3.5 h-3.5 ${theme.themeName?.toLowerCase() === "lucagent" ? "text-gray-400" : "text-gray-500"}`}
                          />
                          <span
                            className={`${theme.themeName?.toLowerCase() === "lucagent" ? "text-gray-500" : "text-gray-400"} uppercase tracking-wider`}
                          >
                            {label}
                          </span>
                        </div>
                        <span
                          className={`${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-900" : "text-white"} font-bold text-xs`}
                        >
                          {value}
                        </span>
                      </div>
                      <div
                        className={`h-1.5 ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-black/5" : "bg-white/5"} rounded-full overflow-hidden border ${theme.themeName?.toLowerCase() === "lucagent" ? "border-black/5" : "border-white/5"}`}
                      >
                        <div
                          className="h-full transition-all duration-700 ease-out"
                          style={{
                            width: `${value}%`,
                            backgroundColor: theme.hex,
                            boxShadow:
                              theme.themeName?.toLowerCase() === "lucagent"
                                ? undefined
                                : `0 0 10px ${theme.hex}40`,
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
            className={`${theme.themeName?.toLowerCase() === "lucagent" ? "glass-panel-light shadow-xl shadow-black/5" : "bg-white/5 border-white/10"} border rounded-lg p-4 lg:p-5`}
          >
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-gray-400" />
              <h4
                className={`text-xs font-bold ${theme.themeName?.toLowerCase() === "lucagent" ? "text-gray-700" : "text-white"} uppercase tracking-widest`}
              >
                Recent Insights
              </h4>
            </div>
            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 no-scrollbar">
              {insights.length > 0 ? (
                insights.map((insight) => (
                  <div
                    key={insight.id}
                    className={`group flex gap-3 p-2 ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-black/5 border-black/10 hover:border-black/20" : "bg-white/[0.02] border-white/5 hover:border-white/10"} rounded-md transition-all border`}
                  >
                    <div className="min-w-[120px] shrink-0">
                      <div
                        className={`text-[9px] font-bold ${theme.themeName?.toLowerCase() === "lucagent" ? "text-indigo-600" : "text-white"} uppercase tracking-wider font-mono ${theme.themeName?.toLowerCase() === "lucagent" ? "" : "opacity-50"}`}
                      >
                        {insight.key.replace(/_/g, " ")}
                      </div>
                    </div>
                    <div className="h-3 w-px bg-white/10 self-center hidden sm:block" />
                    <p
                      className={`text-[10px] ${theme.themeName?.toLowerCase() === "lucagent" ? "text-gray-800" : "text-gray-400"} leading-relaxed font-mono flex-1 text-justify`}
                    >
                      {insight.value}
                    </p>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-[10px] text-gray-500 italic font-mono uppercase tracking-widest opacity-40 border border-dashed border-white/5 rounded-lg">
                  Scanning for behavioral patterns...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Row 5: Development Timeline - Standalone */}
        <div className="col-span-12">
          <div
            className={`${theme.themeName?.toLowerCase() === "lucagent" ? "glass-panel-light shadow-xl shadow-black/5" : "bg-white/5 border-white/10"} border rounded-lg p-4 lg:p-5`}
          >
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-4 h-4 text-gray-400" />
              <h4
                className={`text-xs font-bold ${theme.themeName?.toLowerCase() === "lucagent" ? "text-gray-700" : "text-white"} uppercase tracking-widest`}
              >
                Development Timeline
              </h4>
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
              {personality?.relationship.milestones
                .slice(-8)
                .reverse()
                .map((milestone) => (
                  <div
                    key={milestone.id}
                    className={`flex items-center gap-4 p-2 ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-black/5 border-black/10" : "bg-white/[0.02] border-white/5"} rounded-lg border`}
                  >
                    <div className="min-w-[100px] shrink-0">
                      <div className="text-[9px] font-mono text-gray-500 text-center border-r border-white/10 pr-4">
                        {new Date(milestone.date).toLocaleDateString()}
                      </div>
                    </div>
                    <div
                      className={`text-[10px] ${theme.themeName?.toLowerCase() === "lucagent" ? "text-gray-800" : "text-gray-300"} font-mono leading-normal flex-1`}
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
            className={`${theme.themeName?.toLowerCase() === "lucagent" ? "glass-panel-light shadow-xl shadow-black/5" : "bg-white/5 border-white/10"} border rounded-lg p-4 lg:p-5`}
          >
            <div className="flex items-center gap-2 mb-6">
              <Settings className="w-4 h-4 text-gray-400" />
              <h4
                className={`text-xs font-bold ${theme.themeName?.toLowerCase() === "lucagent" ? "text-gray-700" : "text-white"} uppercase tracking-widest`}
              >
                Assistant Directives
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
              <div
                className={`${theme.themeName?.toLowerCase() === "lucagent" ? "bg-black/5 border-black/5" : "bg-white/[0.02] border-white/5"} p-3 rounded-xl flex flex-col items-center justify-center text-center border`}
              >
                <span className="block text-[9px] text-gray-500 uppercase tracking-widest mb-2 font-mono">
                  Preferred Persona
                </span>
                <span
                  className={`text-[10px] font-bold ${theme.themeName?.toLowerCase() === "lucagent" ? "text-gray-700 bg-black/10 border-black/10" : "text-white bg-white/10 border-white/5"} px-2 py-1 rounded block border truncate font-mono uppercase`}
                >
                  {profile.assistantPreferences?.preferredPersona || "NEUTRAL"}
                </span>
              </div>
              <div
                className={`${theme.themeName?.toLowerCase() === "lucagent" ? "bg-black/5 border-black/5" : "bg-white/[0.02] border-white/5"} p-3 rounded-xl flex flex-col items-center justify-center text-center border`}
              >
                <span className="block text-[9px] text-gray-500 uppercase tracking-widest mb-2 font-mono">
                  Detail Level
                </span>
                <span
                  className={`text-[10px] font-bold ${theme.themeName?.toLowerCase() === "lucagent" ? "text-gray-700 bg-black/10 border-black/10" : "text-white bg-white/10 border-white/5"} px-2 py-1 rounded block border capitalize truncate font-mono uppercase`}
                >
                  {profile.assistantPreferences?.detailLevel || "CONCISE"}
                </span>
              </div>
              <div
                className={`${theme.themeName?.toLowerCase() === "lucagent" ? "bg-black/5 border-black/5" : "bg-white/[0.02] border-white/5"} p-3 rounded-xl flex flex-col items-center justify-center text-center border`}
              >
                <span className="block text-[9px] text-gray-500 uppercase tracking-widest mb-2 font-mono">
                  Interests Observed
                </span>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {profile.workContext?.interests
                    ?.slice(0, 6)
                    .map((interest: string, i: number) => (
                      <span
                        key={i}
                        className="text-[9px] bg-white/5 border border-white/10 rounded px-2 py-0.5 text-gray-400 capitalize font-mono"
                      >
                        {interest}
                      </span>
                    )) || (
                    <span className="text-[9px] italic text-gray-600 font-mono">
                      None detected
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-white/5 text-center">
        <p className="text-[9px] font-mono text-gray-600 uppercase tracking-[0.2em]">
          Dynamic Profile Analysis Powered by Luca Core // Private Context Layer
        </p>
      </div>
      {showEnrollModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div
            className={`${theme.themeName?.toLowerCase() === "lucagent" ? "bg-white shadow-2xl" : "bg-[#0b0606] shadow-2xl"} border rounded-2xl w-full max-w-lg overflow-hidden flex flex-col`}
            style={{
              borderColor:
                theme.themeName?.toLowerCase() === "lucagent"
                  ? "rgba(0,0,0,0.1)"
                  : `${theme.hex}33`,
              boxShadow:
                theme.themeName?.toLowerCase() === "lucagent"
                  ? undefined
                  : `0 0 40px -10px ${theme.hex}22`,
            }}
          >
            <div
              className="p-4 border-b flex items-center justify-between bg-white/[0.02]"
              style={{ borderBottomColor: `${theme.hex}1a` }}
            >
              <h3
                className="text-sm font-bold uppercase tracking-[0.2em]"
                style={{ color: theme.hex }}
              >
                Identity Records
              </h3>
              <button
                onClick={() => setShowEnrollModal(false)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-6">
              <AdminEnrollmentModal
                userName={profile?.identity.name || "Mac"}
                theme={theme}
                onClose={() => {
                  setShowEnrollModal(false);
                  fetchReferenceImage();
                }}
                onEnrollSuccess={() => {
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
