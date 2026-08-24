/**
 * What the Settings footer says after a save.
 *
 * `settingsService.saveSettings` reports which secrets could not reach the Secure
 * Vault. A secret that failed to store is not persisted at all — writing the
 * "[SECURED]" sentinel in that case is what used to make a key disappear on the
 * next reload — so the save genuinely did not do what the user asked, and the
 * footer must say so rather than show "Settings Saved Successfully".
 *
 * Pure, so the wording and the auto-clear rule are testable without mounting the
 * modal. The message deliberately begins with "Error": the footer colours itself
 * with `statusMsg.includes("Error")`, a convention several tabs already follow.
 */

import type { SaveSettingsResult } from "../../services/settingsService";

export interface SettingsSaveOutcome {
  /** Text for the footer's `role="status"` live region. */
  readonly message: string;
  /**
   * How long before the message clears itself, or `null` to leave it up. A
   * failure stays: it is a request for the user to retype something, and a
   * message that vanishes after two seconds is a message they can miss.
   */
  readonly autoClearMs: number | null;
  /** True when nothing needs the user's attention. */
  readonly ok: boolean;
}

/**
 * Human names for the fields `settingsService`'s SENSITIVE_MAP routes to the
 * vault, keyed by the `section.key` strings it reports. A test reads that map out
 * of the service's source and fails if an entry here goes missing, so a new
 * secret cannot ship with a raw identifier in the UI. Exported for that test.
 */
export const SECRET_LABELS: Readonly<Record<string, string>> = {
  "brain.geminiApiKey": "Gemini API key",
  "brain.anthropicApiKey": "Anthropic API key",
  "brain.openaiApiKey": "OpenAI API key",
  "brain.xaiApiKey": "xAI API key",
  "brain.deepseekApiKey": "DeepSeek API key",
  "brain.groqApiKey": "Groq API key",
  "brain.openRouterApiKey": "OpenRouter API key",
  "brain.customOpenAiCompatibleApiKey": "custom OpenAI-compatible API key",
  "voice.googleApiKey": "Google voice API key",
  "voice.deepgramApiKey": "Deepgram API key",
  "iot.haToken": "Home Assistant token",
};

/** Fallback for a field added to the service but not yet named here. */
function humanizeSecretName(name: string): string {
  const key = name.includes(".") ? name.slice(name.indexOf(".") + 1) : name;
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\bApi\b/g, "API")
    .trim();
  return spaced.charAt(0).toLowerCase() + spaced.slice(1);
}

export function describeSecret(name: string): string {
  return SECRET_LABELS[name] ?? humanizeSecretName(name);
}

/** Oxford-comma join, so a three-key failure reads as a sentence. */
function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

export const SETTINGS_SAVED_MESSAGE = "Settings Saved Successfully";
export const SETTINGS_SAVE_FAILED_MESSAGE = "Error Saving Settings";

/**
 * Turn a save result into what the footer should show.
 *
 * A missing or malformed result counts as a failure. Claiming success for an
 * outcome we cannot read is the same class of bug as the sentinel write this
 * whole path exists to undo.
 */
export function describeSettingsSaveOutcome(
  result: SaveSettingsResult | null | undefined,
): SettingsSaveOutcome {
  const failures = Array.isArray(result?.vaultFailures)
    ? result.vaultFailures.filter(
        (name) => typeof name === "string" && name.trim() !== "",
      )
    : [];

  if (failures.length > 0) {
    const named = joinNames(failures.map(describeSecret));
    const subject =
      failures.length === 1
        ? `Your ${named} could not be stored securely and was not saved.`
        : `These could not be stored securely and were not saved: ${named}.`;
    return {
      message: `Error — ${subject} Everything else was saved. Re-enter and save again.`,
      autoClearMs: null,
      ok: false,
    };
  }

  if (!result || result.ok !== true) {
    return {
      message: SETTINGS_SAVE_FAILED_MESSAGE,
      autoClearMs: null,
      ok: false,
    };
  }

  return { message: SETTINGS_SAVED_MESSAGE, autoClearMs: 2000, ok: true };
}
