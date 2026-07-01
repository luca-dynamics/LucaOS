import React, { useState, useEffect } from "react";
import { Icon } from "../ui/Icon";
import { settingsService, LucaSettings } from "../../services/settingsService";

interface ChatModeToggleProps {
  themeName?: string;
  primaryColor?: string;
}

const ChatModeToggle: React.FC<ChatModeToggleProps> = ({ themeName = "default", primaryColor = "#10b981" }) => {
  const [conversationMode, setConversationMode] = useState<"fast" | "planning">("fast");

  useEffect(() => {
    // Initial load
    setConversationMode(settingsService.get("brain").conversationMode || "fast");
    
    // Subscribe to settings changes globally
    const handleSettingsChange = (newSettings: LucaSettings) => {
      setConversationMode(newSettings.brain.conversationMode || "fast");
    };
    
    settingsService.on("settings-changed", handleSettingsChange);
    return () => {
      settingsService.off("settings-changed", handleSettingsChange);
    };
  }, []);

  const setMode = (mode: "fast" | "planning", e: React.MouseEvent) => {
    e.stopPropagation();
    if (mode === conversationMode) return;
    // Save to global system state
    settingsService.saveSettings({
      brain: { ...settingsService.get("brain"), conversationMode: mode },
    });
  };

  const segments = [
    {
      key: "fast" as const,
      label: "Fast",
      icon: "Energy",
      title: "Fast Mode (Direct Execution)",
    },
    {
      key: "planning" as const,
      label: "Planning",
      icon: "BrainCircuit",
      title: "Planning Mode (Luca Autonomous Control)",
    },
  ];

  return (
    <div
      role="group"
      aria-label="Conversation mode"
      className="inline-flex items-center gap-0.5 rounded-lg border p-0.5"
      style={{
        borderColor: "var(--luca-border-subtle, var(--app-border-main))",
        backgroundColor: "var(--luca-surface-glass, transparent)",
      }}
    >
      {segments.map((seg) => {
        const active = conversationMode === seg.key;
        const planningActive = active && seg.key === "planning";
        return (
          <button
            key={seg.key}
            type="button"
            onClick={(e) => setMode(seg.key, e)}
            aria-pressed={active}
            title={seg.title}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition-all active:scale-95"
            style={
              active
                ? planningActive
                  ? {
                      backgroundColor:
                        "color-mix(in srgb, var(--luca-warning, #f2b23e) 16%, transparent)",
                      color: "var(--luca-warning, #f2b23e)",
                    }
                  : {
                      backgroundColor: "var(--luca-surface-hover)",
                      color: "var(--luca-text-primary, var(--app-text-main))",
                    }
                : { color: "var(--luca-text-tertiary, var(--app-text-muted))" }
            }
          >
            <Icon name={seg.icon} size={12} variant="BoldDuotone" />
            {seg.label}
          </button>
        );
      })}
    </div>
  );
};

export default ChatModeToggle;
