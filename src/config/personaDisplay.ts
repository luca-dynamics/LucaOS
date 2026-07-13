/**
 * Humanized display names for the persona wire keys. The wire keys
 * (RUTHLESS/ENGINEER/ASSISTANT/HACKER) stay stable across settings, prompts,
 * and services; every user-facing surface renders these labels instead.
 */
export const PERSONA_DISPLAY: Record<string, { label: string; desc: string }> =
  {
    RUTHLESS: { label: "Direct", desc: "Minimum words, maximum action" },
    ENGINEER: { label: "Technical", desc: "Precise, code-first reasoning" },
    ASSISTANT: { label: "Warm", desc: "Thorough, patient, explains itself" },
    HACKER: { label: "Security", desc: "Authorized security analysis" },
  };

/** Humanized label for a persona wire key; falls back to the raw key. */
export function personaDisplayLabel(key: string | undefined | null): string {
  if (!key) return "";
  return PERSONA_DISPLAY[key.toUpperCase()]?.label ?? key;
}
