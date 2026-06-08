import React from "react";
import { Icon } from "../ui/Icon";
// Holographic icon removed in favor of static branding
import AmbientVisionIndicator from "../AmbientVisionIndicator";
import AlwaysOnControls from "../AlwaysOnControls";
import RuntimeStatusChip from "../runtime/RuntimeStatusChip";
import RuntimeContinuityBootstrap from "../runtime/RuntimeContinuityBootstrap";
import { awarenessService } from "../../services/awarenessService";
import { liveService } from "../../services/liveService";
import { soundService } from "../../services/soundService";
import { useCredits } from "../../hooks/useCredits";

interface HeaderProps {
  theme: any;
  persona: string;
  isMobile: boolean;
  // Retained for API compatibility; persona switching now lives in Settings.
  handleCyclePersona: () => void;
  isRebooting: boolean;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  setIsSettingsOpen: (open: boolean) => void;
  isAdminMode: boolean;
  ambientVisionActive: boolean;
  setAmbientVisionActive: (active: boolean) => void;
  showVoiceHud: boolean;
  setAmbientSuggestions: (suggestions: any[]) => void;
  setShowSuggestionChips: (show: boolean) => void;
  hostPlatform: string;
  isListeningAmbient: boolean;
  isProcessing: boolean;
  audioMonitoringActive: boolean;
  setAudioMonitoringActive: (active: boolean) => void;
  setVisionMonitoringActive: (active: boolean) => void;
  isWakeWordActive: boolean;
  isLockdown?: boolean;
  connectionTier?: "LAN" | "LOCAL" | "CLOUD" | "OFFLINE";
  // Future Basic/Pro/Creator separation. Calm by default; Pro/Creator
  // surface more brand identity. Defaults to BASIC until tiers are wired.
  tier?: "BASIC" | "PRO" | "CREATOR";
}

// Tier-aware wordmark. "LUCA" is an acronym, so it stays uppercase as the
// brand name. Basic gets a calm "LUCA OS"; Pro/Creator get the stylized
// dotted "L.U.C.A OS" mark (kept tasteful — no italic, no neon).
function wordmark(tier: "BASIC" | "PRO" | "CREATOR"): {
  text: string;
  stylized: boolean;
} {
  if (tier === "PRO" || tier === "CREATOR") {
    return { text: "L.U.C.A OS", stylized: true };
  }
  return { text: "LUCA OS", stylized: false };
}

function connectionLabel(
  tier: "LAN" | "LOCAL" | "CLOUD" | "OFFLINE",
): string {
  switch (tier) {
    case "LAN":
      return "LAN";
    case "LOCAL":
      return (window as any).luca ? "On device" : "Linked";
    case "CLOUD":
      return "Cloud";
    default:
      return "Offline";
  }
}

