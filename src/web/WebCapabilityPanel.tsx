import type { WebCapability } from "./browserHostCapabilities";

const STATUS_LABELS: Record<WebCapability["status"], string> = {
  available: "Available",
  "permission-required": "Permission required",
  "api-required": "API required",
  "desktop-required": "Desktop required",
  "mobile-app-required": "Mobile app required",
  "paired-host-required": "Paired host required",
  "connector-required": "Connector required",
  unsupported: "Unsupported",
  unknown: "Unknown",
};

const STATUS_STYLES: Record<WebCapability["status"], string> = {
  available: "border-cyan-200/20 bg-cyan-100/10 text-cyan-50",
  "permission-required": "border-amber-200/20 bg-amber-100/10 text-amber-50",
  "api-required": "border-violet-200/20 bg-violet-100/10 text-violet-50",
  "desktop-required": "border-white/15 bg-white/[0.06] text-white/70",
  "mobile-app-required": "border-white/15 bg-white/[0.06] text-white/70",
  "paired-host-required": "border-blue-200/20 bg-blue-100/10 text-blue-50",
  "connector-required": "border-fuchsia-200/20 bg-fuchsia-100/10 text-fuchsia-50",
  unsupported: "border-white/10 bg-black/20 text-white/40",
  unknown: "border-white/10 bg-white/[0.03] text-white/45",
};

interface WebCapabilityPanelProps {
  title: string;
  eyebrow: string;
  capabilities: WebCapability[];
  compact?: boolean;
}

export function WebCapabilityPanel({
  title,
  eyebrow,
  capabilities,
  compact = false,
}: WebCapabilityPanelProps) {
  return (
    <section className="rounded-[1.6rem] border border-white/10 bg-white/[0.045] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.25)] backdrop-blur-2xl sm:p-6">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-cyan-100/55">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">
        {title}
      </h2>
      <div className={`mt-5 grid gap-3 ${compact ? "" : "md:grid-cols-2"}`}>
        {capabilities.map((item) => (
          <article
            key={item.id}
            className="rounded-2xl border border-white/[0.07] bg-black/20 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm font-medium text-white/90">{item.label}</h3>
              <span
                className={`shrink-0 rounded-full border px-2.5 py-1 text-[0.58rem] font-semibold uppercase tracking-[0.12em] ${STATUS_STYLES[item.status]}`}
              >
                {STATUS_LABELS[item.status]}
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-white/45">{item.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
