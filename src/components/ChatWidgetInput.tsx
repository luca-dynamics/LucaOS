import React, { useRef, useEffect, KeyboardEvent } from "react";
import { Icon } from "./ui/Icon";
import ChatModelSwitcher from "./chat/ChatModelSwitcher";
import ChatModeToggle from "./chat/ChatModeToggle";
import { settingsService } from "../services/settingsService";
import { CURATED_PLUGINS, MarketplacePlugin } from "../data/directoryData";

interface ChatWidgetInputProps {
  input: string;
  setInput: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isProcessing: boolean;
  primaryColor: string;
  onCapture?: () => void;
  attachment?: string | null;
  onClearAttachment?: () => void;
  isEyeActive?: boolean;
  onToggleEye?: () => void;
  isCompact?: boolean;
  onToggleVoice?: () => void;
  isVoiceActive?: boolean;
  onAttachClick?: () => void;
  onClearChat?: () => void;
  onHeightChange?: (height: number) => void;
  onStop?: () => void;
  isSpeaking?: boolean;
  amplitude?: number;
  themeName?: string;
  currentCwd?: string;
  isKernelLocked?: boolean;
  opsecStatus?: string;
  persona?: string;
  hasApprovalRequest?: boolean;
  onScreenShare?: () => void;
  activeMcpServers?: { id: string; name: string; status?: string }[];
  onDisconnectMcp?: (id: string) => void;
  onConnectMcp?: (id: string) => void;
}

