import {
  DEFAULT_LUCA_SKIN_ID,
  LUCA_SKIN_IDS,
  isLucaSkinId,
  type LucaSkinId,
} from "./lucaSkins";

export type LucaSkinPreviewMood =
  | "calm-light"
  | "focused-dark"
  | "liquid-adaptive"
  | "warm-editorial";

export type LucaSkinPreviewCapability =
  | "recommended-default"
  | "high-readability"
  | "low-motion-safe"
  | "reduced-transparency-safe"
  | "mobile-safe"
  | "developer-focus"
  | "writing-focus"
  | "ambient-identity";

export interface LucaSkinPreviewMetadata {
  id: LucaSkinId;
  label: string;
  shortLabel: string;
  tagline: string;
  description: string;
  mood: LucaSkinPreviewMood;
  capabilities: LucaSkinPreviewCapability[];
  recommendedFor: string[];
  previewNotes: string[];
  accessibilityNotes: string[];
  designGuardrails: string[];
}

export const LUCA_SKIN_PREVIEW_METADATA = {
  pearl: {
    id: "pearl",
    label: "LucaOS Pearl",
    shortLabel: "Pearl",
    tagline: "A quiet bright environment for LucaOS.",
    description:
      "A calm light operating environment with soft pearl surfaces, restrained material depth, and readable graphite text for everyday work.",
    mood: "calm-light",
    capabilities: [
      "high-readability",
      "low-motion-safe",
      "mobile-safe",
    ],
    recommendedFor: ["daily work", "calm light-mode use", "reading"],
    previewNotes: [
      "Use soft near-white surfaces with gentle ambient warmth.",
      "Keep the preview spacious, low-noise, and text-forward.",
    ],
    accessibilityNotes: [
      "Preserve strong foreground contrast on light surfaces.",
      "Motion should remain calm and optional in motion-sensitive contexts.",
    ],
    designGuardrails: [
      "Avoid harsh pure white.",
      "Avoid excessive glow.",
      "Preserve text contrast.",
    ],
  },
  carbon: {
    id: "carbon",
    label: "LucaOS Carbon",
    shortLabel: "Carbon",
    tagline: "A professional dark workspace for focused sessions.",
    description:
      "A focused graphite operating environment with restrained accents, quiet depth, and comfortable dark-mode readability.",
    mood: "focused-dark",
    capabilities: [
      "recommended-default",
      "developer-focus",
      "high-readability",
      "low-motion-safe",
    ],
    recommendedFor: ["first-time users", "developers", "long work sessions", "dark-mode users"],
    previewNotes: [
      "Use neutral charcoal depth rather than pure black.",
      "Keep accent treatment restrained and professional.",
    ],
    accessibilityNotes: [
      "Maintain readable contrast for dense technical text.",
      "Avoid relying on glow to communicate state in previews.",
    ],
    designGuardrails: [
      "No cyberpunk styling.",
      "No neon treatment.",
      "No hacker or terminal aesthetic.",
      "Preserve the professional dark tone.",
    ],
  },
  flow: {
    id: "flow",
    label: "LucaOS Flow",
    shortLabel: "Flow",
    tagline: "The signature living OS identity, kept behind the work.",
    description:
      "A liquid-adaptive operating environment with soft gradients, layered glass, and ambient depth designed to feel alive without competing with content.",
    mood: "liquid-adaptive",
    capabilities: ["ambient-identity", "reduced-transparency-safe", "mobile-safe"],
    recommendedFor: ["users who want the signature future OS feel"],
    previewNotes: [
      "Preview the liquid identity as a static-first environment.",
      "Keep ambient depth behind content and controls.",
    ],
    accessibilityNotes: [
      "Provide a reduced-transparency-safe interpretation of glass depth.",
      "Treat mobile previews as static and performance-aware.",
    ],
    designGuardrails: [
      "Motion must stay behind the work.",
      "No aggressive animation.",
      "Static fallback first.",
      "No mobile liquid motion yet.",
    ],
  },
  canvas: {
    id: "canvas",
    label: "LucaOS Canvas",
    shortLabel: "Canvas",
    tagline: "A warm editorial space for reading, writing, and planning.",
    description:
      "A calm warm operating environment with editorial rhythm, matte separation, and readable cream surfaces for thoughtful work.",
    mood: "warm-editorial",
    capabilities: [
      "writing-focus",
      "high-readability",
      "low-motion-safe",
      "reduced-transparency-safe",
    ],
    recommendedFor: ["writing", "reading", "planning", "calm thinking"],
    previewNotes: [
      "Use warm matte surfaces with minimal glass treatment.",
      "Favor text rhythm, quiet spacing, and stable panels.",
    ],
    accessibilityNotes: [
      "Warmth must preserve readable contrast for long-form text.",
      "Prefer low blur or no blur in preview surfaces.",
    ],
    designGuardrails: [
      "Warmth must not reduce contrast.",
      "Use low blur or no blur.",
      "No paper texture assets yet.",
    ],
  },
  graphite: {
    id: "graphite",
    label: "LucaOS Graphite",
    shortLabel: "Graphite",
    tagline: "Neutral grey dark for long sessions.",
    description:
      "A neutral grey dark environment with no color cast — steady contrast and calm materials that stay easy on the eyes across long working sessions.",
    mood: "focused-dark",
    capabilities: [
      "high-readability",
      "low-motion-safe",
      "mobile-safe",
      "developer-focus",
    ],
    recommendedFor: ["long sessions", "neutral dark-mode use", "focus work"],
    previewNotes: [
      "Keep surfaces strictly neutral — no blue or warm cast anywhere.",
      "Structure comes from subtle elevation steps, not color.",
    ],
    accessibilityNotes: [
      "Preserve strong text contrast on grey surfaces.",
      "Status colors stay semantic and are never tinted by the skin.",
    ],
    designGuardrails: [
      "No color cast on backgrounds.",
      "Accent stays desaturated steel.",
      "Avoid glow.",
    ],
  },
  onyx: {
    id: "onyx",
    label: "LucaOS Onyx",
    shortLabel: "Onyx",
    tagline: "True black, OLED-grade contrast.",
    description:
      "A true-black environment where structure is carried by hairlines and a single cool accent — maximum contrast, zero noise, OLED-friendly.",
    mood: "focused-dark",
    capabilities: [
      "high-readability",
      "low-motion-safe",
      "mobile-safe",
    ],
    recommendedFor: ["OLED displays", "night use", "maximum contrast"],
    previewNotes: [
      "Backgrounds are near-absolute black; hairlines carry the layout.",
      "The single cool accent is the only saturated color.",
    ],
    accessibilityNotes: [
      "Text stays high-contrast against true black.",
      "Avoid large pure-white fields that cause halation on OLED.",
    ],
    designGuardrails: [
      "No grey wash over black.",
      "One accent only.",
      "Hairlines, not fills, define structure.",
    ],
  },
  dusk: {
    id: "dusk",
    label: "LucaOS Dusk",
    shortLabel: "Dusk",
    tagline: "Warm charcoal with an amber undertone.",
    description:
      "A warm charcoal environment with a soft amber undertone — dark mode that reads like evening light rather than machinery.",
    mood: "focused-dark",
    capabilities: [
      "high-readability",
      "low-motion-safe",
      "writing-focus",
    ],
    recommendedFor: ["evening use", "reading", "writing"],
    previewNotes: [
      "Warmth lives in the background undertone and accent only.",
      "Keep the amber accent restrained — undertone, not glow.",
    ],
    accessibilityNotes: [
      "Warm cast must never reduce text contrast.",
      "Semantic status colors remain unchanged by the warm palette.",
    ],
    designGuardrails: [
      "Warmth is an undertone, not a tint on text.",
      "No orange glow.",
      "Preserve contrast.",
    ],
  },
  mist: {
    id: "mist",
    label: "LucaOS Mist",
    shortLabel: "Mist",
    tagline: "Clean neutral light — the working daylight.",
    description:
      "A clean neutral light environment with quiet grey-white surfaces and no warmth cast — the everyday daylight counterpart to Graphite.",
    mood: "calm-light",
    capabilities: [
      "high-readability",
      "low-motion-safe",
      "reduced-transparency-safe",
      "mobile-safe",
    ],
    recommendedFor: ["daylight work", "neutral light-mode use", "shared screens"],
    previewNotes: [
      "Strictly neutral light surfaces — no cream or warm tint.",
      "Depth comes from soft shadow steps, not borders.",
    ],
    accessibilityNotes: [
      "Foreground text keeps strong contrast on light grey.",
      "Works with reduced transparency without losing structure.",
    ],
    designGuardrails: [
      "No warm cast.",
      "Avoid harsh pure white fields.",
      "Keep shadows soft and low.",
    ],
  },
} satisfies Readonly<Record<LucaSkinId, LucaSkinPreviewMetadata>>;

export function getLucaSkinPreviewMetadata(skinId?: unknown): LucaSkinPreviewMetadata {
  return LUCA_SKIN_PREVIEW_METADATA[
    isLucaSkinId(skinId) ? skinId : DEFAULT_LUCA_SKIN_ID
  ];
}

export function getDefaultLucaSkinPreviewMetadata(): LucaSkinPreviewMetadata {
  return getLucaSkinPreviewMetadata(DEFAULT_LUCA_SKIN_ID);
}

export function getLucaSkinPreviewMetadataList(): LucaSkinPreviewMetadata[] {
  return LUCA_SKIN_IDS.map((skinId) => LUCA_SKIN_PREVIEW_METADATA[skinId]);
}
