import type { WebCapability } from "./browserHostCapabilities";

const ROUTE_LABELS: Record<
  WebCapability["unlockOptions"][number],
  string
> = {
  "browser-permission": "Approve browser permission",
  "luca-link-host": "Pair a LucaLink host",
  "install-desktop": "Install LucaOS Desktop",
  "install-mobile": "Install LucaOS Mobile",
  "install-connector": "Install approved connector",
  "generate-approved-route": "Generate governed route",
  "api-config": "Configure browser-safe API",
};

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
  available: "border-[color-mix(in_srgb,var(--luca-info,#4f8cff)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-info,#4f8cff)_12%,transparent)] text-[var(--luca-info,#4f8cff)]",
  "permission-required": "border-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_12%,transparent)] text-[var(--luca-warning,#f2b23e)]",
  "api-required": "border-[color-mix(in_srgb,var(--luca-accent-primary,#9b7cff)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-accent-primary,#9b7cff)_12%,transparent)] text-[var(--luca-accent-primary,#9b7cff)]",
  "desktop-required": "border-white/15 bg-white/[0.06] text-white/70",
  "mobile-app-required": "border-white/15 bg-white/[0.06] text-white/70",
  "paired-host-required": "border-[color-mix(in_srgb,var(--luca-info,#4f8cff)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-info,#4f8cff)_12%,transparent)] text-[var(--luca-info,#4f8cff)]",
  "connector-required": "border-[color-mix(in_srgb,var(--luca-accent-primary,#9b7cff)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-accent-primary,#9b7cff)_12%,transparent)] text-[var(--luca-accent-primary,#9b7cff)]",
  unsupported: "border-white/10 bg-black/20 text-white/40",
  unknown: "border-white/10 bg-white/[0.03] text-white/45",
};

interface WebCapabilityPanelProps {
  title: string;
  eyebrow: string;
  capabilities: WebCapability[];
  compact?: boolean;
  grouped?: Array<{ title: string; capabilityIds: string[] }>;
}

export function WebCapabilityPanel({
  title,
  eyebrow,
  capabilities,
  compact = false,
  grouped,
}: WebCapabilityPanelProps) {
  const groups = grouped ?? [
    { title: "", capabilityIds: capabilities.map((item) => item.id) },
  ];

  return (
    <section className="rounded-[1.6rem] border border-white/10 bg-white/[0.045] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.25)] backdrop-blur-2xl sm:p-6">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-[var(--luca-info,#4f8cff)]">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">
        {title}
      </h2>
      <div className="mt-5 grid gap-6">
        {groups.map((group) => {
          const items = group.capabilityIds
            .map((id) => capabilities.find((item) => item.id === id))
            .filter((item): item is WebCapability => item !== undefined);
          if (items.length === 0) return null;

          return (
            <div key={group.title || "capabilities"}>
              {group.title && (
                <h3 className="mb-3 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-white/45">
                  {group.title}
                </h3>
              )}
              <div className={`grid gap-3 ${compact ? "" : "md:grid-cols-2"}`}>
                {items.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-white/[0.07] bg-black/20 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <h4 className="text-sm font-medium text-white/90">{item.label}</h4>
                      <span
                        className={`shrink-0 rounded-full border px-2.5 py-1 text-[0.58rem] font-semibold uppercase tracking-[0.12em] ${STATUS_STYLES[item.status]}`}
                      >
                        {STATUS_LABELS[item.status]}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-white/45">{item.detail}</p>
                    {item.unlockOptions.length > 0 && (
                      <div className="mt-3 border-t border-white/[0.07] pt-3">
                        <p className="text-[0.58rem] font-semibold uppercase tracking-[0.16em] text-[var(--luca-info,#4f8cff)]">
                          Route unlock options
                        </p>
                        <ul className="mt-2 grid gap-1.5">
                          {item.unlockOptions.map((route) => (
                            <li key={route} className="flex gap-2 text-[0.68rem] leading-4 text-white/55">
                              <span className="text-[var(--luca-info,#4f8cff)]">→</span>
                              {ROUTE_LABELS[route]}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
