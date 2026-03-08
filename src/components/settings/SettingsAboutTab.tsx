import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Cpu,
  Mic,
  Database,
  Eye,
  Globe,
  ShieldCheck,
  Zap,
  ExternalLink,
} from "lucide-react";
import pkg from "../../../package.json";
import { LucaSettings } from "../../services/settingsService";
import { memoryService } from "../../services/memoryService";

interface SettingsAboutTabProps {
  theme: {
    primary: string;
    hex: string;
    themeName: string;
  };
  settings: LucaSettings;
}

const SettingsAboutTab: React.FC<SettingsAboutTabProps> = ({
  theme,
  settings,
}) => {
  const version = pkg?.version || "1.0.0";
  const [memoryCount, setMemoryCount] = useState(0);
  const [cortexOnline, setCortexOnline] = useState(false);

  useEffect(() => {
    // Load local stats
    const mems = memoryService.getAllMemories();
    setMemoryCount(mems.length);

    // Check Cortex Health
    memoryService.checkCortexHealth().then(setCortexOnline);
  }, []);

  const electronVersion =
    typeof process !== "undefined" && process.versions?.electron
      ? `v${process.versions.electron}`
      : "Web Relay";

  // Dynamic Architecture Detection
  const model = settings.brain.model.toLowerCase();
  let architecture = "Gemini 3 Flash";
  let archBadge = "One OS";

  if (
    model.includes("local") ||
    model.includes("gemma") ||
    model.includes("llama")
  ) {
    architecture = "Hybrid Multi-Agent";
    archBadge = "Local Core";
  } else if (model.includes("pro")) {
    architecture = "Gemini 3 Pro";
    archBadge = "Elite Reasoning";
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="space-y-8 py-2">
      {/* Brand Header */}
      <div className="text-center space-y-3">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`w-20 h-20 mx-auto rounded-[22%] border flex items-center justify-center relative group overflow-hidden ${theme.themeName === "lucagent" ? "glass-panel-light" : "glass-panel tech-border"}`}
          style={{
            color: theme.hex,
            boxShadow:
              theme.themeName === "lucagent"
                ? "0 10px 40px rgba(0,0,0,0.1)"
                : `0 0 20px ${theme.hex}33`,
            border:
              theme.themeName === "lucagent"
                ? "1px solid rgba(0,0,0,0.1)"
                : undefined,
          }}
        >
          {/* Background Highlight Pulse */}
          <motion.div
            animate={{
              opacity: [0.1, 0.3, 0.1],
              scale: [1, 1.1, 1],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 z-0"
            style={{
              background: `radial-gradient(circle, ${theme.hex}44 0%, transparent 70%)`,
            }}
          />

          <img
            src="/logo.png"
            alt="Luca OS Logo"
            className="w-full h-full object-cover relative z-10 transition-transform duration-500 group-hover:scale-110"
          />
        </motion.div>

        <div>
          <h2
            className={`text-xl font-bold tracking-[0.2em] uppercase ${theme.themeName === "lucagent" ? "text-slate-900" : "text-white"}`}
          >
            Luca OS
          </h2>
          <div className="flex items-center justify-center gap-2 mt-1">
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${theme.themeName === "lucagent" ? "bg-black/[0.03] text-slate-500 border-black/10" : "bg-white/5 text-gray-400 border-white/10"}`}
            >
              v{version}
            </span>
            <span className="flex items-center gap-1 text-[10px] font-mono text-green-500 uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Operational
            </span>
          </div>
        </div>
      </div>

      {/* System Grid */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 gap-4"
      >
        {/* Core Intelligence */}
        <motion.div
          variants={item}
          className={`${theme.themeName === "lucagent" ? "glass-panel-light border-black/10" : "glass-panel tech-border border"} p-4 space-y-3 relative overflow-hidden`}
        >
          <div className="flex items-center justify-between">
            <Cpu className="w-4 h-4" style={{ color: theme.hex }} />
            <Zap
              className={`w-3 h-3 ${theme.themeName === "lucagent" ? "text-amber-500" : "text-yellow-500/50"}`}
            />
          </div>
          <div>
            <div
              className={`text-[9px] font-bold uppercase tracking-tighter ${theme.themeName === "lucagent" ? "text-slate-500" : "text-gray-500"}`}
            >
              Luca Architecture
            </div>
            <div
              className={`text-xs font-medium truncate ${theme.themeName === "lucagent" ? "text-slate-900" : "text-white"}`}
            >
              {architecture}
            </div>
            <div
              className={`text-[10px] mt-1 flex items-center gap-1 ${theme.themeName === "lucagent" ? "text-slate-500 font-bold" : "text-gray-400"}`}
            >
              <ShieldCheck className="w-3 h-3" />
              {archBadge}
            </div>
          </div>
        </motion.div>

        {/* Voice Engine */}
        <motion.div
          variants={item}
          className={`${theme.themeName === "lucagent" ? "glass-panel-light border-black/10" : "glass-panel tech-border border"} p-4 space-y-3 relative overflow-hidden`}
        >
          <div className="flex items-center justify-between">
            <Mic className="w-4 h-4" style={{ color: theme.hex }} />
            <div
              className={`text-[8px] px-1.5 py-0.5 rounded font-mono ${theme.themeName === "lucagent" ? "bg-black/5 border border-black/10 text-slate-500" : "bg-white/5 border border-white/10 text-gray-500"}`}
            >
              {settings.voice.provider.toUpperCase()}
            </div>
          </div>
          <div>
            <div
              className={`text-[9px] font-bold uppercase tracking-tighter ${theme.themeName === "lucagent" ? "text-slate-500" : "text-gray-500"}`}
            >
              Voice Synthesis
            </div>
            <div
              className={`text-xs font-medium truncate ${theme.themeName === "lucagent" ? "text-slate-900" : "text-white"}`}
            >
              {settings.voice.voiceId.split("-").pop() || "Standard"}
            </div>
            <div
              className={`text-[10px] mt-1 ${theme.themeName === "lucagent" ? "text-slate-500 font-bold" : "text-gray-400"}`}
            >
              Pacing: {settings.voice.pacing}
            </div>
          </div>
        </motion.div>

        {/* Neural Memory */}
        <motion.div
          variants={item}
          className={`${theme.themeName === "lucagent" ? "glass-panel-light border-black/10" : "glass-panel tech-border border"} p-4 space-y-3 relative overflow-hidden`}
        >
          <div className="flex items-center justify-between">
            <Database className="w-4 h-4" style={{ color: theme.hex }} />
            <div
              className={`text-[8px] flex items-center gap-1 font-mono ${cortexOnline ? (theme.themeName === "lucagent" ? "text-green-600 font-bold" : "text-green-500") : "text-orange-500"}`}
            >
              <span
                className={`w-1 h-1 rounded-full ${cortexOnline ? "bg-green-500 animate-pulse" : "bg-orange-500"}`}
              />
              CORTEX {cortexOnline ? "ON" : "OFF"}
            </div>
          </div>
          <div>
            <div
              className={`text-[9px] font-bold uppercase tracking-tighter ${theme.themeName === "lucagent" ? "text-slate-500" : "text-gray-500"}`}
            >
              Semantic Memory
            </div>
            <div
              className={`text-xs font-medium ${theme.themeName === "lucagent" ? "text-slate-900" : "text-white"}`}
            >
              {memoryCount} Vectors
            </div>
            <div
              className={`text-[10px] mt-1 ${theme.themeName === "lucagent" ? "text-slate-500 font-bold" : "text-gray-400"}`}
            >
              Knowledge Graph Active
            </div>
          </div>
        </motion.div>

        {/* Environmental Awareness */}
        <motion.div
          variants={item}
          className={`${theme.themeName === "lucagent" ? "glass-panel-light border-black/10" : "glass-panel tech-border border"} p-4 space-y-3 relative overflow-hidden`}
        >
          <div className="flex items-center justify-between">
            <Eye className="w-4 h-4" style={{ color: theme.hex }} />
            <Globe
              className={`w-3 h-3 ${theme.themeName === "lucagent" ? "text-indigo-500" : "text-blue-500/50"}`}
            />
          </div>
          <div>
            <div
              className={`text-[9px] font-bold uppercase tracking-tighter ${theme.themeName === "lucagent" ? "text-slate-500" : "text-gray-500"}`}
            >
              Vision
            </div>
            <div
              className={`text-xs font-medium truncate ${theme.themeName === "lucagent" ? "text-slate-900" : "text-white"}`}
            >
              {(settings.brain.visionModel || "Gemini 3 Flash")
                .split("/")
                .pop()
                ?.replace(/-/g, " ")
                .replace(/\b\w/g, (l) => l.toUpperCase())}
            </div>
            <div
              className={`text-[10px] mt-1 flex items-center gap-1 ${theme.themeName === "lucagent" ? "text-slate-500 font-bold" : "text-gray-400"}`}
            >
              <Zap
                className={`w-2.5 h-2.5 ${theme.themeName === "lucagent" ? "text-amber-500" : "text-yellow-500/60"}`}
              />
              Spatial Awareness Active
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Footer Meta */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="pt-4 flex flex-col items-center gap-4"
      >
        <div className="flex gap-6">
          <button
            onClick={() =>
              window.open("https://github.com/macking/luca/releases")
            }
            className="flex items-center gap-1.5 text-[10px] text-gray-500 hover:text-white transition-colors group"
          >
            <ExternalLink className="w-3 h-3 group-hover:scale-110 transition-transform" />
            Check Updates
          </button>
          <button
            onClick={() =>
              window.luca?.openScreenPermissions &&
              window.luca.openScreenPermissions()
            }
            className={`flex items-center gap-1.5 text-[10px] transition-colors group ${theme.themeName === "lucagent" ? "text-slate-500 hover:text-slate-900" : "text-gray-500 hover:text-white"}`}
          >
            <ShieldCheck className="w-3 h-3 group-hover:scale-110 transition-transform" />
            Permissions
          </button>
        </div>

        <div
          className={`text-[9px] font-mono tracking-widest flex items-center gap-2 ${theme.themeName === "lucagent" ? "text-slate-400" : "text-gray-600"}`}
        >
          <span>{electronVersion}</span>
          <span
            className={`w-1 h-1 rounded-full ${theme.themeName === "lucagent" ? "bg-slate-300" : "bg-gray-700"}`}
          />
          <span>LUCAOS LABS</span>
        </div>
      </motion.div>
    </div>
  );
};

export default SettingsAboutTab;
