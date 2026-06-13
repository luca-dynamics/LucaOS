import { useState } from "react";
import { LucaButton, LucaPanel, LucaStatusChip } from "../shared/ui/LucaWebPrimitives";
import type { WebProfile } from "./webLifecycleStorage";
import { useWebRuntime } from "./WebRuntimeContext";

const STEPS = ["Identity", "Interaction", "Appearance", "Model route", "Ready"];

export function WebOnboardingSurface({ onComplete }: { onComplete: (profile: WebProfile) => void }) {
  const { hostClass } = useWebRuntime();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<WebProfile>({
    name: "",
    interaction: "chat",
    theme: "cyan",
    modelRoute: "cloud",
  });

  const choices = step === 1
    ? [["chat", "Chat"], ["voice", "Voice later"]]
    : step === 2
      ? [["cyan", "Luca cyan"], ["violet", "Violet"], ["neutral", "Neutral"]]
      : [["cloud", "Cloud / API"], ["byok", "BYOK connector"], ["desktop-later", "Connect Desktop later"]];

  return (
    <div data-web-surface="onboarding" className="mx-auto grid min-h-full max-w-5xl place-items-center px-4 py-8">
      <LucaPanel className="w-full overflow-hidden p-0">
        <div className="grid lg:grid-cols-[0.72fr_1.28fr]">
          <aside className="border-b border-white/10 bg-black/20 p-6 lg:border-b-0 lg:border-r">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100/55">Welcome to LucaOS</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Let’s set up LucaOS for this browser.</h1>
            <p className="mt-4 text-sm leading-6 text-white/55">Luca adapts to this host without loading desktop or native runtime modules.</p>
            <div className="mt-6"><LucaStatusChip>{hostClass.replace("-", " ")} · Browser host</LucaStatusChip></div>
            <ol className="mt-8 grid gap-3">
              {STEPS.map((label, index) => (
                <li key={label} className={`flex items-center gap-3 text-sm ${index === step ? "text-white" : "text-white/35"}`}>
                  <span className={`grid h-7 w-7 place-items-center rounded-full border ${index <= step ? "border-cyan-100/35 bg-cyan-100/10" : "border-white/10"}`}>{index + 1}</span>
                  {label}
                </li>
              ))}
            </ol>
          </aside>
          <div className="p-6 sm:p-9">
            {step === 0 ? (
              <>
                <StepTitle title="What should Luca call you?" detail="This browser-safe profile stays in origin-scoped browser storage." />
                <input autoFocus aria-label="Name" value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} placeholder="Your name" className="mt-6 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none focus:border-cyan-100/35" />
              </>
            ) : step < 4 ? (
              <>
                <StepTitle
                  title={step === 1 ? "How do you want to begin?" : step === 2 ? "Choose your LucaOS accent." : "Choose a web-safe model route."}
                  detail={step === 1 ? "Voice can be enabled later; no microphone permission is requested now." : step === 3 ? "Local models require a paired or installed Desktop host." : "You can change this later in Settings."}
                />
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {choices.map(([value, label]) => {
                    const key = step === 1 ? "interaction" : step === 2 ? "theme" : "modelRoute";
                    return <button type="button" key={value} onClick={() => setProfile({ ...profile, [key]: value })} className={`rounded-2xl border p-4 text-left text-sm transition ${profile[key] === value ? "border-cyan-100/35 bg-cyan-100/10" : "border-white/10 bg-black/20 hover:bg-white/[0.05]"}`}>{label}</button>;
                  })}
                </div>
              </>
            ) : (
              <>
                <StepTitle title={`LucaOS is ready${profile.name ? `, ${profile.name}` : ""}.`} detail="Your normal web-safe LucaOS surface will open next. Host capabilities and LucaLink remain available in Settings." />
                <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5 text-sm leading-6 text-white/60">
                  Deeper native actions will be routed contextually through Desktop, Mobile, LucaLink, browser permissions, or approved connectors.
                </div>
              </>
            )}
            <div className="mt-9 flex justify-between gap-3">
              <LucaButton variant="quiet" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</LucaButton>
              <LucaButton variant="primary" disabled={step === 0 && !profile.name.trim()} onClick={() => step === 4 ? onComplete(profile) : setStep(step + 1)}>{step === 4 ? "Enter LucaOS" : "Continue"}</LucaButton>
            </div>
          </div>
        </div>
      </LucaPanel>
    </div>
  );
}

function StepTitle({ title, detail }: { title: string; detail: string }) {
  return <><p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">Setup</p><h2 className="mt-2 text-2xl font-semibold">{title}</h2><p className="mt-3 text-sm leading-6 text-white/50">{detail}</p></>;
}
