/**
 * @package luca-orb-design
 * @file material/lighting.ts
 *
 * Lighting design constants for the Living Orb.
 *
 * The orb uses a 3-point lighting setup, but unlike traditional 3D lighting,
 * the positions are expressive — they lean, shift, and breathe with each profile.
 *
 * Coordinate system:
 * - (0,0) is orb center
 * - +X is right, +Y is up
 * - Positions are in normalized orb-radius units
 */

/** A light source definition */
export interface LightDefinition {
  /** Position in normalized orb units (1.0 = 1 orb radius from center) */
  position:    readonly [number, number];
  /** Intensity multiplier [0,1] */
  intensity:   number;
  /** Color temperature influence [0=cool, 0.5=neutral, 1=warm] */
  temperature: number;
  /** Whether this light contributes to specular highlights */
  specular:    boolean;
  /** Specular exponent override (uses GlassMaterial.specularExponent if 0) */
  specularExp: number;
}

/** A complete 3-point lighting rig for one profile */
export interface LightingRig {
  key:    LightDefinition;   // Main light — dominant specular
  fill:   LightDefinition;   // Secondary light — wraps shadow side
  rim:    LightDefinition;   // Back/edge light — defines silhouette
  bloom:  number;            // Bloom intensity [0,1]
  bloomRadius: number;       // Bloom radius multiplier
}

// ─────────────────────────────────────────────────────────────────────────────
// Lighting rigs per profile
// ─────────────────────────────────────────────────────────────────────────────

export const LIGHTING_RIGS: Record<string, LightingRig> = {
  idle: {
    key: {
      position:    [-0.3, 0.7],   // Upper-left (matches mockup)
      intensity:   0.90,
      temperature: 0.25,          // Cool-neutral
      specular:    true,
      specularExp: 0,             // Use material default
    },
    fill: {
      position:    [0.6, -0.2],   // Lower-right
      intensity:   0.22,
      temperature: 0.50,
      specular:    false,
      specularExp: 0,
    },
    rim: {
      position:    [0.0, -1.4],   // Below
      intensity:   0.15,
      temperature: 0.30,
      specular:    false,
      specularExp: 0,
    },
    bloom:       0.45,
    bloomRadius: 1.0,
  },

  listening: {
    // Light leans forward — front-lit, rim reduced
    key: {
      position:    [-0.1, 0.8],   // More centered, slightly more forward
      intensity:   0.95,
      temperature: 0.20,
      specular:    true,
      specularExp: 0,
    },
    fill: {
      position:    [0.5, 0.1],
      intensity:   0.30,          // Stronger fill = more evenly lit (receptive)
      temperature: 0.40,
      specular:    false,
      specularExp: 0,
    },
    rim: {
      position:    [0.0, -1.2],
      intensity:   0.10,          // Rim reduced — less separation
      temperature: 0.25,
      specular:    false,
      specularExp: 0,
    },
    bloom:       0.55,
    bloomRadius: 1.15,
  },

  thinking: {
    // Rim brightens, core dims — introverted, concentrated
    key: {
      position:    [-0.4, 0.5],   // Shifts slightly further off-axis
      intensity:   0.70,          // Dimmer key
      temperature: 0.15,          // Cooler
      specular:    true,
      specularExp: 18,            // Tighter specular (more crystalline)
    },
    fill: {
      position:    [0.5, -0.3],
      intensity:   0.15,
      temperature: 0.30,
      specular:    false,
      specularExp: 0,
    },
    rim: {
      position:    [0.0, -1.6],
      intensity:   0.35,          // Much brighter rim — wraps around
      temperature: 0.20,
      specular:    false,
      specularExp: 0,
    },
    bloom:       0.30,
    bloomRadius: 0.85,
  },

  speaking: {
    // Core bright and warm, bloom expands
    key: {
      position:    [-0.2, 0.6],
      intensity:   1.00,          // Maximum key light
      temperature: 0.60,          // Warm
      specular:    true,
      specularExp: 0,
    },
    fill: {
      position:    [0.5, 0.2],
      intensity:   0.35,
      temperature: 0.65,          // Warm fill
      specular:    false,
      specularExp: 0,
    },
    rim: {
      position:    [0.0, -1.3],
      intensity:   0.20,
      temperature: 0.55,
      specular:    false,
      specularExp: 0,
    },
    bloom:       0.70,            // Largest bloom — most expressive
    bloomRadius: 1.30,
  },

  success: {
    key: {
      position:    [-0.2, 0.75],
      intensity:   0.88,
      temperature: 0.55,          // Warm-cool — pleasant
      specular:    true,
      specularExp: 0,
    },
    fill: {
      position:    [0.55, 0.0],
      intensity:   0.28,
      temperature: 0.50,
      specular:    false,
      specularExp: 0,
    },
    rim: {
      position:    [0.0, -1.3],
      intensity:   0.22,
      temperature: 0.40,
      specular:    false,
      specularExp: 0,
    },
    bloom:       0.60,
    bloomRadius: 1.20,
  },

  error: {
    // Rim hardens, key shifts cooler — alert, contracted
    key: {
      position:    [-0.5, 0.4],
      intensity:   0.80,
      temperature: 0.10,          // Cool — clinical
      specular:    true,
      specularExp: 16,
    },
    fill: {
      position:    [0.6, -0.3],
      intensity:   0.12,
      temperature: 0.20,
      specular:    false,
      specularExp: 0,
    },
    rim: {
      position:    [0.0, -1.5],
      intensity:   0.40,          // Hard rim — tense
      temperature: 0.15,
      specular:    false,
      specularExp: 0,
    },
    bloom:       0.25,
    bloomRadius: 0.75,
  },

  sleeping: {
    // Very dim, balanced — barely lit
    key: {
      position:    [-0.2, 0.6],
      intensity:   0.30,
      temperature: 0.55,          // Slightly warm (resting)
      specular:    true,
      specularExp: 6,             // Very soft specular
    },
    fill: {
      position:    [0.5, -0.2],
      intensity:   0.08,
      temperature: 0.50,
      specular:    false,
      specularExp: 0,
    },
    rim: {
      position:    [0.0, -1.3],
      intensity:   0.06,
      temperature: 0.45,
      specular:    false,
      specularExp: 0,
    },
    bloom:       0.10,
    bloomRadius: 0.65,
  },
} as const;
