import React, { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { motion } from "framer-motion";

/**
 * Workforce graph nodes (workforce-target): agents and tasks as living
 * session cards in the shell's exact vocabulary — hairline cards, tone dots
 * (accent working · dim done · danger only for real failure), plain
 * language. The contextual viewport (live terminal / browser snapshot
 * inside an executing task) is kept — it is the most honest pixel in the
 * app — just dressed calmly.
 */

const CARD: React.CSSProperties = {
  background: "var(--luca-background-base, #111417)",
  border: "1px solid var(--luca-border-subtle, rgba(255,255,255,0.07))",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.03), 0 10px 30px -14px rgba(0,0,0,0.6)",
};

const HANDLE = "!w-1.5 !h-1.5 !border-0 !bg-[rgba(255,255,255,0.18)]";

const AGENT_LABELS: Record<string, string> = {
  HACKER: "Security agent",
  ENGINEER: "Engineer agent",
  BROWSER: "Browser agent",
};

// --- MISSION (GOAL) NODE ---
export const GoalNode = memo(({ data }: any) => {
  return (
    <div className="rounded-2xl px-5 py-4 min-w-[220px] max-w-[280px]" style={CARD}>
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--luca-text-tertiary,var(--app-text-muted))]">
        Mission
      </div>
      <div className="mt-1 text-[13px] font-medium leading-snug text-[var(--luca-text-primary,var(--app-text-main))] break-words">
        {data.label}
      </div>
      <Handle type="source" position={Position.Bottom} className={HANDLE} />
    </div>
  );
});

// --- AGENT NODE ---
export const AgentNode = memo(({ data }: any) => {
  const { persona, status } = data;
  const working = status === "in-progress";
  const label = AGENT_LABELS[persona] ?? "Agent";

  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className={HANDLE} />
      <div
        className="rounded-xl px-4 py-3 min-w-[160px]"
        style={{
          ...CARD,
          border: working
            ? "1px solid color-mix(in srgb, var(--luca-accent-primary, #7aa2ff) 30%, transparent)"
            : (CARD.border as string),
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className={`h-1.5 w-1.5 flex-none rounded-full ${working ? "animate-pulse" : ""}`}
            style={{
              background: working
                ? "var(--luca-success, #4fbf7a)"
                : "rgba(255,255,255,0.22)",
            }}
            aria-hidden="true"
          />
          <span className="text-[12.5px] font-semibold text-[var(--luca-text-primary,var(--app-text-main))]">
            {label}
          </span>
        </div>
        <div className="mt-0.5 pl-3.5 text-[11px] text-[var(--luca-text-tertiary,var(--app-text-muted))]">
          {String(status || "idle").replace(/-/g, " ")}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className={HANDLE} />
    </div>
  );
});

// --- TASK NODE ---
export const TaskNode = memo(({ data }: any) => {
  const { task, status, persona } = data;
  const isExecuting = status === "in-progress";
  const isComplete = status === "complete";
  const isFailed = status === "failed";

  const snapshot = task.snapshot;
  const dot = isExecuting
    ? "var(--luca-accent-primary, #7aa2ff)"
    : isComplete
      ? "var(--luca-success, #4fbf7a)"
      : isFailed
        ? "var(--luca-danger, #f87171)"
        : "rgba(255,255,255,0.22)";

  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className={HANDLE} />
      <div
        className={`rounded-xl p-3 min-w-[190px] max-w-[250px] flex flex-col gap-2 transition-colors ${isComplete ? "opacity-70" : ""}`}
        style={{
          ...CARD,
          border: isExecuting
            ? "1px solid color-mix(in srgb, var(--luca-accent-primary, #7aa2ff) 30%, transparent)"
            : isFailed
              ? "1px solid color-mix(in srgb, var(--luca-danger, #f87171) 35%, transparent)"
              : (CARD.border as string),
        }}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <span
            className={`h-1.5 w-1.5 rounded-full shrink-0 ${isExecuting ? "animate-pulse" : ""}`}
            style={{ background: dot }}
            aria-hidden="true"
          />
          <span className="truncate text-[12px] text-[var(--luca-text-secondary,var(--app-text-muted))]">
            {task.description}
          </span>
        </div>

        {/* Contextual viewport — the agent's actual work, live. */}
        {isExecuting && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="overflow-hidden rounded-lg"
            style={{
              background: "rgba(0,0,0,0.35)",
              border: "1px solid var(--luca-border-subtle, rgba(255,255,255,0.05))",
            }}
          >
            {persona === "ENGINEER" && snapshot?.terminal && (
              <div className="p-2 font-mono text-[9px] leading-relaxed text-[var(--luca-text-secondary,#9aa4b2)]">
                {snapshot.terminal.slice(-4).map((line: string, i: number) => (
                  <div key={i} className="truncate opacity-90">{line}</div>
                ))}
              </div>
            )}
            {persona === "BROWSER" && snapshot?.browserScreenshot && (
              <div className="relative aspect-video overflow-hidden">
                <img
                  src={snapshot.browserScreenshot}
                  className="h-full w-full object-cover opacity-70"
                  alt="What the browser agent sees"
                />
              </div>
            )}
            {!snapshot && (
              <div className="p-2 text-center text-[10px] text-[var(--luca-text-tertiary,var(--app-text-muted))]">
                working…
              </div>
            )}
          </motion.div>
        )}

        {isComplete && task.result && (
          <div className="truncate pl-3.5 text-[10.5px] text-[var(--luca-text-tertiary,var(--app-text-muted))]">
            {typeof task.result === "string" ? task.result : "Done."}
          </div>
        )}
        {isFailed && (
          <div className="pl-3.5 text-[10.5px] text-[var(--luca-danger,#f87171)]">
            Failed — Luca will report why in chat.
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className={`${HANDLE} opacity-0`} />
    </div>
  );
});

GoalNode.displayName = "GoalNode";
AgentNode.displayName = "AgentNode";
TaskNode.displayName = "TaskNode";

