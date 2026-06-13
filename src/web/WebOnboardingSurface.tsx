import { useState } from "react";
import { LucaOnboardingChoice, LucaOnboardingShell } from "../shared/onboarding/LucaOnboardingShell";
import { LUCA_INTERACTION_OPTIONS, LUCA_ONBOARDING_STEPS, LUCA_THEME_OPTIONS, LUCA_WEB_MODEL_ROUTES } from "../shared/onboarding/lucaOnboardingSchema";
import type { WebProfile } from "./webLifecycleStorage";

export function WebOnboardingSurface({ onComplete }: { onComplete: (profile: WebProfile) => void }) {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<WebProfile>({ name: "", interaction: "chat", theme: "cyan", modelRoute: "cloud" });
  const choices = step === 1 ? LUCA_INTERACTION_OPTIONS : step === 2 ? LUCA_THEME_OPTIONS : LUCA_WEB_MODEL_ROUTES;

  return (
    <LucaOnboardingShell
      activeStep={step}
      canContinue={step !== 0 || Boolean(profile.name.trim())}
      onBack={() => setStep((current) => current - 1)}
      onContinue={() => step === LUCA_ONBOARDING_STEPS.length - 1 ? onComplete(profile) : setStep((current) => current + 1)}
    >
      {step === 0 ? (
        <input autoFocus aria-label="Name" value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} placeholder="Your name" className="w-full rounded-xl border border-[var(--luca-border-subtle)] bg-[var(--luca-background-elevated)] px-4 py-3 text-[var(--luca-text-primary)] outline-none focus:border-[var(--luca-accent-primary)]" />
      ) : step < 4 ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {choices.map(({ value, label, detail }) => {
            const key = step === 1 ? "interaction" : step === 2 ? "theme" : "modelRoute";
            return <LucaOnboardingChoice key={value} active={profile[key] === value} label={label} detail={detail} onClick={() => setProfile({ ...profile, [key]: value })} />;
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-[var(--luca-border-subtle)] bg-[var(--luca-surface-glass)] p-5 text-sm leading-6 text-[var(--luca-text-secondary)]">
          Welcome{profile.name ? `, ${profile.name}` : ""}. Luca will adapt capabilities to this host while preserving your LucaOS workspace, settings, and LucaLink continuity.
        </div>
      )}
    </LucaOnboardingShell>
  );
}
