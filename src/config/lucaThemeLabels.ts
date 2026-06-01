import { THEME_PALETTE } from "./themeColors";
import type { UIThemeId } from "../types/lucaPersonality";

export type LucaThemeVisibility = "normal" | "legacy" | "experimental";

export interface LucaThemeLabelConfig {
  id: string;
  canonicalThemeId: UIThemeId;
  label: string;
  description: string;
  hex: string;
  visibility: LucaThemeVisibility;
}

const lucaSilverDescription =
  "Pearl-white glass, graphite text, subtle silver depth.";
const lucaGraphiteDescription =
  "Charcoal glass, soft grey borders, focused dark workspace.";
const lucaFrostDescription =
  "Cool silver surfaces with restrained blue highlights.";
const lucaCreamDescription =
  "Warm pearl surfaces with calm natural contrast.";

export const LUCA_THEME_LABELS: Record<string, LucaThemeLabelConfig> = {
  PROFESSIONAL: {
    id: "PROFESSIONAL",
    canonicalThemeId: "PROFESSIONAL",
    label: "Luca Silver",
    description: lucaSilverDescription,
    hex: THEME_PALETTE.PROFESSIONAL.primary,
    visibility: "normal",
  },
  MASTER_SYSTEM: {
    id: "MASTER_SYSTEM",
    canonicalThemeId: "MASTER_SYSTEM",
    label: "Luca Graphite",
    description: lucaGraphiteDescription,
    hex: THEME_PALETTE.MASTER_SYSTEM.primary,
    visibility: "normal",
  },
  FROST: {
    id: "FROST",
    canonicalThemeId: "FROST",
    label: "Luca Frost",
    description: lucaFrostDescription,
    hex: THEME_PALETTE.FROST.primary,
    visibility: "normal",
  },
  LIGHTCREAM: {
    id: "LIGHTCREAM",
    canonicalThemeId: "LIGHTCREAM",
    label: "Luca Cream",
    description: lucaCreamDescription,
    hex: THEME_PALETTE.LIGHTCREAM.primary,
    visibility: "normal",
  },
  ASSISTANT: {
    id: "ASSISTANT",
    canonicalThemeId: "PROFESSIONAL",
    label: "Luca Silver",
    description: lucaSilverDescription,
    hex: THEME_PALETTE.PROFESSIONAL.primary,
    visibility: "legacy",
  },
  AGENTIC_SLATE: {
    id: "AGENTIC_SLATE",
    canonicalThemeId: "PROFESSIONAL",
    label: "Luca Silver",
    description: lucaSilverDescription,
    hex: THEME_PALETTE.AGENTIC_SLATE.primary,
    visibility: "legacy",
  },
  LUCAGENT: {
    id: "LUCAGENT",
    canonicalThemeId: "PROFESSIONAL",
    label: "Luca Silver",
    description: lucaSilverDescription,
    hex: THEME_PALETTE.LUCAGENT.primary,
    visibility: "legacy",
  },
  RUTHLESS: {
    id: "RUTHLESS",
    canonicalThemeId: "MASTER_SYSTEM",
    label: "Luca Graphite",
    description: lucaGraphiteDescription,
    hex: THEME_PALETTE.RUTHLESS.primary,
    visibility: "legacy",
  },
  TERMINAL: {
    id: "TERMINAL",
    canonicalThemeId: "MASTER_SYSTEM",
    label: "Luca Graphite · Green Accent",
    description: "Charcoal glass with a restrained green accent.",
    hex: THEME_PALETTE.TERMINAL.primary,
    visibility: "legacy",
  },
  HACKER: {
    id: "HACKER",
    canonicalThemeId: "MASTER_SYSTEM",
    label: "Luca Graphite · Green Accent",
    description: "Charcoal glass with a restrained green accent.",
    hex: THEME_PALETTE.HACKER.primary,
    visibility: "legacy",
  },
  BUILDER: {
    id: "BUILDER",
    canonicalThemeId: "MASTER_SYSTEM",
    label: "Luca Graphite · Amber Accent",
    description: "Charcoal glass with a restrained amber accent.",
    hex: THEME_PALETTE.BUILDER.primary,
    visibility: "legacy",
  },
  ENGINEER: {
    id: "ENGINEER",
    canonicalThemeId: "MASTER_SYSTEM",
    label: "Luca Graphite · Amber Accent",
    description: "Charcoal glass with a restrained amber accent.",
    hex: THEME_PALETTE.ENGINEER.primary,
    visibility: "legacy",
  },
  DICTATION: {
    id: "DICTATION",
    canonicalThemeId: "MASTER_SYSTEM",
    label: "Luca Graphite · Violet Accent",
    description: "Charcoal glass with a restrained violet accent.",
    hex: THEME_PALETTE.DICTATION.primary,
    visibility: "legacy",
  },
  VAPORWAVE: {
    id: "VAPORWAVE",
    canonicalThemeId: "VAPORWAVE",
    label: "Vaporwave Experimental",
    description: "Experimental high-color appearance for local testing.",
    hex: THEME_PALETTE.VAPORWAVE.primary,
    visibility: "experimental",
  },
};

export const NORMAL_LUCA_THEME_OPTIONS = [
  LUCA_THEME_LABELS.PROFESSIONAL,
  LUCA_THEME_LABELS.MASTER_SYSTEM,
  LUCA_THEME_LABELS.FROST,
  LUCA_THEME_LABELS.LIGHTCREAM,
] as const;

export const getLucaThemeLabel = (themeId?: string | null): LucaThemeLabelConfig => {
  if (!themeId) return LUCA_THEME_LABELS.PROFESSIONAL;

  return LUCA_THEME_LABELS[themeId.toUpperCase()] ?? LUCA_THEME_LABELS.PROFESSIONAL;
};
