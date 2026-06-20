import React from "react";
import { Icon } from "./ui/Icon";

export type StepStatus =
  | "PENDING"
  | "PROCESSING"
  | "SUCCESS"
  | "ERROR"
  | "SKIPPED"
  | "COMPLETE";

export interface PipelineStep {
  id: string;
  label: string;
  status: StepStatus;
  toolName?: string;
  details?: string;
  duration?: number;
  error?: string;
}

interface ExecutionPipelineProps {
  steps: PipelineStep[];
  currentStep?: string;
  onStepClick?: (stepId: string) => void;
}

const ExecutionPipeline: React.FC<ExecutionPipelineProps> = ({
  steps,
  currentStep,
  onStepClick,
}) => {
  const getStatusIcon = (status: StepStatus) => {
    switch (status) {
      case "SUCCESS":
        return (
          <Icon name="CheckCircle2" size={12} className="text-[var(--luca-success,#4fbf7a)] sm:w-4 sm:h-4" />
        );
      case "ERROR":
        return <Icon name="XCircle" size={12} className="text-[var(--luca-danger,#f87171)] sm:w-4 sm:h-4" />;
      case "PROCESSING":
        return (
          <Icon
            name="Loader2"
            size={12}
            className="text-[var(--luca-warning,#f2b23e)] animate-spin sm:w-4 sm:h-4"
          />
        );
      case "SKIPPED":
        return (
          <Icon name="AlertTriangle" size={12} className="text-slate-500 sm:w-4 sm:h-4" />
        );
      default:
        return <Icon name="Clock" size={12} className="text-slate-500 sm:w-4 sm:h-4" />;
    }
  };

  const getStatusColor = (status: StepStatus) => {
    switch (status) {
      case "SUCCESS":
        return "border-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_12%,transparent)]";
      case "ERROR":
        return "border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)]";
      case "PROCESSING":
        return "border-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_12%,transparent)] animate-pulse";
      case "SKIPPED":
        return "border-slate-500 bg-slate-500/10";
      default:
        return "border-slate-700 bg-slate-700/10";
    }
  };

  return (
    <div className="flex flex-col gap-2 p-4">
      {steps.map((step, index) => {
        const isActive = step.id === currentStep;
        const isCompleted =
          step.status === "SUCCESS" || step.status === "ERROR";
        const showConnector = index < steps.length - 1;

        return (
          <div key={step.id} className="flex items-start gap-3">
            {/* Step indicator */}
            <div className="flex flex-col items-center">
              <button
                onClick={() => onStepClick?.(step.id)}
                className={`
                  w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 flex items-center justify-center
                  transition-all duration-300
                  ${getStatusColor(step.status)}
                  ${isActive ? "scale-110 shadow-lg" : ""}
                  ${onStepClick ? "cursor-pointer hover:scale-105" : ""}
                `}
              >
                {getStatusIcon(step.status)}
              </button>

              {/* Connector line */}
              {showConnector && (
                <div
                  className={`
                    w-0.5 h-8 sm:h-12 mt-1 sm:mt-2 transition-all duration-500
                    ${
                      isCompleted
                        ? "bg-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_12%,transparent)]"
                        : step.status === "ERROR"
                        ? "bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)]"
                        : "bg-slate-700"
                    }
                  `}
                />
              )}
            </div>

            {/* Step content */}
            <div
              className={`
                flex-1 p-3 rounded border transition-all duration-300
                ${getStatusColor(step.status)}
                ${isActive ? "shadow-lg scale-105" : ""}
              `}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-sm text-white">
                  {step.label}
                </span>
                {step.duration && (
                  <span className="text-xs text-slate-400">
                    {step.duration.toFixed(2)}s
                  </span>
                )}
              </div>

              {step.toolName && (
                <div className="text-xs text-slate-400 mb-1">
                  Tool: <span className="text-[var(--luca-info,#4f8cff)]">{step.toolName}</span>
                </div>
              )}

              <Icon
                name="BrainCircuit"
                className="text-[var(--luca-accent-primary,#9b7cff)] shrink-0 mt-1"
                size={20}
              />

              {step.details && (
                <div className="text-xs text-slate-300 mt-1">
                  {step.details}
                </div>
              )}

              {step.error && (
                <div className="text-xs text-[var(--luca-danger,#f87171)] mt-2 p-2 bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)] rounded border border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)]">
                  {step.error}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ExecutionPipeline;
