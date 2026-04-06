import React from "react";
import HologramScene from "./HologramScene";
import { ContextCard } from "../../services/ContextCardService";
import { PERSONA_UI_CONFIG } from "../../config/themeColors";
import {
  translationService,
  TranslationMode,
  TranslationState,
} from "../../services/TranslationService";
import { MissionScope } from "../../services/toolRegistry";
import { MISSION_COLORS } from "../../config/themeColors";
import { eventBus } from "../../services/eventBus";
import { Icon } from "../ui/Icon";

interface TranslationResult {
  originalText: string;
  translatedText: string;
  speaker: "user" | "model";
  mode: TranslationMode;
  timestamp: number;
}

interface HologramWidgetProps {
  isVoiceActive: boolean;
  isMicOpen: boolean;
  transcript: string;
  transcriptSource: "user" | "model";
  isSpeaking: boolean;
  audioLevel: number;
  primaryColor?: string;
  persona?: string;
  propIntent?: string | null;
  elevationState?: {
    lastScanTimestamp: number;
    authorizedMissionIds: Set<string>;
    activeMissionScope: MissionScope;
  };
  onClick?: () => void;
}

const HologramWidget: React.FC<HologramWidgetProps> = ({
  isVoiceActive,
  isMicOpen,
  transcript,
  transcriptSource,
  isSpeaking,
  audioLevel,
  primaryColor: propColor,
  persona = "ASSISTANT",
  propIntent,
  elevationState,
  onClick,
}) => {
  const activeConfig = PERSONA_UI_CONFIG[persona] || PERSONA_UI_CONFIG.DEFAULT;
  const primaryColor = propColor || activeConfig.hex;
  const [isVisionActive, setIsVisionActive] = React.useState(false);
  const [isVisualCoreActive, setIsVisualCoreActive] = React.useState(false);
  const [ipcIntent, setIpcIntent] = React.useState<string | null>(null);

  const displayIntent = propIntent || ipcIntent;

  const toggleVisualCore = () => {
    if (window.electron?.ipcRenderer) {
      if (isVisualCoreActive) {
        window.electron.ipcRenderer.send("close-visual-core");
      } else {
        window.electron.ipcRenderer.send("open-visual-core");
      }
    }
  };

  const handleExpand = () => {
    window.electron?.ipcRenderer?.send("expand-dashboard");
  };

  React.useEffect(() => {
    if (window.electron && window.electron.ipcRenderer) {
      const removeVision = window.electron.ipcRenderer.on(
        "vision-status",
        (data: { active: boolean }) => {
          setIsVisionActive(data.active);
        },
      );
      const removeIntent = window.electron.ipcRenderer.on(
        "hologram-intent",
        (intent: string) => {
          setIpcIntent(intent);
        },
      );
      const removeVisualStatus = window.electron.ipcRenderer.on(
        "hologram-visual-status",
        (payload: { isVisible: boolean }) => {
          setIsVisualCoreActive(payload.isVisible);
        },
      );
      return () => {
        if (removeVision) removeVision();
        if (removeIntent) removeIntent();
        if (removeVisualStatus) removeVisualStatus();
      };
    }
  }, []);

  // Clear intent when transcript starts coming from model
  React.useEffect(() => {
    if (transcriptSource === "model" && transcript.length > 0) {
      setIpcIntent(null);
    }
  }, [transcript, transcriptSource]);

  return (
    <HologramWidgetImplementation
      isVoiceActive={isVoiceActive}
      isMicOpen={isMicOpen}
      transcript={transcript}
      transcriptSource={transcriptSource}
      isSpeaking={isSpeaking}
      audioLevel={audioLevel}
      primaryColor={primaryColor}
      persona={persona}
      onClick={onClick}
      isVisionActive={isVisionActive}
      intent={displayIntent}
      elevationState={elevationState}
      isVisualCoreActive={isVisualCoreActive}
      onToggleHUD={toggleVisualCore}
      onExpand={handleExpand}
    />
  );
};

