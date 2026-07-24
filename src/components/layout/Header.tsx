import React, { useEffect, useRef, useState } from "react";
import { Icon } from "../ui/Icon";
// Holographic icon removed in favor of static branding
import AmbientVisionIndicator from "../AmbientVisionIndicator";
import AlwaysOnControls from "../AlwaysOnControls";
import RuntimeStatusChip from "../runtime/RuntimeStatusChip";
import RuntimeContinuityBootstrap from "../runtime/RuntimeContinuityBootstrap";
import { awarenessService } from "../../services/awarenessService";
import { soundService } from "../../services/soundService";
import { useCredits } from "../../hooks/useCredits";
import {
  lucaMaterialControlStyle,
  lucaMaterialMobileControlStyle,
  lucaMaterialMobilePanelChromeStyle,
  lucaMaterialPanelStyle,
} from "../../styles/lucaMaterialSystem";
import { lucaShellClassNames } from "../../styles/lucaShellStyles";

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
  setShowVoiceHud?: (show: boolean) => void;
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
  /**
   * Hide the brand wordmark (used when the header is dissolved into the panel
   * shell and the brand lives at the top of the left rail instead). The header
   * then renders only the status/controls cluster.
   */
  hideBrand?: boolean;
  /**
   * Current desktop window width, used to prioritise header controls under
   * compression. The essential controls (panel toggles, settings, window
   * controls) always stay; credits and runtime status yield first — compacting,
   * then hiding — so the essential icons never get squeezed. Undefined (mobile
   * / standalone) renders everything.
   */
  viewportWidth?: number;
}

// Tier-aware wordmark. The canonical brand form is "LucaOS" (matches the
// window title). Pro/Creator keep the stylized dotted "L.U.C.A OS" flourish
// (kept tasteful — no italic, no neon).
function wordmark(tier: "BASIC" | "PRO" | "CREATOR"): {
  text: string;
  stylized: boolean;
} {
  if (tier === "PRO" || tier === "CREATOR") {
    return { text: "L.U.C.A OS", stylized: true };
  }
  return { text: "LucaOS", stylized: false };
}

