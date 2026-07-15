import { describe, expect, it } from "vitest";
import {
  CUSTOM_PERSONA_INSTRUCTION_MAX,
  CUSTOM_PERSONA_LABEL_MAX,
  DEFAULT_CUSTOM_PERSONA,
  applyCustomPersonaLayer,
  normalizeCustomPersona,
} from "./customPersona";

const { readFileSync } = process.getBuiltinModule("node:fs");
const readSource = (path: string) =>
  readFileSync(path, "utf8").replace(/\r\n/g, "\n");

describe("normalizeCustomPersona", () => {
  it("defaults to a disabled, blank, Warm-based persona", () => {
    expect(normalizeCustomPersona(undefined)).toEqual(DEFAULT_CUSTOM_PERSONA);
    expect(normalizeCustomPersona(null)).toEqual(DEFAULT_CUSTOM_PERSONA);
    expect(normalizeCustomPersona({})).toEqual(DEFAULT_CUSTOM_PERSONA);
  });

  it("clamps label and instruction lengths", () => {
    const normalized = normalizeCustomPersona({
      enabled: true,
      label: "x".repeat(CUSTOM_PERSONA_LABEL_MAX + 20),
      instruction: "y".repeat(CUSTOM_PERSONA_INSTRUCTION_MAX + 50),
      basePersona: "ENGINEER",
    });
    expect(normalized.label).toHaveLength(CUSTOM_PERSONA_LABEL_MAX);
    expect(normalized.instruction).toHaveLength(
      CUSTOM_PERSONA_INSTRUCTION_MAX,
    );
    expect(normalized.basePersona).toBe("ENGINEER");
  });

  it("falls invalid bases back to ASSISTANT and coerces non-strings", () => {
    const normalized = normalizeCustomPersona({
      enabled: true,
      label: 42 as unknown as string,
      instruction: {} as unknown as string,
      basePersona: "LUCAGENT" as never,
    });
    expect(normalized.label).toBe("");
    expect(normalized.instruction).toBe("");
    expect(normalized.basePersona).toBe("ASSISTANT");
  });
});

describe("applyCustomPersonaLayer", () => {
  const base = "IDENTITY SCAFFOLD.\nMode: ASSISTANT.";

  it("is a no-op when disabled or the instruction is blank", () => {
    expect(applyCustomPersonaLayer(base, undefined)).toBe(base);
    expect(
      applyCustomPersonaLayer(base, {
        enabled: false,
        instruction: "Be pithy.",
      }),
    ).toBe(base);
    expect(
      applyCustomPersonaLayer(base, { enabled: true, instruction: "   " }),
    ).toBe(base);
  });

  it("appends the labeled tone layer after the base prompt", () => {
    const layered = applyCustomPersonaLayer(base, {
      enabled: true,
      label: "Studio Voice",
      instruction: "Calm, brief, dry humor.",
      basePersona: "ENGINEER",
    });
    expect(layered.startsWith(base)).toBe(true);
    expect(layered).toContain('CUSTOM PERSONA LAYER — "Studio Voice"');
    expect(layered).toContain("Calm, brief, dry humor.");
    expect(layered).toContain("remain authoritative");
  });

  it("labels an unnamed layer as Custom", () => {
    const layered = applyCustomPersonaLayer(base, {
      enabled: true,
      label: "  ",
      instruction: "Be direct.",
    });
    expect(layered).toContain('CUSTOM PERSONA LAYER — "Custom"');
  });
});

describe("custom persona wiring invariants", () => {
  it("layers onto both the chat and voice prompt assemblies", () => {
    for (const path of [
      "src/services/lucaService.ts",
      "src/services/liveService.ts",
    ]) {
      expect(readSource(path)).toContain("applyCustomPersonaLayer(");
    }
  });

  it("keeps the tool loadout keyed by the base preset, never by custom text", () => {
    const customPersonaSource = readSource("src/config/customPersona.ts");
    expect(customPersonaSource).not.toContain("PERSONA_SPECIALIZED_TOOLS");
    const generalTabSource = readSource(
      "src/components/settings/SettingsGeneralTab.tsx",
    );
    // Activating or re-basing the custom persona always writes a real preset
    // key into general.persona.
    expect(generalTabSource).toContain(
      'onUpdate("general", "persona", customPersona.basePersona)',
    );
  });
});
