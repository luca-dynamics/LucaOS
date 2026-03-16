/**
 * SINGLE SOURCE OF TRUTH FOR BRAND COLORS
 *
 * Edit these hex codes to update the entire application.
 * These colors affect:
 * 1. Tailwind classes (border-rq-blue, text-rq-blue, etc.)
 * 2. Voice Visualizers (Glow/Orb/HUD)
 * 3. Onboarding Screens
 * 4. Trading/Security Dashboards
 */

export const THEME_PALETTE = {
  MASTER_SYSTEM: {
    primary: "#4589f7ff", // Electric Blue
    secondary: "#3981d9ff",
    dark: "#203ea1ff",
    dim: "rgba(98, 152, 240, 0.1)",
  },
  TERMINAL: {
    primary: "#48f688ff", // Surgical Green
    secondary: "#3ad272ff",
    dark: "#166534",
    dim: "rgba(34, 197, 94, 0.1)",
  },
  BUILDER: {
    primary: "#f4a569ff", // Bold Terracotta
    secondary: "#d38748ff",
    dark: "#a28278ff",
    dim: "rgba(249, 115, 22, 0.1)",
  },
  PROFESSIONAL: {
    primary: "#E0E0E0", // Light Grey / Assistant White
    secondary: "#F5F5F5",
    dark: "#9E9E9E",
    dim: "rgba(224, 224, 224, 0.1)",
  },
  DICTATION: {
    primary: "#a855f7",
    secondary: "#d8b4fe",
    dark: "#7e22ce",
    dim: "rgba(168, 85, 247, 0.1)",
  },
  AGENTIC_SLATE: {
    primary: "#475569", // Slate
    secondary: "#94a3b8",
    dark: "#1e293b",
    dim: "rgba(71, 85, 105, 0.1)",
  },
  MIDNIGHT: {
    primary: "#ffffff", // Pure White on Pure Black
    secondary: "#94a3b8",
    dark: "#000000",
    dim: "rgba(255, 255, 255, 0.05)",
  },
  VAPORWAVE: {
    primary: "#ff71ce", // Hot Pink
    secondary: "#01cdfe", // Cyan
    dark: "#b967ff", // Purple
    dim: "rgba(255, 113, 206, 0.1)",
  },
  FROST: {
    primary: "#70eaf0ff", // Ice Blue
    secondary: "#ffffff",
    dark: "#74ebd5",
    dim: "rgba(180, 251, 255, 0.15)",
  },
  // Legacy Persona Aliases for Build Stability
  RUTHLESS: {
    primary: "#4589f7ff", // Electric Blue
    secondary: "#3981d9ff",
    dark: "#203ea1ff",
    dim: "rgba(98, 152, 240, 0.1)",
  },
  HACKER: {
    primary: "#48f688ff", // Surgical Green
    secondary: "#3ad272ff",
    dark: "#166534",
    dim: "rgba(34, 197, 94, 0.1)",
  },
  ASSISTANT: {
    primary: "#E0E0E0", // Light Grey / Assistant White
    secondary: "#F5F5F5",
    dark: "#9E9E9E",
    dim: "rgba(224, 224, 224, 0.1)",
  },
  ENGINEER: {
    primary: "#f4a569ff", // Bold Terracotta
    secondary: "#d38748ff",
    dark: "#a28278ff",
    dim: "rgba(249, 115, 22, 0.1)",
  },
  LUCAGENT: {
    primary: "#475569", // Slate
    secondary: "#94a3b8",
    dark: "#1e293b",
    dim: "rgba(71, 85, 105, 0.1)",
  },
};

export const MISSION_COLORS = {
  FILE: "#70eaf0ff", // Ice Blue
  FINANCE: "#48f688ff", // Surgical Green
  SOCIAL: "#a855f7", // Purple
  SYSTEM: "#f4a569ff", // Engineering Terracotta
  FULL: "#ef4444ff", // Dual-Auth Red
};

/**
 * Utility to safely add alpha to a hex color, handling both 6-digit and 8-digit hex.
 */
export const setHexAlpha = (hex: string, alpha: number): string => {
  // Trim existing alpha if present (e.g., #rrggbbaa -> #rrggbb)
  const cleanHex = hex.startsWith("#")
    ? hex.slice(0, 7)
    : "#" + hex.slice(0, 6);

  // Convert 0-1 alpha to 00-FF hex
  const alphaHex = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");
  return cleanHex + alphaHex;
};

/**
 * Utility to convert the palette into CSS Variables.
 * This is injected into the document head automatically by App.tsx.
 */
export const generateThemeStyles = () => {
  return `
    :root {
      --rq-blue: ${THEME_PALETTE.MASTER_SYSTEM.primary};
      --rq-blue-dim: ${THEME_PALETTE.MASTER_SYSTEM.dim};
      --rq-green: ${THEME_PALETTE.TERMINAL.primary};
      --rq-green-dim: ${THEME_PALETTE.TERMINAL.dim};
      --rq-amber: ${THEME_PALETTE.BUILDER.primary};
      --rq-amber-dim: ${THEME_PALETTE.BUILDER.dim};
      --rq-purple: ${THEME_PALETTE.DICTATION.primary};
      --rq-purple-dim: ${THEME_PALETTE.DICTATION.dim};
    }
  `;
};

