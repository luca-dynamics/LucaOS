import React from "react";
import PropTypes from "prop-types";
import { Icon } from "./ui/Icon";

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
    <div className="fixed inset-0 z-[400] bg-black/80 glass-blur flex items-center justify-center p-4">
      <div
        className="bg-[#0f172a] border rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200 border-[rgba(var(--app-primary-rgb),0.3)] shadow-[0_0_50px_rgba(var(--app-primary-rgb),0.15)]"
      >
        <div className="flex items-center gap-3 mb-4">
          {isRisky ? (
            <Icon name="Danger" className="text-red-400" size={24} />
          ) : (
            <Icon name="Microphone" size={24} style={{ color: "var(--app-primary)" }} />
          )}
          <h2 className="text-xl font-bold text-white">
            {isRisky ? "Confirm Risky Command" : "Confirm Command"}
          </h2>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-1 block">
              What You Said
            </label>
            <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-white text-sm">
              &quot;{originalTranscript}&quot;
            </div>
          </div>

          <div>
            <label className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-1 block">
              LUCA Interpreted
            </label>
            <div
              className="rounded-lg p-3 text-sm font-bold border bg-[rgba(var(--app-primary-rgb),0.1)] border-[rgba(var(--app-primary-rgb),0.3)] text-[var(--app-primary)]"
            >
              &quot;{interpretedCommand}&quot;
            </div>
          </div>

          {confidence !== undefined && (
            <div>
              <label className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-1 block">
                Recognition Confidence
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      confidence > 0.8
                        ? "bg-green-500"
                        : confidence > 0.6
                          ? "bg-yellow-500"
                          : "bg-red-500"
                    }`}
                    style={{ width: `${confidence * 100}%` }}
                  />
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {(confidence * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          )}

          {isRisky && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 flex items-start gap-2">
              <Icon name="Danger" className="text-red-400 shrink-0" size={16} />
              <p className="text-xs text-red-400">
                This command may have destructive effects. Please confirm
                this is what you intended.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Icon name="CloseCircle" size={18} />
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-3 font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${isRisky ? "bg-red-500 text-white" : "bg-[var(--app-primary)] text-black"} shadow-[0_0_20px_rgba(var(--app-primary-rgb),0.2)]`}
          >
            <Icon name="CheckCircle" size={18} />
            Confirm
          </button>
        </div>
      </div>
    </div>
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
