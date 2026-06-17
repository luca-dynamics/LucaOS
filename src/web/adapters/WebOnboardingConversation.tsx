import { useState } from "react";
import type { OnboardingConversationProps } from "../../components/Onboarding/OnboardingRuntimeAdapter";

export function WebOnboardingConversation({
  mode,
  userName,
  onBack,
  onComplete,
}: OnboardingConversationProps) {
  const [detailLevel, setDetailLevel] = useState<
    "minimal" | "balanced" | "verbose"
  >("balanced");

  return (
    <div className="w-full max-w-xl space-y-6 px-4 text-center animate-fade-in-up">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.22em]" style={{ color: "var(--app-text-muted)" }}>
          {mode === "voice" ? "Voice selected" : "Chat selected"}
        </p>
        <h1 className="text-2xl font-bold tracking-widest uppercase" style={{ color: "var(--app-text-main)" }}>
          How should Luca respond, {userName || "Operator"}?
        </h1>
        <p className="text-sm" style={{ color: "var(--app-text-muted)" }}>
          Choose a starting level of detail. You can change this later.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {(["minimal", "balanced", "verbose"] as const).map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => setDetailLevel(level)}
            className="rounded-xl border px-3 py-4 text-xs font-bold uppercase tracking-wider transition-colors"
            style={{
              color: "var(--app-text-main)",
              borderColor: detailLevel === level ? "var(--app-primary)" : "var(--app-border-main)",
              backgroundColor: "var(--app-bg-tint)",
            }}
          >
            {level}
          </button>
        ))}
      </div>
      <div className="flex justify-center gap-3">
        {onBack && (
          <button type="button" onClick={onBack} className="rounded-lg border px-5 py-3 text-xs uppercase tracking-wider" style={{ color: "var(--app-text-muted)", borderColor: "var(--app-border-main)" }}>
            Back
          </button>
        )}
        <button
          type="button"
          onClick={() => onComplete({ identity: { name: userName }, assistantPreferences: { detailLevel } })}
          className="rounded-lg border px-5 py-3 text-xs font-bold uppercase tracking-wider"
          style={{ color: "var(--app-text-main)", borderColor: "var(--app-primary)", backgroundColor: "var(--app-bg-tint)" }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
