import { useState } from "react";
import type { OnboardingConversationProps } from "../../components/Onboarding/OnboardingRuntimeAdapter";
import { Icon } from "../../components/ui/Icon";
import { LucaCanvasPresenceOrb } from "../../components/visual/LucaCanvasPresenceOrb";

export function WebVoiceOnboardingSurface({
  userName,
  theme,
  onBack,
  onComplete,
}: OnboardingConversationProps) {
  const [microphoneStatus, setMicrophoneStatus] = useState<
    "idle" | "requesting" | "ready" | "unavailable"
  >("idle");
  const [typedFallback, setTypedFallback] = useState("");

  const requestMicrophone = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicrophoneStatus("unavailable");
      return;
    }
    setMicrophoneStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicrophoneStatus("ready");
    } catch {
      setMicrophoneStatus("unavailable");
    }
  };

  const finish = () =>
    onComplete({
      identity: { name: userName },
      assistantPreferences: { detailLevel: "balanced", helpStyle: "proactive" },
      personality: { preferences: ["voice-first", typedFallback || "balanced setup"] },
      workContext: { profession: typedFallback },
    });

  return (
    <section
      aria-label="Luca voice onboarding"
      className="flex h-full min-h-dvh w-full max-w-3xl flex-col overflow-hidden border glass-blur sm:min-h-0 sm:rounded-2xl"
      style={{
        borderColor: "var(--app-border-main)",
        backgroundColor: "rgba(8, 9, 11, 0.82)",
      }}
    >
      <header className="flex items-center justify-between gap-4 border-b px-4 py-3 sm:px-6" style={{ borderColor: "var(--app-border-main)" }}>
        <button type="button" onClick={onBack} className="rounded-full border px-3 py-2 text-xs font-bold uppercase tracking-wider" style={{ borderColor: "var(--app-border-main)", color: "var(--app-text-main)" }}>
          Back / Change mode
        </button>
        <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: theme?.hex || "var(--app-primary)" }}>
          Voice setup
        </p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-5 py-8 text-center">
        <LucaCanvasPresenceOrb size={96} state={microphoneStatus === "ready" ? "ready" : "preparing"} amplitude={0.18} themeColor={theme?.hex} />
        <h1 className="mt-6 font-display text-3xl font-semibold text-white">Hi {userName || "there"}. Luca is listening.</h1>
        <p className="mt-3 max-w-lg text-sm leading-6 text-white/62">
          Voice setup is available. Browser live voice will connect through Luca Voice runtime when enabled.
          You can continue with typed fallback for now.
        </p>

        <button type="button" onClick={requestMicrophone} disabled={microphoneStatus === "requesting" || microphoneStatus === "ready"} className="mt-7 inline-flex items-center gap-3 rounded-2xl border px-6 py-4 text-sm font-bold disabled:opacity-60" style={{ borderColor: theme?.hex || "var(--app-primary)", color: "var(--app-text-main)", background: "var(--luca-accent-soft, rgba(255,255,255,0.06))" }}>
          <Icon name="Microphone" size={20} />
          {microphoneStatus === "requesting" ? "Requesting microphone…" : microphoneStatus === "ready" ? "Microphone ready" : "Enable microphone"}
        </button>
        {microphoneStatus === "unavailable" && <p role="status" className="mt-3 text-xs text-amber-200">Microphone is unavailable in this browser session. Typed fallback remains available.</p>}

        <div className="mt-8 w-full max-w-xl rounded-2xl border p-4 text-left" style={{ borderColor: "var(--app-border-main)", background: "rgba(255,255,255,0.035)" }}>
          <label htmlFor="voice-fallback" className="text-xs font-bold uppercase tracking-wider text-white/60">Typed fallback note</label>
          <textarea id="voice-fallback" value={typedFallback} onChange={(event) => setTypedFallback(event.target.value)} rows={3} placeholder="Optional: tell Luca what you want help with first…" className="mt-3 w-full resize-none rounded-xl border bg-black/20 px-4 py-3 text-sm text-white outline-none" style={{ borderColor: "var(--app-border-main)" }} />
          <div className="mt-4 flex justify-end">
            <button type="button" onClick={finish} className="rounded-xl border px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{ borderColor: theme?.hex || "var(--app-primary)", color: "var(--app-text-main)" }}>Continue with Luca Voice</button>
          </div>
        </div>
      </div>
    </section>
  );
}
