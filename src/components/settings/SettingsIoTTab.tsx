import React from "react";
import * as LucideIcons from "lucide-react";
const {
  Home,
} = LucideIcons as any;
import { LucaSettings } from "../../services/settingsService";
import { setHexAlpha } from "../../config/themeColors";

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
        className={`flex items-center gap-3 border p-4 rounded-lg ${theme.themeName?.toLowerCase() === "lucagent" ? "glass-panel-light border-black/10 shadow-sm" : "backdrop-blur-sm"}`}
        style={{
          backgroundColor: theme.themeName?.toLowerCase() === "lucagent" ? undefined : setHexAlpha(theme.hex, 0.05),
          borderColor: theme.themeName?.toLowerCase() === "lucagent" ? undefined : setHexAlpha(theme.hex, 0.1)
        }}
      >
        <Home
          className="w-8 h-8"
          style={{ color: theme.hex }}
        />
        <div>
          <h3
            className={`font-bold ${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-900" : "text-gray-200"}`}
          >
            Home Assistant
          </h3>
          <p
            className={`text-xs ${theme.themeName?.toLowerCase() === "lucagent" ? "text-slate-600 font-bold" : "text-gray-400"}`}
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
            className={`w-full border rounded-lg p-2 outline-none font-mono text-sm transition-all shadow-inner ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-black/[0.03] border-black/10 text-slate-900" : "text-white"}`}
            style={{
              borderColor:
                theme.themeName?.toLowerCase() === "lucagent"
                  ? "rgba(0,0,0,0.1)"
                  : setHexAlpha(theme.hex, 0.1),
              backgroundColor: theme.themeName?.toLowerCase() === "lucagent" ? undefined : "rgba(0,0,0,0.2)"
            }}
            onFocus={(e) => (e.target.style.borderColor = theme.hex)}
            onBlur={(e) =>
              (e.target.style.borderColor =
                theme.themeName?.toLowerCase() === "lucagent"
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
            className={`w-full h-24 border rounded-lg p-2 outline-none font-mono text-[10px] transition-all shadow-inner ${theme.themeName?.toLowerCase() === "lucagent" ? "bg-black/[0.03] border-black/10 text-slate-800" : "text-white"}`}
            style={{
              borderColor:
                theme.themeName?.toLowerCase() === "lucagent"
                  ? "rgba(0,0,0,0.1)"
                  : setHexAlpha(theme.hex, 0.1),
              backgroundColor: theme.themeName?.toLowerCase() === "lucagent" ? undefined : "rgba(0,0,0,0.2)"
            }}
            onFocus={(e) => (e.target.style.borderColor = theme.hex)}
            onBlur={(e) =>
              (e.target.style.borderColor =
                theme.themeName?.toLowerCase() === "lucagent"
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