const Header: React.FC<HeaderProps> = ({
  theme,
  persona,
  isMobile,
  setIsSettingsOpen,
  isAdminMode,
  ambientVisionActive,
  setAmbientVisionActive,
  showVoiceHud,
  setAmbientSuggestions,
  setShowSuggestionChips,
  hostPlatform,
  isProcessing,
  setAudioMonitoringActive,
  setVisionMonitoringActive,
  isWakeWordActive,
  isLockdown,
  connectionTier = "LOCAL",
  tier = "BASIC",
}) => {
  const credits = useCredits();
  const isLightCream = theme.themeName?.toLowerCase() === "lightcream";
  const brand = wordmark(tier);

  const creditColor =
    credits.status === "CRITICAL"
      ? isLightCream
        ? "#991b1b"
        : "#ef4444"
      : credits.status === "LOW"
        ? isLightCream
          ? "#92400e"
          : "#f59e0b"
        : isLightCream
          ? "#065f46"
          : "#10b981";

  const planLabel = credits.isLocal
    ? "Local"
    : credits.isBYOK
      ? "BYOK"
      : "Prime";

  const connectionColor =
    connectionTier === "OFFLINE"
      ? "var(--app-text-muted, #64748b)"
      : connectionTier === "CLOUD"
        ? isLightCream
          ? "#1e40af"
          : "#3b82f6"
        : isLightCream
          ? "#065f46"
          : "#22c55e";

  const surfaceStyle = {
    backgroundColor: "var(--app-bg-tint, rgba(0, 0, 0, 0.3))",
    borderColor: "var(--app-border-main, rgba(255, 255, 255, 0.1))",
  };

  return (
    <header
      id="app-header"
      className={`${isMobile ? "h-16 px-4" : "h-16 px-6"} glass-blur flex items-center justify-between z-50 transition-all duration-500 relative drag border-b`}
      style={{
        backgroundColor: theme?.isLight
          ? isLightCream
            ? "rgba(229, 225, 205, var(--app-bg-opacity, 0.5))"
            : "rgba(255, 255, 255, var(--app-bg-opacity, 0.5))"
          : "rgba(0, 0, 0, var(--app-bg-opacity, 0.5))",
        borderColor: "var(--app-border-main, rgba(255, 255, 255, 0.08))",
        color: "var(--app-text-main, #ffffff)",
      }}
    >
      <RuntimeContinuityBootstrap />

      {/* Brand */}
      <div className="flex items-center gap-3 app-region-no-drag min-w-0">
        <div
          className={`relative ${
            isMobile ? "w-8 h-8" : "w-9 h-9"
          } group cursor-pointer flex items-center justify-center flex-none`}
          onClick={() => soundService.play("HOVER")}
        >
          <img
            src={
              theme.themeName?.toLowerCase() === "lucagent"
                ? "/icon_dark.png"
                : "/icon.png"
            }
            alt="Luca"
            className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
          />
        </div>
        <h1
          className={`font-display ${
            isMobile ? "text-base" : "text-lg"
          } font-semibold ${
            brand.stylized ? "tracking-[0.18em]" : "tracking-tight"
          } leading-none whitespace-nowrap`}
          style={{ color: "var(--app-text-main, #ffffff)" }}
        >
          {brand.text}
        </h1>

        {isLockdown && (
          <span
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border"
            style={{
              color: isLightCream ? "#92400e" : "#f59e0b",
              borderColor: isLightCream
                ? "rgba(146, 64, 14, 0.3)"
                : "rgba(245, 158, 11, 0.3)",
              backgroundColor: isLightCream
                ? "rgba(146, 64, 14, 0.06)"
                : "rgba(245, 158, 11, 0.1)",
            }}
            title="Lockdown active"
          >
            <Icon name="Lock" size={12} variant="Linear" color="currentColor" />
            Locked
          </span>
        )}
      </div>

      {/* System status + controls */}
      <div className="flex items-center gap-2 sm:gap-3 app-region-no-drag">
        {isProcessing && (
          <span
            className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium"
            style={{ color: "var(--app-text-muted, #94a3b8)" }}
            title="Luca is working"
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: "var(--luca-accent-primary, #3b82f6)" }}
            />
            Working
          </span>
        )}

        {isAdminMode && (
          <span
            className={`${isMobile ? "hidden md:inline-flex" : "inline-flex"} items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border`}
            style={{
              color: isLightCream ? "#991b1b" : "#f87171",
              borderColor: isLightCream
                ? "rgba(153, 27, 27, 0.3)"
                : "rgba(248, 113, 113, 0.3)",
              backgroundColor: isLightCream
                ? "rgba(153, 27, 27, 0.06)"
                : "rgba(248, 113, 113, 0.1)",
            }}
            title="Admin mode active"
          >
            <Icon name="Shield" size={12} variant="Linear" color="currentColor" />
            Admin
          </span>
        )}

        {/* Credits */}
        <div
          className={`${isMobile ? "hidden sm:flex" : "flex"} items-center gap-2 px-3 py-1.5 rounded-full border transition-all cursor-default`}
          style={surfaceStyle}
          title={`Credits${credits.isLocal ? " · running on local models" : credits.isBYOK ? " · using your own API key" : ""}`}
        >
          <Icon
            name="Wallet"
            size={15}
            variant="Linear"
            color={creditColor}
          />
          <span
            className="text-[13px] font-semibold tabular-nums"
            style={{ color: "var(--app-text-main, #ffffff)" }}
          >
            {!isFinite(credits.balance)
              ? "∞"
              : Math.floor(credits.balance).toLocaleString()}
          </span>
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded-md"
            style={{
              color: creditColor,
              backgroundColor: `${creditColor}1a`,
            }}
          >
            {planLabel}
          </span>
        </div>

        {!isMobile && <RuntimeStatusChip compact />}

        {/* Ambient vision toggle */}
        <div className={isMobile ? "hidden sm:block" : "block"}>
          <AmbientVisionIndicator
            active={ambientVisionActive}
            onToggle={() => {
              if (ambientVisionActive) {
                awarenessService.stopAmbientVisionLoop();
                setAmbientVisionActive(false);
              } else {
                awarenessService.startAmbientVisionLoop({
                  mode: showVoiceHud ? "voice" : "text",
                  persona,
                  onScreenCapture: (base64) => {
                    liveService.sendVideoFrame(base64);
                    liveService.sendText(
                      "[AMBIENT VISION] I just scanned the screen. Describe what you see briefly and suggest if there is anything you can help with. Keep it to 1-2 sentences.",
                    );
                  },
                  onSuggestionsUpdate: (suggestions) => {
                    setAmbientSuggestions(suggestions);
                    setShowSuggestionChips(true);
                  },
                  onStatusChange: (active) => setAmbientVisionActive(active),
                });
              }
            }}
            theme={theme}
            isMobile={isMobile}
          />
        </div>

        {/* Always-on monitoring controls */}
        {!isMobile && (
          <AlwaysOnControls
            onVisionToggle={(active) => setVisionMonitoringActive(active)}
            onAudioToggle={(active) => setAudioMonitoringActive(active)}
            isMobile={isMobile}
            isWakeWordActive={isWakeWordActive}
            theme={theme}
          />
        )}

        {/* Connection status */}
        <div
          className="hidden md:flex items-center gap-1.5 text-[11px] font-medium"
          style={{ color: connectionColor }}
          title={`Connection: ${connectionLabel(connectionTier)}${
            hostPlatform
              ? ` · ${hostPlatform.replace(/\(.*\)/, "").trim().split(" ")[0]}`
              : ""
          }`}
        >
          {connectionTier === "OFFLINE" ? (
            <Icon name="CloseCircle" size={14} color="currentColor" />
          ) : connectionTier === "CLOUD" ? (
            <Icon name="Cloud" size={14} color="currentColor" variant="Linear" />
          ) : (
            <Icon name="Server" size={14} color="currentColor" variant="Linear" />
          )}
          <span>{connectionLabel(connectionTier)}</span>
        </div>

        {/* Settings */}
        <button
          type="button"
          onClick={() => setIsSettingsOpen(true)}
          aria-label="Open settings"
          title="Settings"
          className="flex items-center justify-center w-9 h-9 rounded-full border transition-all group app-region-no-drag"
          style={{
            ...surfaceStyle,
            color: "var(--app-text-muted, #94a3b8)",
          }}
        >
          <Icon
            name="Settings"
            size={16}
            variant="Linear"
            className="group-hover:rotate-90 transition-transform duration-300"
          />
        </button>
      </div>
    </header>
  );
};

export default Header;
