import {
  canShowCreatorMode,
  getAvailableExperienceModes,
  mapLegacyTierToExperienceMode,
  type CreatorAccessState,
  type LucaExperienceMode,
} from "./experienceMode";

const LEGACY_EXPERIENCE_MODE_VALUES = new Set([
  "normal",
  "tactical",
  "origin",
  "public_standard",
  "public_tactical",
  "basic",
  "pro",
  "creator",
]);

export interface ExperienceModeOption {
  mode: LucaExperienceMode;
  label: string;
  description: string;
}

const EXPERIENCE_MODE_DESCRIPTIONS: Record<LucaExperienceMode, string> = {
  basic: "Calm, simple, everyday Luca.",
  pro: "Advanced tools, local/BYOK controls, diagnostics.",
  creator: "Source-authority mode for LucaOS builders.",
};

function recognizedMode(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  return LEGACY_EXPERIENCE_MODE_VALUES.has(normalized) ? value : undefined;
}

/**
 * Resolve the canonical setting from current or legacy settings shapes.
 * Creator values are accepted only when the current build is eligible.
 */
export function resolvePersistedExperienceMode(
  stored: unknown,
  creatorAccess: CreatorAccessState,
): LucaExperienceMode {
  const candidate = stored as
    | {
        experienceMode?: unknown;
        tier?: unknown;
        mode?: unknown;
        general?: {
          experienceMode?: unknown;
          tier?: unknown;
          mode?: unknown;
        };
      }
    | null
    | undefined;

  const raw = [
    candidate?.general?.experienceMode,
    candidate?.experienceMode,
    candidate?.general?.tier,
    candidate?.tier,
    candidate?.general?.mode,
    candidate?.mode,
  ]
    .map(recognizedMode)
    .find((value) => value !== undefined);

  return normalizeSelectableExperienceMode(raw, creatorAccess);
}

/** Keep invalid or ineligible values from reaching persisted UI state. */
export function normalizeSelectableExperienceMode(
  value: unknown,
  creatorAccess: CreatorAccessState,
): LucaExperienceMode {
  const mode = mapLegacyTierToExperienceMode(recognizedMode(value));
  if (mode === "creator" && !canShowCreatorMode(creatorAccess)) {
    return "basic";
  }
  return mode;
}

export function getExperienceModeOptions(
  creatorAccess: CreatorAccessState,
): ExperienceModeOption[] {
  return getAvailableExperienceModes(creatorAccess).map((mode) => ({
    mode,
    label: mode.charAt(0).toUpperCase() + mode.slice(1),
    description: EXPERIENCE_MODE_DESCRIPTIONS[mode],
  }));
}
