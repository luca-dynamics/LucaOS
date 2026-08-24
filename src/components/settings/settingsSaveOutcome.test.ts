/**
 * The Settings footer's honesty test.
 *
 * The bug this covers: a provider key whose vault write failed used to produce
 * "Settings Saved Successfully", and then vanished on the next reload. The helper
 * exists so the footer can say what actually happened, and these assertions pin
 * the three things that matter — the wording names the key, the message is styled
 * as an error, and it does not clear itself.
 *
 * The SENSITIVE_MAP drift check reads `settingsService.ts` through
 * `process.getBuiltinModule('node:fs')`: `vite.config.ts` aliases `fs` to a
 * browser polyfill, so a plain import returns `''` and every assertion below
 * would pass vacuously.
 */

import { describe, it, expect } from "vitest";
import type { SaveSettingsResult } from "../../services/settingsService";
import {
  SECRET_LABELS,
  SETTINGS_SAVED_MESSAGE,
  SETTINGS_SAVE_FAILED_MESSAGE,
  describeSecret,
  describeSettingsSaveOutcome,
} from "./settingsSaveOutcome";

const { readFileSync } = process.getBuiltinModule("node:fs");

const ok: SaveSettingsResult = { ok: true, vaultFailures: [] };

describe("describeSettingsSaveOutcome: a clean save", () => {
  it("keeps the wording the modal has always shown", () => {
    const outcome = describeSettingsSaveOutcome(ok);
    expect(outcome.message).toBe(SETTINGS_SAVED_MESSAGE);
    expect(outcome.ok).toBe(true);
  });

  it("clears itself after two seconds, as before", () => {
    expect(describeSettingsSaveOutcome(ok).autoClearMs).toBe(2000);
  });

  it("is not styled as an error", () => {
    // The footer colours on `statusMsg.includes("Error")`, so a success message
    // containing that word would turn green text red.
    expect(describeSettingsSaveOutcome(ok).message).not.toContain("Error");
  });
});

describe("describeSettingsSaveOutcome: a key that could not be secured", () => {
  const one = describeSettingsSaveOutcome({
    ok: false,
    vaultFailures: ["brain.openaiApiKey"],
  });

  it("names the key the user typed, not its identifier", () => {
    expect(one.message).toContain("OpenAI API key");
    expect(one.message).not.toContain("openaiApiKey");
    expect(one.message).not.toContain("brain.");
  });

  it("says the key was not saved, because it was not", () => {
    expect(one.message).toMatch(/not saved/i);
    expect(one.message).toMatch(/re-enter/i);
    expect(one.ok).toBe(false);
  });

  it("says the rest of the save did land, because it did", () => {
    // Only the failed secrets are dropped; general settings are already written.
    // Implying a total failure would send the user to redo work that is done.
    expect(one.message).toMatch(/everything else was saved/i);
  });

  it("is styled as an error by the footer's existing rule", () => {
    expect(one.message.includes("Error")).toBe(true);
    expect(one.message.startsWith("Error")).toBe(true);
  });

  it("stays on screen until the user acts", () => {
    // Two seconds is long enough to miss, and this message asks for work.
    expect(one.autoClearMs).toBeNull();
  });

  it("lists several failures as a sentence", () => {
    const many = describeSettingsSaveOutcome({
      ok: false,
      vaultFailures: ["brain.openaiApiKey", "brain.groqApiKey", "iot.haToken"],
    });
    expect(many.message).toContain(
      "OpenAI API key, Groq API key, and Home Assistant token",
    );
    expect(many.autoClearMs).toBeNull();
  });

  it("reports the failure even when `ok` wrongly says true", () => {
    // Belt and braces: the names are the evidence, `ok` is a summary of them.
    const contradictory = describeSettingsSaveOutcome({
      ok: true,
      vaultFailures: ["voice.deepgramApiKey"],
    });
    expect(contradictory.ok).toBe(false);
    expect(contradictory.message).toContain("Deepgram API key");
  });

  it("ignores blank entries rather than rendering a nameless one", () => {
    const mixed = describeSettingsSaveOutcome({
      ok: false,
      vaultFailures: ["", "   ", "iot.haToken"],
    });
    expect(mixed.message).toContain("Your Home Assistant token could not");
    expect(mixed.message).not.toMatch(/,\s*,/);
    expect(mixed.message).not.toContain("and  ");
  });
});

describe("describeSettingsSaveOutcome: a save that failed outright", () => {
  it("falls back to the generic message when there are no key names", () => {
    const outcome = describeSettingsSaveOutcome({ ok: false, vaultFailures: [] });
    expect(outcome.message).toBe(SETTINGS_SAVE_FAILED_MESSAGE);
    expect(outcome.ok).toBe(false);
    expect(outcome.autoClearMs).toBeNull();
  });

  it("treats an unreadable result as a failure, never as success", () => {
    // `saveSettings` returning nothing means we do not know what happened.
    // Claiming success there is the bug this file exists to prevent.
    for (const bad of [undefined, null, {} as SaveSettingsResult]) {
      const outcome = describeSettingsSaveOutcome(bad);
      expect(outcome.ok).toBe(false);
      expect(outcome.message).toContain("Error");
    }
  });
});

describe("describeSecret", () => {
  it("humanizes an unlabelled field instead of printing the raw key", () => {
    expect(describeSecret("brain.someNewApiKey")).toBe("some New API Key");
    expect(describeSecret("nakedKey")).toBe("naked Key");
  });
});

describe("every vault-backed field has a label", () => {
  const serviceSource: string = readFileSync(
    new URL("../../services/settingsService.ts", import.meta.url),
    "utf8",
  );

  /** The SENSITIVE_MAP rows `saveSettings` reports failures for. */
  const sensitive = [
    ...(serviceSource.match(/const SENSITIVE_MAP = \[([\s\S]*?)\];/)?.[1] ?? "").matchAll(
      /\{\s*section:\s*"([^"]+)",\s*key:\s*"([^"]+)"\s*\}/g,
    ),
  ].map((m) => `${m[1]}.${m[2]}`);

  it("read the service (a vacuous pass here would hide the assertion below)", () => {
    expect(serviceSource.length).toBeGreaterThan(1000);
    expect(sensitive.length).toBeGreaterThanOrEqual(11);
    expect(sensitive).toContain("brain.openRouterApiKey");
  });

  it("labels every one of them", () => {
    // A new secret added to the service without a label here would surface to the
    // user as a camelCase identifier in a red error message.
    for (const name of sensitive) {
      expect(Object.keys(SECRET_LABELS), `${name} has no label`).toContain(name);
    }
  });

  it("labels nothing the service does not secure", () => {
    // Keeps the table from accumulating names that no longer exist.
    for (const name of Object.keys(SECRET_LABELS)) {
      expect(sensitive, `${name} is labelled but not in SENSITIVE_MAP`).toContain(name);
    }
  });
});
