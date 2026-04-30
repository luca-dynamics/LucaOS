import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Icon } from "./ui/Icon";
import { soundService } from "../services/soundService";
import AdminEnrollmentModal from "./AdminEnrollmentModal";
import { lucaService, PersonaType } from "../services/lucaService";

interface Props {
  toolName: string;
  args: any;
  userName: string;
  persona: PersonaType;
  onApprove: () => void;
  onDeny: () => void;
  theme?: any;
}

const SecurityGate: React.FC<Props> = ({
  toolName,
  args,
  userName,
  persona,
  onApprove,
  onDeny,
}) => {
  const [timeLeft, setTimeLeft] = useState(30);
  const [showVerify, setShowVerify] = useState(false);

  useEffect(() => {
    soundService.play("ALERT");
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onDeny();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onDeny]);

  const handleVerificationSuccess = () => {
    soundService.play("SUCCESS");
    setTimeout(() => onApprove(), 1200);
  };

  const isSafetyValve = (args as any)?.isSafetyValve || false;
  const safetyAction = (args as any)?.action || "SYSTEM_ACCESS";
  const safetyMetadata = (args as any)?.metadata || {};
  const safetyMessage =
    (args as any)?.message ||
    "A restricted operation was blocked by safety protocols.";

  const renderSafetyValve = () => {
    return (
      <div className="p-6 flex flex-col gap-6">
        <div className="flex gap-4 items-start">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-red-500/20 to-transparent border border-red-500/30 flex items-center justify-center relative shrink-0 shadow-inner group/icon overflow-hidden">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
                className="absolute inset-0 opacity-20"
              >
                <Icon
                  name="ShieldCheck"
                  variant="BoldDuotone"
                  className="w-full h-full p-4 scale-150"
                  style={{ color: "#ef4444" }}
                />
              </motion.div>
              <Icon name="Lock" className="w-6 h-6 text-red-500 relative z-10" />
            </div>

          <div className="flex-1 space-y-2">
            <h2 className="text-xl font-bold text-white tracking-tight uppercase flex items-center gap-2">
              <span className="text-red-500">Safety Valve</span>
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              Luca&apos;s autonomous action was intercepted by the system&apos;s
              safety protocols. The requested operation is outside of the
              current <span className="text-white font-bold">Safe Mode</span>{" "}
              configuration.
            </p>
          </div>
        </div>

        <div className="bg-red-500/[0.03] border border-red-500/10 rounded-2xl overflow-hidden glass-blur">
          <div className="p-3 border-b border-red-500/10 bg-red-500/[0.02] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon name="Flash" className="w-3 h-3 text-red-500" />
              <span className="text-[9px] font-bold text-red-500/60 uppercase tracking-widest">
                Action Blocked
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[8px] text-red-500/60 uppercase tracking-[0.2em]">
                Restricted
              </span>
            </div>
          </div>
          <div className="p-4 space-y-4 font-mono text-[11px]">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">INTERCEPTED_ACTION</span>
              <span className="text-white font-bold tracking-widest">
                {safetyAction}
              </span>
            </div>
            <div className="space-y-2">
              <span className="text-gray-500 block">PROTOCOL_MESSAGE:</span>
              <div className="p-3 bg-red-950/20 rounded-xl text-red-100/80 border border-red-500/20 leading-relaxed text-[11px] italic">
                &quot;{safetyMessage}&quot;
              </div>
            </div>
            {Object.keys(safetyMetadata).length > 0 && (
              <div className="space-y-2">
                <span className="text-gray-500 block">ACTION_METADATA:</span>
                <pre className="p-3 bg-black/60 rounded-xl text-gray-400 overflow-x-auto border border-white/5 leading-relaxed text-[10px]">
                  {JSON.stringify(safetyMetadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex gap-4">
            <button
              onClick={onDeny}
              className="flex-1 py-4 px-6 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] text-gray-400 hover:text-white font-bold text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
            >
              <Icon name="CloseCircle" size={16} />
              Deny Access
            </button>
            <button
              onClick={onApprove}
              className="flex-[2] py-4 px-6 rounded-2xl text-white font-bold text-xs uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 relative group overflow-hidden active:scale-[0.98] shadow-[0_0_30px_rgba(239,68,68,0.3)] bg-red-600"
            >
              <Icon
                name="ShieldCheck"
                variant="BoldDuotone"
                size={20}
                className="group-hover:scale-110 transition-transform"
              />
              Allow Action (One-Time)
            </button>
          </div>

          <p className="text-[10px] text-center text-gray-500 font-mono tracking-tight">
            Enable{" "}
            <span className="text-[var(--app-primary)] underline cursor-pointer">
              God Mode (Autonomy)
            </span>{" "}
            in settings to grant Luca full machine access.
          </p>
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`fixed z-[999] ${isSafetyValve ? "top-6 right-6" : "inset-0 flex items-center justify-center bg-black/40 glass-blur[20px]"}`}
    >
      {/* Dynamic Background HUD Patterns - Hidden or scoped for Safety Valve */}
      {!isSafetyValve && (
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none overflow-hidden">
          <div className={`absolute inset-0 bg-[#0a0c10] opacity-30`} />

          {isSafetyValve ? (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,0,0,0.1)_0%,transparent_70%)]" />
          ) : persona === "HACKER" ? (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,100,0.1)_0%,transparent_70%)]" />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(var(--app-primary-rgb),0.05)_0%,transparent_70%)]" />
          )}

          <svg width="100%" height="100%" className="absolute inset-0">
            <pattern
              id="circles"
              width="60"
              height="60"
              patternUnits="userSpaceOnUse"
            >
              <circle
                cx="30"
                cy="30"
                r="28"
                fill="none"
                stroke={isSafetyValve ? "#ef4444" : "var(--app-primary)"}
                strokeWidth="0.5"
                strokeOpacity="0.1"
              />
            </pattern>
            <rect width="100%" height="100%" fill="url(#circles)" />
          </svg>
        </div>
      )}

      <motion.div
        initial={
          isSafetyValve
            ? { x: 400, opacity: 0 }
            : { scale: 0.9, y: 20, opacity: 0 }
        }
        animate={
          isSafetyValve ? { x: 0, opacity: 1 } : { scale: 1, y: 0, opacity: 1 }
        }
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className={`relative w-full ${
          isSafetyValve ? "max-w-md" : "max-w-2xl"
        } bg-black/60 border rounded-3xl overflow-hidden shadow-[0_0_80px_-20px_rgba(0,0,0,0.8)] glass-blur`}
        style={{
          borderColor: isSafetyValve
            ? "rgba(239, 68, 68, 0.4)"
            : "rgba(var(--app-primary-rgb), 0.2)",
        }}
      >
        {/* Scanning Line Animation */}
        <motion.div
          animate={{ top: ["0%", "100%", "0%"] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white to-transparent opacity-20 z-10 pointer-events-none"
          style={{
            boxShadow: `0 0 15px ${isSafetyValve ? "#ef4444" : "var(--app-primary)"}`,
          }}
        />

        {/* HUD Top Bar */}
        <div
          className="p-4 border-b flex items-center justify-between bg-white/[0.02]"
          style={{
            borderBottomColor: isSafetyValve
              ? "rgba(239, 68, 68, 0.2)"
              : "rgba(var(--app-primary-rgb), 0.1)",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <Icon
                name="Danger"
                size={20}
                style={{ color: isSafetyValve ? "#ef4444" : "var(--app-primary)" }}
              />
              <motion.div
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="absolute inset-0 blur-sm"
                style={{
                  backgroundColor: isSafetyValve ? "#ef4444" : "var(--app-primary)",
                }}
              />
            </div>
            <span
              className="text-[10px] font-bold uppercase tracking-[0.3em] font-mono"
              style={{ color: isSafetyValve ? "#ef4444" : "var(--app-primary)" }}
            >
              {isSafetyValve
                ? "Luca Safety Valve Intercept"
                : "High-Security Internal Override Gate"}
            </span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[9px]">
            <span className="opacity-40">
              {isSafetyValve
                ? "STATUS: RESTRICTED"
                : "ENCRYPTION: AES-4096-ECC"}
            </span>
            <span className="w-px h-3 bg-white/10" />
            <span className="text-red-500 font-bold">
              TIMELIMIT: {timeLeft}s
            </span>
          </div>
        </div>

        {isSafetyValve ? (
          renderSafetyValve()
        ) : (
          <div className="p-8 flex flex-col gap-8">
            {/* Main Info Section */}
            <div className="flex gap-6 items-start">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-white/5 to-transparent border border-white/10 flex items-center justify-center relative shrink-0 shadow-inner group/icon overflow-hidden">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 10,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="absolute inset-0 opacity-10"
                >
                  <Icon
                    name="Cpu"
                    size={40}
                    style={{ color: "var(--app-primary)" }}
                    className="w-full h-full p-4 scale-150"
                  />
                </motion.div>
                <Icon name="Lock" size={40} className="text-white relative z-10" />
                <div className="absolute inset-0 bg-radial-gradient from-transparent to-black/40" />
              </div>

              <div className="flex-1 space-y-2">
                <h2 className="text-2xl font-bold text-white tracking-tight uppercase">
                  Manual Authority Required
                </h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                  The agent is requesting access to a{" "}
                  <span className="text-red-400 font-bold">Level 2</span>{" "}
                  terminal override. Verify your identity as{" "}
                  <span className="text-white font-bold px-1 rounded bg-white/10 italic">
                    {userName}
                  </span>{" "}
                  to approve the operation.
                </p>
              </div>
            </div>

            {!showVerify ? (
              <>
                {/* Tool Context Card */}
                <div className="bg-white/[0.03] border border-white/5 rounded-2xl overflow-hidden glass-blur">
                  <div className="p-3 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon name="Flash" size={12} style={{ color: "var(--app-primary)" }} />
                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                        Protocol Metadata
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[8px] text-gray-500 uppercase tracking-[0.2em]">
                        Validated
                      </span>
                    </div>
                  </div>
                  <div className="p-4 space-y-4 font-mono text-[11px]">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">TARGET_SERVICE</span>
                      <span className="text-white font-bold tracking-widest">
                        {toolName.toUpperCase()}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <span className="text-gray-500 block">
                        ARGUMENTS_TREE:
                      </span>
                      <pre className="p-3 bg-black/60 rounded-xl text-gray-400 overflow-x-auto border border-white/5 leading-relaxed text-[10px]">
                        {JSON.stringify(args, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4">
                  <button
                    onClick={onDeny}
                    className="flex-1 py-4 px-6 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] text-gray-400 hover:text-white font-bold text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                  >
                    <Icon name="CloseCircle" size={16} />
                    Terminate
                  </button>
                  <button
                    onClick={() => setShowVerify(true)}
                    className="flex-[2] py-4 px-6 rounded-2xl text-[#050505] font-bold text-xs uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 relative group overflow-hidden active:scale-[0.98] shadow-lg bg-[var(--app-primary)]"
                  >
                    <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
                    <Icon
                      name="Fingerprint"
                      size={20}
                      className="group-hover:scale-110 transition-transform"
                    />
                    Elevate Permissions
                  </button>
                </div>
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-black/40 rounded-3xl border border-white/10 p-6 flex flex-col items-center justify-center min-h-[300px]"
              >
                <div className="w-full max-w-md">
                  <AdminEnrollmentModal
                    userName={userName}
                    theme={{
                      hex: "var(--app-primary)",
                      primary: "blue"
                    }}
                    onClose={() => setShowVerify(false)}
                    onEnrollSuccess={() => {}}
                    onVerify={async (img) => {
                      const match = await lucaService.verifyIdentity(img);
                      if (match) handleVerificationSuccess();
                      return match;
                    }}
                    onVerifyVoice={async (audio) => {
                      const match = await lucaService.verifyVoice(audio);
                      if (match) handleVerificationSuccess();
                      return match;
                    }}
                  />
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* Footer Diagnostic Panel */}
        <div
          className="p-3 bg-black/40 border-t flex items-center justify-between font-mono text-[8px] text-gray-600 uppercase tracking-widest"
          style={{
            borderTopColor: isSafetyValve
              ? "rgba(239, 68, 68, 0.2)"
              : "rgba(var(--app-primary-rgb), 0.1)",
          }}
        >
          <div className="flex gap-4">
            <span className="flex items-center gap-1">
              <Icon name="Activity" size={10} />{" "}
              {isSafetyValve ? "Safety-Link: Restricting" : "Bio-Link: Active"}
            </span>
            <span className="flex items-center gap-1">
              <Icon name="Maximize" size={10} /> Enclave: Locked
            </span>
          </div>
          <div className="animate-pulse">
            System Liability Clause v4.2 // User Authorization Required
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default SecurityGate;