// UI Config (Fallback) - Consolidated here for easy access by components
export const PERSONA_UI_CONFIG: Record<string, any> = {
  DEFAULT: {
    themeName: "assistant",
    primary: "text-white",
    border: "border-white/30",
    bg: "bg-white/10",
    glow: "shadow-[0_0_20px_rgba(255,255,255,0.5)]",
    coreColor: "text-white",
    hex: "#ffffff",
  },
  DICTATION: {
    themeName: "dictation",
    primary: "text-purple-400",
    border: "border-purple-500/30",
    bg: "bg-purple-900/10",
    glow: "shadow-[0_0_20px_#a855f7]",
    coreColor: "text-purple-500",
    hex: "#a855f7",
  },
  MASTER_SYSTEM: {
    themeName: "master-system",
    primary: "text-rq-blue",
    border: "border-rq-blue",
    bg: "bg-rq-blue-dim",
    glow: `shadow-[0_0_20px_${THEME_PALETTE.MASTER_SYSTEM.primary}]`,
    coreColor: "text-blue-500",
    hex: THEME_PALETTE.MASTER_SYSTEM.primary,
  },
  BUILDER: {
    themeName: "builder",
    primary: "text-rq-amber",
    border: "border-rq-amber/30",
    bg: "bg-rq-amber-dim",
    glow: `shadow-[0_0_20px_${THEME_PALETTE.BUILDER.primary}]`,
    coreColor: "text-amber-500",
    hex: THEME_PALETTE.BUILDER.primary,
  },
  PROFESSIONAL: {
    themeName: "professional",
    primary: "text-white",
    border: "border-white/30",
    bg: "bg-white/10",
    glow: "shadow-[0_0_20px_rgba(255,255,255,0.5)]",
    coreColor: "text-white",
    hex: "#ffffff",
  },
  TERMINAL: {
    themeName: "terminal",
    primary: "text-rq-green",
    border: "border-rq-green/50",
    bg: "bg-[#121212]",
    glow: `shadow-[0_0_20px_${THEME_PALETTE.TERMINAL.primary}]`,
    coreColor: "text-green-500",
    hex: THEME_PALETTE.TERMINAL.primary,
  },
  AGENTIC_SLATE: {
    themeName: "lucagent",
    primary: "text-gray-900",
    border: "border-gray-900/40",
    bg: "bg-white/40",
    glow: "shadow-[0_4px_20px_rgba(0,0,0,0.1)]",
    coreColor: "text-gray-900",
    hex: "#111827",
    isLight: true,
  },
  LUCAGENT: {
    themeName: "lucagent",
    primary: "text-gray-900",
    border: "border-gray-900/40",
    bg: "bg-white/40",
    glow: "shadow-[0_4px_20px_rgba(0,0,0,0.1)]",
    coreColor: "text-gray-900",
    hex: "#111827",
    isLight: true,
  },
  RUTHLESS: {
    themeName: "master-system",
    primary: "text-rq-blue",
    border: "border-rq-blue",
    bg: "bg-rq-blue-dim",
    glow: `shadow-[0_0_20px_${THEME_PALETTE.MASTER_SYSTEM.primary}]`,
    coreColor: "text-blue-500",
    hex: THEME_PALETTE.MASTER_SYSTEM.primary,
  },
  HACKER: {
    themeName: "terminal",
    primary: "text-rq-green",
    border: "border-rq-green/50",
    bg: "bg-[#121212]",
    glow: `shadow-[0_0_20px_${THEME_PALETTE.TERMINAL.primary}]`,
    coreColor: "text-green-500",
    hex: THEME_PALETTE.TERMINAL.primary,
  },
  ENGINEER: {
    themeName: "builder",
    primary: "text-rq-amber",
    border: "border-rq-amber/30",
    bg: "bg-rq-amber-dim",
    glow: `shadow-[0_0_20px_${THEME_PALETTE.BUILDER.primary}]`,
    coreColor: "text-amber-500",
    hex: THEME_PALETTE.BUILDER.primary,
  },
  ASSISTANT: {
    themeName: "professional",
    primary: "text-white",
    border: "border-white/30",
    bg: "bg-white/10",
    glow: "shadow-[0_0_20px_rgba(255,255,255,0.5)]",
    coreColor: "text-white",
    hex: "#ffffff",
  },
  MIDNIGHT: {
    themeName: "midnight",
    primary: "text-white",
    border: "border-white/20",
    bg: "bg-[#121212]",
    glow: "shadow-[0_0_30px_rgba(255,255,255,0.1)]",
    coreColor: "text-white",
    hex: "#ffffff",
  },
  VAPORWAVE: {
    themeName: "vaporwave",
    primary: "text-[#ff71ce]",
    border: "border-[#01cdfe]/50",
    bg: "bg-[#121212]",
    glow: "shadow-[0_0_20px_#ff71ce]",
    coreColor: "text-[#ff71ce]",
    hex: "#ff71ce",
  },
  FROST: {
    themeName: "frost",
    primary: "text-[#b4fbff]",
    border: "border-white/40",
    bg: "bg-white/10",
    glow: "shadow-[0_8px_32px_rgba(180,251,255,0.2)]",
    coreColor: "text-white",
    hex: "#b4fbff",
    isLight: true,
  },
};

/**
 * Returns the UI configuration for a given persona.
 * This is used as a default by many components.
 */
export const getThemeColors = (persona: string = "PROFESSIONAL") => {
  return PERSONA_UI_CONFIG[persona] || PERSONA_UI_CONFIG.PROFESSIONAL;
};
