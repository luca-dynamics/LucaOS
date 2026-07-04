// IntentRoutingModeSelector — PR #123: Intent Routing Layer
// Small selector for AUTO | FAST | PLAN | AGENT routing mode.
// Does NOT route by itself. Does NOT execute anything.

import React, { useEffect, useRef, useState } from "react";
import { Icon } from "../ui/Icon";
import { intentRoutingModeService } from "../../services/runtime/IntentRoutingModeService";
import type { LucaRoutingMode } from "../../types/intentRouting";
import {
  LUCA_ROUTING_MODES,
  ROUTING_MODE_SHORT_LABELS,
  ROUTING_MODE_DESCRIPTIONS,
} from "../../types/intentRouting";

interface IntentRoutingModeSelectorProps {
  theme?: { hex?: string; primary?: string };
  compact?: boolean;
}

const IntentRoutingModeSelector: React.FC<IntentRoutingModeSelectorProps> = ({ theme, compact }) => {
  const [mode, setMode] = useState<LucaRoutingMode>(intentRoutingModeService.getMode());
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = intentRoutingModeService.subscribe((next) => setMode(next));
    return unsub;
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleChange = (next: LucaRoutingMode) => {
    intentRoutingModeService.setMode(next);
  };

  if (compact) {
    // One trigger + dropdown (owner call: the four side-by-side segments
    // crowded the composer). The menu opens UPWARD — the composer lives at
    // the bottom of the canvas — and carries each mode's description, which
    // the segments never had room for.
    return (
      <div ref={rootRef} className="relative inline-flex">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          title={ROUTING_MODE_DESCRIPTIONS[mode]}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors hover:bg-[var(--luca-surface-hover,var(--app-bg-tint))]"
          style={{
            borderColor: "var(--luca-border-subtle, var(--app-border-main))",
            backgroundColor: "var(--luca-surface-glass, transparent)",
            color: "var(--luca-text-primary, var(--app-text-main))",
          }}
        >
          {ROUTING_MODE_SHORT_LABELS[mode]}
          <Icon
            name="AltArrowUp"
            size={12}
            className="text-[var(--app-text-muted)]"
          />
        </button>
        {open && (
          <div
            role="menu"
            aria-label="Routing mode"
            className="absolute bottom-full left-0 z-[70] mb-1.5 w-[224px]"
            style={{
              background:
                "var(--luca-background-elevated, var(--app-bg-main, #14181d))",
              border:
                "1px solid var(--luca-border-subtle, rgba(255,255,255,0.08))",
              borderRadius: 12,
              boxShadow:
                "0 18px 48px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)",
              padding: 4,
            }}
          >
            {LUCA_ROUTING_MODES.map((m) => {
              const active = mode === m;
              return (
                <button
                  key={m}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => {
                    handleChange(m);
                    setOpen(false);
                  }}
                  className="flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:bg-[var(--luca-surface-hover,rgba(255,255,255,0.06))]"
                >
                  <span className="min-w-0 flex-1">
                    <span
                      className="block text-[12.5px] font-semibold"
                      style={{
                        color: active
                          ? "var(--luca-accent-primary, var(--app-text-main))"
                          : "var(--luca-text-primary, var(--app-text-main))",
                      }}
                    >
                      {ROUTING_MODE_SHORT_LABELS[m]}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-[var(--app-text-muted)]">
                      {ROUTING_MODE_DESCRIPTIONS[m]}
                    </span>
                  </span>
                  {active && (
                    <Icon
                      name="CheckCircle"
                      size={14}
                      className="mt-0.5 flex-none"
                      style={{
                        color: "var(--luca-accent-primary, var(--app-text-main))",
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="text-[9px] font-black uppercase tracking-widest text-[var(--app-text-muted)]">Routing mode</div>
      <div className="flex flex-wrap gap-1">
        {LUCA_ROUTING_MODES.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => handleChange(m)}
            title={ROUTING_MODE_DESCRIPTIONS[m]}
            className={`rounded-lg border px-2 py-1 text-[9px] font-black uppercase tracking-widest transition-colors ${
              mode === m
                ? "border-white/20 bg-white/10 text-[var(--app-text-main)]"
                : "border-white/5 bg-white/[0.02] text-[var(--app-text-muted)] hover:bg-white/5 hover:text-[var(--app-text-main)]"
            }`}
            style={mode === m && theme?.hex ? { borderColor: `${theme.hex}40`, color: theme.hex } : undefined}
          >
            {ROUTING_MODE_SHORT_LABELS[m]}
          </button>
        ))}
      </div>
      <div className="text-[9px] leading-relaxed text-[var(--app-text-muted)]">
        {ROUTING_MODE_DESCRIPTIONS[mode]}
      </div>
    </div>
  );
};

export default IntentRoutingModeSelector;
