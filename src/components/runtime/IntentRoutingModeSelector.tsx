// IntentRoutingModeSelector — PR #123: Intent Routing Layer
// Small selector for AUTO | FAST | PLAN | AGENT routing mode.
// Does NOT route by itself. Does NOT execute anything.

import React, { useEffect, useState } from "react";
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

  useEffect(() => {
    const unsub = intentRoutingModeService.subscribe((next) => setMode(next));
    return unsub;
  }, []);

  const handleChange = (next: LucaRoutingMode) => {
    intentRoutingModeService.setMode(next);
  };

  if (compact) {
    // One cohesive segmented control (a single rounded track holding the four
    // segments), matching the other composer controls — not four loose buttons.
    return (
      <div
        role="group"
        aria-label="Routing mode"
        className="inline-flex items-center gap-0.5 rounded-lg border p-0.5"
        style={{
          borderColor: "var(--luca-border-subtle, var(--app-border-main))",
          backgroundColor: "var(--luca-surface-glass, transparent)",
        }}
      >
        {LUCA_ROUTING_MODES.map((m) => {
          const active = mode === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => handleChange(m)}
              title={ROUTING_MODE_DESCRIPTIONS[m]}
              aria-pressed={active}
              className="rounded-md px-2 py-1 text-[11px] font-semibold transition-all"
              style={
                active
                  ? {
                      backgroundColor: "var(--luca-surface-hover)",
                      color:
                        theme?.hex ||
                        "var(--luca-text-primary, var(--app-text-main))",
                    }
                  : { color: "var(--luca-text-tertiary, var(--app-text-muted))" }
              }
            >
              {ROUTING_MODE_SHORT_LABELS[m]}
            </button>
          );
        })}
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
