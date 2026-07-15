import React, { useEffect, useState } from "react";
import { Icon } from "./ui/Icon";
import { soundService } from "../services/soundService";
import { lucaMaterialDialogStyle } from "../styles/lucaMaterialSystem";
import { LucaDialog, LucaDialogOverlay } from "./ui/luca";

interface Props {
  onGrant: () => void;
  onDeny: () => void;
  justification?: string;
}

const AdminGrantModal: React.FC<Props> = ({
  onGrant,
  onDeny,
  justification,
}) => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    soundService.play("ALERT");
    const t1 = setTimeout(() => setStep(1), 500);
    const t2 = setTimeout(() => setStep(2), 1500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <LucaDialogOverlay className="bg-black/75 animate-in fade-in duration-300 font-mono" layer="critical" closeOnBackdrop={false} onRequestClose={onDeny}>
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.15)_0%,transparent_70%)]"></div>
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(45deg,rgba(0,0,0,0)_49.9%,rgba(220,38,38,0.5)_50%,rgba(0,0,0,0)_50.1%)] bg-[size:10px_10px]"></div>

      <LucaDialog
        modal
        modalRole="alertdialog"
        onRequestClose={onDeny}
        className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)]"
        aria-label="Administrator authorization request"
        style={{
          ...lucaMaterialDialogStyle,
          borderColor: "color-mix(in srgb, var(--luca-danger,#f87171) 32%, transparent)",
          boxShadow: "0 0 100px color-mix(in srgb, var(--luca-danger,#f87171) 20%, transparent)",
        }}
      >
        {/* Header */}
        <div className="bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)] text-black p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Icon name="ShieldCheck" variant="BoldDuotone" size={32} className="animate-pulse" />
            <div>
              <h2 className="font-display text-2xl font-black tracking-[0.2em] uppercase">
                ROOT ACCESS REQUEST
              </h2>
              <div className="text-xs font-bold opacity-80">
                SYSTEM KERNEL // PRIVILEGE ESCALATION
              </div>
            </div>
          </div>
          <div className="border-l-2 border-black/20 pl-4 ml-4">
            <div className="text-[10px] font-bold">IDENTITY</div>
            <div className="font-mono text-lg font-bold">LUCA CORE</div>
          </div>
        </div>

        {/* Body */}
        <div className="p-8 space-y-8">
          {/* Warning Block */}
          <div className="flex gap-6">
            <div className="p-4 bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)] border border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)] rounded flex items-center justify-center h-fit">
              <Icon name="Lock" size={48} className="text-[var(--luca-danger,#f87171)]" />
            </div>
            <div className="space-y-4 flex-1">
              <div className="text-[var(--luca-danger,#f87171)] font-bold tracking-widest text-sm flex items-center gap-2">
                <Icon name="Danger" size={16} /> SECURITY WARNING
              </div>

              {/* Justification Box */}
              <div className="bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)] border-l-2 border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)] p-3 text-xs">
                <div className="flex items-center gap-2 text-[var(--luca-danger,#f87171)] font-bold mb-1 uppercase">
                  <Icon name="Document" size={12} /> Request Justification:
                </div>
                <div className="text-white font-mono leading-relaxed italic">
                {justification || "SYSTEM OVERRIDE REQUIRED FOR AUTONOMOUS ACTION"}
                </div>
              </div>

              <p className="text-slate-300 text-sm leading-relaxed">
                The autonomous agent is requesting{" "}
                <strong className="text-white">
                  UNRESTRICTED ADMINISTRATIVE ACCESS
                </strong>{" "}
                (Ring 0).
              </p>
              <ul className="space-y-2 text-xs text-slate-400 border-l-2 border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)] pl-4">
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)] rounded-full"></div>
                  Bypass all safety protocols and human-in-the-loop gates.
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)] rounded-full"></div>
                  Read/Write access to protected system directories.
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)] rounded-full"></div>
                  Execute arbitrary shell commands as Administrator/Root.
                </li>
              </ul>
            </div>
          </div>

          {/* Terminal Simulation */}
          <div className="bg-black border border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)] p-4 rounded font-mono text-xs h-32 overflow-hidden relative">
            <div className="text-slate-500 border-b border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)] pb-1 mb-2 flex justify-between">
              <span>SYS LOG PREVIEW</span>
              <span className="text-[var(--luca-danger,#f87171)]">LIVE</span>
            </div>
            <div className="space-y-1 text-[var(--luca-danger,#f87171)]">
              <div>&gt; Initiating handshake... OK</div>
              {step >= 1 && (
                <div>&gt; Verifying cryptographic signatures... VALID</div>
              )}
              {step >= 2 && (
                <div>
                  &gt; Requesting SUDO token...{" "}
                  <span className="animate-pulse text-white">
                    WAITING FOR USER
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Area */}
          <div className="grid grid-cols-2 gap-6 pt-4">
            <button
              onClick={onDeny}
              className="group py-5 border border-slate-700 bg-slate-900/50 hover:bg-slate-800 hover:border-slate-500 text-slate-400 hover:text-white font-bold tracking-[0.2em] text-sm transition-all flex items-center justify-center gap-3"
            >
              <Icon name="CloseCircle" size={18} /> DENY ACCESS
            </button>
            <button
              onClick={() => {
                soundService.play("SUCCESS");
                onGrant();
              }}
              className="group relative overflow-hidden py-5 bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)] hover:bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)] text-black font-black tracking-[0.2em] text-sm transition-all flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(220,38,38,0.3)] hover:shadow-[0_0_50px_rgba(220,38,38,0.6)]"
            >
              <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[size:250%_250%] animate-[shine_2s_infinite]"></div>
              <Icon
                name="Fingerprint"
                size={20}
                className="group-hover:scale-110 transition-transform"
              />
              GRANT FULL CONTROL
            </button>
          </div>

          <div className="text-center">
            <div className="text-[9px] text-[var(--luca-danger,#f87171)] font-mono uppercase tracking-widest">
              By clicking Grant, you accept full liability for autonomous
              actions.
            </div>
          </div>
        </div>
      </LucaDialog>
    </LucaDialogOverlay>
  );
};

export default AdminGrantModal;
