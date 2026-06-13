import type { ReactNode } from "react";
import { LucaAction, LucaSurface } from "../ui/LucaPrimitives";
import { LUCA_ONBOARDING_STEPS, type LucaOnboardingStep } from "./lucaOnboardingSchema";

export function LucaOnboardingShell({ activeStep, canContinue, children, onBack, onContinue }: { activeStep: number; canContinue: boolean; children: ReactNode; onBack: () => void; onContinue: () => void }) {
  return (
    <div data-luca-surface="onboarding" className="mx-auto grid min-h-full w-full max-w-5xl place-items-center px-4 py-8">
      <LucaSurface className="w-full overflow-hidden p-0">
        <div className="grid min-h-[38rem] lg:grid-cols-[17rem_1fr]">
          <aside className="border-b border-[var(--luca-border-subtle)] p-6 lg:border-b-0 lg:border-r">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--luca-accent-primary)]">LUCAOS</p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight">Meet Luca.</h1>
            <p className="mt-3 text-sm leading-6 text-[var(--luca-text-secondary)]">Calibrate identity, conversation, appearance, and runtime before entering your LucaOS workspace.</p>
            <ol className="mt-8 grid gap-2">
              {LUCA_ONBOARDING_STEPS.map((item, index) => (
                <li key={item.id} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${index === activeStep ? "bg-[var(--luca-surface-hover)] text-[var(--luca-text-primary)]" : "text-[var(--luca-text-tertiary)]"}`}>
                  <span className={`grid h-7 w-7 place-items-center rounded-full border text-xs ${index <= activeStep ? "border-[var(--luca-accent-soft)] text-[var(--luca-accent-primary)]" : "border-[var(--luca-border-subtle)]"}`}>{index + 1}</span>
                  {item.label}
                </li>
              ))}
            </ol>
          </aside>
          <div className="flex flex-col p-6 sm:p-9">
            <OnboardingStepHeading step={LUCA_ONBOARDING_STEPS[activeStep]} />
            <div className="flex-1 py-7">{children}</div>
            <div className="flex justify-between gap-3 border-t border-[var(--luca-border-subtle)] pt-5">
              <LucaAction emphasis="quiet" disabled={activeStep === 0} onClick={onBack}>Back</LucaAction>
              <LucaAction emphasis="primary" disabled={!canContinue} onClick={onContinue}>{activeStep === LUCA_ONBOARDING_STEPS.length - 1 ? "Enter LucaOS" : "Continue"}</LucaAction>
            </div>
          </div>
        </div>
      </LucaSurface>
    </div>
  );
}

export function LucaOnboardingChoice({ active, detail, label, onClick }: { active: boolean; detail: string; label: string; onClick: () => void }) {
  return <button type="button" aria-pressed={active} onClick={onClick} className={`rounded-2xl border p-5 text-left transition ${active ? "border-[var(--luca-accent-primary)] bg-[var(--luca-accent-soft)]" : "border-[var(--luca-border-subtle)] hover:bg-[var(--luca-surface-hover)]"}`}><span className="font-semibold">{label}</span><span className="mt-2 block text-xs leading-5 text-[var(--luca-text-secondary)]">{detail}</span></button>;
}

function OnboardingStepHeading({ step }: { step: LucaOnboardingStep }) {
  return <header><p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--luca-accent-primary)]">{step.eyebrow}</p><h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{step.title}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--luca-text-secondary)]">{step.detail}</p></header>;
}
