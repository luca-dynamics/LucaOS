import React, { useMemo, useState } from "react";
import type { LucaExperienceMode } from "../../experience/experienceMode";
import {
  cancelMemoryReviewPreview,
  confirmMemoryReviewPreview,
  createMemoryReviewActionPreview,
  createMemoryReviewWorkflowState,
  selectMemoryReviewItem,
  createPersonalIntelligenceReviewOperationSummary,
} from "../../personal-intelligence/reviewWorkflow";
import type { PersonalMemoryControlAction } from "../../personal-intelligence/memoryControls";
import type { PersonalMemoryGraph } from "../../personal-intelligence/memoryGraph";

interface PersonalIntelligenceReviewWorkflowPanelProps {
  readonly graph: PersonalMemoryGraph;
  readonly mode: LucaExperienceMode;
  readonly now?: Date;
}

function labelForAction(action: PersonalMemoryControlAction): string {
  switch (action) {
    case "approve_memory":
      return "Approve";
    case "deny_memory":
      return "Deny";
    case "forget_memory":
      return "Forget";
    case "correct_memory":
      return "Correct";
    case "edit_memory":
      return "Edit";
    case "make_temporary":
      return "Temporary";
    case "make_private":
      return "Private";
    case "mark_do_not_sync":
      return "Do not sync";
    case "mark_sync_allowed":
      return "Allow sync";
    case "archive_memory":
      return "Archive";
    case "restore_memory":
      return "Restore";
  }
}

const PersonalIntelligenceReviewWorkflowPanel: React.FC<PersonalIntelligenceReviewWorkflowPanelProps> = ({
  graph,
  mode,
  now,
}) => {
  const baseState = useMemo(
    () => createMemoryReviewWorkflowState(graph, { mode, now }),
    [graph, mode, now],
  );
  const [workflowState, setWorkflowState] = useState(baseState);

  React.useEffect(() => {
    setWorkflowState(baseState);
  }, [baseState]);

  const selectedMemoryId = workflowState.selection?.targetMemoryId;
  const preview = workflowState.preview;
  const result = workflowState.result;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3" data-testid="personal-intelligence-review-workflow-panel">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--app-text-main)]">
            Interactive review
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-[var(--app-text-muted)]">
            Select an item, preview an action, then confirm or cancel a local intent. No memory changes have been applied.
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-sky-400/20 bg-sky-400/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-sky-200">
          Local only
        </span>
      </div>

      <div className="mt-3 space-y-2">
        {workflowState.items.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-black/10 p-2 text-[10px] italic text-[var(--app-text-muted)]">
            No memory review items are waiting. No memory changes have been applied.
          </div>
        ) : (
          workflowState.items.slice(0, 5).map((item) => (
            <div
              key={item.memoryId}
              className={`rounded-lg border p-2 ${selectedMemoryId === item.memoryId ? "border-amber-300/40 bg-amber-300/10" : "border-white/10 bg-black/10"}`}
            >
              <button
                type="button"
                className="block w-full text-left"
                onClick={() => setWorkflowState((current) => selectMemoryReviewItem(current, item.memoryId))}
                aria-label={`Select ${item.title}`}
              >
                <div className="text-xs font-bold text-[var(--app-text-main)]">{item.title}</div>
                <div className="mt-1 text-[10px] leading-relaxed text-[var(--app-text-muted)]">{item.detail}</div>
              </button>
              {mode !== "basic" && (
                <div className="mt-1 flex flex-wrap gap-1 text-[9px] uppercase tracking-widest text-[var(--app-text-muted)]">
                  {item.category && <span>{item.category}</span>}
                  {item.sensitivity && <span>{item.sensitivity}</span>}
                  {item.staleness && <span>{item.staleness}</span>}
                  {item.reasonCount !== undefined && <span>{item.reasonCount} reasons</span>}
                </div>
              )}
              {mode === "creator" && item.audit && (
                <div className="mt-1 text-[9px] uppercase tracking-widest text-[var(--app-text-muted)]">
                  Audit id {item.audit.safeMemoryId} · evidence {item.audit.evidenceCount}
                </div>
              )}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {item.suggestedActions.slice(0, 4).map((action) => (
                  <button
                    key={action}
                    type="button"
                    className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-[var(--app-text-main)] hover:border-sky-300/40"
                    onClick={() => {
                      const selected = createMemoryReviewActionPreview(
                        graph,
                        baseState,
                        item.memoryId,
                        action,
                        { now },
                      );
                      setWorkflowState(selected);
                    }}
                  >
                    {labelForAction(action)}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {preview && (
        <div className="mt-3 rounded-xl border border-amber-300/20 bg-amber-300/10 p-3">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-100">
            Preview-only result
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-amber-100/75">{preview.summary}</p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[9px] uppercase tracking-widest text-amber-100/75">
            <span>Confirmation {preview.requiresConfirmation ? "required" : "optional"}</span>
            <span>Persistence deferred</span>
            <span>Side effects none</span>
            <span>No memory changes applied</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-100"
              onClick={() => setWorkflowState((current) => confirmMemoryReviewPreview(current))}
            >
              Confirm intent
            </button>
            <button
              type="button"
              className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-[var(--app-text-main)]"
              onClick={() => setWorkflowState((current) => cancelMemoryReviewPreview(current))}
            >
              Cancel preview
            </button>
          </div>
        </div>
      )}

      {result && mode === "creator" && (
        <div className="mt-3 rounded-xl border border-white/10 bg-black/10 p-2 text-[9px] uppercase tracking-widest text-[var(--app-text-muted)]">
          <div>Workflow phase: {workflowState.phase}</div>
          <div>persistencePerformed: false</div>
          <div>sideEffectsPerformed: false</div>
          <div>{createPersonalIntelligenceReviewOperationSummary(result)}</div>
        </div>
      )}

      {result?.phase === "confirmed" && (
        <div className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-2 text-[10px] leading-relaxed text-emerald-100/80">
          Confirmation records intent only; persistence is deferred. No memory changes have been applied.
        </div>
      )}
      {result?.phase === "cancelled" && (
        <div className="mt-3 rounded-xl border border-white/10 bg-black/10 p-2 text-[10px] leading-relaxed text-[var(--app-text-muted)]">
          Preview cancelled. No memory changes have been applied.
        </div>
      )}

      <p className="mt-3 text-[10px] leading-relaxed text-[var(--app-text-muted)]">
        Changes require your confirmation. Manage memory settings in Settings. Confirmation records intent only; persistence is deferred.
      </p>
    </div>
  );
};

export default PersonalIntelligenceReviewWorkflowPanel;
