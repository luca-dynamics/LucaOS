import React, { Component, ErrorInfo, ReactNode } from "react";
import { Icon } from "./ui/Icon";
import { apiUrl } from "../config/api";
import { isElectron } from "../utils/env";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isRestoring: boolean;
  isRepairing: boolean;
}

class SystemErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    isRestoring: false,
    isRepairing: false,
  };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      isRestoring: false,
      isRepairing: false,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[Luca] Interface error caught by boundary:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRollback = async () => {
    this.setState({ isRestoring: true });
    try {
      // Creator recovery: ask the Local Core to undo the last source-file write.
      const res = await fetch(apiUrl("/api/fs/restore-last"), { method: "POST" });
      const data = await res.json();

      if (data.success) {
        alert(`Restored ${data.file}. Reloading Luca…`);
        window.location.reload();
      } else {
        alert(
          `Couldn't restore automatically: ${data.error}\nThe change may need a manual look in /src.`,
        );
        this.setState({ isRestoring: false });
      }
    } catch {
      alert("The Local Core is offline, so Luca can't restore automatically.");
      this.setState({ isRestoring: false });
    }
  };

  handleAutoRepair = async () => {
    this.setState({ isRepairing: true });
    try {
      // Creator recovery: hand the error to the Evolution engine to find + fix
      // the responsible source file.
      const res = await fetch(apiUrl("/api/evolution/repair"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: this.state.error?.message,
          stack: this.state.errorInfo?.componentStack || this.state.error?.stack,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(`Luca repaired itself: ${data.message}. Reloading…`);
        window.location.reload();
      } else {
        alert(`The repair didn't complete: ${data.error || data.message}`);
        this.setState({ isRepairing: false });
      }
    } catch {
      alert("Luca couldn't reach the Evolution engine to attempt a repair.");
      this.setState({ isRepairing: false });
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const creatorRecovery = isElectron();

    return (
      <div
        className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden px-6 font-sans"
        style={{
          background: "var(--luca-background-base, #111417)",
          color: "var(--luca-text-primary, #f4f6f8)",
        }}
      >
        {/* Calm vignette — no hazard stripes, no neon glow. */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 50% 38%, transparent 55%, rgba(0,0,0,0.45) 100%)",
          }}
        />

        <section
          className="relative z-10 w-full max-w-xl rounded-2xl p-8"
          style={{
            background:
              "var(--luca-surface-elevated, var(--luca-surface-glass, #1b2025))",
            border: "1px solid var(--luca-border-subtle, rgba(255,255,255,0.08))",
            boxShadow: "0 30px 80px -30px rgba(0,0,0,0.6)",
          }}
        >
          <div className="flex items-start gap-4">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
              style={{
                background:
                  "color-mix(in srgb, var(--luca-warning, #e0b15a) 16%, transparent)",
                color: "var(--luca-warning, #e0b15a)",
              }}
            >
              <Icon name="ShieldAlert" size={22} />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-[-0.01em]">
                Luca ran into a problem
              </h1>
              <p
                className="mt-1 text-sm"
                style={{ color: "var(--luca-text-secondary, #9aa6b6)" }}
              >
                An unexpected error interrupted the interface. Your work is safe —
                reload to continue.
              </p>
            </div>
          </div>

          {/* Technical details — quiet, collapsed by default. */}
          <details className="mt-5">
            <summary
              className="cursor-pointer select-none text-xs font-medium tracking-[0.14em] uppercase"
              style={{ color: "var(--luca-text-tertiary, #7d8a93)" }}
            >
              Technical details
            </summary>
            <pre
              className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap rounded-lg p-3 text-[11px] leading-relaxed"
              style={{
                background: "var(--luca-surface-glass, rgba(255,255,255,0.03))",
                border: "1px solid var(--luca-border-subtle, rgba(255,255,255,0.07))",
                color: "var(--luca-text-secondary, #9aa6b6)",
                fontFamily: "ui-monospace, 'JetBrains Mono', monospace",
              }}
            >
              {this.state.error?.toString()}
              {this.state.errorInfo?.componentStack}
            </pre>
          </details>

          {/* Primary action — available to everyone. */}
          <button
            onClick={() => window.location.reload()}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-colors"
            style={{
              background: "var(--luca-accent-primary, #6f9bff)",
              color: "var(--luca-accent-on, #0b0d10)",
            }}
          >
            <Icon name="Refresh" size={16} />
            Reload Luca
          </button>

          {/* Creator recovery — source-level self-repair, Creator/desktop only. */}
          {creatorRecovery && (
            <div
              className="mt-6 border-t pt-5"
              style={{ borderColor: "var(--luca-border-subtle, rgba(255,255,255,0.08))" }}
            >
              <div
                className="text-xs font-medium tracking-[0.14em] uppercase"
                style={{ color: "var(--luca-text-tertiary, #7d8a93)" }}
              >
                Creator recovery
              </div>
              <p
                className="mt-1 text-xs"
                style={{ color: "var(--luca-text-secondary, #9aa6b6)" }}
              >
                These edit Luca's own source through the Local Core.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <button
                  onClick={this.handleRollback}
                  disabled={this.state.isRestoring}
                  className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
                  style={{
                    background: "var(--luca-surface-glass, rgba(255,255,255,0.04))",
                    border: "1px solid var(--luca-border-subtle, rgba(255,255,255,0.1))",
                    color: "var(--luca-text-primary, #f4f6f8)",
                  }}
                >
                  <Icon
                    name={this.state.isRestoring ? "Refresh" : "Restart"}
                    size={15}
                    className={this.state.isRestoring ? "animate-spin" : ""}
                  />
                  Restore last change
                </button>
                <button
                  onClick={this.handleAutoRepair}
                  disabled={this.state.isRepairing}
                  className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
                  style={{
                    background:
                      "color-mix(in srgb, var(--luca-accent-primary, #6f9bff) 14%, transparent)",
                    border:
                      "1px solid color-mix(in srgb, var(--luca-accent-primary, #6f9bff) 32%, transparent)",
                    color: "var(--luca-text-primary, #f4f6f8)",
                  }}
                >
                  <Icon
                    name={this.state.isRepairing ? "Refresh" : "Code"}
                    size={15}
                    className={this.state.isRepairing ? "animate-spin" : ""}
                  />
                  Let Luca repair this
                </button>
              </div>
            </div>
          )}

          <div
            className="mt-6 text-center text-[11px] tracking-[0.12em] uppercase"
            style={{ color: "var(--luca-text-tertiary, #7d8a93)" }}
          >
            Luca Self-Repair · Creator module
          </div>
        </section>
      </div>
    );
  }
}

export default SystemErrorBoundary;
