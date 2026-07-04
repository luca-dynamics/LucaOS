import React from "react";

interface QuickActionsSectionProps {
  isLight: boolean;
  isLightCream: boolean;
  onAgentMode: () => void;
  onCognitiveEngine: () => void;
  onLockdown: () => void;
}

/**
 * QUICK ACTIONS (panel-interiors-target): three quiet rows in the rail's one
 * language — no tile grid, no glass card. "Pause all actions" is the safety
 * action (LEVEL_3, behaviour unchanged): neutral at rest, danger only on
 * hover/focus so the resting rail never reads as an alarm.
 *
 * TODO: direct high-risk actions like Lockdown should eventually route through
 * the governed action request / provenance gate services rather than calling
 * executeTool directly. Not wired in this UI refactor.
 */
const QuickActionsSection: React.FC<QuickActionsSectionProps> = ({
  onAgentMode,
  onCognitiveEngine,
  onLockdown,
}) => {
  const [lockdownHovered, setLockdownHovered] = React.useState(false);

  const row =
    "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-[rgba(127,127,127,0.09)]";
  const dot: React.CSSProperties = {
    background: "var(--luca-border-strong, rgba(255,255,255,0.18))",
  };
  const label: React.CSSProperties = {
    color: "var(--luca-text-secondary, var(--app-text-muted))",
  };

  return (
    <div>
      <p
        className="px-2 pb-1 text-[11px]"
        style={{ color: "var(--luca-text-tertiary, var(--app-text-muted))" }}
      >
        Quick actions
      </p>
      <button type="button" onClick={onAgentMode} className={row}>
        <span className="h-1.5 w-1.5 flex-none rounded-full" style={dot} aria-hidden="true" />
        <span className="text-[12.5px]" style={label}>
          Agent mode
        </span>
      </button>
      <button type="button" onClick={onCognitiveEngine} className={row}>
        <span className="h-1.5 w-1.5 flex-none rounded-full" style={dot} aria-hidden="true" />
        <span className="text-[12.5px]" style={label}>
          Cognitive engine
        </span>
      </button>
      <button
        type="button"
        onClick={onLockdown}
        onMouseEnter={() => setLockdownHovered(true)}
        onMouseLeave={() => setLockdownHovered(false)}
        onFocus={() => setLockdownHovered(true)}
        onBlur={() => setLockdownHovered(false)}
        className={row}
        style={
          lockdownHovered
            ? { background: "color-mix(in srgb, var(--luca-danger, #f87171) 10%, transparent)" }
            : undefined
        }
      >
        <span
          className="h-1.5 w-1.5 flex-none rounded-full"
          style={
            lockdownHovered ? { background: "var(--luca-danger, #f87171)" } : dot
          }
          aria-hidden="true"
        />
        <span
          className="text-[12.5px] transition-colors"
          style={
            lockdownHovered ? { color: "var(--luca-danger, #f87171)" } : label
          }
        >
          Pause all actions
        </span>
      </button>
    </div>
  );
};

export default QuickActionsSection;