function connectionLabel(tier: "LAN" | "LOCAL" | "CLOUD" | "OFFLINE"): string {
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
  setShowVoiceHud,
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
  hideBrand = false,
  viewportWidth,
}) => {
  const credits = useCredits();
  const brand = wordmark(tier);

  // Priority under compression. Essential controls (panel toggles, settings,
  // window controls, quick-controls) always render at full size. Non-essential
  // status yields first: runtime chip hides, then credits compacts, then hides.
  const w = viewportWidth ?? Infinity;
  const showRuntimeChip = w >= 900;
  const showCredits = w >= 780;
  const compactCredits = w < 880;

  // Quick controls popover: Voice, Vision, and monitoring live here instead of
  // as persistent header pills, so the bar stays calm and never crowds. Closes
  // on outside click or Escape.
  const [quickOpen, setQuickOpen] = useState(false);
  const quickRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!quickOpen) return;
    const onDown = (e: MouseEvent) => {
      if (quickRef.current && !quickRef.current.contains(e.target as Node)) {
        setQuickOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setQuickOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [quickOpen]);

  const creditColor =
    credits.status === "CRITICAL"
      ? "var(--luca-danger)"
      : credits.status === "LOW"
        ? "var(--luca-warning)"
        : "var(--luca-success)";

  const planLabel = credits.isLocal
    ? "Local"
    : credits.isBYOK
      ? "BYOK"
      : "Prime";

  const connectionColor =
    connectionTier === "OFFLINE"
      ? "var(--luca-text-tertiary, var(--app-text-muted))"
      : connectionTier === "CLOUD"
        ? "var(--luca-info)"
        : "var(--luca-success)";

  // Embedded in the shell's top band (desktop): the band already paints the
  // environment surface — the header must be TRANSPARENT furniture on it, or
  // it reads as a second, mismatched strip. Standalone/mobile keeps its own
  // panel chrome.
  const embedded = hideBrand && !isMobile;
  const headerSurfaceStyle = embedded
    ? undefined
    : isMobile
      ? lucaMaterialMobilePanelChromeStyle
      : lucaMaterialPanelStyle;
  const surfaceStyle = isMobile
    ? lucaMaterialMobileControlStyle
    : lucaMaterialControlStyle;

  return (
    <header
      id="app-header"
      className={`${isMobile ? "h-16 px-4" : embedded ? "h-full px-4" : "h-14 px-6"} luca-window-drag ${embedded ? "" : "glass-blur border-b"} flex items-center justify-between z-50 transition-all duration-500 relative drag`}
      style={headerSurfaceStyle}
    >
      <RuntimeContinuityBootstrap />

      {/* Brand (hidden when the header is dissolved into the shell; the brand
          then lives at the top of the left rail). An empty spacer keeps the
          controls right-aligned via justify-between. */}
      {hideBrand && <div aria-hidden="true" />}
      {!hideBrand && (
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
            style={{ color: "var(--luca-text-primary, var(--app-text-main))" }}
          >
            {brand.text}
          </h1>

          {isLockdown && (
            <span
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border"
              style={{
                color: "var(--luca-warning)",
                borderColor:
                  "color-mix(in srgb, var(--luca-warning) 32%, transparent)",
                backgroundColor:
                  "color-mix(in srgb, var(--luca-warning) 10%, transparent)",
              }}
              title="Lockdown active"
            >
              <Icon
                name="Lock"
                size={12}
                variant="Linear"
                color="currentColor"
              />
              Locked
            </span>
          )}
        </div>
      )}

      {/* System status + controls */}
      <div className="flex items-center gap-2 sm:gap-3 app-region-no-drag">
        {isProcessing && (
          <span
            className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium"
            style={{
              color: "var(--luca-text-secondary, var(--app-text-muted))",
            }}
            title="Luca is working"
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: "var(--luca-accent-primary)" }}
            />
            Working
          </span>
        )}

        {isAdminMode && (
          <span
            className={`${isMobile ? "hidden md:inline-flex" : "inline-flex"} items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border`}
            style={{
              color: "var(--luca-danger)",
              borderColor:
                "color-mix(in srgb, var(--luca-danger) 32%, transparent)",
              backgroundColor:
                "color-mix(in srgb, var(--luca-danger) 10%, transparent)",
            }}
            title="Admin mode active"
          >
            <Icon
              name="Shield"
              size={12}
              variant="Linear"
              color="currentColor"
            />
            Admin
          </span>
        )}

        {/* Credits — compacts (drops the plan badge) then hides under
            compression, so the essential controls keep their room. */}
        {showCredits && (
          <div
            className={`${isMobile ? "hidden sm:flex" : "flex"} items-center gap-2 ${compactCredits ? "px-2.5" : "px-3"} py-1.5 rounded-full border transition-all cursor-default shrink-0`}
            style={surfaceStyle}
            title={`Credits${credits.isLocal ? " · running on local models" : credits.isBYOK ? " · using your own API key" : ""}`}
          >
            <Icon name="Wallet" size={15} variant="Linear" color={creditColor} />
            <span
              className="text-[13px] font-semibold tabular-nums"
              style={{
                color: "var(--luca-text-primary, var(--app-text-main))",
              }}
            >
              {!isFinite(credits.balance)
                ? "∞"
                : Math.floor(credits.balance).toLocaleString()}
            </span>
            {!compactCredits && (
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-md"
                style={{
                  color: creditColor,
                  backgroundColor: `${creditColor}1a`,
                }}
              >
                {planLabel}
              </span>
            )}
          </div>
        )}

        {!isMobile && showRuntimeChip && <RuntimeStatusChip compact />}

        {/* Quick controls: Voice, Vision, and monitoring live in this popover
            instead of as persistent header pills, keeping the bar calm. */}
        {!isMobile && (
          <div className="relative shrink-0" ref={quickRef}>
            <button
              type="button"
              onClick={() => setQuickOpen((v) => !v)}
              aria-label="Quick controls"
              aria-haspopup="menu"
              aria-expanded={quickOpen}
              title="Quick controls"
              className={`${lucaShellClassNames.control} flex items-center justify-center w-9 h-9 rounded-full border app-region-no-drag shrink-0`}
              style={{
                ...surfaceStyle,
                color: quickOpen
                  ? "var(--luca-accent-primary)"
                  : "var(--luca-text-secondary, var(--app-text-muted))",
              }}
            >
              <Icon name="MoreHorizontal" size={16} variant="Linear" />
            </button>
            {quickOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-2 z-[60] w-56 rounded-xl border p-1.5 glass-blur"
                style={{
                  ...lucaMaterialPanelStyle,
                  borderColor: "var(--luca-border-subtle, var(--app-border-main))",
                }}
              >
                <p
                  className="px-2.5 pt-1.5 pb-1 text-[10px] tracking-wide"
                  style={{
                    color: "var(--luca-text-tertiary, var(--app-text-muted))",
                  }}
                >
                  Quick controls
                </p>
                {setShowVoiceHud && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setShowVoiceHud(!showVoiceHud);
                      setQuickOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors hover:bg-[var(--luca-surface-hover,rgba(255,255,255,0.05))]"
                    style={{
                      color: "var(--luca-text-primary, var(--app-text-main))",
                    }}
                  >
                    <Icon
                      name="Microphone"
                      size={16}
                      variant="Linear"
                      style={{
                        color: showVoiceHud
                          ? "var(--luca-accent-primary)"
                          : "var(--luca-text-secondary, var(--app-text-muted))",
                      }}
                    />
                    Voice
                    <span
                      className="ml-auto text-[11px]"
                      style={{
                        color: showVoiceHud
                          ? "var(--luca-accent-primary)"
                          : "var(--luca-text-tertiary, var(--app-text-muted))",
                      }}
                    >
                      {showVoiceHud ? "On" : "Off"}
                    </span>
                  </button>
                )}
                <div className="px-1 py-1">
                  <AlwaysOnControls
                    onVisionToggle={(active) =>
                      setVisionMonitoringActive(active)
                    }
                    onAudioToggle={(active) => setAudioMonitoringActive(active)}
                    isMobile={isMobile}
                    isWakeWordActive={isWakeWordActive}
                    theme={theme}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Ambient vision status (null unless Luca is actively watching). */}
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
                  onScreenCapture: async (base64) => {
                    const { liveService } =
                      await import("../../services/liveService");
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

        {/* Connection status — hidden in the embedded shell header; the
            Operation Center already reports connection/offline state. */}
        {!embedded && (
        <div
          className="hidden md:flex items-center gap-1.5 text-[11px] font-medium"
          style={{ color: connectionColor }}
          title={`Connection: ${connectionLabel(connectionTier)}${
            hostPlatform
              ? ` · ${
                  hostPlatform
                    .replace(/\(.*\)/, "")
                    .trim()
                    .split(" ")[0]
                }`
              : ""
          }`}
        >
          {connectionTier === "OFFLINE" ? (
            <Icon name="CloseCircle" size={14} color="currentColor" />
          ) : connectionTier === "CLOUD" ? (
            <Icon
              name="Cloud"
              size={14}
              color="currentColor"
              variant="Linear"
            />
          ) : (
            <Icon
              name="Server"
              size={14}
              color="currentColor"
              variant="Linear"
            />
          )}
          <span>{connectionLabel(connectionTier)}</span>
        </div>
        )}

        {/* Settings — hidden in the embedded shell header; it already lives in
            the sidebar footer and the app menu, so it isn't repeated here. */}
        {!embedded && (
        <button
          type="button"
          onClick={() => setIsSettingsOpen(true)}
          aria-label="Open settings"
          title="Settings"
          className="flex items-center justify-center w-9 h-9 rounded-full border transition-all group app-region-no-drag shrink-0"
          style={{
            ...surfaceStyle,
            color: "var(--luca-text-secondary, var(--app-text-muted))",
          }}
        >
          <Icon
            name="Settings"
            size={16}
            variant="Linear"
            className="group-hover:rotate-90 transition-transform duration-300"
          />
        </button>
        )}
      </div>
    </header>
  );
};

export default Header;
