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
    return (
      <div className="flex items-center gap-1">
        {LUCA_ROUTING_MODES.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => handleChange(m)}
            title={ROUTING_MODE_DESCRIPTIONS[m]}
            className={`rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest transition-colors ${
              mode === m
                ? "border border-white/20 bg-white/10 text-[var(--app-text-main)]"
                : "border border-transparent bg-transparent text-[var(--app-text-muted)] hover:text-[var(--app-text-main)]"
            }`}
            style={mode === m && theme?.hex ? { borderColor: `${theme.hex}40`, color: theme.hex } : undefined}
          >
            {ROUTING_MODE_SHORT_LABELS[m]}
          </button>
        ))}
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
