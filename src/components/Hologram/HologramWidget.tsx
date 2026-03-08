import React from "react";
import HologramScene from "./HologramScene";

interface HologramWidgetProps {
  isVoiceActive: boolean;
  isMicOpen: boolean;
  transcript: string;
  isSpeaking: boolean;
  audioLevel: number;
  primaryColor?: string;
  onClick?: () => void;
}

const HologramWidget: React.FC<HologramWidgetProps> = ({
  isVoiceActive,
  isMicOpen,
  transcript,
  isSpeaking,
  audioLevel,
  primaryColor = "#3b82f6",
  onClick,
}) => {
  const [isVisionActive, setIsVisionActive] = React.useState(false);

  React.useEffect(() => {
    if (window.electron && window.electron.ipcRenderer) {
      const removeVision = window.electron.ipcRenderer.on(
        "vision-status",
        (data: { active: boolean }) => {
          setIsVisionActive(data.active);
        },
      );
      return () => {
        if (removeVision) removeVision();
      };
    }
  }, []);

  return (
    <HologramWidgetImplementation
      isVoiceActive={isVoiceActive}
      isMicOpen={isMicOpen}
      transcript={transcript}
      isSpeaking={isSpeaking}
      audioLevel={audioLevel}
      primaryColor={primaryColor}
      onClick={onClick}
      isVisionActive={isVisionActive}
    />
  );
};

const HologramWidgetImplementation = ({
  isVoiceActive,
  audioLevel,
  primaryColor,
  onClick,
  isVisionActive,
}: any) => {
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
      className="fixed z-50 cursor-grab active:cursor-grabbing"
      style={containerStyle}
      onPointerDown={handleMouseDown}
    >
      <div className="relative w-[200px] h-[270px] flex items-end justify-center group">
        <div className="w-full h-full relative z-10 scale-100 origin-bottom transition-transform duration-300 pointer-events-auto">
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
        </div>

        <div
          className="absolute bottom-6 right-6 w-28 h-28 rounded-full blur-[45px] -z-10 transition-opacity duration-100"
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
