import { LucaButton, LucaPanel } from "../shared/ui/LucaWebPrimitives";

export function WebLucaLinkSurface({ onBack }: { onBack: () => void }) {
  return (
    <div data-settings-surface="lucalink" className="grid gap-4">
      <LucaPanel>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/55">Settings · LucaLink</p>
        <h2 className="mt-2 text-2xl font-semibold">Continue LucaOS across your hosts</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">Pairing and session-porting remain user-approved. This browser acts as a client surface, never as the native host controller.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {["Pair Desktop", "Pair Mobile", "Pair Smart TV / Large Display", "Continue session on another host", "Request capability through paired host"].map((label) => (
            <button type="button" key={label} className="rounded-xl border border-white/10 bg-black/20 p-4 text-left text-sm text-white/75 hover:bg-white/[0.05]">{label}<span className="mt-1 block text-xs text-white/35">Safe pairing placeholder · approval required</span></button>
          ))}
        </div>
      </LucaPanel>
      <LucaButton className="justify-self-start" onClick={onBack}>Back to Settings</LucaButton>
    </div>
  );
}
