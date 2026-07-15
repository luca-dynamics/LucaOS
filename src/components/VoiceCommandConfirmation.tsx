import React from "react";
import PropTypes from "prop-types";
import { Icon } from "./ui/Icon";
import {
  lucaMaterialCardStyle,
  lucaMaterialControlStyle,
  lucaMaterialDialogStyle,
  lucaMaterialMetricStyle,
} from "../styles/lucaMaterialSystem";
import { LucaDialog, LucaDialogOverlay } from "./ui/luca";

interface VoiceCommandConfirmationProps {
  originalTranscript: string;
  interpretedCommand: string;
  confidence?: number;
  isRisky: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const VoiceCommandConfirmation: React.FC<
  VoiceCommandConfirmationProps
> = ({
  originalTranscript,
  interpretedCommand,
  confidence,
  isRisky,
  onConfirm,
  onCancel,
}) => {
  return (
    <LucaDialogOverlay className="bg-black/70 p-4" layer={isRisky ? "critical" : "modal"} closeOnBackdrop={false} onRequestClose={onCancel}>
      <LucaDialog
        modal
        modalRole="alertdialog"
        onRequestClose={onCancel}
        className="w-full max-w-md rounded-2xl border p-6 shadow-2xl animate-in zoom-in-95 duration-200"
        aria-label={isRisky ? "Confirm risky voice command" : "Confirm voice command"}
        style={{
          ...lucaMaterialDialogStyle,
          borderColor: isRisky
            ? "color-mix(in srgb, var(--luca-danger,#f87171) 32%, transparent)"
            : "var(--luca-border-strong, var(--app-border-main))",
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          {isRisky ? (
            <Icon name="Danger" className="text-[var(--luca-danger,#f87171)]" size={24} />
          ) : (
            <Icon name="Microphone" size={24} style={{ color: "var(--app-primary)" }} />
          )}
          <h2 className="text-xl font-bold text-[var(--luca-text-primary)]">
            {isRisky ? "Confirm Risky Command" : "Confirm Command"}
          </h2>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="mb-1 block font-mono text-xs uppercase tracking-widest text-[var(--luca-text-tertiary)]">
              What You Said
            </label>
            <div className="rounded-lg border p-3 text-sm" style={lucaMaterialCardStyle}>
              &quot;{originalTranscript}&quot;
            </div>
          </div>

          <div>
            <label className="mb-1 block font-mono text-xs uppercase tracking-widest text-[var(--luca-text-tertiary)]">
              LUCA Interpreted
            </label>
            <div
              className="rounded-lg border p-3 text-sm font-bold text-[var(--luca-accent-primary)]"
              style={{
                ...lucaMaterialCardStyle,
                borderColor: "color-mix(in srgb, var(--luca-accent-primary) 32%, transparent)",
              }}
            >
              &quot;{interpretedCommand}&quot;
            </div>
          </div>

          {confidence !== undefined && (
            <div>
              <label className="mb-1 block font-mono text-xs uppercase tracking-widest text-[var(--luca-text-tertiary)]">
                Recognition Confidence
              </label>
              <div className="flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full" style={lucaMaterialMetricStyle}>
                  <div
                    className={`h-full ${
                      confidence > 0.8
                        ? "bg-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_12%,transparent)]"
                        : confidence > 0.6
                          ? "bg-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_12%,transparent)]"
                          : "bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)]"
                    }`}
                    style={{ width: `${confidence * 100}%` }}
                  />
                </div>
                <span className="font-mono text-xs text-[var(--luca-text-secondary)]">
                  {(confidence * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          )}

          {isRisky && (
            <div className="bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)] border border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)] rounded-lg p-3 flex items-start gap-2">
              <Icon name="Danger" className="text-[var(--luca-danger,#f87171)] shrink-0" size={16} />
              <p className="text-xs text-[var(--luca-danger,#f87171)]">
                This command may have destructive effects. Please confirm
                this is what you intended.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="luca-material-pressable flex flex-1 items-center justify-center gap-2 rounded-lg border py-3 font-bold transition-colors hover:text-[var(--luca-text-primary)]"
            style={lucaMaterialControlStyle}
          >
            <Icon name="CloseCircle" size={18} />
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`luca-material-pressable flex flex-1 items-center justify-center gap-2 rounded-lg border py-3 font-bold transition-colors ${isRisky ? "border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)] text-[var(--luca-danger,#f87171)]" : "border-transparent bg-[var(--luca-accent-primary)] text-[var(--luca-accent-ink,#0c0e12)]"}`}
          >
            <Icon name="CheckCircle" size={18} />
            Confirm
          </button>
        </div>
      </LucaDialog>
    </LucaDialogOverlay>
  );
};

VoiceCommandConfirmation.propTypes = {
  originalTranscript: PropTypes.string.isRequired,
  interpretedCommand: PropTypes.string.isRequired,
  confidence: PropTypes.number,
  isRisky: PropTypes.bool.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default VoiceCommandConfirmation;
