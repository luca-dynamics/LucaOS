import React from "react";
import { Icon } from "../ui/Icon";
import { LucaSettings } from "../../services/settingsService";

interface SettingsIoTTabProps {
  theme?: any;
  settings: LucaSettings;
  onUpdate: (section: keyof LucaSettings, key: string, value: any) => void;
}

const SettingsIoTTab: React.FC<SettingsIoTTabProps> = ({
  settings,
  onUpdate,
}) => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* IoT Header */}
      <div
        className={`flex items-center gap-5 border p-6 rounded-2xl bg-[var(--app-bg-tint)] border-[var(--app-border-main)] tech-border glass-blur shadow-lg transition-all`}
      >
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-blue-500/10 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
          <Icon
            name="Home"
            variant="BoldDuotone"
            className="w-10 h-10 text-blue-400"
          />
        </div>
        <div>
          <h3
            className={`text-xl font-black uppercase tracking-widest text-[var(--app-text-main)] mb-1`}
          >
            Home Assistant
          </h3>
          <p
            className={`text-sm text-[var(--app-text-muted)] opacity-80 leading-relaxed max-w-xs`}
          >
            Bridge Luca to your real-world environment. Full automation control active.
          </p>
        </div>
      </div>

      {/* Form Fields */}
      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--app-text-muted)] ml-1 opacity-60">
            Internal Server URL
          </label>
          <input
            type="text"
            value={settings.iot.haUrl}
            onChange={(e) => onUpdate("iot", "haUrl", e.target.value)}
            placeholder="http://homeassistant.local:8123"
            className={`w-full border rounded-xl p-4 outline-none font-mono text-sm transition-all shadow-inner bg-black/40 border-[var(--app-border-main)] text-[var(--app-text-main)] focus:border-[var(--app-text-muted)] focus:bg-black/60`}
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--app-text-muted)] ml-1 opacity-60">
            Long-Lived Access Token
          </label>
          <textarea
            value={settings.iot.haToken}
            onChange={(e) => onUpdate("iot", "haToken", e.target.value)}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5..."
            className={`w-full h-48 border rounded-xl p-4 outline-none font-mono text-sm transition-all shadow-inner bg-black/40 border-[var(--app-border-main)] text-[var(--app-text-main)] focus:border-[var(--app-text-muted)] focus:bg-black/60 resize-none leading-relaxed`}
          />
        </div>
      </div>
    </div>
  );
};

export default SettingsIoTTab;
