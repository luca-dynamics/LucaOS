import React, { useState, useEffect } from "react";
import { Icon } from "../ui/Icon";
import { settingsService, LucaSettings } from "../../services/settingsService";

interface ChatModeToggleProps {
  themeName?: string;
  primaryColor?: string;
}

const ChatModeToggle: React.FC<ChatModeToggleProps> = ({ themeName = "default", primaryColor = "#10b981" }) => {
  const [conversationMode, setConversationMode] = useState<"fast" | "planning">("fast");

  const isLight = themeName.toLowerCase() === "lucagent" || themeName.toLowerCase() === "agentic-slate" || themeName.toLowerCase() === "light";
  const safeColor = primaryColor.startsWith("#") && primaryColor.length > 7 ? primaryColor.slice(0, 7) : primaryColor;

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

  const isPlanningMode = conversationMode === "planning";

  const toggleMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newMode = isPlanningMode ? "fast" : "planning";
    
    // Save to global system state
    settingsService.saveSettings({
      brain: { ...settingsService.get("brain"), conversationMode: newMode }
    });
  };

  return (
    <button
      onClick={toggleMode}
      className={`flex items-center gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-md border transition-all active:scale-95 ${
        isPlanningMode 
          ? (isLight ? "bg-amber-50 border-amber-200" : "bg-amber-500/10 border-amber-500/30") 
          : (isLight ? "bg-white border-gray-200 hover:bg-gray-100" : "bg-black/20 border-white/10 hover:bg-white/10")
      }`}
      style={!isPlanningMode ? { borderColor: `${safeColor}30` } : {}}
      title={isPlanningMode ? "Planning Mode (LUCA Autonomous Control)" : "Fast Mode (Direct Execution)"}
    >
      {isPlanningMode ? (
          <Icon name="BrainCircuit" size={12} variant="BoldDuotone" color="#f59e0b" />
      ) : (
          <Icon name="Energy" size={12} variant="BoldDuotone" className={isLight ? "text-gray-500" : "text-gray-400"} />
      )}
      <span className={`text-[10px] sm:text-xs font-bold ${
          isPlanningMode 
            ? "text-amber-600 dark:text-amber-500" 
            : (isLight ? "text-gray-600" : "text-gray-400")
      }`}>
        {isPlanningMode ? "Planning" : "Fast"}
      </span>
    </button>
  );
};

export default ChatModeToggle;
