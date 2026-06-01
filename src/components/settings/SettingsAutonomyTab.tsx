import React from "react";
import { motion } from "framer-motion";
import { LucaSettings } from "../../services/settingsService";
import { Icon as IconEngine } from "../ui/Icon";

interface SettingsAutonomyTabProps {
  settings: LucaSettings;
  onUpdate: (section: keyof LucaSettings, key: string, value: any) => void;
  theme: {
    primary: string;
    hex: string;
    themeName: string;
  };
  isMobile?: boolean;
}

const SettingsAutonomyTab: React.FC<SettingsAutonomyTabProps> = ({
  settings,
  onUpdate,
  theme,
  isMobile,
}) => {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 },
  };

  const autonomy = settings.autonomy || {
    backgroundMissionsEnabled: false,
    shadowExecutionEnabled: false,
    doubleBrainConsensus: true,
    resourceAwareThrottling: true,
    idleThresholdMinutes: 10,
  };

  const toggle = (key: keyof typeof autonomy) => {
    onUpdate("autonomy", key, !autonomy[key]);
  };

  const setRange = (key: keyof typeof autonomy, value: number) => {
    onUpdate("autonomy", key, value);
  };

  return (
    <div className={`space-y-6 ${isMobile ? "px-0" : "pr-2"} overflow-y-auto`}>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-4"
      >
        {/* HEADER & PHILOSOPHY */}
        <motion.div
          variants={item}
          className={`${isMobile ? "p-4 py-6 border-x-0 border-y rounded-none" : "p-4 rounded-xl border"} transition-all duration-300`}
          style={{
            backgroundColor: isMobile ? "rgba(255,255,255,0.02)" : "var(--app-bg-tint, rgba(0,0,0,0.1))",
            borderColor: "var(--app-border-main, rgba(0,0,0,0.2))",
          }}
        >
          <div className="flex items-center gap-3 mb-2">
            <IconEngine name="Ghost" variant="BoldDuotone" className="w-5 h-5" style={{ color: theme.hex }} />
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--app-text-main)" }}>
                Luca Autonomy Model
              </h3>
              <p className="text-[10px] text-[var(--app-text-muted)] italic">
                Safety-aware controls for proactive, user-approved assistance.
              </p>
            </div>
          </div>
          <p className="text-[11px] leading-relaxed opacity-80 mt-3" style={{ color: "var(--app-text-main)" }}>
            Autonomy lets Luca prepare and continue approved work while you are away. Keep mission controls and safety review enabled for sensitive tasks. <strong>These routines may consume tokens and system resources.</strong>
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* COLUMN 1: MISSION CONTROL */}
          <div className="space-y-4">
            <motion.div
              variants={item}
              className="p-4 rounded-xl border glass-blur space-y-4"
              style={{
                backgroundColor: "var(--app-bg-tint, rgba(0,0,0,0.1))",
                borderColor: "var(--app-border-main, rgba(0,0,0,0.2))",
              }}
            >
              <div className="flex items-center gap-2">
                <IconEngine name="Target" variant="BoldDuotone" className="w-4 h-4" style={{ color: theme.hex }} />
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--app-text-main)" }}>
                  Mission Autonomy
                </span>
              </div>

              <div className="space-y-3">
                {/* Background Missions */}
                <div className="flex items-center justify-between group">
                  <div className="space-y-0.5">
                    <div className="text-[11px] font-bold" style={{ color: "var(--app-text-main)" }}>Background Missions</div>
                    <div className="text-[9px] text-[var(--app-text-muted)] uppercase">Allow Luca to continue approved goals while you are idle</div>
                  </div>
                  <button
                    onClick={() => toggle("backgroundMissionsEnabled")}
                    className={`w-8 h-4 rounded-full transition-all relative ${autonomy.backgroundMissionsEnabled ? "" : "bg-[var(--app-border-main)] opacity-40"}`}
                    style={{ backgroundColor: autonomy.backgroundMissionsEnabled ? theme.hex : undefined }}
                  >
                    <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${autonomy.backgroundMissionsEnabled ? "translate-x-4.5" : "translate-x-0.5"}`} />
                  </button>
                </div>

                {/* Shadow Execution */}
                <div className="flex items-center justify-between group">
                  <div className="space-y-0.5">
                    <div className="text-[11px] font-bold" style={{ color: "var(--app-text-main)" }}>Shadow Execution</div>
                    <div className="text-[9px] text-[var(--app-text-muted)] uppercase">Preview actions before Luca runs or surfaces them</div>
                  </div>
                  <button
                    onClick={() => toggle("shadowExecutionEnabled")}
                    className={`w-8 h-4 rounded-full transition-all relative ${autonomy.shadowExecutionEnabled ? "" : "bg-[var(--app-border-main)] opacity-40"}`}
                    style={{ backgroundColor: autonomy.shadowExecutionEnabled ? theme.hex : undefined }}
                  >
                    <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${autonomy.shadowExecutionEnabled ? "translate-x-4.5" : "translate-x-0.5"}`} />
                  </button>
                </div>
              </div>
            </motion.div>

            <motion.div
              variants={item}
              className="p-4 rounded-xl border glass-blur space-y-4"
              style={{
                backgroundColor: "var(--app-bg-tint, rgba(0,0,0,0.1))",
                borderColor: "var(--app-border-main, rgba(0,0,0,0.2))",
              }}
            >
              <div className="flex items-center gap-2">
                <IconEngine name="Clock" variant="BoldDuotone" className="w-4 h-4" style={{ color: theme.hex }} />
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--app-text-main)" }}>
                  Environmental Sensitivity
                </span>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono text-[var(--app-text-muted)]">IDLE THRESHOLD</span>
                    <span className="text-[10px] font-mono" style={{ color: theme.hex }}>{autonomy.idleThresholdMinutes} MIN</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="60"
                    value={autonomy.idleThresholdMinutes}
                    onChange={(e) => setRange("idleThresholdMinutes", parseInt(e.target.value))}
                    className="w-full h-1 rounded-lg appearance-none cursor-pointer"
                    style={{ 
                      accentColor: theme.hex,
                      backgroundColor: "var(--app-border-main, rgba(255,255,255,0.2))"
                    }}
                  />
                  <p className="text-[9px] text-[var(--app-text-muted)] italic">
                    Determines how long you must be inactive before autonomous background turns initiate.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* COLUMN 2: SECURITY HARDNESS */}
          <div className="space-y-4">
            <motion.div
              variants={item}
              className="p-4 rounded-xl border glass-blur space-y-4"
              style={{
                backgroundColor: "var(--app-bg-tint, rgba(0,0,0,0.1))",
                borderColor: "var(--app-border-main, rgba(0,0,0,0.2))",
              }}
            >
              <div className="flex items-center gap-2">
                <IconEngine name="ShieldCheck" variant="BoldDuotone" className="w-4 h-4" style={{ color: theme.hex }} />
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--app-text-main)" }}>
                  Autonomy Safety
                </span>
              </div>

              <div className="space-y-3">
                {/* Double-Brain Consensus */}
                <div className="flex items-center justify-between group">
                  <div className="space-y-0.5">
                    <div className="text-[11px] font-bold" style={{ color: "var(--app-text-main)" }}>Double-Brain Consensus</div>
                    <div className="text-[9px] text-[var(--app-text-muted)] uppercase">Require a second model review before autonomous actions</div>
                  </div>
                  <button
                    onClick={() => toggle("doubleBrainConsensus")}
                    className={`w-8 h-4 rounded-full transition-all relative ${autonomy.doubleBrainConsensus ? "" : "bg-[var(--app-border-main)] opacity-40"}`}
                    style={{ backgroundColor: autonomy.doubleBrainConsensus ? theme.hex : undefined }}
                  >
                    <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${autonomy.doubleBrainConsensus ? "translate-x-4.5" : "translate-x-0.5"}`} />
                  </button>
                </div>

                {/* Resource Throttling */}
                <div className="flex items-center justify-between group">
                  <div className="space-y-0.5">
                    <div className="text-[11px] font-bold" style={{ color: "var(--app-text-main)" }}>Resource Awareness</div>
                    <div className="text-[9px] text-[var(--app-text-muted)] uppercase">Throttles missions on low battery or high CPU</div>
                  </div>
                  <button
                    onClick={() => toggle("resourceAwareThrottling")}
                    className={`w-8 h-4 rounded-full transition-all relative ${autonomy.resourceAwareThrottling ? "" : "bg-[var(--app-border-main)] opacity-40"}`}
                    style={{ backgroundColor: autonomy.resourceAwareThrottling ? theme.hex : undefined }}
                  >
                    <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${autonomy.resourceAwareThrottling ? "translate-x-4.5" : "translate-x-0.5"}`} />
                  </button>
                </div>
              </div>

              <div className="p-3 rounded border border-yellow-500/20 bg-yellow-500/5 mt-2">
                <div className="flex items-center gap-2 mb-1">
                  <IconEngine name="Info" variant="BoldDuotone" className="w-3 h-3 text-yellow-500" />
                  <span className="text-[9px] font-bold text-yellow-500 uppercase">Security Note</span>
                </div>
                <p className="text-[9px] text-yellow-500/80 leading-tight">
                  Consensus review helps prevent single-model mistakes during autonomous work. Disabling this safety layer is not recommended.
                </p>
              </div>
            </motion.div>

            <motion.div
              variants={item}
              className="p-4 rounded-xl border border-red-500/10 bg-red-500/5 space-y-2"
            >
               <div className="flex items-center gap-2">
                <IconEngine name="Danger" variant="BoldDuotone" className="w-4 h-4 text-red-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-500">
                  Mission Killswitch
                </span>
              </div>
              <p className="text-[10px] text-red-500/70">
                Stops all autonomous activity immediately and clears queued missions. Use this any time Luca behaves unexpectedly.
              </p>
              <button className="w-full py-2 bg-red-500/20 border border-red-500/30 rounded text-[10px] font-bold text-red-500 hover:bg-red-500/30 transition-all uppercase tracking-widest">
                Stop All Missions
              </button>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SettingsAutonomyTab;
