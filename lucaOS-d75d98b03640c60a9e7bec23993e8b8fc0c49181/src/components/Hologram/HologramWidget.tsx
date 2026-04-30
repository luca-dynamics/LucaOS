import React from "react";
import HologramScene from "./HologramScene";
import { eventBus } from "../../services/eventBus";
import { ContextCard } from "../../services/ContextCardService";
import { PERSONA_UI_CONFIG } from "../../config/themeColors";
import {
  translationService,
  TranslationMode,
  TranslationState,
} from "../../services/TranslationService";

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
  intent?: string | null;
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
  intent: propIntent,
  onClick,
}) => {
  const activeConfig = PERSONA_UI_CONFIG[persona] || PERSONA_UI_CONFIG.DEFAULT;
  const primaryColor = propColor || activeConfig.hex;
  const [isVisionActive, setIsVisionActive] = React.useState(false);
  const [ipcIntent, setIpcIntent] = React.useState<string | null>(null);

  const displayIntent = propIntent || ipcIntent;

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
      return () => {
        if (removeVision) removeVision();
        if (removeIntent) removeIntent();
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
  // Extract CSS value from shadow-[]
  const shadowValue = glowRaw.match(/shadow-\[(.*)\]/)?.[1] || "none";

  // Positions around the face (assuming 200x200 center)
  const positions = [
    { top: "50%", right: "-30px", transform: "translateY(-50%)" }, // Right Edge
    { top: "50%", left: "-30px", transform: "translateY(-50%)" }, // Left Edge
    { top: "-40px", left: "50%", transform: "translateX(-50%)" }, // Top Edge
    { bottom: "-40px", left: "50%", transform: "translateX(-50%)" }, // Bottom Edge
    { top: "20px", right: "-20px" }, // Top-Right Offset
  ];

  const pos = positions[index] || positions[0];

  return (
    <div
      className="absolute z-20 transition-all duration-700 animate-in fade-in zoom-in slide-in-from-bottom-2"
      style={pos}
    >
      <button
        className="px-4 py-2 rounded-xl border backdrop-blur-xl flex items-center gap-3 group/card transition-all duration-300 hover:scale-105"
        style={{
          borderColor: `${primaryColor}66`,
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
}: {
  state: TranslationState;
  primaryColor: string;
}) => {
  const modes = [
    { id: TranslationMode.OFF, label: "OFF", icon: "󰂭" },
    { id: TranslationMode.ONE_WAY, label: "1-WAY", icon: "󰗊" },
    { id: TranslationMode.INTERPRETER, label: "INT", icon: "󰗋" },
    { id: TranslationMode.TRANSCRIBE, label: "TX", icon: "󰙶" },
  ];

  return (
    <div
      className="flex items-center gap-1 p-1 rounded-full border backdrop-blur-2xl bg-black/20"
      style={{ borderColor: `${primaryColor}33` }}
    >
      {modes.map((m) => (
        <button
          key={m.id}
          onClick={() => translationService.setMode(m.id)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold tracking-widest transition-all duration-300 ${
            state.mode === m.id
              ? "text-white"
              : "text-white/40 hover:text-white/70"
          }`}
          style={{
            backgroundColor: state.mode === m.id ? primaryColor : "transparent",
            boxShadow:
              state.mode === m.id ? `0 0 10px ${primaryColor}66` : "none",
          }}
        >
          <span>{m.icon}</span>
          <span>{m.label}</span>
        </button>
      ))}
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
}: any) => {
  const [cards, setCards] = React.useState<ContextCard[]>([]);
  const [translationState, setTranslationState] =
    React.useState<TranslationState>(translationService.getState());
  const [translations, setTranslations] = React.useState<TranslationResult[]>(
    [],
  );

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
    const handleCards = (data: { cards: ContextCard[] }) => {
      setCards(data.cards);
    };

    eventBus.on("translation-result", handleTranslationResult);
    eventBus.on("translation-state-changed", handleStateChange);
    eventBus.on("context-cards-updated", handleCards);

    return () => {
      eventBus.off("translation-result", handleTranslationResult);
      eventBus.off("translation-state-changed", handleStateChange);
      eventBus.off("context-cards-updated", handleCards);
    };
  }, []);
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

      if (dist > 5) {
        hasDragged.current = true;
      }

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
      className="fixed z-50 cursor-grab active:cursor-grabbing select-none"
      style={containerStyle}
      onPointerDown={handleMouseDown}
    >
      <div className="relative w-[280px] h-[350px] flex flex-col items-center justify-center group gap-2">
        {/* Subtitle / Intent Area */}
        <div className="w-full min-h-[100px] flex flex-col items-center justify-end px-4 text-center pointer-events-none relative">
          {intent && !transcript && !translations.length && (
            <div
              className="text-[10px] font-mono tracking-[0.2em] uppercase animate-pulse mb-1"
              style={{ color: primaryColor }}
            >
              [{intent}]
            </div>
          )}

          {/* Translation Subtitles Overlay */}
          <div className="flex flex-col gap-1 mb-2">
            {translations.map((t, i) => (
              <div
                key={t.timestamp}
                className={`transition-all duration-500 animate-in fade-in slide-in-from-bottom-1 ${
                  i === translations.length - 1
                    ? "opacity-100 scale-100"
                    : "opacity-40 scale-95"
                }`}
              >
                <div
                  className="text-[9px] font-mono uppercase tracking-tighter opacity-50 mb-0.5"
                  style={{ color: primaryColor }}
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

        <div className="w-[200px] h-[200px] relative z-10 scale-100 origin-bottom transition-transform duration-300 pointer-events-auto">
          <HologramScene
            color={primaryColor}
            audioLevel={audioLevel}
            isVisionActive={isVisionActive}
            onClick={() => {
              if (!hasDragged.current) {
                onClick?.();
              }
            }}
            onDragStart={handleMouseDown}
          />

          {/* AI Context Cards (Glassmorphic Buttons) */}
          {cards.map((card, idx) => (
            <ContextButton
              key={card.id}
              card={card}
              index={idx}
              primaryColor={primaryColor}
              persona={persona}
            />
          ))}
        </div>

        <div className="mt-4 pointer-events-auto transition-all duration-500 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0">
          <TranslationControlBar
            state={translationState}
            primaryColor={primaryColor}
          />
        </div>

        <div
          className="absolute bottom-16 right-16 w-32 h-32 rounded-full blur-[50px] -z-10 transition-opacity duration-100"
          style={{
            opacity: (audioLevel / 255) * 0.4,
            backgroundColor: primaryColor,
          }}
        />
      </div>
    </div>
  );
};

export default HologramWidget;