const TypewriterText = ({ text }: { text: string }) => {
  const [displayedText, setDisplayedText] = React.useState("");

  React.useEffect(() => {
    setDisplayedText("");
    let i = 0;
    const interval = setInterval(() => {
      setDisplayedText(text.substring(0, i + 1));
      i++;
      if (i >= text.length) clearInterval(interval);
    }, 40);
    return () => clearInterval(interval);
  }, [text]);

  return <span>{displayedText}</span>;
};

const ContextButton = ({
  card,
  index,
  primaryColor,
  persona,
}: {
  card: ContextCard;
  index: number;
  primaryColor: string;
  persona: string;
}) => {
  const activeConfig = PERSONA_UI_CONFIG[persona] || PERSONA_UI_CONFIG.DEFAULT;
  const glowRaw = activeConfig.glow || `shadow-[0_0_20px_${primaryColor}]`;
  const shadowValue = glowRaw.match(/shadow-\[(.*)\]/)?.[1] || "none";

  const positions = [
    { top: "50%", right: "-30px", transform: "translateY(-50%)" },
    { top: "50%", left: "-30px", transform: "translateY(-50%)" },
    { top: "-40px", left: "50%", transform: "translateX(-50%)" },
    { bottom: "-40px", left: "50%", transform: "translateX(-50%)" },
    { top: "20px", right: "-20px" },
  ];

  const pos = positions[index] || positions[0];

  return (
    <div
      className="absolute z-20 transition-all duration-700 animate-in fade-in zoom-in slide-in-from-bottom-2"
      style={pos as any}
    >
      <button
        className="pointer-events-auto px-4 py-2 rounded-xl glass-blur flex items-center gap-3 group/card transition-all duration-300 hover:scale-105"
        style={{
          border: `1px solid ${primaryColor}66`,
          backgroundColor: `${activeConfig.bg ? "transparent" : `${primaryColor}15`}`,
          boxShadow: shadowValue,
        }}
      >
        <div className="relative">
          <div
            className="w-2 h-2 rounded-full animate-ping absolute inset-0"
            style={{ backgroundColor: primaryColor, opacity: 0.4 }}
          />
          <div
            className="w-2 h-2 rounded-full relative z-10"
            style={{ backgroundColor: primaryColor }}
          />
        </div>
        <div className="flex flex-col items-start leading-tight">
          <span
            className="text-[7px] font-black tracking-[0.2em] opacity-60 uppercase"
            style={{ color: primaryColor }}
          >
            {card.type}
          </span>
          <span className="text-[11px] font-mono font-medium tracking-tight text-white/90">
            {card.label}
          </span>
        </div>
      </button>
    </div>
  );
};

