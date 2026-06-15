import type { WebCapability } from "./browserHostCapabilities";

interface WebReadyStateProps {
  hostClass: string;
  browserCapabilities: WebCapability[];
  guardedNativeCapabilities: WebCapability[];
  lucaLinkStatus: string;
}

export function WebReadyState({
  hostClass,
  browserCapabilities,
  guardedNativeCapabilities,
  lucaLinkStatus,
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
          LucaOS Web session ready. Original main shell/dashboard isolation is
          next.
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
        <p
          className="mt-6 text-xs leading-5"
          style={{ color: "var(--app-text-muted)" }}
        >
          Continue by pairing LucaOS Desktop when native capabilities are
          required. This transition state is not a replacement dashboard.
        </p>
      </div>
    </section>
  );
}
