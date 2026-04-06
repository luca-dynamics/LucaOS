import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Icon } from "../ui/Icon";
import pkg from "../../../package.json";
import { LucaSettings } from "../../services/settingsService";
import { memoryService } from "../../services/memoryService";

interface SettingsAboutTabProps {
  theme?: any;
  settings: LucaSettings;
}

const SettingsAboutTab: React.FC<SettingsAboutTabProps> = ({
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
      <div className="text-center space-y-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`w-24 h-24 mx-auto rounded-3xl border flex items-center justify-center relative group overflow-hidden transition-all shadow-xl bg-[var(--app-bg-tint)] border-[var(--app-border-main)] tech-border glass-blur`}
        >
          {/* Background Highlight Pulse */}
          <motion.div
            animate={{
              opacity: [0.05, 0.15, 0.05],
              scale: [1, 1.2, 1],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 z-0 bg-blue-500/20"
            style={{
              background: `radial-gradient(circle, var(--app-text-main) 0%, transparent 70%)`,
            }}
          />

          <img
            src="/logo.png"
            alt="Luca OS Logo"
            className="w-[80%] h-[80%] object-contain relative z-10 transition-transform duration-700 group-hover:scale-110"
          />
        </motion.div>

        <div className="space-y-1">
          <h2
            className={`text-4xl font-bold tracking-[0.25em] uppercase text-[var(--app-text-main)] shadow-sm`}
          >
            Luca OS
          </h2>
          <div className="flex items-center justify-center gap-3">
            <span
              className={`text-[10px] font-black font-mono px-3 py-1 rounded-full border bg-[var(--app-bg-tint)] border-[var(--app-border-main)] text-[var(--app-text-muted)] opacity-60 uppercase tracking-widest tech-border glass-blur shadow-sm`}
            >
              v{version}
            </span>
            <span className="flex items-center justify-center gap-1.5 text-[10px] font-black font-mono text-green-500 uppercase tracking-widest bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.2)]">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
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
          className={`transition-all border shadow-sm bg-[var(--app-bg-tint)] border-[var(--app-border-main)] rounded-2xl p-5 space-y-4 relative overflow-hidden tech-border glass-blur`}
        >
          <div className="flex items-center justify-between">
            <Icon name="Cpu" variant="BoldDuotone" className="w-5 h-5 text-[var(--app-text-main)] opacity-80" />
            <Icon
              name="Bolt"
              className="w-3.5 h-3.5 text-[var(--app-text-main)] opacity-40"
            />
          </div>
          <div>
            <div
              className={`text-[10px] font-black uppercase tracking-widest text-[var(--app-text-muted)] opacity-60 mb-1`}
            >
              OS Core
            </div>
            <div
              className={`text-base font-bold truncate text-[var(--app-text-main)]`}
            >
              {architecture}
            </div>
            <div
              className={`text-[10px] mt-2 flex items-center gap-1.5 text-[var(--app-text-muted)] font-bold uppercase tracking-tighter opacity-80`}
            >
              <Icon name="ShieldCheck" className="w-3.5 h-3.5 text-blue-400" />
              {archBadge}
            </div>
          </div>
        </motion.div>

        {/* Voice Engine */}
        <motion.div
          variants={item}
          className={`transition-all border shadow-sm bg-[var(--app-bg-tint)] border-[var(--app-border-main)] rounded-2xl p-5 space-y-4 relative overflow-hidden tech-border glass-blur`}
        >
          <div className="flex items-center justify-between">
            <Icon name="Mic" variant="BoldDuotone" className="w-5 h-5 text-[var(--app-text-main)] opacity-80" />
            <div
              className={`text-[9px] px-2 py-0.5 rounded font-black font-mono shadow-sm border bg-white/5 border-[var(--app-border-main)] text-[var(--app-text-muted)] opacity-60 uppercase tracking-widest`}
            >
              {settings.voice.provider}
            </div>
          </div>
          <div>
            <div
              className={`text-[10px] font-black uppercase tracking-widest text-[var(--app-text-muted)] opacity-60 mb-1`}
            >
              Synthesis Engine
            </div>
            <div
              className={`text-base font-bold truncate text-[var(--app-text-main)]`}
            >
              {settings.voice.voiceId.split("-").pop() || "Standard"}
            </div>
            <div
              className={`text-[10px] mt-2 text-[var(--app-text-muted)] font-bold uppercase tracking-tighter opacity-80`}
            >
              Pacing: {settings.voice.pacing}
            </div>
          </div>
        </motion.div>

        {/* Neural Memory */}
        <motion.div
          variants={item}
          className={`transition-all border shadow-sm bg-[var(--app-bg-tint)] border-[var(--app-border-main)] rounded-2xl p-5 space-y-4 relative overflow-hidden tech-border glass-blur`}
        >
          <div className="flex items-center justify-between">
            <Icon name="Database" variant="BoldDuotone" className="w-5 h-5 text-[var(--app-text-main)] opacity-80" />
            <div
              className={`text-[9px] flex items-center gap-1.5 font-black font-mono uppercase tracking-widest ${cortexOnline ? "text-green-500" : "text-amber-500 opacity-80"}`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${cortexOnline ? "bg-green-500 animate-pulse shadow-[0_0_6px_rgba(34,197,94,0.6)]" : "bg-amber-500"}`}
              />
              CORTEX {cortexOnline ? "ON" : "OFF"}
            </div>
          </div>
          <div>
            <div
              className={`text-[10px] font-black uppercase tracking-widest text-[var(--app-text-muted)] opacity-60 mb-1`}
            >
              Semantic Matrix
            </div>
            <div
              className={`text-base font-bold text-[var(--app-text-main)]`}
            >
              {memoryCount} Known Facts
            </div>
            <div
              className={`text-[10px] mt-2 text-[var(--app-text-muted)] font-bold uppercase tracking-tighter opacity-80 flex items-center gap-1.5`}
            >
              <Icon name="Check" className="w-3.5 h-3.5 text-blue-400" />
              Knowledge Graph Active
            </div>
          </div>
        </motion.div>

        {/* Environmental Awareness */}
        <motion.div
          variants={item}
          className={`transition-all border shadow-sm bg-[var(--app-bg-tint)] border-[var(--app-border-main)] rounded-2xl p-5 space-y-4 relative overflow-hidden tech-border glass-blur`}
        >
          <div className="flex items-center justify-between">
            <Icon name="Eye" variant="BoldDuotone" className="w-5 h-5 text-[var(--app-text-main)] opacity-80" />
            <Icon
              name="Globus"
              className="w-3.5 h-3.5 text-[var(--app-text-main)] opacity-40"
            />
          </div>
          <div>
            <div
              className={`text-[10px] font-black uppercase tracking-widest text-[var(--app-text-muted)] opacity-60 mb-1`}
            >
              Spatial Vision
            </div>
            <div
              className={`text-base font-bold truncate text-[var(--app-text-main)]`}
            >
              {(settings.brain.visionModel || "Gemini 3 Flash")
                .split("/")
                .pop()
                ?.replace(/-/g, " ")
                .replace(/\b\w/g, (l) => l.toUpperCase())}
            </div>
            <div
              className={`text-[10px] mt-2 flex items-center gap-1.5 text-[var(--app-text-muted)] font-bold uppercase tracking-tighter opacity-80`}
            >
              <Icon
                name="Bolt"
                className="w-3.5 h-3.5 text-amber-500"
              />
              Sensory Aware
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Footer Meta */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="pt-6 flex flex-col items-center gap-6"
      >
        <div className="flex gap-8">
          <button
            onClick={() =>
              window.open("https://github.com/macking/luca/releases")
            }
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--app-text-muted)] hover:text-[var(--app-text-main)] transition-all opacity-60 hover:opacity-100 group"
          >
            <Icon name="ExternalLink" className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>Check Updates</span>
          </button>
          <button
            onClick={() =>
              window.luca?.openScreenPermissions &&
              window.luca.openScreenPermissions()
            }
            className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--app-text-muted)] hover:text-[var(--app-text-main)] transition-all opacity-60 hover:opacity-100 group`}
          >
            <Icon name="ShieldCheck" className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>Permissions</span>
          </button>
        </div>

        <div
          className={`text-[10px] font-black font-mono tracking-[0.3em] flex items-center gap-3 text-[var(--app-text-muted)] opacity-40 uppercase`}
        >
          <span>{electronVersion}</span>
          <span
            className={`w-1 h-1 rounded-full bg-[var(--app-text-muted)] opacity-60`}
          />
          <span>LucaOS LABS</span>
        </div>
      </motion.div>
    </div>
  );
};

export default SettingsAboutTab;
