import React from "react";
import { Home } from "lucide-react";
import { LucaSettings } from "../../services/settingsService";

interface SettingsIoTTabProps {
  settings: LucaSettings;
  onUpdate: (section: keyof LucaSettings, key: string, value: any) => void;
  theme: {
    primary: string;
    hex: string;
    themeName: string;
  };
}

const SettingsIoTTab: React.FC<SettingsIoTTabProps> = ({
  settings,
  onUpdate,
  theme,
}) => {
  return (
    <div className="space-y-6">
      <div
        className={`flex items-center gap-3 border p-4 rounded-lg ${theme.themeName === "lucagent" ? "glass-panel-light border-black/10 shadow-sm" : "backdrop-blur-sm bg-white/5 border-white/10"}`}
      >
        <Home
          className={`w-8 h-8 ${theme.themeName === "lucagent" ? "text-slate-400" : "text-gray-400"}`}
        />
        <div>
          <h3
            className={`font-bold ${theme.themeName === "lucagent" ? "text-slate-900" : "text-gray-200"}`}
          >
            Home Assistant
          </h3>
          <p
            className={`text-xs ${theme.themeName === "lucagent" ? "text-slate-600 font-bold" : "text-gray-400"}`}
          >
            Control your real-world devices.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-400">Server URL</label>
          <input
            type="text"
            value={settings.iot.haUrl}
            onChange={(e) => onUpdate("iot", "haUrl", e.target.value)}
            placeholder="http://homeassistant.local:8123"
            className={`w-full border rounded-lg p-2 outline-none font-mono text-sm transition-all shadow-inner ${theme.themeName === "lucagent" ? "bg-black/[0.03] border-black/10 text-slate-900" : "bg-black/20 border-white/10 text-white"}`}
            style={{
              borderColor:
                theme.themeName === "lucagent"
                  ? "rgba(0,0,0,0.1)"
                  : "rgba(255,255,255,0.1)",
            }}
            onFocus={(e) => (e.target.style.borderColor = theme.hex)}
            onBlur={(e) =>
              (e.target.style.borderColor =
                theme.themeName === "lucagent"
                  ? "rgba(0,0,0,0.1)"
                  : "rgba(255,255,255,0.1)")
            }
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-400">
            Long-Lived Access Token
          </label>
          <textarea
            value={settings.iot.haToken}
            onChange={(e) => onUpdate("iot", "haToken", e.target.value)}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5..."
            className={`w-full h-24 border rounded-lg p-2 outline-none font-mono text-[10px] transition-all shadow-inner ${theme.themeName === "lucagent" ? "bg-black/[0.03] border-black/10 text-slate-800" : "bg-black/20 border-white/10 text-white"}`}
            style={{
              borderColor:
                theme.themeName === "lucagent"
                  ? "rgba(0,0,0,0.1)"
                  : "rgba(255,255,255,0.1)",
            }}
            onFocus={(e) => (e.target.style.borderColor = theme.hex)}
            onBlur={(e) =>
              (e.target.style.borderColor =
                theme.themeName === "lucagent"
                  ? "rgba(0,0,0,0.1)"
                  : "rgba(255,255,255,0.1)")
            }
          />
        </div>
      </div>
    </div>
  );
};

export default SettingsIoTTab;
