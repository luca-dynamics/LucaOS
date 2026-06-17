import React from "react";
import { Icon } from "../ui/Icon";
import { LucaCanvasPresenceOrb, type LucaCanvasPresenceOrbState } from "../visual/LucaCanvasPresenceOrb";

export type VoiceHudPresentationState =
  | "idle"
  | "requesting"
  | "listening"
  | "thinking"
  | "speaking"
  | "ready"
  | "unavailable";

export interface VoiceHudPresentationProps {
  state: VoiceHudPresentationState;
  title?: string;
  subtitle?: string;
  transcript?: string;
  assistantText?: string;
  micAvailable?: boolean;
  typedFallbackValue?: string;
  typedFallbackPlaceholder?: string;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
  continueLabel?: string;
  themeColor?: string;
  compact?: boolean;
  showTypedFallback?: boolean;
  onRequestMic?: () => void;
  onBack?: () => void;
  onContinue?: () => void;
  onTypedFallbackChange?: (value: string) => void;
}

const stateCopy: Record<VoiceHudPresentationState, { label: string; detail: string; orb: LucaCanvasPresenceOrbState; amplitude: number }> = {
  idle: { label: "READY", detail: "Enable microphone.", orb: "idle", amplitude: 0.08 },
  requesting: { label: "CONNECTING", detail: "Enable microphone.", orb: "preparing", amplitude: 0.24 },
  listening: { label: "LISTENING", detail: "Luca is listening.", orb: "listening", amplitude: 0.42 },
  thinking: { label: "THINKING", detail: "Luca is thinking.", orb: "thinking", amplitude: 0.3 },
  speaking: { label: "SPEAKING", detail: "Luca is responding.", orb: "speaking", amplitude: 0.5 },
  ready: { label: "READY", detail: "Voice setup is available.", orb: "ready", amplitude: 0.18 },
  unavailable: { label: "NEEDS ATTENTION", detail: "Luca Voice will connect when your voice runtime is enabled. You can continue with typed fallback for now.", orb: "error", amplitude: 0.12 },
};

export function VoiceHudPresentation({
  state,
  title,
  subtitle,
  transcript,
  assistantText,
  micAvailable = state !== "unavailable",
  typedFallbackValue = "",
  typedFallbackPlaceholder = "Typed fallback.",
  primaryActionLabel,
  secondaryActionLabel = "Back / Change mode",
  continueLabel = "Continue with Luca Voice",
  themeColor = "#67e8f9",
  compact = false,
  showTypedFallback = false,
  onRequestMic,
  onBack,
  onContinue,
  onTypedFallbackChange,
}: VoiceHudPresentationProps) {
  const copy = stateCopy[state];
  const inputLabel = state === "speaking" || assistantText ? "LUCA" : "INPUT";
  const requestLabel = primaryActionLabel || (state === "ready" ? "Microphone ready" : state === "requesting" ? "Requesting microphone…" : "Enable microphone");

  return (
    <section
      aria-label="Luca VoiceHUD presentation"
      data-voice-hud-presentation="true"
      className={`relative flex min-h-[620px] w-full flex-col items-center justify-center overflow-hidden border glass-blur ${compact ? "rounded-2xl px-4 py-6" : "min-h-dvh px-5 py-10"}`}
      style={{ borderColor: "var(--app-border-main)", backgroundColor: "rgba(8, 9, 11, 0.84)" }}
    >
      <div className="glass-noise" />
      <div className="pointer-events-none absolute inset-0 opacity-70" style={{ background: `radial-gradient(circle at 50% 42%, ${themeColor}2e, transparent 36%), radial-gradient(circle at 50% 80%, rgba(255,255,255,0.08), transparent 28%)` }} />

      {onBack ? (
        <button type="button" onClick={onBack} className="absolute left-4 top-4 z-40 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.18em]" style={{ borderColor: `${themeColor}88`, color: "var(--app-text-main)" }}>
          {secondaryActionLabel}
        </button>
      ) : null}

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="absolute h-[360px] w-[360px] rounded-full border border-white/10 blur-[1px]" />
        <div className="absolute h-[520px] w-[520px] rounded-full border opacity-30" style={{ borderColor: `${themeColor}55` }} />
      </div>

      <div className="relative z-20 flex -translate-y-8 flex-col items-center gap-3 text-center">
        <div className="font-mono text-sm font-bold tracking-[0.5em]" style={{ color: state === "unavailable" ? "var(--app-danger, #f87171)" : themeColor }}>{copy.label}</div>
        <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/55">LUCA VOICE</div>
      </div>

      <LucaCanvasPresenceOrb size={compact ? 180 : 240} state={copy.orb} amplitude={copy.amplitude} themeColor={themeColor} visualCoreActive className="relative z-10 -my-8" />

      <div className="relative z-20 mt-2 max-w-3xl text-center">
        <h1 className="font-display text-3xl font-semibold text-white md:text-5xl">{title || "Luca is listening."}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-white/64">{subtitle || copy.detail}</p>
      </div>

      <div className="relative z-20 mt-8 w-full max-w-3xl rounded-3xl border px-5 py-4 text-center" style={{ borderColor: "var(--app-border-main)", background: "rgba(255,255,255,0.045)" }}>
        <div className="mb-3 flex items-center justify-center gap-2">
          <Icon name="Microphone" size={14} className={state === "listening" ? "animate-pulse" : ""} style={{ color: themeColor }} />
          <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/70">{inputLabel}</span>
        </div>
        <p className="min-h-7 font-display text-lg font-bold leading-relaxed tracking-wide text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.45)]">
          {assistantText || transcript || (micAvailable ? copy.detail : stateCopy.unavailable.detail)}
        </p>
      </div>

      <div className="relative z-30 mt-6 flex flex-wrap items-center justify-center gap-3">
        {onRequestMic ? <button type="button" onClick={onRequestMic} disabled={state === "requesting" || state === "ready"} className="inline-flex items-center gap-3 rounded-2xl border px-6 py-4 text-sm font-bold disabled:opacity-60" style={{ borderColor: themeColor, color: "var(--app-text-main)", background: "rgba(255,255,255,0.06)" }}><Icon name="Microphone" size={20} />{requestLabel}</button> : null}
        {onContinue ? <button type="button" onClick={onContinue} className="rounded-2xl border px-6 py-4 text-sm font-bold" style={{ borderColor: `${themeColor}99`, color: "var(--app-text-main)" }}>{continueLabel}</button> : null}
      </div>

      {showTypedFallback ? (
        <div className="relative z-30 mt-6 w-full max-w-2xl rounded-2xl border p-4 text-left" style={{ borderColor: "var(--app-border-main)", background: "rgba(0,0,0,0.22)" }}>
          <label htmlFor="voice-hud-typed-fallback" className="text-xs font-bold uppercase tracking-wider text-white/60">Typed fallback</label>
          <textarea id="voice-hud-typed-fallback" value={typedFallbackValue} onChange={(event) => onTypedFallbackChange?.(event.target.value)} rows={3} placeholder={typedFallbackPlaceholder} className="mt-3 w-full resize-none rounded-xl border bg-black/20 px-4 py-3 text-sm text-white outline-none" style={{ borderColor: "var(--app-border-main)" }} />
        </div>
      ) : null}
    </section>
  );
}

export default VoiceHudPresentation;