const TranslationControlBar = ({
  state,
  primaryColor,
  onMonitorToggle,
  onFullscreenToggle,
  isVisualCoreActive,
  onToggle,
}: {
  state: TranslationState;
  primaryColor: string;
  onMonitorToggle?: () => void;
  onFullscreenToggle?: () => void;
  isVisualCoreActive?: boolean;
  onToggle?: () => void;
}) => {
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const [showHelp, setShowHelp] = React.useState(false);
  const hideTimeoutRef = React.useRef<any>(null);

  const setHoveredStatus = (desc: string | null) => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    if (desc) {
      setStatusMessage(desc);
    } else {
      hideTimeoutRef.current = setTimeout(() => {
        setStatusMessage(null);
        setShowHelp(false);
      }, 350);
    }
  };

  const controls = [
    {
      id: TranslationMode.OFF,
      icon: "Power",
      x: 30,
      y: 178,
      type: "MODE",
      desc: "TOGGLE <ON /OFF",
      info: "Privacy: All translation and transcription services are paused.",
    },
    {
      id: TranslationMode.ONE_WAY,
      icon: "Mic",
      x: 58,
      y: 191,
      type: "MODE",
      desc: "1-WAY TRANSLATE",
      info: "Translates one source into your primary language.",
    },
    {
      id: TranslationMode.INTERPRETER,
      icon: "Languages",
      x: 86,
      y: 199,
      type: "MODE",
      desc: "INTERPRETER MODE",
      info: "Bilingual: Translates both directions of a conversation.",
    },
    {
      id: TranslationMode.TRANSCRIBE,
      icon: "FileText",
      x: 114,
      y: 199,
      type: "MODE",
      desc: "LIVE TRANSCRIPT",
      info: "No translation: Records a real-time text transcript of audio.",
    },
    {
      id: "MONITOR",
      icon: "Monitor",
      x: 142,
      y: 191,
      type: "ACTION",
      desc: "SMART SCREEN",
      info: "HUD Vision: Mirror a specific screen or window into the HUD.",
      onClick: onMonitorToggle,
    },
    {
      id: "EXPAND",
      icon: "Maximize",
      x: 170,
      y: 178,
      type: "ACTION",
      desc: "DASHBOARD",
      info: "System Core: Expand to the full LUCA management console.",
      onClick: onFullscreenToggle,
    },
  ];

  const activeControl = controls.find(c => c.desc === statusMessage);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible">
      <div className="relative w-full h-full">
        {/* HUD STATUS READOUT */}
        <div
          onPointerEnter={() => setHoveredStatus(statusMessage)}
          onPointerLeave={() => setHoveredStatus(null)}
          className={`absolute top-[220px] left-1/2 -translate-x-1/2 transition-all duration-300 pointer-events-auto z-50 ${
            statusMessage
              ? "opacity-100 translate-y-0 scale-100"
              : "opacity-0 translate-y-2 scale-95"
          }`}
        >
          {/* INFO CARD (Fades in when hovering the ?) */}
          <div className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 transition-all duration-500 w-[220px] ${
            showHelp ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-2 scale-95 pointer-events-none'
          }`}>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px]"
                 style={{ borderBottomColor: `${primaryColor}66` }} />
            <div className="bg-black/95 glass-blur p-4 rounded-2xl shadow-2xl relative"
                 style={{ border: `1px solid ${primaryColor}66`, boxShadow: `0 8px 32px ${primaryColor}33` }}>
              <p className="text-[10px] font-mono leading-relaxed text-white/90 text-center">
                {activeControl?.info}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 glass-blur group/readout cursor-default"
               style={{ border: `1px solid ${primaryColor}44`, boxShadow: `0 0 15px ${primaryColor}22` }}>
            <div 
              onPointerEnter={() => setShowHelp(true)}
              onPointerLeave={() => setShowHelp(false)}
              className="pointer-events-auto cursor-help transition-all duration-300 hover:scale-110 opacity-40 hover:opacity-100 w-6 h-6 flex items-center justify-center shrink-0"
              style={{ color: primaryColor }}
            >
              <Icon name="HelpCircle" size={10} />
            </div>
            
            <div
              className="text-[8px] font-black tracking-[0.2em] uppercase whitespace-nowrap"
              style={{ color: primaryColor }}
            >
              {statusMessage}
            </div>
          </div>
        </div>

        {controls.map((m) => {
          const isActive =
            m.type === "MODE"
              ? state.mode === m.id
              : m.id === "MONITOR"
                ? isVisualCoreActive
                : false;

          return (
            <button
              key={m.id}
              onPointerEnter={() => setHoveredStatus(m.desc)}
              onPointerLeave={() => setHoveredStatus(null)}
              onClick={() => {
                if (m.id === TranslationMode.OFF) {
                  onToggle?.();
                } else if (m.type === "MODE") {
                  translationService.setMode(m.id as TranslationMode);
                } else {
                  m.onClick?.();
                }
              }}
              className={`absolute pointer-events-auto w-7 h-7 rounded-full glass-blur flex items-center justify-center transition-all duration-300 transform -translate-x-1/2 -translate-y-1/2 ${
                isActive
                  ? "scale-110"
                  : "opacity-60 hover:opacity-100 hover:scale-105"
              }`}
              style={{
                left: `${m.x}px`,
                top: `${m.y}px`,
                boxShadow: isActive ? `0 0 15px ${primaryColor}66` : "none",
                border: isActive ? `1px solid ${primaryColor}` : `1px solid ${primaryColor}66`,
                backgroundColor: isActive ? `${primaryColor}40` : `${primaryColor}1A`,
                color: isActive ? "#ffffff" : primaryColor,
              }}
            >
              <Icon name={m.icon as string} size={12} />
            </button>
          );
        })}
      </div>
    </div>
  );
};

const HologramWidgetImplementation = ({
  isVoiceActive,
  audioLevel,
  primaryColor,
  persona,
  onClick,
  isVisionActive,
  transcript,
  transcriptSource,
  intent,
  elevationState,
  isVisualCoreActive,
  onToggleHUD,
  onExpand,
}: any) => {
  const [cards, setCards] = React.useState<ContextCard[]>([]);
  const [translationState, setTranslationState] =
    React.useState<TranslationState>(translationService.getState());
  const [translations, setTranslations] = React.useState<TranslationResult[]>(
    [],
  );
  const [localStatus, setLocalStatus] = React.useState<string | null>(null);

  React.useEffect(() => {
    const handleTranslationResult = (res: any) => {
      setTranslations((prev) => [
        ...prev.slice(-2),
        { ...res, timestamp: Date.now() },
      ]);
    };
    const handleStateChange = (state: TranslationState) => {
      setTranslationState(state);
    };
    const handleCards = (newCards: ContextCard[]) => {
      setCards(newCards);
    };
    const handleWakeWord = () => {
      setLocalStatus("LISTENING...");
    };
    const handleVoiceStatus = (data: { status: string }) => {
      setLocalStatus(data.status.toUpperCase());
    };

    eventBus.on("translation-result", handleTranslationResult);
    eventBus.on("translation-state-changed", handleStateChange);
    eventBus.on("context-cards-updated", handleCards);
    eventBus.on("wake-word-triggered", handleWakeWord);
    eventBus.on("voice-status-update", handleVoiceStatus);

    return () => {
      eventBus.off("translation-result", handleTranslationResult);
      eventBus.off("translation-state-changed", handleStateChange);
      eventBus.off("context-cards-updated", handleCards);
      eventBus.off("wake-word-triggered", handleWakeWord);
      eventBus.off("voice-status-update", handleVoiceStatus);
    };
  }, []);

  React.useEffect(() => {
    if (transcript && transcript.length > 0) {
      setLocalStatus(null);
    }
  }, [transcript]);

  const activeScope = elevationState?.activeMissionScope;
  const hasMission = activeScope && activeScope !== MissionScope.NONE;

  let missionColor = primaryColor;
  if (hasMission) {
    let colorKey: keyof typeof MISSION_COLORS = "FULL";
    if (activeScope === MissionScope.FILE) colorKey = "FILE";
    else if (activeScope === MissionScope.FINANCE) colorKey = "FINANCE";
    else if (activeScope === MissionScope.SOCIAL) colorKey = "SOCIAL";
    else if (activeScope === MissionScope.SYSTEM) colorKey = "SYSTEM";
    else if (activeScope === MissionScope.FULL) colorKey = "FULL";
    missionColor = MISSION_COLORS[colorKey];
  }

  const displayCards = [...cards];
  if (hasMission) {
    displayCards.unshift({
      id: "mission-active-card",
      type: "MISSION_ACTIVE",
      label: activeScope,
      metadata: { mission: activeScope },
    } as any);
  }
  const [position, setPosition] = React.useState({
    x: Math.max(20, window.innerWidth - 220),
    y: Math.max(20, window.innerHeight - 300),
  });

  const hasDragged = React.useRef(false);
  const isDragging = React.useRef(false);
  const dragStart = React.useRef({ x: 0, y: 0 });
  const initialPos = React.useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: any) => {
    isDragging.current = true;
    hasDragged.current = false;
    const clientX = e.clientX || e.nativeEvent?.clientX || 0;
    const clientY = e.clientY || e.nativeEvent?.clientY || 0;

    dragStart.current = { x: clientX, y: clientY };
    initialPos.current = { x: position.x, y: position.y };

    document.body.style.userSelect = "none";
  };

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent | PointerEvent) => {
      if (!isDragging.current) return;
      const dist = Math.hypot(
        e.clientX - dragStart.current.x,
        e.clientY - dragStart.current.y,
      );
      if (dist > 5) hasDragged.current = true;
      const isHologramMode = window.location.search.includes("mode=hologram");
      if (isHologramMode) {
        const targetX = e.screenX - dragStart.current.x;
        const targetY = e.screenY - dragStart.current.y;
        if (window.electron && window.electron.ipcRenderer) {
          window.electron.ipcRenderer.send("set-window-position", {
            x: targetX,
            y: targetY,
          });
        }
      } else {
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        setPosition({
          x: initialPos.current.x + dx,
          y: initialPos.current.y + dy,
        });
      }
    };
    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.userSelect = "auto";
    };
    window.addEventListener("pointermove", handleMouseMove);
    window.addEventListener("pointerup", handleMouseUp);
    return () => {
      window.removeEventListener("pointermove", handleMouseMove);
      window.removeEventListener("pointerup", handleMouseUp);
    };
  }, []);

  if (!isVoiceActive) return null;

  const isHologramMode =
    typeof window !== "undefined" &&
    window.location.search.includes("mode=hologram");
  const containerStyle = isHologramMode
    ? { top: 0, left: 0 }
    : { top: position.y, left: position.x };

  return (
    <div
      className="fixed z-50 select-none pointer-events-none"
      style={containerStyle}
    >
      <div className="relative w-[280px] h-[350px] flex flex-col items-center justify-center group gap-2">
        {/* TOP RIGHT GHOST CONTROLS */}

        <div className="w-full min-h-[100px] flex flex-col items-center justify-end px-4 text-center pointer-events-none relative">
          {(intent || localStatus) && !transcript && !translations.length && (
            <div
              className={`text-[10px] font-mono tracking-[0.2em] uppercase ${hasMission || localStatus ? "animate-pulse" : ""} mb-1`}
              style={{ color: missionColor }}
            >
              [{hasMission ? `ARMED: ${activeScope}` : localStatus || intent}]
            </div>
          )}
          <div className="flex flex-col gap-1 mb-2">
            {translations
              .filter((t) => t.speaker === "model")
              .map((t, i, filtered) => (
                <div
                  key={t.timestamp}
                  className={`transition-all duration-500 animate-in fade-in slide-in-from-bottom-1 ${
                    i === filtered.length - 1
                      ? "opacity-100 scale-100"
                      : "opacity-40 scale-95"
                  }`}
                >
                  <div
                    className="text-[9px] font-mono uppercase tracking-tighter opacity-50 mb-0.5"
                    style={{ color: missionColor }}
                  >
                    {t.mode === TranslationMode.TRANSCRIBE
                      ? "Live Text"
                      : `${t.speaker} Transl.`}
                  </div>
                  <div className="text-[13px] font-medium tracking-tight text-white drop-shadow-lg leading-tight">
                    {t.translatedText}
                  </div>
                  {t.mode !== TranslationMode.TRANSCRIBE && (
                    <div className="text-[10px] italic opacity-40 text-white/80 line-clamp-1">
                      {t.originalText}
                    </div>
                  )}
                </div>
              ))}
          </div>
          {transcriptSource === "model" &&
            transcript &&
            !translations.length && (
              <div className="text-sm font-medium tracking-wide drop-shadow-md text-white leading-tight">
                <TypewriterText text={transcript} />
              </div>
            )}
        </div>

        <div className="w-[200px] h-[200px] relative z-20 scale-100 origin-bottom transition-transform duration-300 pointer-events-none">
          {/* Isolate the canvas clip path so it doesn't crop out the UI icons */}
          <div 
            className="absolute inset-0 pointer-events-auto cursor-grab active:cursor-grabbing" 
            style={{ clipPath: "circle(45% at 50% 50%)" }}
            onPointerDown={handleMouseDown}
          >
            <HologramScene
              color={missionColor}
              audioLevel={audioLevel}
              isVisionActive={isVisionActive}
              onDragStart={handleMouseDown}
            />
          </div>
          {displayCards.map((card, idx) => (
            <ContextButton
              key={card.id}
              card={card}
              index={idx}
              primaryColor={
                card.type === "MISSION_ACTIVE" ? missionColor : primaryColor
              }
              persona={persona}
            />
          ))}

          {/* CURVED HUD CONTROLS - Anchored to the center of the hologram scene */}
          <div className="absolute inset-0 pointer-events-none transition-all duration-500 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 z-50">
            <TranslationControlBar
              state={translationState}
              primaryColor={missionColor}
              onMonitorToggle={onToggleHUD}
              onFullscreenToggle={onExpand}
              isVisualCoreActive={isVisualCoreActive}
              onToggle={onClick}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HologramWidget;
