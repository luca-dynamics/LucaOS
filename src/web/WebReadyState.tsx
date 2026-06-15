import type { WebCapability } from "./browserHostCapabilities";

interface WebReadyStateProps {
  hostClass: string;
  browserCapabilities: WebCapability[];
  guardedNativeCapabilities: WebCapability[];
  lucaLinkStatus: string;
  onContinueToShell: () => void;
}

export function WebReadyState({
  hostClass,
  browserCapabilities,
  guardedNativeCapabilities,
  lucaLinkStatus,
  onContinueToShell,
}: WebReadyStateProps) {
  const available = browserCapabilities.filter(
    (capability) => capability.status === "available",
  ).length;

  return (
    <section className="absolute inset-0 z-10 flex items-center justify-center p-6 font-mono">
      <div
        className="w-full max-w-2xl rounded-2xl border p-6 glass-blur sm:p-8"
        style={{
          color: "var(--app-text-main)",
          borderColor: "var(--app-border-main)",
          backgroundColor: "var(--app-bg-tint)",
        }}
      >
        <p
          className="text-xs font-bold uppercase tracking-[0.22em]"
          style={{ color: "var(--app-primary)" }}
        >
          LucaOS Web session ready
        </p>
        <h1 className="mt-3 text-2xl font-bold tracking-wide">
          Original onboarding complete.
        </h1>
        <p
          className="mt-3 text-sm leading-6"
          style={{ color: "var(--app-text-muted)" }}
        >
          Continue into the browser-safe LucaOS shell. Native desktop
          capabilities remain guarded until paired through LucaLink.
        </p>
        <dl className="mt-6 grid gap-3 text-xs sm:grid-cols-2">
          <div
            className="rounded-xl border p-4"
            style={{ borderColor: "var(--app-border-main)" }}
          >
            <dt style={{ color: "var(--app-text-muted)" }}>Host class</dt>
            <dd className="mt-1 font-bold">{hostClass}</dd>
          </div>
          <div
            className="rounded-xl border p-4"
            style={{ borderColor: "var(--app-border-main)" }}
          >
            <dt style={{ color: "var(--app-text-muted)" }}>LucaLink</dt>
            <dd className="mt-1 font-bold">{lucaLinkStatus}</dd>
          </div>
          <div
            className="rounded-xl border p-4"
            style={{ borderColor: "var(--app-border-main)" }}
          >
            <dt style={{ color: "var(--app-text-muted)" }}>
              Browser capabilities
            </dt>
            <dd className="mt-1 font-bold">{available} available</dd>
          </div>
          <div
            className="rounded-xl border p-4"
            style={{ borderColor: "var(--app-border-main)" }}
          >
            <dt style={{ color: "var(--app-text-muted)" }}>Native routes</dt>
            <dd className="mt-1 font-bold">
              {guardedNativeCapabilities.length} guarded
            </dd>
          </div>
        </dl>
        <button
          type="button"
          onClick={onContinueToShell}
          className="mt-6 w-full rounded-xl border px-4 py-3 text-sm font-bold transition hover:brightness-110 focus:outline-none focus:ring-2"
          style={{
            color: "var(--app-text-main)",
            borderColor: "var(--app-primary)",
            backgroundColor: "var(--luca-accent-soft, var(--app-bg-tint))",
          }}
        >
          Continue to LucaOS Web Shell
        </button>
      </div>
    </section>
  );
}
