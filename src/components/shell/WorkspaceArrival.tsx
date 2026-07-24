import React from "react";
import { settingsService } from "../../services/settingsService";
import { LucaPresence } from "../presence/LucaPresence";
import { workspaceColor } from "./workspaceShellTokens";

/**
 * WorkspaceArrival — the calm first screen of the workspace centre.
 *
 * It replaces the legacy ChatPanel welcome (the "Good evening Operator" greeting
 * and the "Zero-Cloud Update" status chatter) with one quiet moment: a
 * time-of-day greeting and a single invitation. The command bar sits just below
 * it, so the whole centre reads as "you've arrived, ask when ready" rather than
 * a console reporting its own boot.
 *
 * No jargon, by rule. The greeting NEVER invents a name — if the user hasn't set
 * one it simply omits the slot rather than addressing them as "Operator" (a
 * tactical term the calm tiers forbid). Presentational and inert; it reads a
 * name from settings and renders. Shown only while the thread is empty; the
 * first message swaps it for the conversation.
 */

const greetingFor = (hour: number): string => {
  if (hour < 5) return "Good evening";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

const BANNED_NAMES = new Set(["operator", "commander", "user", "admin"]);

const readName = (): string => {
  try {
    const general = settingsService.get("general") as any;
    const raw = String(general?.userName ?? general?.name ?? "").trim();
    // Never surface a placeholder/tactical identity as if it were a real name.
    if (!raw || BANNED_NAMES.has(raw.toLowerCase())) return "";
    return raw;
  } catch {
    return "";
  }
};

export interface WorkspaceArrivalProps {
  /** Overrides the settings-derived name (empty string = no name). */
  name?: string;
  /** Space/context the user is in, shown as a quiet line under the greeting. */
  contextLabel?: string;
  /** Presence resolution, inherited from the shell. */
  skinId?: string;
  reducedMotion?: boolean;
  faceSrc?: string;
}

export const WorkspaceArrival: React.FC<WorkspaceArrivalProps> = ({
  name,
  contextLabel,
  skinId,
  reducedMotion,
  faceSrc,
}) => {
  const hour = new Date().getHours();
  const who = (name ?? readName()).trim();
  const greeting = greetingFor(hour);

  return (
    <div
      data-luca-workspace-arrival
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        padding: "24px 24px 140px",
        textAlign: "center",
      }}
    >
      {/* Luca is HERE — the same living presence that carries boot and
          onboarding, so arrival feels like being met, not a blank prompt. */}
      <div style={{ marginBottom: 6 }}>
        <LucaPresence
          state="identity"
          size={148}
          label="Luca"
          breathing
          skinId={skinId}
          reducedMotion={reducedMotion}
          faceSrc={faceSrc}
        />
      </div>

      <h1
        style={{
          margin: 0,
          fontSize: "clamp(26px, 4vw, 40px)",
          fontWeight: 600,
          letterSpacing: "-0.025em",
          lineHeight: 1.1,
          color: workspaceColor.ink,
        }}
      >
        {greeting}
        {who ? (
          <>
            , <span style={{ color: workspaceColor.accent }}>{who}</span>
          </>
        ) : (
          "."
        )}
      </h1>

      <p
        style={{
          margin: 0,
          fontSize: 14,
          lineHeight: 1.55,
          color: workspaceColor.ink3,
          maxWidth: 420,
        }}
      >
        Ask Luca anything, or pick up where you left off.
      </p>

      {contextLabel ? (
        <span
          style={{
            marginTop: 4,
            fontSize: 11.5,
            letterSpacing: "0.02em",
            color: workspaceColor.ink3,
            opacity: 0.85,
          }}
        >
          {contextLabel}
        </span>
      ) : null}
    </div>
  );
};

export default WorkspaceArrival;
