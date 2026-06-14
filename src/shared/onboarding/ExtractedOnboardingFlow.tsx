import { useState } from "react";
import { NORMAL_LUCA_THEME_OPTIONS } from "../../config/lucaThemeLabels";
import type { WebProfile } from "../../web/webLifecycleStorage";
import { OnboardingChoiceCard } from "../ui/ExtractedSurfacePrimitives";

export const EXTRACTED_ONBOARDING_SOURCES = [
  "src/components/Onboarding/OnboardingFlow.tsx",
  "src/components/Onboarding/OnboardingAccessPanels.tsx",
  "src/components/Onboarding/ModeSelect.tsx",
  "src/components/Onboarding/ModeCard.tsx",
  "src/components/Onboarding/ThemeSelectionStep.tsx",
  "src/services/onboarding/OnboardingController.ts",
] as const;

type BrowserSafeStep =
  | "KERNEL_AWAKENING"
  | "THEME"
  | "NEURAL_HANDSHAKE"
  | "COGNITIVE_CORE_SELECTION"
  | "MODE_SELECT"
  | "CONVERSATION"
  | "CALIBRATION"
  | "COMPLETE";

const STEP_ORDER: BrowserSafeStep[] = [
  "KERNEL_AWAKENING",
  "THEME",
  "NEURAL_HANDSHAKE",
  "COGNITIVE_CORE_SELECTION",
  "MODE_SELECT",
  "CONVERSATION",
  "CALIBRATION",
  "COMPLETE",
];

export function ExtractedOnboardingFlow({
  initialProfile,
  onComplete,
}: {
  initialProfile: WebProfile;
  onComplete: (profile: WebProfile) => void;
}) {
  const [step, setStep] = useState<BrowserSafeStep>("KERNEL_AWAKENING");
  const [profile, setProfile] = useState(initialProfile);
  const index = STEP_ORDER.indexOf(step);
  const advance = () =>
    step === "COMPLETE"
      ? onComplete(profile)
      : setStep(STEP_ORDER[Math.min(index + 1, STEP_ORDER.length - 1)]);

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center overflow-hidden font-mono">
      <div className="glass-noise transition-opacity duration-700" style={{ opacity: "calc((1 - var(--app-bg-opacity, 0.3)) * 0.025)" }} />
      <div className="absolute inset-0 opacity-[0.16]" style={{ backgroundImage: "radial-gradient(var(--app-core-hex, #7dd3fc) 1px, transparent 1px)", backgroundSize: "30px 30px" }} />
      <div className={`z-10 relative mx-auto flex flex-col items-center justify-center px-4 transition-all duration-700 ${step === "THEME" ? "h-[min(88vh,860px)] w-full max-w-2xl" : "w-[min(90vw,1000px)]"}`}>
        {step === "KERNEL_AWAKENING" && <KernelAwakening onContinue={advance} />}
        {step === "THEME" && <ThemeCalibration profile={profile} onChange={setProfile} onContinue={advance} />}
        {step === "NEURAL_HANDSHAKE" && <IdentityHandshake profile={profile} onChange={setProfile} onContinue={advance} />}
        {step === "COGNITIVE_CORE_SELECTION" && <CoreSelection profile={profile} onChange={setProfile} onContinue={advance} />}
        {step === "MODE_SELECT" && <ModeSelection profile={profile} onChange={setProfile} onContinue={advance} />}
        {step === "CONVERSATION" && <PreferenceCalibration profile={profile} onChange={setProfile} onContinue={advance} />}
        {step === "CALIBRATION" && <SimpleStage title="Calibrating Luca" detail="Applying your identity, appearance, runtime, and interaction preferences." action="Continue" onContinue={advance} />}
        {step === "COMPLETE" && <SimpleStage title="Luca is ready" detail="The LucaOS workspace is calibrated for this host." action="Enter LucaOS" onContinue={advance} />}
      </div>
      <div className="absolute bottom-4 flex items-center gap-2 text-[10px] tracking-widest">
        <div className="h-2 w-2 animate-pulse rounded-full bg-[var(--app-core-hex,#7dd3fc)]" />
        L.U.C.A OS v1.0.0 // PROTOCOL_CONNECTED
      </div>
    </div>
  );
}

function KernelAwakening({ onContinue }: { onContinue: () => void }) {
  return <div className="space-y-3 text-sm text-[var(--app-text-main)]"><p>&gt; LUCA KERNEL ONLINE</p><p>&gt; BROWSER-SAFE RUNTIME VERIFIED</p><p>&gt; OPERATOR CALIBRATION REQUIRED</p><button type="button" onClick={onContinue} className="mt-5 rounded-lg border border-[var(--app-border-main)] px-5 py-2 uppercase tracking-widest">Begin</button></div>;
}