const ChatWidgetInput: React.FC<ChatWidgetInputProps> = ({
  input,
  setInput,
  onSubmit,
  isProcessing,
  primaryColor,

  attachment,
  onClearAttachment,
  isEyeActive,
  onToggleEye,

  onToggleVoice,
  isVoiceActive,
  onAttachClick,
  onClearChat,
  onHeightChange,
  onStop,
  isSpeaking,
  amplitude = 0,
  themeName = "default",
  currentCwd,
  isKernelLocked,
  opsecStatus,
  persona,
  hasApprovalRequest,
  onScreenShare,
  activeMcpServers = [],
  onDisconnectMcp,
  onConnectMcp,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // THREE.Color/CSS doesn't always handle 8-digit hex properly when appending, sanitize to 6-digit
  const safeColor = React.useMemo(() => {
    if (primaryColor.startsWith("#") && primaryColor.length > 7) {
      return primaryColor.slice(0, 7);
    }
    return primaryColor;
  }, [primaryColor]);

  // Auto-resize textarea
  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to get accurate scrollHeight
    textarea.style.height = "auto";

    // Calculate new height (min 48px for text only, max 200px)
    const scrollHeight = textarea.scrollHeight;
    const newHeight = Math.max(48, Math.min(scrollHeight, 200));

    textarea.style.height = `${newHeight}px`;
    textarea.style.overflowY = scrollHeight > 200 ? "auto" : "hidden";

    // Report total height including toolbar buffer (approx 44px)
    if (onHeightChange) {
      onHeightChange(newHeight + 44);
    }
  };

  // Adjust height when input changes
  useEffect(() => {
    adjustHeight();
  }, [input]);

  // Plugin State
  const [activePluginId, setActivePluginId] = React.useState<string | null>(
    settingsService.getSettings().brain.activePluginId
  );

  useEffect(() => {
    const handleSettings = (s: any) => setActivePluginId(s.brain.activePluginId);
    settingsService.on("settings-changed", handleSettings);
    return () => { settingsService.off("settings-changed", handleSettings); };
  }, []);

  const activePlugin = React.useMemo(() => 
    CURATED_PLUGINS.find((p: MarketplacePlugin) => p.id === activePluginId),
    [activePluginId]
  );

  const handleClearPlugin = () => {
    const current = settingsService.getSettings();
    settingsService.saveSettings({
      brain: { ...current.brain, activePluginId: null }
    });
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter without Shift = Send
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() || attachment) {
        onSubmit(e as any);
      }
    }
    // Shift + Enter = New line (default behavior, do nothing)
  };

  const isLight = 
    themeName?.toLowerCase() === "lucagent" || 
    themeName?.toLowerCase() === "agentic-slate" ||
    themeName?.toLowerCase() === "light";

  return (
    <div
      className={`relative z-20 transition-colors duration-500 ${
        isLight 
          ? "bg-white/10 glass-blur rounded-b-2xl border-t border-gray-200/50" 
          : "bg-black/40 glass-blur"
      }`}
    >
      {/* Attachment Preview (Above Input) */}
      {attachment && (
        <div className="mb-3 flex">
          <div className="relative group">
            <img
              src={attachment}
              alt="Attachment"
              className={`h-20 sm:h-24 w-auto rounded-xl border ${isLight ? "border-gray-300" : "border-white/20"} shadow-lg`}
            />
            <button
              type="button"
              onClick={onClearAttachment}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition-all active:scale-90"
            >
              <Icon name="CloseCircle" size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Main Input Container (Draggable Wrapper) */}
      <div
        className="relative pt-2 border-t bg-transparent transition-all duration-200"
        style={
          {
            borderColor: `${safeColor}40`,
            WebkitAppRegion: "drag", // DRAGGABLE AREA
          } as any
        }
        onClick={() => textareaRef.current?.focus()} // Click padding -> Focus input
      >
        {/* Textarea (No Drag, minimal padding) */}
        <textarea
          ref={textareaRef}
          id="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={attachment ? "Discuss this image..." : "Message Luca..."}
          rows={1}
          enterKeyHint="enter"
          className={`
            w-full
            bg-transparent
            ${isLight ? "text-gray-900 placeholder-gray-500" : "text-white placeholder-slate-500"}
            text-[13px]
            px-2 sm:px-2.5
            py-2
            focus:outline-none
            resize-none
            font-mono
            leading-relaxed
            block
          `}
          style={
            {
              caretColor: safeColor,
              WebkitAppRegion: "no-drag", // TEXT INPUT IS NOT DRAGGABLE
            } as any
          }
          autoFocus
        />

        {/* MISSION PENDING INDICATOR */}
        {hasApprovalRequest && (
          <div className="absolute top-0 right-3 flex items-center gap-1.5 py-2 px-3 bg-red-500/10 border border-red-500/20 rounded-bl-xl z-30 animate-pulse pointer-events-none">
            <Icon name="Shield" size={12} className="text-red-500" variant="BoldDuotone" />
            <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest font-mono">
              Mission Pending
            </span>
          </div>
        )}

        {/* Bottom Icons Row - Relative to flow below textarea */}
        <div className="relative pt-2 pb-2 flex items-center justify-between px-2 sm:px-2 pointer-events-none z-50">
          {/* Left Icons */}
          <div
            className="flex items-center gap-1 sm:gap-1 pointer-events-auto"
            style={{ WebkitAppRegion: "no-drag" } as any}
          >
            {/* Model Switcher */}
            <ChatModelSwitcher themeName={themeName} primaryColor={activePlugin?.color || safeColor} />
            
            {/* Plugin Badge (Mode Indicator) */}
            {activePlugin && (
              <div 
                className="flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] sm:text-[11px] font-mono font-bold animate-in slide-in-from-left-2 duration-300"
                style={{ 
                  backgroundColor: `${activePlugin.color}15`, 
                  borderColor: `${activePlugin.color}40`,
                  color: activePlugin.color,
                  boxShadow: `0 0 15px ${activePlugin.color}20` 
                }}
              >
                <Icon name={activePlugin.icon as any} size={12} variant="BoldDuotone" />
                <span className="uppercase tracking-widest truncate max-w-[80px] sm:max-w-[120px]">
                  {activePlugin.name}
                </span>
                <button 
                  onClick={handleClearPlugin}
                  className="ml-1 p-0.5 hover:bg-white/10 rounded transition-colors opacity-60 hover:opacity-100"
                >
                  <Icon name="Close" size={10} />
                </button>
              </div>
            )}
            
            {/* Extended Thinking (Planning mode) Toggle */}
            <ChatModeToggle themeName={themeName} primaryColor={safeColor} />

            {/* Clear Chat Button */}
            {onClearChat && (
              <button
                type="button"
                onClick={onClearChat}
                className={`p-1 sm:p-1.5 hover:text-red-400 transition-all rounded-md border ${isLight ? "hover:bg-gray-100" : "hover:bg-white/5"} active:scale-90`}
                style={{
                  borderColor: `${safeColor}60`,
                  color: `${safeColor}cc`,
                }}
                title="Clear Chat"
              >
                <Icon name="Chat" size={15} variant="BoldDuotone" className="sm:w-[13px] sm:h-[13px]" />
              </button>
            )}

            {/* Attachment Button */}
            <button
              type="button"
              className={`p-1 sm:p-1.5 transition-all rounded-md border ${isLight ? "hover:bg-gray-100" : "hover:bg-white/5"} active:scale-90`}
              style={{
                borderColor: `${safeColor}60`,
                color: `${safeColor}cc`,
              }}
              title="Attach file"
              onClick={onAttachClick}
            >
              <Icon name="Import" size={15} variant="BoldDuotone" className="sm:w-[13px] sm:h-[13px]" />
            </button>

            {/* Camera/Vision Toggle */}
            <button
              type="button"
              onClick={onToggleEye}
              className={`
                p-1 sm:p-1.5 rounded-md border transition-all
                ${
                  isEyeActive
                    ? "text-white bg-white/10 shadow-lg"
                    : "hover:text-white hover:bg-white/5"
                }
                active:scale-90
                relative
              `}
              style={{
                color: isEyeActive ? safeColor : `${safeColor}cc`,
                borderColor: isEyeActive ? `${safeColor}b3` : `${safeColor}60`,
              }}
              title={
                isEyeActive ? "Disable Vision" : "Enable Vision (Luca Eye)"
              }
            >
              <Icon
                name="Monitor"
                size={15}
                variant="BoldDuotone"
                className={`sm:w-[13px] sm:h-[13px] ${
                  isEyeActive ? "animate-pulse" : ""
                }`}
              />
              {/* Active indicator */}
              {isEyeActive && (
                <span
                  className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full animate-ping"
                  style={{ backgroundColor: safeColor }}
                />
              )}
            </button>

            {/* Screen Share (Monitor) */}
            {onScreenShare && (
              <button
                type="button"
                onClick={onScreenShare}
                className={`p-1 sm:p-1.5 transition-all rounded-md border ${isLight ? "hover:bg-gray-100" : "hover:bg-white/5"} active:scale-90`}
                style={{
                  borderColor: `${safeColor}60`,
                  color: `${safeColor}cc`,
                }}
                title="Share Screen"
              >
                <Icon name="Monitor" size={15} variant="BoldDuotone" className="sm:w-[13px] sm:h-[13px]" />
              </button>
            )}

            {/* Status Indicators (RELOCATED LEFT) */}
            <div className="hidden sm:flex items-center gap-1 ml-1">
              {persona === "ENGINEER" && (
                <>
                  <div
                    className="flex items-center gap-1 text-[10px] sm:text-[11px] font-mono text-rq-green bg-rq-green-dim/10 px-1.5 rounded-md border h-[24px] sm:h-[27px] max-w-[100px] overflow-hidden"
                    style={{ borderColor: `${safeColor}40` }}
                  >
                    <Icon name="Folder" size={12} variant="BoldDuotone" className="opacity-80" />
                    <span className="opacity-40 text-[9px]">CWD:</span>
                    <span className="font-bold truncate uppercase">
                      {currentCwd || "ROOT"}
                    </span>
                  </div>
                  <div
                    className={`flex items-center gap-1 text-[10px] sm:text-[11px] font-mono px-1.5 rounded-md border h-[24px] sm:h-[27px] ${
                      isKernelLocked
                        ? isLight 
                          ? "text-gray-400 bg-gray-100 border-gray-200"
                          : "text-slate-500 bg-slate-900/40 border-slate-800"
                        : "text-rq-red bg-rq-red-dim/10 border-rq-red/20 animate-pulse"
                    }`}
                  >
                    <Icon name="Lock" size={12} variant="BoldDuotone" className="opacity-80" />
                    <span className="font-bold uppercase whitespace-nowrap">
                      {isKernelLocked ? "LOCKED" : "WRITE: ON"}
                    </span>
                  </div>
                </>
              )}
              {persona === "HACKER" && (
                <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono text-green-500 bg-green-950/10 px-2 rounded-md border border-green-500/20 h-[24px] sm:h-[27px]">
                  <Icon name="Shield" size={12} variant="BoldDuotone" className="opacity-80" />
                  <span className="opacity-40 text-[9px]">OPSEC:</span>
                  <span className="font-bold uppercase">
                    {opsecStatus || "ACTIVE"}
                  </span>
                </div>
              )}
            </div>

            {/* Active MCP indicator — single smart pill */}
            {activeMcpServers.length > 0 && (() => {
              const connected = activeMcpServers.filter(s => s.status === "connected");
              const isAnyConnected = connected.length > 0;
              
              const label = !isAnyConnected
                ? "OFFLINE"
                : connected.length === 1
                  ? connected[0].name.toUpperCase()
                  : `${connected.length} MCP`;

              return (
                <div className="hidden sm:flex items-center relative group/mcp ml-1">
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent("luca:open-settings", { detail: { tab: "mcp" } }))}
                    className="flex items-center gap-1 text-[10px] sm:text-[11px] font-mono px-1.5 rounded-md border h-[24px] sm:h-[27px] transition-all hover:opacity-80 active:scale-95"
                    style={{
                      borderColor: isAnyConnected ? `${safeColor}40` : isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)",
                      color: isAnyConnected ? safeColor : isLight ? "#94a3b8" : "#475569",
                      backgroundColor: isAnyConnected ? `${safeColor}10` : "transparent",
                    }}
                    title={`MCP: ${activeMcpServers.length} configured — ${connected.length} active`}
                  >
                    <Icon name="Plug" size={10} variant="BoldDuotone" className={`opacity-70 flex-shrink-0 ${!isAnyConnected ? "grayscale" : ""}`} />
                    <span className={`font-bold truncate max-w-[72px] ${!isAnyConnected ? "opacity-60" : ""}`}>{label}</span>
                    {isAnyConnected && connected.length > 1 && (
                      <span
                        className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0"
                        style={{ backgroundColor: safeColor }}
                      />
                    )}
                  </button>

                  {/* Hover popover — lists all servers */}
                  <div
                    className={`
                      absolute bottom-full left-0 mb-2 z-50
                      min-w-[180px] rounded-xl border shadow-2xl
                      py-2 px-0
                      opacity-0 group-hover/mcp:opacity-100
                      pointer-events-none group-hover/mcp:pointer-events-auto
                      translate-y-1 group-hover/mcp:translate-y-0
                      transition-all duration-200
                      ${isLight ? "bg-white border-black/10 text-slate-700" : "bg-[#13131f] border-white/10 text-gray-300"}
                    `}
                  >
                    <div className="flex items-center justify-between px-3 pb-2 border-b border-white/5 mb-1">
                      <p className={`text-[9px] font-black uppercase tracking-widest ${isLight ? "text-slate-400" : "text-gray-500"}`}>
                        MCP Node Hub
                      </p>
                    </div>
                    <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                      {activeMcpServers.map(s => {
                        const isConnected = s.status === "connected";
                        return (
                          <div key={s.id} className={`flex items-center justify-between gap-3 px-3 py-1.5 transition-colors ${isLight ? "hover:bg-slate-50" : "hover:bg-white/5"}`}>
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isConnected ? "bg-green-400 animate-pulse" : "bg-gray-500"}`} />
                              <span className={`text-[11px] font-mono font-bold truncate ${!isConnected ? "opacity-50" : ""}`}>{s.name}</span>
                            </div>
                            
                            {/* Actions — Toggle Connect/Disconnect */}
                            <div className="flex items-center gap-1 opacity-40 hover:opacity-100 transition-opacity">
                              {isConnected ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDisconnectMcp?.(s.id);
                                  }}
                                  className="p-1 rounded-md hover:bg-red-500/20 text-red-400/80 hover:text-red-400 transition-all active:scale-90"
                                  title="Disconnect server"
                                >
                                  <Icon name="Power" size={10} variant="BoldDuotone" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onConnectMcp?.(s.id);
                                  }}
                                  className="p-1 rounded-md hover:bg-green-500/20 text-green-400/80 hover:text-green-400 transition-all active:scale-90"
                                  title="Connect server"
                                >
                                  <Icon name="Play" size={10} variant="BoldDuotone" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-1 pt-1 border-t border-white/5 px-2">
                       <button
                         onClick={() => window.dispatchEvent(new CustomEvent("luca:open-settings", { detail: { tab: "mcp" } }))}
                         className={`w-full text-center py-1 text-[8px] font-bold uppercase tracking-widest hover:underline ${isLight ? "text-slate-400" : "text-gray-500"}`}
                       >
                         Manage All Nodes
                       </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
          
       
          {/* Right: Voice & Send */}
          <div
            className="flex items-center gap-1 sm:gap-1 pointer-events-auto"
            style={{ WebkitAppRegion: "no-drag" } as any}
          >
            {/* Voice Toggle */}
            <button
              type="button"
              onClick={onToggleVoice}
              className={`
                 p-1 sm:p-1.5 rounded-md border transition-all
                 ${
                   isVoiceActive
                     ? isSpeaking
                       ? "bg-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                       : "text-white bg-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                     : "hover:text-white hover:bg-white/5"
                 }
                 active:scale-90
                 relative
               `}
              style={{
                borderColor: isVoiceActive
                  ? isSpeaking
                    ? `${safeColor}b3`
                    : "rgba(239, 68, 68, 0.5)"
                  : `${safeColor}60`,
                color: isVoiceActive
                  ? isSpeaking
                    ? safeColor
                    : undefined
                  : `${safeColor}cc`,
              }}
              title={isVoiceActive ? "Stop Voice Mode" : "Start Voice Mode"}
            >
              {isVoiceActive ? (
                isSpeaking ? (
                  <Icon
                    name="Microphone"
                    size={15}
                    variant="BoldDuotone"
                    className="sm:w-[13px] sm:h-[13px] animate-pulse"
                    style={{
                      transform: `scale(${1 + (amplitude / 255) * 0.5})`,
                    }}
                  />
                ) : (
                  <Icon
                    name="Microphone"
                    size={15}
                    variant="BoldDuotone"
                    className="sm:w-[13px] sm:h-[13px] animate-pulse text-red-400"
                  />
                )
              ) : (
                <Icon name="Microphone" size={15} variant="BoldDuotone" className="sm:w-[13px] sm:h-[13px] opacity-50" />
              )}
              {isSpeaking && (
                <span
                  className="absolute inset-0 rounded-md animate-ping opacity-20"
                  style={{ backgroundColor: safeColor }}
                />
              )}
            </button>

            {/* Send / Stop Button */}
            <button
              type="button"
              onClick={(e) => {
                if (isProcessing) {
                  onStop?.();
                  return;
                }
                if (input.trim() || attachment) {
                  onSubmit(e as any);
                }
              }}
              disabled={!input.trim() && !attachment && !isProcessing}
              className={`
              pointer-events-auto
              p-1 sm:p-1.5
              rounded-md border
              transition-all duration-200
              ${
                isProcessing
                  ? "bg-red-500 border-red-500 text-red-100 shadow-[0_0_20px_rgba(239,68,68,0.6)] animate-pulse hover:bg-red-600 active:scale-95"
                  : input.trim() || attachment
                    ? "text-white hover:text-white/80 hover:bg-white/5 active:scale-90"
                    : `${isLight ? "text-gray-400" : "text-slate-600"} cursor-not-allowed`}
              }
            `}
              style={
                (!isProcessing
                  ? {
                      WebkitAppRegion: "no-drag",
                      borderColor: `${safeColor}${
                        input.trim() || attachment ? "b3" : "60"
                      }`,
                      color:
                        input.trim() || attachment
                          ? safeColor
                          : `${safeColor}cc`,
                    }
                  : { WebkitAppRegion: "no-drag" }) as any
              }
              title={
                isProcessing
                  ? "Stop generation"
                  : input.trim() || attachment
                    ? "Send message (Enter)"
                    : "Type a message"
              }
            >
              {isProcessing ? (
                <Icon
                  name="StopCircle"
                  size={15}
                  variant="BoldDuotone"
                  className="sm:w-[13px] sm:h-[13px]"
                />
              ) : (
                <Icon name="Send" size={15} variant="BoldDuotone" className="sm:w-[13px] sm:h-[13px]" />
              )}
            </button>
          </div>
        </div>

        {/* Focus Glow Effect */}
        <div
          className="absolute inset-0 rounded-md opacity-0 focus-within:opacity-100 transition-opacity pointer-events-none -z-10"
          style={{
            boxShadow: `0 0 0 1px ${safeColor}33, 0 0 20px ${safeColor}22`,
          }}
        />
      </div>
    </div>
  );
};

export default ChatWidgetInput;