function ThemeCalibration({ profile, onChange, onContinue }: StepProps) {
  return (
    <div className="flex h-full w-full flex-col justify-center animate-fade-in-up">
      <StageHeading title="Interface Calibration" detail="Configure visual style" />
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {NORMAL_LUCA_THEME_OPTIONS.map((theme) => <button type="button" key={theme.canonicalThemeId} onClick={() => onChange({ ...profile, theme: theme.canonicalThemeId as WebProfile["theme"] })} className="relative flex h-[72px] items-center gap-2 rounded-xl border p-3 text-left backdrop-blur-md" style={{ borderColor: profile.theme === theme.canonicalThemeId ? theme.hex : "var(--app-border-main)", backgroundColor: `${theme.hex}18` }}><span className="h-7 w-7 rounded-full border border-white/20" style={{ backgroundColor: theme.hex }} /><span><strong className="block text-[10px] uppercase tracking-wide">{theme.label}</strong><small className="block text-[9px] text-[var(--app-text-muted)]">{theme.description}</small></span></button>)}
      </div>
      <label className="mt-5 text-xs uppercase tracking-wider">Background opacity <input className="mt-2 w-full" type="range" min="10" max="90" value={profile.backgroundOpacity} onChange={(event) => onChange({ ...profile, backgroundOpacity: Number(event.target.value) })} /></label>
      <label className="mt-4 text-xs uppercase tracking-wider">Background blur <input className="mt-2 w-full" type="range" min="0" max="80" value={profile.backgroundBlur} onChange={(event) => onChange({ ...profile, backgroundBlur: Number(event.target.value) })} /></label>
      <ContinueButton onClick={onContinue} />
    </div>
  );
}

function IdentityHandshake({ profile, onChange, onContinue }: StepProps) {
  return <form onSubmit={(event) => { event.preventDefault(); if (profile.name.trim()) onContinue(); }} className="mx-auto flex w-full max-w-sm flex-col gap-6 animate-fade-in-up"><StageHeading title="Identity Verification" detail="Please identify yourself, Operator." /><label className="block text-center text-xs font-bold uppercase tracking-[0.16em]">Operator Alias</label><input autoFocus value={profile.name} onChange={(event) => onChange({ ...profile, name: event.target.value })} className="w-full rounded-xl border border-[var(--app-border-main)] bg-[var(--app-bg-tint)] p-3 text-center text-lg font-bold uppercase tracking-wider outline-none" placeholder="ENTER DESIGNATION" /><ContinueButton disabled={!profile.name.trim()} label="Confirm Identity" /></form>;
}

function CoreSelection({ profile, onChange, onContinue }: StepProps) {
  const routes = [
    ["cloud", "Luca Prime", "Maximum reasoning through an approved cloud route."],
    ["desktop-later", "Local Models", "Pair LucaOS Desktop for private local compute."],
    ["byok", "BYOK", "Use your own provider key after onboarding in Settings."],
  ] as const;
  return <div className="w-full animate-fade-in-up"><StageHeading title="Luca Core" detail="Choose how Luca processes your thoughts." /><div className="grid gap-4 sm:grid-cols-3">{routes.map(([value, title, description]) => <OnboardingChoiceCard key={value} active={profile.modelRoute === value} title={title} description={description} onClick={() => onChange({ ...profile, modelRoute: value })} />)}</div><ContinueButton onClick={onContinue} /></div>;
}

function ModeSelection({ profile, onChange, onContinue }: StepProps) {
  return <div className="w-full max-w-2xl animate-fade-in-up"><StageHeading title="How would you like to talk?" detail="Let's get to know each other. Choose your preferred way to communicate." /><div className="grid gap-4 sm:grid-cols-2"><OnboardingChoiceCard active={profile.interaction === "chat"} title="TEXT" description="Type your thoughts" onClick={() => onChange({ ...profile, interaction: "chat" })} /><OnboardingChoiceCard active={profile.interaction === "voice"} title="VOICE" description="Speak naturally when ready" onClick={() => onChange({ ...profile, interaction: "voice" })} /></div><p className="mt-4 text-center text-xs text-[var(--app-text-muted)]">Microphone permission is requested only when voice is used.</p><ContinueButton onClick={onContinue} /></div>;
}

function PreferenceCalibration({ profile, onChange, onContinue }: StepProps) {
  return <div className="w-full max-w-2xl animate-fade-in-up"><StageHeading title={`Identity Link Established${profile.name ? `, ${profile.name}` : ""}`} detail="How should Luca work with you?" /><div className="grid gap-4 sm:grid-cols-2"><OnboardingChoiceCard active={profile.personality === "proactive"} title="PROACTIVE" description="Offer suggestions and next steps" onClick={() => onChange({ ...profile, personality: "proactive" })} /><OnboardingChoiceCard active={profile.personality === "direct"} title="DIRECT" description="Wait for clear operator requests" onClick={() => onChange({ ...profile, personality: "direct" })} /></div><ContinueButton onClick={onContinue} /></div>;
}

function SimpleStage({ title, detail, action, onContinue }: { title: string; detail: string; action: string; onContinue: () => void }) {
  return <div className="text-center animate-fade-in-up"><StageHeading title={title} detail={detail} /><ContinueButton label={action} onClick={onContinue} /></div>;
}

function StageHeading({ title, detail }: { title: string; detail: string }) {
  return <div className="mb-6 space-y-2 text-center"><h1 className="text-2xl font-bold uppercase tracking-widest text-[var(--app-text-main)]">{title}</h1><p className="text-xs font-medium text-[var(--app-text-muted)]">{detail}</p></div>;
}

function ContinueButton({ disabled, label = "Continue", onClick }: { disabled?: boolean; label?: string; onClick?: () => void }) {
  return <button type={onClick ? "button" : "submit"} disabled={disabled} onClick={onClick} className="mx-auto mt-6 block rounded-xl border border-[var(--app-border-main)] bg-[var(--app-bg-tint)] px-6 py-3 text-sm font-bold uppercase tracking-widest disabled:opacity-40">{label}</button>;
}

type StepProps = {
  profile: WebProfile;
  onChange: (profile: WebProfile) => void;
  onContinue: () => void;
};
